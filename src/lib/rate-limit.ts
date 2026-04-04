const tokenBuckets = new Map<string, { tokens: number; lastRefill: number }>();

const MAX_TOKENS = 20;
const REFILL_RATE = 20; // tokens per minute
const REFILL_INTERVAL = 60 * 1000; // 1 minute

export function checkRateLimit(userId: string): {
  allowed: boolean;
  remaining: number;
} {
  const now = Date.now();
  let bucket = tokenBuckets.get(userId);

  if (!bucket) {
    bucket = { tokens: MAX_TOKENS, lastRefill: now };
    tokenBuckets.set(userId, bucket);
  }

  // Refill tokens based on elapsed time
  const elapsed = now - bucket.lastRefill;
  const tokensToAdd = Math.floor(
    (elapsed / REFILL_INTERVAL) * REFILL_RATE
  );

  if (tokensToAdd > 0) {
    bucket.tokens = Math.min(MAX_TOKENS, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  if (bucket.tokens <= 0) {
    return { allowed: false, remaining: 0 };
  }

  bucket.tokens -= 1;
  return { allowed: true, remaining: bucket.tokens };
}
