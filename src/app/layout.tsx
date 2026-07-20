import type { Metadata } from 'next'
import { GeistMono } from 'geist/font/mono'
import localFont from 'next/font/local'
import { Analytics } from '@vercel/analytics/next'
import '@/styles/globals.scss'
import Nav from '@/components/layout/Nav/Nav'
import Footer from '@/components/layout/Footer/Footer'
import Grain from '@/components/ui/Grain/Grain'
import Cursor from '@/components/ui/Cursor/Cursor'
import SmoothScroll from '@/providers/SmoothScroll'
import PageTransitionProvider from '@/providers/PageTransition'

const switzer = localFont({
  variable: '--font-switzer',
  display: 'swap',
  src: [
    { path: '../fonts/switzer/switzer-light.woff2', weight: '300', style: 'normal' },
    { path: '../fonts/switzer/switzer-regular.woff2', weight: '400', style: 'normal' },
  ],
})

const SITE_URL = 'https://juancfresno.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: '%s — Juan C. Fresno',
    default: 'Juan C. Fresno — Creative Developer & Designer',
  },
  description: 'Portfolio of Juan C. Fresno, creative developer and designer based in Valencia, Spain.',
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
  jobTitle: 'Independent Product Designer & Digital Art Director',
  url: SITE_URL,
  sameAs: [
    'https://www.linkedin.com/in/juancfresno',
    'https://www.behance.net/juancfresno',
    'https://dribbble.com/my-playbook',
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
        <SmoothScroll>
          <PageTransitionProvider>
            <Grain />
            <Cursor />
            <Nav />
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</main>
            <Footer />
          </PageTransitionProvider>
        </SmoothScroll>
        <Analytics />
      </body>
    </html>
  )
}
