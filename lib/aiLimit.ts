// lib/aiLimit.ts
import { prisma } from "./prisma";

export const AI_LIMIT_FREE = 1;
export const AI_LIMIT_PRO = 3;
export const INGREDIENT_LIMIT_FREE = 100;

export type LimitType = "AI_MENU" | "INGREDIENT_COUNT";

/**
 * ユーザーの各機能利用制限をチェックし、必要に応じてカウントを更新・リセットする
 */
export async function checkUserLimit(
  userId: string,
  type: LimitType,
): Promise<{ ok: boolean; remaining: number; resetAt?: Date }> {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        plan: true,
        aiDailyCount: true,
        dailyResetAt: true,
      },
    });

    if (!user) return { ok: false, remaining: 0 };

    // --- オンデマンドリセット用の日時設定 ---
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    let currentAiCount = user.aiDailyCount;

    // 日次リセットが必要かチェック
    if (!user.dailyResetAt || user.dailyResetAt < todayStart) {
      currentAiCount = 0;
      await tx.user.update({
        where: { id: userId },
        data: {
          aiDailyCount: 0,
          dailyResetAt: now,
        },
      });
    }

    const isPro = user.plan === "PRO";

    // --- 制限判定 ---
    if (type === "AI_MENU") {
      const limit = isPro ? AI_LIMIT_PRO : AI_LIMIT_FREE;
      if (currentAiCount >= limit) {
        return { ok: false, remaining: 0, resetAt: todayStart };
      }
      // アトミックインクリメント
      await tx.user.update({
        where: { id: userId },
        data: { aiDailyCount: { increment: 1 } },
      });
      return { ok: true, remaining: limit - (currentAiCount + 1) };
    }

    if (type === "INGREDIENT_COUNT") {
      if (isPro) return { ok: true, remaining: 999 };

      const count = await tx.ingredient.count({ where: { userId } });
      if (count >= INGREDIENT_LIMIT_FREE) {
        return { ok: false, remaining: 0 };
      }
      return { ok: true, remaining: INGREDIENT_LIMIT_FREE - count };
    }

    return { ok: false, remaining: 0 };
  });
}
