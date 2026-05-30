import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Graceful fallback: if Redis env vars are missing, return a no-op limiter
// so the app doesn't crash in environments without Upstash configured
function makeRatelimit(prefix: string, requests: number, window: string) {
  try {
    const redis = Redis.fromEnv()
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requests, window as Parameters<typeof Ratelimit.slidingWindow>[1]),
      analytics: true,
      prefix,
    })
  } catch {
    // No-op limiter — always allows requests (Redis not configured)
    return {
      limit: async (_id: string) => ({ success: true, limit: requests, remaining: requests, reset: 0 }),
    } as unknown as Ratelimit
  }
}

export const loginRateLimit      = makeRatelimit('ratelimit:login',   5,  '1 m')
export const apiRateLimit        = makeRatelimit('ratelimit:api',     100, '1 m')
export const bulkRateLimit       = makeRatelimit('ratelimit:bulk',    10,  '1 m')
export const accountLockoutLimit = makeRatelimit('ratelimit:account', 5,  '15 m')
