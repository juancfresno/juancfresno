import type { MetadataRoute } from 'next'
import { EXPERIMENT_SLUGS } from '@/content/site'
import { CASE_PROJECT_SLUGS } from '@/content/cases'
import { LOCALES } from '@/i18n/config'
import { absoluteUrl, languageAlternates } from '@/lib/seo'
import { WIP } from '@/lib/wip'

// Both languages of every page, each with its hreflang alternates
// (xhtml:link) and x-default → English.
export default function sitemap(): MetadataRoute.Sitemap {
  // WIP landing (lib/wip.ts): only / and /es exist.
  const routes = WIP ? ['/'] : ['/', '/about', '/work', '/feed', '/lab', '/journal', '/contact', ...EXPERIMENT_SLUGS.map((s) => `/lab/${s}`), ...CASE_PROJECT_SLUGS.map((s) => `/work/${s}`)]

  return routes.flatMap((route) =>
    LOCALES.map((l) => ({
      url: absoluteUrl(l, route),
      alternates: { languages: languageAlternates(route) },
    })),
  )
}
