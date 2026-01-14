// lib/rateLimiter.ts
// 改善されたレートリミッター（メモリベース、セキュリティ強化）

import { generateRateLimitKey } from "@/lib/security";

interface RateLimitEntry {
  count: number;
  timestamp: number;
  violations: number;
  lastViolation?: number;
}

const requests = new Map<string, RateLimitEntry>();
const VIOLATION_PENALTY_MULTIPLIER = 2; // 違反時のペナルティ倍率
const VIOLATION_THRESHOLD = 5; // 違反回数のしきい値
const VIOLATION_RESET_TIME = 24 * 60 * 60 * 1000; // 24時間

/**
 * 改善されたレートリミット関数
 * @param identifier 識別子（IPアドレス、ユーザーIDなど）
 * @param action アクション種別
 * @param limit 制限回数
 * @param windowSeconds 窓口秒数
 * @returns { ok: boolean, remaining: number, resetTime: number }
 */
export async function rateLimit(
  identifier: string,
  action: string,
  limit: number,
  windowSeconds: number,
): Promise<{ ok: boolean; remaining: number; resetTime: number }> {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  // 安全なキー生成
  const key = generateRateLimitKey(identifier, action);

  const entry = requests.get(key);

  if (!entry || entry.timestamp < windowStart) {
    // 新しいウィンドウまたは期限切れ
    const newEntry: RateLimitEntry = {
      count: 1,
      timestamp: now,
      violations:
        entry?.violations &&
        entry.lastViolation &&
        now - entry.lastViolation < VIOLATION_RESET_TIME
          ? entry.violations
          : 0,
    };

    requests.set(key, newEntry);
    return {
      ok: true,
      remaining: limit - 1,
      resetTime: now + windowSeconds * 1000,
    };
  }

  // 違反履歴に基づく制限強化
  let adjustedLimit = limit;
  if (entry.violations >= VIOLATION_THRESHOLD) {
    adjustedLimit = Math.max(
      1,
      Math.floor(limit / VIOLATION_PENALTY_MULTIPLIER),
    );
  }

  if (entry.count >= adjustedLimit) {
    // 違反を記録
    entry.violations++;
    entry.lastViolation = now;
    requests.set(key, entry);

    return {
      ok: false,
      remaining: 0,
      resetTime: entry.timestamp + windowSeconds * 1000,
    };
  }

  entry.count++;
  entry.timestamp = now;
  requests.set(key, entry);

  return {
    ok: true,
    remaining: adjustedLimit - entry.count,
    resetTime: now + windowSeconds * 1000,
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
