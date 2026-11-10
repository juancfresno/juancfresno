import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  sassOptions: {
    includePaths: ['./src/styles'],
  },
  async redirects() {
    return [
      // juancfresno.vercel.app is the production alias and served a full duplicate
      // of the site. Send it permanently to the canonical domain. Only this exact
      // host matches — preview deployment URLs are unaffected.
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'juancfresno.vercel.app' }],
        destination: 'https://www.juancfresno.com/:path*',
        permanent: true,
      },
      // v2 sections: Projects → Work, Playground → Lab.
      { source: '/projects', destination: '/work', permanent: true },
      { source: '/projects/:slug(bbva|la-liga|acciona|coca-cola|iberdrola|repsol|telefonica|vodafone)', destination: '/work', permanent: true },
      { source: '/projects/:slug', destination: '/work/:slug', permanent: true },
      { source: '/playground', destination: '/lab', permanent: true },
      // Same redirects under the Spanish prefix (/es/…).
      { source: '/es/projects', destination: '/es/work', permanent: true },
      { source: '/es/projects/:slug(bbva|la-liga|acciona|coca-cola|iberdrola|repsol|telefonica|vodafone)', destination: '/es/work', permanent: true },
      { source: '/es/projects/:slug', destination: '/es/work/:slug', permanent: true },
      { source: '/es/playground', destination: '/es/lab', permanent: true },
      { source: '/es/work/:slug(bbva|la-liga|acciona|coca-cola|iberdrola|repsol|telefonica|vodafone)', destination: '/es/work', permanent: true },
      // Old v1 home variant and placeholder case pages removed in v2.
      { source: '/index2', destination: '/', permanent: true },
      { source: '/work/:slug(bbva|la-liga|acciona|coca-cola|iberdrola|repsol|telefonica|vodafone)', destination: '/work', permanent: true },
    ]
  },
  async headers() {
    // Vercel preview deployments must never be indexed. Vercel already sends
    // X-Robots-Tag: noindex on preview URLs; this guard makes it explicit.
    // Production (VERCEL_ENV=production) and local builds send nothing.
    const env = process.env.VERCEL_ENV
    if (!env || env === 'production') return []
    return [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }]
  },
  async rewrites() {
    return [
      { source: '/medida/privacidad', destination: '/medida/privacidad/index.html' },
      { source: '/glyf/privacy', destination: '/glyf/privacy/index.html' },
    ]
  },
}

export default nextConfig
