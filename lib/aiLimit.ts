// lib/aiLimit.ts
import { prisma } from "./prisma";
import { redis, isRedisEnabled } from "./redis";

export const AI_LIMIT_FREE = 1;
export const AI_LIMIT_PRO = 3;
export const INGREDIENT_LIMIT_FREE = 100;

export type LimitType = "AI_MENU" | "INGREDIENT_COUNT";

export async function checkUserLimit(
  userId: string,
  type: LimitType,
  options: { readonly?: boolean } = {},
): Promise<{ ok: boolean; remaining: number; resetAt?: Date }> {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 0. AI_MENU 以外は従来通り DB で管理（在庫制限など）
  if (type !== "AI_MENU") {
    return await checkDbLimit(userId, type, options);
  }

  // 1. Try Redis for AI_MENU
  if (isRedisEnabled()) {
    try {
      const redisKey = `quota:ai:${userId}:${dateStr}`;
      const count = await redis?.get<number>(redisKey) ?? 0;
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true }
      });
      const isPro = user?.plan === "PRO";
      const limit = isPro ? AI_LIMIT_PRO : AI_LIMIT_FREE;

      if (count >= limit) {
        return { ok: false, remaining: 0, resetAt: todayStart };
      }

      if (options.readonly) {
        return { ok: true, remaining: limit - count };
      }

      // Increment and set TTL (expires at end of day)
      const newCount = await redis?.incr(redisKey);
      if (newCount === 1) {
        await redis?.expire(redisKey, 86400 + 3600); // 25 hours to be safe
      }
      
      // Background sync to DB (Safety First)
      void syncLimitToDb(userId, (newCount as number));

      return { ok: true, remaining: limit - (newCount as number) };
    } catch (e) {
      console.warn(`[AI-Limit] Redis error:`, e);
      // Fallback to DB
    }
  }

  // 2. Fallback to DB
  return await checkDbLimit(userId, type, options);
}

/**
 * ユーザーのAI献立生成カウントを1増やす（成功時のみ呼び出す）
 * 通常は checkUserLimit でインクリメントするが、生成失敗時に戻すなどの制御が必要な場合に使用。
 */
export async function incrementUserLimit(
  userId: string,
  type: LimitType,
): Promise<void> {
  if (type !== "AI_MENU") return;
  
  // Redis increment if enabled
  if (isRedisEnabled()) {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    try {
      await redis?.incr(`quota:ai:${userId}:${dateStr}`);
    } catch (e) { /* ignore */ }
  }

  // DB increment as safety
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { dailyResetAt: true, aiDailyCount: true },
    });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (!user?.dailyResetAt || user.dailyResetAt < todayStart) {
      await tx.user.update({
        where: { id: userId },
        data: { aiDailyCount: 1, dailyResetAt: now },
      });
    } else {
      await tx.user.update({
        where: { id: userId },
        data: { aiDailyCount: { increment: 1 } },
      });
    }
  });
}

// --- Helper Functions ---

async function checkDbLimit(userId: string, type: LimitType, options: { readonly?: boolean }) {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, plan: true, aiDailyCount: true, dailyResetAt: true },
    });

    if (!user) return { ok: false, remaining: 0 };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isPro = user.plan === "PRO";

    if (type === "AI_MENU") {
      let currentAiCount = user.aiDailyCount;
      if (!user.dailyResetAt || user.dailyResetAt < todayStart) {
        currentAiCount = 0;
        await tx.user.update({
          where: { id: userId },
          data: { aiDailyCount: 0, dailyResetAt: now },
        });
      }

      const limit = isPro ? AI_LIMIT_PRO : AI_LIMIT_FREE;
      if (currentAiCount >= limit) {
        return { ok: false, remaining: 0, resetAt: todayStart };
      }
      
      if (options.readonly) return { ok: true, remaining: limit - currentAiCount };

      await tx.user.update({
        where: { id: userId },
        data: { aiDailyCount: { increment: 1 } },
      });
      return { ok: true, remaining: limit - (currentAiCount + 1) };
    }

    if (type === "INGREDIENT_COUNT") {
      if (isPro) return { ok: true, remaining: 999 };
      const count = await tx.ingredient.count({ where: { userId } });
      if (count >= INGREDIENT_LIMIT_FREE) return { ok: false, remaining: 0 };
      return { ok: true, remaining: INGREDIENT_LIMIT_FREE - count };
    }

    return { ok: false, remaining: 0 };
  });
}

async function syncLimitToDb(userId: string, count: number) {
  try {
    const now = new Date();
    // Update DB if count is higher than current (simple sync)
    await prisma.user.update({
      where: { id: userId },
      data: { aiDailyCount: count, dailyResetAt: now }
    });
  } catch (e) {
    console.warn(`[AI-Limit] DB Sync failed:`, e);
  }
}
