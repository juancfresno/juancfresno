import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'
import { IS_INDEXABLE } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  // Vercel previews: block everything (plus X-Robots-Tag in next.config.ts).
  if (!IS_INDEXABLE) return { rules: { userAgent: '*', disallow: '/' } }
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
