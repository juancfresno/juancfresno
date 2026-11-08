// UI strings per locale (i18n/ui.en.ts, i18n/ui.es.ts). Kept apart from
// site.ts so client components don't pull the page copy into their bundle.
import type { Locale } from '@/i18n/config'
import { UI_EN, type UiDict } from './i18n/ui.en'
import { UI_ES } from './i18n/ui.es'

const UIS: Record<Locale, UiDict> = { en: UI_EN, es: UI_ES }
export const getUi = (l: Locale): UiDict => UIS[l]
export type { UiDict }
