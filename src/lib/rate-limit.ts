// BUG-3.1 FIX: Wrap Redis in try-catch, provide no-op fallback if env vars missing
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let redis: Redis
let redisAvailable = false

try {
  redis = Redis.fromEnv()
  redisAvailable = true
} catch {
  redis = {} as Redis
  console.warn('[RateLimit] Redis not configured (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN missing). Rate limiting disabled.')
}

const createLimiter = (prefix: string, requests: number, window: string): Ratelimit => {
  if (!redisAvailable) {
    return {
      limit: async () => ({ success: true, limit: requests, remaining: requests, reset: 0, pending: Promise.resolve() }),
    } as unknown as Ratelimit
  }
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window as `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}`),
    analytics: true,
    prefix,
  })
}

export const loginRateLimit       = createLimiter('ratelimit:login',   5,   '1 m')
export const apiRateLimit         = createLimiter('ratelimit:api',     100, '1 m')
export const bulkRateLimit        = createLimiter('ratelimit:bulk',    10,  '1 m')
export const accountLockoutLimit  = createLimiter('ratelimit:account', 5,   '15 m')
