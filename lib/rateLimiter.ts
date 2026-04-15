// lib/rateLimiter.ts
// 改善されたレートリミッター（メモリベース、セキュリティ強化）

import { generateRateLimitKey } from "@/lib/security";
import { redis, isRedisEnabled } from "@/lib/redis";

interface RateLimitEntry {
  count: number;
  timestamp: number;
  violations: number;
  lastViolation?: number;
}

const MAX_ENTRIES = 10000;
const requests = new Map<string, RateLimitEntry>();
const VIOLATION_PENALTY_MULTIPLIER = 2; // 違反時のペナルティ倍率
const VIOLATION_THRESHOLD = 5; // 違反回数のしきい値
const VIOLATION_RESET_TIME = 24 * 60 * 60 * 1000; // 24時間

/**
 * 改善されたレートリミット関数（Redis対応）
 */
export async function rateLimit(
  identifier: string,
  action: string,
  limit: number,
  windowSeconds: number,
): Promise<{ ok: boolean; remaining: number; resetTime: number }> {
  const now = Date.now();
  const key = generateRateLimitKey(identifier, action);

  // --- Redis 利用可能な場合 ---
  if (isRedisEnabled() && redis) {
    try {
      const redisKey = `ratelimit:${key}`;
      const entry = await redis.get<RateLimitEntry>(redisKey);
      const windowStart = now - windowSeconds * 1000;

      if (!entry || entry.timestamp < windowStart) {
        // 新しいウィンドウ
        const newEntry: RateLimitEntry = {
          count: 1,
          timestamp: now,
          violations: entry?.violations && entry.lastViolation && (now - entry.lastViolation < VIOLATION_RESET_TIME) ? entry.violations : 0,
        };
        await redis.set(redisKey, newEntry, { px: windowSeconds * 1000 });
        return { ok: true, remaining: limit - 1, resetTime: now + windowSeconds * 1000 };
      }

      // 違反ペナルティ
      let adjustedLimit = limit;
      if (entry.violations >= VIOLATION_THRESHOLD) {
        adjustedLimit = Math.max(1, Math.floor(limit / VIOLATION_PENALTY_MULTIPLIER));
      }

      if (entry.count >= adjustedLimit) {
        entry.violations++;
        entry.lastViolation = now;
        await redis.set(redisKey, entry, { px: windowSeconds * 1000 });
        return { ok: false, remaining: 0, resetTime: entry.timestamp + windowSeconds * 1000 };
      }

      entry.count++;
      await redis.set(redisKey, entry, { px: windowSeconds * 1000 });
      return { ok: true, remaining: adjustedLimit - entry.count, resetTime: entry.timestamp + windowSeconds * 1000 };
    } catch (e) {
      console.error("[RATE_LIMIT] Redis error, falling back to memory:", e);
    }
  }

  // --- メモリフォールバック ---
  if (requests.size > MAX_ENTRIES) {
    cleanupRateLimit();
  }

  const windowStart = now - windowSeconds * 1000;
  const entry = requests.get(key);

  if (!entry || entry.timestamp < windowStart) {
    const newEntry: RateLimitEntry = {
      count: 1,
      timestamp: now,
      violations: entry?.violations && entry.lastViolation && (now - entry.lastViolation < VIOLATION_RESET_TIME) ? entry.violations : 0,
    };
    requests.set(key, newEntry);
    return { ok: true, remaining: limit - 1, resetTime: now + windowSeconds * 1000 };
  }

  let adjustedLimit = limit;
  if (entry.violations >= VIOLATION_THRESHOLD) {
    adjustedLimit = Math.max(1, Math.floor(limit / VIOLATION_PENALTY_MULTIPLIER));
  }

  if (entry.count >= adjustedLimit) {
    entry.violations++;
    entry.lastViolation = now;
    requests.set(key, entry);
    return { ok: false, remaining: 0, resetTime: entry.timestamp + windowSeconds * 1000 };
  }

  entry.count++;
  requests.set(key, entry);

  return {
    ok: true,
    remaining: adjustedLimit - entry.count,
    resetTime: entry.timestamp + windowSeconds * 1000,
  };
}

/**
 * レートリミット統計情報の取得
 */
export function getRateLimitStats(
  identifier: string,
  action: string,
): {
  count: number;
  violations: number;
  lastViolation?: number;
} | null {
  const key = generateRateLimitKey(identifier, action);
  const entry = requests.get(key);

  if (!entry) return null;

  return {
    count: entry.count,
    violations: entry.violations,
    lastViolation: entry.lastViolation,
  };
}

/**
 * 古いエントリのクリーンアップ
 */
export function cleanupRateLimit(): void {
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000; // 24時間前

  for (const [key, entry] of requests.entries()) {
    if (entry.timestamp < cutoff) {
      requests.delete(key);
    }
  }
}

// 定期的なクリーンアップ（1時間ごと）
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimit, 60 * 60 * 1000);
}
