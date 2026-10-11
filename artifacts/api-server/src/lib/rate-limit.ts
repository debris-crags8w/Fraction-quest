// Small in-memory rate limiter. Good enough for a single server process;
// counts reset when the server restarts.
type Bucket = { count: number; resetAt: number };

export function createRateLimiter({ max, windowMs }: { max: number; windowMs: number }) {
  const buckets = new Map<string, Bucket>();
  return {
    /** True when `key` has used up its attempts in the current window. */
    isLimited(key: string, now = Date.now()): boolean {
      const bucket = buckets.get(key);
      return !!bucket && bucket.resetAt > now && bucket.count >= max;
    },
    hit(key: string, now = Date.now()): void {
      const bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= now) buckets.set(key, { count: 1, resetAt: now + windowMs });
      else bucket.count += 1;
      if (buckets.size > 10_000) {
        for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
      }
    },
    reset(key: string): void {
      buckets.delete(key);
    },
  };
}
