// Password gate for the FDS docs at fds.juancfresno.com.
// The cookie holds an HMAC of a fixed label keyed with FDS_PASSWORD, so
// changing the password in Vercel signs everyone out.

export const FDS_HOST = 'fds.juancfresno.com'
export const FDS_COOKIE = 'fds_auth'
export const FDS_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

const LABEL = 'fds-docs-v1'

export async function fdsToken(password: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(LABEL))
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('')
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
