'use client'

import { PERSON_BASE } from '@/content/person'
import { useUi } from '@/i18n/client'
import Pending from '@/components/blocks/Pending'
import s from './close.module.scss'

// "Book a 15-min call ↗": a real link once PERSON.callUrl exists, until then
// the label with a <Pending /> tag.
export default function CallLink({ label }: { label: string }) {
  const ui = useUi()
  if (PERSON_BASE.callUrl) {
    return <a className={s.call} href={PERSON_BASE.callUrl} target="_blank" rel="noopener noreferrer" data-no-transition>{label}</a>
  }
  return <span className={s.call} aria-disabled="true">{label}<Pending>{ui.pending.call}</Pending></span>
}
