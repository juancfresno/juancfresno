// ─── Locales and localized paths ──────────────────────────────────────────────
// English lives at / (no prefix, the URLs v1.0 already had) and Spanish under
// /es. Internally every page is app/[lang]/…: src/proxy.ts rewrites English
// URLs to /en/… and redirects any public /en/… URL back to the bare path.
// Pure TS, no React/Next imports: the proxy (edge) imports it too.

export const LOCALES = ['en', 'es'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'

// Explicit choice from the selector (copy-web-v1-es.md, decision 3): cookie
// `lang`, 1 year. The proxy only reads it on / (lang=es → /es). No
// Accept-Language redirect: Google crawls without it.
export const LOCALE_COOKIE = 'lang'
export const LOCALE_STORAGE = 'locale'

export const isLocale = (x: unknown): x is Locale => typeof x === 'string' && (LOCALES as readonly string[]).includes(x)

export const HTML_LANG: Record<Locale, string> = { en: 'en', es: 'es' }
export const HREFLANG: Record<Locale, string> = { en: 'en', es: 'es' }
export const OG_LOCALE: Record<Locale, string> = { en: 'en_GB', es: 'es_ES' }
// Intl formatting (dates, month names).
export const INTL: Record<Locale, string> = { en: 'en-GB', es: 'es-ES' }

// Public first path segment per locale. Internal ids (folders in app/[lang])
// are the English ones; a different Spanish slug is mapped here and the proxy
// rewrites it back. Identity = same slug in both languages (copy decision 2:
// same slugs; a Spanish slug later is one line here, no content change).
export const SEGMENTS: Record<string, Record<Locale, string>> = {
  work: { en: 'work', es: 'work' },
  about: { en: 'about', es: 'about' },
  feed: { en: 'feed', es: 'feed' },
  lab: { en: 'lab', es: 'lab' },
  journal: { en: 'journal', es: 'journal' },
  contact: { en: 'contact', es: 'contact' },
  legal: { en: 'legal', es: 'legal' },
}

const split = (p: string) => {
  const m = p.match(/^([^?#]*)(.*)$/)!
  return [m[1] || '/', m[2]] as const
}

// Internal path ("/work/shoeciety#x") → public URL for that locale.
export function localePath(locale: Locale, internal: string): string {
  const [path, tail] = split(internal)
  const parts = path.split('/').filter(Boolean)
  if (parts[0] && SEGMENTS[parts[0]]) parts[0] = SEGMENTS[parts[0]][locale]
  const body = parts.length ? `/${parts.join('/')}` : ''
  if (locale === DEFAULT_LOCALE) return (body || '/') + tail
  return `/${locale}${body}` + tail
}

// Public (or internal /en/…) pathname → its locale and the internal path.
export function parsePath(pathname: string): { locale: Locale; path: string } {
  const parts = pathname.split('/').filter(Boolean)
  let locale: Locale = DEFAULT_LOCALE
  if (isLocale(parts[0])) locale = parts.shift() as Locale
  if (parts[0]) {
    const id = Object.keys(SEGMENTS).find((k) => SEGMENTS[k][locale] === parts[0])
    if (id) parts[0] = id
  }
  return { locale, path: parts.length ? `/${parts.join('/')}` : '/' }
}

// Same page in the other language (pathname only; callers add ?query#hash).
export const switchLocalePath = (pathname: string, to: Locale) => localePath(to, parsePath(pathname).path)
