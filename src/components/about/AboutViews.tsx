'use client'

import { useState } from 'react'
import clsx from 'clsx'
import v from '@/components/blocks/v0.module.scss'
import s from './about.module.scss'

// Professional / Personal split (an idea from Naiara Odriozola's site, made
// ours): the same segmented toggle as Work and Feed swaps the text and the
// photo. Both views are always in the HTML (the hidden one with `hidden`), so
// search engines and screen readers get both.
type View = 'professional' | 'personal'

export default function AboutViews({ professional, personal, photoPro, photoPersonal }: {
  professional: React.ReactNode
  personal: React.ReactNode
  photoPro: React.ReactNode
  photoPersonal: React.ReactNode
}) {
  const [view, setView] = useState<View>('professional')

  return (
    <div className={s.views} data-view={view}>
      <div className={s.viewsBar}>
        <div className={v.segmented} role="group" aria-label="About view">
          <span>View:</span>
          <span className={v.segment}>
            <button type="button" aria-pressed={view === 'professional'} aria-controls="about-professional" onClick={() => setView('professional')}>Professional</button>
            <button type="button" aria-pressed={view === 'personal'} aria-controls="about-personal" onClick={() => setView('personal')}>Personal</button>
          </span>
        </div>
      </div>
      <div className={s.viewsGrid}>
        <div className={s.viewsPhoto} aria-hidden={false}>
          <div className={clsx(s.photoLayer, view === 'professional' && s.photoOn)}>{photoPro}</div>
          <div className={clsx(s.photoLayer, view === 'personal' && s.photoOn)}>{photoPersonal}</div>
        </div>
        <div className={s.viewsText}>
          <div id="about-professional" className={s.viewPane} hidden={view !== 'professional'}>{professional}</div>
          <div id="about-personal" className={s.viewPane} hidden={view !== 'personal'}>{personal}</div>
        </div>
      </div>
    </div>
  )
}
