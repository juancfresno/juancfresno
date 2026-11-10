import type { Metadata, Viewport } from 'next'
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
import { IS_INDEXABLE } from '@/lib/seo'
import { personJsonLd } from '@/lib/jsonld'
import { HTML_LANG, LOCALES, OG_LOCALE, isLocale, DEFAULT_LOCALE, type Locale } from '@/i18n/config'
import { LocaleProvider } from '@/i18n/client'
import { getSite, getUi } from '@/content/site'
import { LANG_SWITCH_SCRIPT } from '@/providers/langSwitch'
import { WIP } from '@/lib/wip'
import { WIP_INTRO_SCRIPT } from '@/components/wip/introScript'

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
    { path: '../../fonts/switzer/switzer-light.woff2', weight: '300', style: 'normal' },
    { path: '../../fonts/switzer/switzer-regular.woff2', weight: '400', style: 'normal' },
  ],
})

// viewport-fit=cover so env(safe-area-inset-*) reaches the CSS (tab bar, feed HUD).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

// Root layout per locale: app/[lang] (en is served at / by src/proxy.ts).
export const generateStaticParams = () => LOCALES.map((lang) => ({ lang }))

type Props = { children: React.ReactNode; params: Promise<{ lang: string }> }

// Unknown values only reach here through paths the proxy skips (e.g. a
// missing file with a dot): render in English and let the page 404.
const pick = (lang: string): Locale => (isLocale(lang) ? lang : DEFAULT_LOCALE)

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const l = pick((await params).lang)
  const { META } = getSite(l)
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      template: '%s — Juan C. Fresno',
      default: META.home.title,
    },
    description: META.home.description,
    openGraph: {
      siteName: 'Juan C. Fresno',
      locale: OG_LOCALE[l],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
    },
    // Vercel previews: noindex (production and local builds stay indexable).
    ...(IS_INDEXABLE ? {} : { robots: { index: false, follow: false } }),
  }
}

export default async function RootLayout({ children, params }: Props) {
  const l = pick((await params).lang)
  const ui = getUi(l)
  return (
    <html lang={HTML_LANG[l]} data-wip={WIP ? '' : undefined} suppressHydrationWarning className={`${fragmentMono.variable} ${switzer.variable}`}>
      <head>
        {/* Theme before paint: saved choice, else dark (brand default). WIP: dark. */}
        <script
          dangerouslySetInnerHTML={{
            __html: WIP
              ? "document.documentElement.dataset.theme='dark'" // WIP landing: always dark, no toggle
              : "try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}",
          }}
        />
        {/* Language switch: keep the new page hidden until the transition reveals it. */}
        <script dangerouslySetInnerHTML={{ __html: LANG_SWITCH_SCRIPT }} />
        {/* WIP landing intro: full / fast / reduced, before paint. */}
        {WIP && <script dangerouslySetInnerHTML={{ __html: WIP_INTRO_SCRIPT }} />}
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd(l)) }}
        />
        <LocaleProvider locale={l}>
          <a href="#content" className="skip-link" data-no-transition>{ui.skip}</a>
          <PageTransitionProvider>
            <Nav />
            <main id="content" tabIndex={-1} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</main>
            <Footer />
          </PageTransitionProvider>
          <GridOverlay />
          <Shortcuts />
          <SocialPreview />
        </LocaleProvider>
        <Analytics />
      </body>
    </html>
  )
}
