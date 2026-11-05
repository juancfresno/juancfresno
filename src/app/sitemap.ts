import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'
import { EXPERIMENTS } from '@/content/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/about', '/work', '/feed', '/lab', '/journal', '/contact', ...EXPERIMENTS.map((e) => `/lab/${e.slug}`)]

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
  }))
}
