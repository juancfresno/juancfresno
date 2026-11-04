import type { Metadata } from 'next'
import { GeistMono } from 'geist/font/mono'
import localFont from 'next/font/local'
import { Analytics } from '@vercel/analytics/next'
import '@/styles/globals.scss'
import Nav from '@/components/layout/Nav/Nav'
import Footer from '@/components/layout/Footer/Footer'
import PageTransitionProvider from '@/providers/PageTransition'
import { SITE_URL } from '@/lib/site'

const switzer = localFont({
  variable: '--font-switzer',
  display: 'swap',
  src: [
    { path: '../fonts/switzer/switzer-light.woff2', weight: '300', style: 'normal' },
    { path: '../fonts/switzer/switzer-regular.woff2', weight: '400', style: 'normal' },
  ],
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: '%s — Juan C. Fresno',
    default: 'Juan C. Fresno — Independent Art Director & Interactive Designer',
  },
  description: 'Juan C. Fresno, independent art director and interactive designer for studios and brands. Valencia, Spain.',
  openGraph: {
    siteName: 'Juan C. Fresno',
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Juan C. Fresno',
  jobTitle: 'Independent Art Director & Interactive Designer',
  url: SITE_URL,
  sameAs: [
    'https://www.linkedin.com/in/juancfresno',
    'https://www.behance.net/juancfresno',
    'https://dribbble.com/JuanCFresno',
    'https://instagram.com/juanc.fresno',
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${GeistMono.variable} ${switzer.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <PageTransitionProvider>
          <Nav />
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</main>
          <Footer />
        </PageTransitionProvider>
        <Analytics />
      </body>
    </html>
  )
}
