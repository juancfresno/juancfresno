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
  async rewrites() {
    return [
      { source: '/medida/privacidad', destination: '/medida/privacidad/index.html' },
      { source: '/glyf/privacy', destination: '/glyf/privacy/index.html' },
    ]
  },
}

export default nextConfig
