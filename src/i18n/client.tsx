'use client'

// Locale for client components: set once by app/[lang]/layout.tsx.
import { createContext, useContext, type ReactNode } from 'react'
import { DEFAULT_LOCALE, localePath, type Locale } from './config'
import { getUi } from '@/content/ui'

const Ctx = createContext<Locale>(DEFAULT_LOCALE)

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>
}

export const useLocale = () => useContext(Ctx)
export const useUi = () => getUi(useContext(Ctx))
// Internal path → public URL in the current locale.
export function useHref() {
  const l = useContext(Ctx)
  return (path: string) => localePath(l, path)
}
