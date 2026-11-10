import { getUi } from '@/content/ui'
import NavClock from '@/components/ui/NavClock/NavClock'
import type { Locale } from '@/i18n/config'
import s from './wip.module.scss'

// Status line under the contact copy: pulsing G-orange dot + live Valencia time.
export default function Availability({ locale }: { locale: Locale }) {
  const ui = getUi(locale)
  return (
    <p className={`${s.disciplines} ${s.availability}`} data-wire="P · 11 MONO" data-wire-text="">
      <i className={s.dot} aria-hidden="true" />
      <span>{ui.wip.available} · <NavClock zone={false} /></span>
    </p>
  )
}
