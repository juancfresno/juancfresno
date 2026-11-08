import { PERSON } from '@/content/site'
import Pending from '@/components/blocks/Pending'
import s from './close.module.scss'

// "Book a 15-min call ↗": a real link once PERSON.callUrl exists, until then
// the label with a <Pending /> tag.
export default function CallLink({ label }: { label: string }) {
  if (PERSON.callUrl) {
    return <a className={s.call} href={PERSON.callUrl} target="_blank" rel="noopener noreferrer" data-no-transition>{label}</a>
  }
  return <span className={s.call} aria-disabled="true">{label}<Pending>call link</Pending></span>
}
