import type { Metadata } from 'next'
import { GeistMono } from 'geist/font/mono'
import '@/styles/globals.scss'
import Nav from '@/components/layout/Nav/Nav'
import Footer from '@/components/layout/Footer/Footer'
import Grain from '@/components/ui/Grain/Grain'
import Cursor from '@/components/ui/Cursor/Cursor'
import SmoothScroll from '@/providers/SmoothScroll'
import PageTransitionProvider from '@/providers/PageTransition'

export const metadata: Metadata = {
  title: {
    template: '%s — Juan C. Fresno',
    default: 'Juan C. Fresno — Creative Developer & Designer',
  },
  description: 'Portfolio of Juan C. Fresno, creative developer and designer based in Valencia, Spain.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={GeistMono.variable}>
      <body>
        <SmoothScroll>
          <PageTransitionProvider>
            <Grain />
            <Cursor />
            <Nav />
            <main style={{ flex: 1 }}>{children}</main>
            <Footer />
          </PageTransitionProvider>
        </SmoothScroll>
      </body>
    </html>
  )
}
