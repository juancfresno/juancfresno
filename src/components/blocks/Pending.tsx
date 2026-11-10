'use client'

import { useUi } from '@/i18n/client'
import s from './blocks.module.scss'

// Marks copy that is still a placeholder, so gaps are visible on the preview.
// Mirrors Figma v1/pending (6878:85): dashed 1 px, mono 9, "Pending · <what>"
// ("Pendiente · …" in Spanish; callers pass `what` from getUi(l).pending).
export default function Pending({ children }: { children?: React.ReactNode }) {
  const ui = useUi()
  return <span className={s.pending}>{ui.pending.word}{children ? <> · {children}</> : null}</span>
}
