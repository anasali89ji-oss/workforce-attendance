// JWT session helpers — fully independent of Supabase Auth
// Uses jose (already installed) to sign/verify session tokens
import { SignJWT, jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'workforce-fallback-secret-change-in-production-32chars'
)
const ALG = 'HS256'
const ISSUER = 'workforce-pro'
const AUDIENCE = 'workforce-pro-api'

export interface SessionPayload {
  sub: string        // profile id
  tenant_id: string
  role: string
  email: string
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime('24h')
    .sign(SECRET)
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    })
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}
