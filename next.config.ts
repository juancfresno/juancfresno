import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  sassOptions: {
    includePaths: ['./src/styles'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.cdninstagram.com' },
      { protocol: 'https', hostname: '**.fbcdn.net' },
      { protocol: 'https', hostname: 'cdn.dribbble.com' },
    ],
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
