import type { Metadata } from 'next'
import { Fragment_Mono } from 'next/font/google'
import localFont from 'next/font/local'
import { Analytics } from '@vercel/analytics/next'
import '@/styles/globals.scss'
import Nav from '@/components/layout/Nav/Nav'
import Footer from '@/components/layout/Footer/Footer'
import GridOverlay from '@/components/ui/GridOverlay/GridOverlay'
import Shortcuts from '@/components/ui/Shortcuts/Shortcuts'
import SocialPreview from '@/components/ui/SocialPreview/SocialPreview'
import PageTransitionProvider from '@/providers/PageTransition'
import { SITE_URL } from '@/lib/site'

// UI mono: Fragment Mono (one weight, 400 + italic). Body: Switzer.
const fragmentMono = Fragment_Mono({
  variable: '--font-fragment-mono',
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
})

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
  description: 'Independent Art Director & Interactive Designer based in Valencia. 15+ years shaping digital products, brands and websites.',
  openGraph: {
    siteName: 'Juan C. Fresno',
    locale: 'en_GB',
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
  email: 'mailto:hello@juancfresno.com',
  address: { '@type': 'PostalAddress', addressLocality: 'Valencia', addressCountry: 'ES' },
  sameAs: [
    'https://www.linkedin.com/in/juancfresno',
    'https://www.behance.net/juancfresno',
    'https://dribbble.com/JuanCFresno',
    'https://instagram.com/juanc.fresno',
    'https://x.com/JuanCFresno',
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${fragmentMono.variable} ${switzer.variable}`}>
      <head>
        {/* Theme before paint: saved choice, else dark (brand default). */}
        <script
          dangerouslySetInnerHTML={{
            __html: "try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}",
          }}
        />
      </head>
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
        <GridOverlay />
        <Shortcuts />
        <SocialPreview />
        <Analytics />
      </body>
    </html>
  )
}
