import type { MetadataRoute } from 'next'

const SITE_URL = 'https://juancfresno.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/about', '/projects', '/playground', '/contact']

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
  }))
}
