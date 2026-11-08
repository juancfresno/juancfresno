'use client'

import { useState } from 'react'
import s from './about.module.scss'

// "View: Both · Professional · Personal" (Figma About v1.0, 6888:1169).
// Both = the two views side by side with a 1 px divider (stacked on mobile);
// the other two show one. Both panes are always in the HTML; the hidden one
// gets `hidden`, so search engines and screen readers still have both.
type View = 'both' | 'professional' | 'personal'
const VIEWS: { id: View; label: string }[] = [
  { id: 'both', label: 'Both' },
  { id: 'professional', label: 'Professional' },
  { id: 'personal', label: 'Personal' },
]

export default function AboutViews({ title, professional, personal }: { title: React.ReactNode; professional: React.ReactNode; personal: React.ReactNode }) {
  const [view, setView] = useState<View>('both')

  return (
    <>
      <div className={s.heroRow}>
        {title}
        <div className={s.toggle} role="group" aria-label="About view">
          <span className={s.toggleLabel}>View</span>
          {VIEWS.map((x) => (
            <button key={x.id} type="button" aria-pressed={view === x.id} onClick={() => setView(x.id)}>{x.label}</button>
          ))}
        </div>
      </div>
      <div className={s.split} data-view={view}>
        <div id="about-professional" className={s.pane} hidden={view === 'personal'}>{professional}</div>
        <span className={s.splitDivider} aria-hidden="true" hidden={view !== 'both'} />
        <div id="about-personal" className={`${s.pane} ${s.panePersonal}`} hidden={view === 'professional'}>{personal}</div>
      </div>
    </>
  )
}
