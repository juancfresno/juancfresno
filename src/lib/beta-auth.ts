// Password gate for the private v1 preview at beta.juancfresno.com.
// The cookie holds an HMAC of a fixed label keyed with BETA_PASSWORD, so
// changing the password in Vercel signs everyone out. No password set →
// nobody gets in.

export const BETA_HOSTS = ['beta.juancfresno.com', 'beta.localhost']
export const BETA_COOKIE = 'beta_auth'
export const BETA_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days
export const BETA_ERROR_PARAM = '__beta_e'

const LABEL = 'beta-site-v1'

export function isBetaHost(host: string): boolean {
  return BETA_HOSTS.includes(host)
}

export async function betaToken(password: string): Promise<string> {
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

// Only same-site relative paths: "/x", never "//host" or "/\host".
export function safeNext(value: unknown): string {
  const v = typeof value === 'string' ? value : ''
  if (!v.startsWith('/') || v.startsWith('//') || v.includes('\\') || /[\r\n]/.test(v)) return '/'
  return v
}
