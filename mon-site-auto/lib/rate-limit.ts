import "server-only";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;
let nextCleanup = 0;

function clientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "unknown";
}

export function checkRateLimit(req: Request, scope: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (now >= nextCleanup || buckets.size >= MAX_BUCKETS) {
    for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
    nextCleanup = now + 60_000;
  }
  const key = `${scope}:${clientIp(req)}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (!bucket && buckets.size >= MAX_BUCKETS) return false;
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) {
    return false;
  }

  bucket.count += 1;
  return true;
}
