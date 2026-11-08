import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getUi } from '@/content/site'
import { isLocale, DEFAULT_LOCALE } from '@/i18n/config'

// Any unknown path under a locale → app/[lang]/not-found.tsx (inside the
// locale's root layout, so the 404 has nav, footer and the right language).
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  return { title: getUi(isLocale(lang) ? lang : DEFAULT_LOCALE).notFound.title, robots: { index: false, follow: true } }
}

export default function CatchAll() {
  notFound()
}
