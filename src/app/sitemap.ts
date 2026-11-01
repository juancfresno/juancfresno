import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/about', '/projects', '/playground', '/contact']

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
  }))
}
