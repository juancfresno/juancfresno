// Locale for server components: pages read it from params.lang.
import { notFound } from 'next/navigation'
import { isLocale, LOCALES, type Locale } from './config'

export type LangParams = { lang: string }

// Valid locale or 404 (anything else under app/[lang] is not a page).
export async function localeOf(params: Promise<LangParams> | LangParams): Promise<Locale> {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  return lang
}

export const localeParams = () => LOCALES.map((lang) => ({ lang }))
