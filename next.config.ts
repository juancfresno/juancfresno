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
      { source: '/projects/:slug', destination: '/work/:slug', permanent: true },
      { source: '/playground', destination: '/lab', permanent: true },
    ]
  },
  async rewrites() {
    return [
      { source: '/medida/privacidad', destination: '/medida/privacidad/index.html' },
      { source: '/glyf/privacy', destination: '/glyf/privacy/index.html' },
    ]
  },
}

export default nextConfig
