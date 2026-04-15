import { prisma } from "@/lib/prisma";
import { redis, isRedisEnabled } from "@/lib/redis";

/**
 * Checks if a recent idempotent action was already performed.
 * Returns the previous meta result if found, otherwise null.
 */
export async function checkIdempotency(action: string, idempotencyKey: string | null, userId: string) {
  if (!idempotencyKey) return null;

  const redisKey = `idemp:${action}:${userId}:${idempotencyKey}`;

  // 1. Try Redis
  if (isRedisEnabled()) {
    try {
      const cached = await redis?.get<any>(redisKey);
      if (cached) {
        console.log(`[Idempotency] Redis Hit: ${redisKey}`);
        // Wrap in the same structure expected by callers
        return { meta: cached };
      }
    } catch (e) {
      console.warn(`[Idempotency] Redis error (GET):`, e);
      // Fallback to DB continues...
    }
  }
  
  // 2. Fallback to DB (UsageHistory)
  const existing = await prisma.usageHistory.findFirst({
    where: {
      userId,
      action,
      meta: { path: ["idempotencyKey"], equals: idempotencyKey } as any,
      date: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Look back 24 hours max
    },
    select: { meta: true },
  });

  return existing;
}

/**
 * Records an idempotent action so it can be cached for future duplicated requests.
 */
export async function recordIdempotency(action: string, idempotencyKey: string | null, userId: string, resultData: any = {}) {
  if (!idempotencyKey) return;
  
  const redisKey = `idemp:${action}:${userId}:${idempotencyKey}`;
  const meta = { idempotencyKey, ...resultData };

  // 1. Try Redis (TTL: 24h)
  if (isRedisEnabled()) {
    try {
      await redis?.set(redisKey, meta, { ex: 86400 });
      console.log(`[Idempotency] Redis Cached: ${redisKey}`);
    } catch (e) {
      console.warn(`[Idempotency] Redis error (SET):`, e);
    }
  }

  // 2. Always record in DB as secondary safety/audit trail
  // UsageHistory separation is handled by keep using it for now or moving to SystemLog later
  await prisma.usageHistory.create({
    data: {
      userId,
      action,
      meta: meta as any,
    },
  });
}
