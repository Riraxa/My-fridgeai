// app/lib/rate-limit.ts

type RateLimitRecord = {
  count: number;
  firstRequest: number;
};

// In-memory store: Map<IP_ACTION, Record>
const store = new Map<string, RateLimitRecord>();

// Cleanup interval (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (now - record.firstRequest > CLEANUP_INTERVAL) {
      store.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

interface RateLimitConfig {
  interval: number; // milliseconds
  limit: number; // max requests per interval
}

/**
 * Check if the action from the given IP is allowed.
 * Returns true if allowed, false if limit exceeded.
 */
export function checkRateLimit(
  ip: string,
  action: string,
  config: RateLimitConfig,
): boolean {
  const key = `${ip}:${action}`;
  const now = Date.now();
  const record = store.get(key);

  if (!record) {
    store.set(key, { count: 1, firstRequest: now });
    return true;
  }

  if (now - record.firstRequest > config.interval) {
    // Reset if interval passed
    store.set(key, { count: 1, firstRequest: now });
    return true;
  }

  if (record.count >= config.limit) {
    return false;
  }

  record.count += 1;
  return true;
}
