import { CASE_CLOSE } from '@/content/site'
import CopyEmail from './CopyEmail'
import s from './close.module.scss'

// Short close at the end of a case, after the next case.
export default function CaseClose({ nda }: { nda?: boolean }) {
  return (
    <section className={s.caseClose} aria-label="Contact">
      <p className={s.caseCloseText}>{nda ? CASE_CLOSE.nda : CASE_CLOSE.text}</p>
      <CopyEmail size="md" />
    </section>
  )
}
