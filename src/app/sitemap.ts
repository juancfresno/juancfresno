import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'
import { EXPERIMENTS } from '@/content/site'
import { CASE_PROJECTS } from '@/content/cases'

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/about', '/work', '/feed', '/lab', '/journal', '/contact', ...EXPERIMENTS.map((e) => `/lab/${e.slug}`), ...CASE_PROJECTS.map((p) => `/work/${p.slug}`)]

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
  }))
}
