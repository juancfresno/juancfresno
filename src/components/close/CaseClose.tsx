import { CASE_CLOSE, CLOSE } from '@/content/site'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import CopyEmail from './CopyEmail'
import s from './close.module.scss'

// Short close at the end of a case, after the next case (v1/close Type=Case).
export default function CaseClose({ nda }: { nda?: boolean }) {
  return (
    <section className={s.caseClose} aria-label="Contact">
      <ElasticLine className={s.rule} />
      <p className={s.label}>{CLOSE.label}</p>
      <div className={s.caseRow}>
        <p className={s.caseCloseText}>{nda ? CASE_CLOSE.nda : CASE_CLOSE.text.replace('? ', '?\n')}</p>
        <CopyEmail size="md" />
      </div>
    </section>
  )
}
