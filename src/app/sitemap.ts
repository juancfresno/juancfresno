import type { MetadataRoute } from 'next'
import { EXPERIMENT_SLUGS } from '@/content/site'
import { CASE_PROJECT_SLUGS } from '@/content/cases'
import { LOCALES } from '@/i18n/config'
import { absoluteUrl, languageAlternates } from '@/lib/seo'

// Both languages of every page, each with its hreflang alternates
// (xhtml:link) and x-default → English.
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['/', '/about', '/work', '/feed', '/lab', '/journal', '/contact', ...EXPERIMENT_SLUGS.map((s) => `/lab/${s}`), ...CASE_PROJECT_SLUGS.map((s) => `/work/${s}`)]

  return routes.flatMap((route) =>
    LOCALES.map((l) => ({
      url: absoluteUrl(l, route),
      alternates: { languages: languageAlternates(route) },
    })),
  )
}
