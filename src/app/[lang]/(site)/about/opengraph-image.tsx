import { defaultOg, OG_SIZE, OG_TYPE } from '@/lib/og'
import { isLocale, DEFAULT_LOCALE } from '@/i18n/config'
import { localeParams } from '@/i18n/server'

// Default card (per language). Pages that set their own openGraph object
// don't inherit the parent's file-based image, so each section has one.
export const alt = 'Juan C. Fresno — Independent Art Director & Interactive Designer'
export const size = OG_SIZE
export const contentType = OG_TYPE
export const generateStaticParams = localeParams

export default async function OpengraphImage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  return defaultOg(isLocale(lang) ? lang : DEFAULT_LOCALE)
}
