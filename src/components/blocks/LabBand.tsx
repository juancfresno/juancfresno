import { getSite } from '@/content/site'
import { localePath, type Locale } from '@/i18n/config'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import s from './labBand.module.scss'

// Work · band "{ Lab ↘" under the close (Figma 7014:18140): bg/subtle, a
// rule and the mono link to /lab, then reserved height (685 at 1680) for
// what Diseño puts there later. The global footer under it takes the same
// subtle theme (web/footer Theme=Light, html:has([data-foot='subtle'])).
export default function LabBand({ locale }: { locale: Locale }) {
  const { LAB_BAND } = getSite(locale)
  return (
    <section className={s.band} aria-label={LAB_BAND.label.replace(/[{↘]/g, '').trim()}>
      <ElasticLine className={s.rule} />
      <a className={s.link} href={localePath(locale, '/lab')}>{LAB_BAND.label}</a>
    </section>
  )
}
