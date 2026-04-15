// lib/redis.ts
import { Redis } from "@upstash/redis";

const upstashRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

/**
 * Upstash Redis Client
 * 環境変数が設定されていない場合は null を返す（fallback用）
 */
export const redis =
  upstashRedisUrl && upstashRedisToken
    ? new Redis({
        url: upstashRedisUrl,
        token: upstashRedisToken,
      })
    : null;

/**
 * Redis が有効かどうかを確認
 */
export const isRedisEnabled = (): boolean => !!redis;
