// Rate limiting with graceful fallback — works with OR without Upstash Redis
// Without Redis: in-memory fallback (per-instance, resets on cold start — acceptable for free tier)

const HAS_REDIS = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

interface RateLimitResult { success: boolean; remaining: number; reset: number }

// ─── In-memory fallback (no Redis) ──────────────────────────────────────────
const memStore = new Map<string, { count: number; resetAt: number }>()

function memLimit(key: string, maxReq: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const entry = memStore.get(key)

  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: maxReq - 1, reset: now + windowMs }
  }

  entry.count++
  if (entry.count > maxReq) {
    return { success: false, remaining: 0, reset: entry.resetAt }
  }
  return { success: true, remaining: maxReq - entry.count, reset: entry.resetAt }
}

// ─── Redis-backed limiter (lazy-loaded) ─────────────────────────────────────
async function redisLimit(
  prefix: string,
  key: string,
  maxReq: number,
  windowMs: number
): Promise<RateLimitResult> {
  const { Ratelimit } = await import('@upstash/ratelimit')
  const { Redis } = await import('@upstash/redis')
  const redis = Redis.fromEnv()
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxReq, `${Math.floor(windowMs / 1000)} s`),
    prefix,
  })
  const { success, remaining, reset } = await limiter.limit(key)
  return { success, remaining, reset }
}

// ─── Public API ─────────────────────────────────────────────────────────────
function createLimiter(prefix: string, maxReq: number, windowMs: number) {
  return {
    limit: async (key: string): Promise<RateLimitResult> => {
      try {
        if (HAS_REDIS) {
          return await redisLimit(prefix, key, maxReq, windowMs)
        }
      } catch (e) {
        console.warn('[RateLimit] Redis error, falling back to memory:', (e as Error).message)
      }
      return memLimit(`${prefix}:${key}`, maxReq, windowMs)
    }
  }
}

export const loginRateLimit = createLimiter('ratelimit:login', 5, 60_000)   // 5/min
export const apiRateLimit   = createLimiter('ratelimit:api',   100, 60_000)  // 100/min
export const bulkRateLimit  = createLimiter('ratelimit:bulk',  10, 60_000)   // 10/min
