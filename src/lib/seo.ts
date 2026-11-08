import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/site'
import { DEFAULT_LOCALE, HREFLANG, LOCALES, OG_LOCALE, localePath, type Locale } from '@/i18n/config'

// Page-level metadata helpers. In Next.js a page's `openGraph` / `twitter`
// objects replace the layout's (shallow merge), so every page builds them here
// to keep siteName, locale, type and og:url on all routes. og:image comes from
// the opengraph-image files (default in (site)/, one per case in work/[slug]/).
// `path` is always the internal (English) path: "/work/shoeciety".

export const SITE_NAME = 'Juan C. Fresno'

// Only the production deployment on Vercel is indexable. Previews (and any
// other Vercel env) send noindex; local builds (no VERCEL_ENV) stay indexable
// so audits see production behaviour.
export const IS_INDEXABLE = !process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'production'

// Absolute URL of a page in a locale (home without trailing slash).
export function absoluteUrl(locale: Locale, path: string) {
  const p = localePath(locale, path)
  return `${SITE_URL}${p === '/' ? '' : p}`
}

// hreflang alternates for a page: every locale + x-default (English).
export function languageAlternates(path: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const l of LOCALES) out[HREFLANG[l]] = absoluteUrl(l, path)
  out['x-default'] = absoluteUrl(DEFAULT_LOCALE, path)
  return out
}

export function pageMeta({
  locale,
  path,
  title,
  description,
  absoluteTitle,
  type = 'website',
}: {
  locale: Locale
  path: string
  title: string
  description: string
  absoluteTitle?: boolean
  type?: 'website' | 'article' | 'profile'
}): Metadata {
  const full = absoluteTitle ? title : `${title} — ${SITE_NAME}`
  const url = absoluteUrl(locale, path)
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      title: full,
      description,
      url,
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      type,
    },
    twitter: { card: 'summary_large_image', title: full, description },
  }
}
