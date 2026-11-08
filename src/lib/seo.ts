import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/site'

// Page-level metadata helpers. In Next.js a page's `openGraph` / `twitter`
// objects replace the layout's (shallow merge), so every page builds them here
// to keep siteName, locale, type and og:url on all routes. og:image comes from
// the opengraph-image files (default in (site)/, one per case in work/[slug]/).

export const SITE_NAME = 'Juan C. Fresno'

// Only the production deployment on Vercel is indexable. Previews (and any
// other Vercel env) send noindex; local builds (no VERCEL_ENV) stay indexable
// so audits see production behaviour.
export const IS_INDEXABLE = !process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'production'

export function pageMeta({
  path,
  title,
  description,
  absoluteTitle,
  type = 'website',
}: {
  path: string
  title: string
  description: string
  absoluteTitle?: boolean
  type?: 'website' | 'article' | 'profile'
}): Metadata {
  const full = absoluteTitle ? title : `${title} — ${SITE_NAME}`
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: full,
      description,
      url: `${SITE_URL}${path === '/' ? '' : path}`,
      siteName: SITE_NAME,
      locale: 'en_GB',
      type,
    },
    twitter: { card: 'summary_large_image', title: full, description },
  }
}
