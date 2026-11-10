import { getSite, getUi } from '@/content/site'
import type { Locale } from '@/i18n/config'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import CopyEmail from './CopyEmail'
import s from './close.module.scss'

// Short close at the end of a case, after the next case (v1/close Type=Case).
export default function CaseClose({ locale, nda }: { locale: Locale; nda?: boolean }) {
  const { CASE_CLOSE, CLOSE } = getSite(locale)
  return (
    <section className={s.caseClose} aria-label={getUi(locale).nav.links.contact}>
      <ElasticLine className={s.rule} />
      <p className={s.label}>{CLOSE.label}</p>
      <div className={s.caseRow}>
        <p className={s.caseCloseText}>{nda ? CASE_CLOSE.nda : CASE_CLOSE.text}</p>
        <CopyEmail size="md" />
      </div>
    </section>
  )
}
