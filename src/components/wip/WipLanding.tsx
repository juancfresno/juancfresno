import type { CSSProperties } from 'react'
import { getSite } from '@/content/site'
import { FEED, FEED_SELECTED } from '@/content/feed'
import { PERSON_BASE } from '@/content/person'
import { headlineCycle } from '@/content/headline'
import type { Locale } from '@/i18n/config'
import HeadlineCycle from '@/components/home/HeadlineCycle'
import Backdrop from './Backdrop'
import type { TrailItem } from './trail/deck'
import EmailLink from './EmailLink'
import Grain from './Grain'
import Intro from './Intro'
import s from './wip.module.scss'

// Temporary landing while v1.0 is finished (lib/wip.ts). Figma "Home · v0"
// (6944:8590): greeting line (cycles languages with a decode on hover) +
// fixed role, mono disciplines, two-line intro, contact line with the email.
// Behind it the feed plane (Backdrop: ?bg= / ?trail= compare in previews),
// grain over everything, and the entrance (Intro + [data-in] delays).
// Copy: WIP in site.*.ts; the greeting in other languages in content/headline.
const d = (ms: number) => ({ '--in-d': `${ms}ms` }) as CSSProperties

export default function WipLanding({ locale }: { locale: Locale }) {
  const { WIP } = getSite(locale)
  const email = PERSON_BASE.email
  const seen = new Set<string>()
  const trail: TrailItem[] = []
  for (const it of FEED) {
    if (seen.has(it.id)) continue
    seen.add(it.id)
    trail.push({ src: `/feed/t/${it.id}.webp`, r: +(it.w / it.h).toFixed(3) })
  }

  return (
    <div className={s.page}>
      <Intro />
      <Backdrop feed={FEED_SELECTED} trail={trail} hint={WIP.hint} />
      <Grain />
      <header className={s.hero}>
        <h1 className={s.head}>
          <HeadlineCycle lines={headlineCycle({ lang: locale, a: WIP.line1 })} className={s.name} />
          <span className={`${s.mask} ${s.titleMask}`} data-wire="" data-wire-text="">
            <span className={s.title} data-in="mask" style={d(280)}>{WIP.title}</span>
          </span>
        </h1>
        <p className={`${s.disciplines} ${s.mask}`} data-wire="" data-wire-text="">
          <span data-in="mask" style={d(220)}>{WIP.disciplines}</span>
        </p>
        <p className={s.intro}>
          <span className={s.mask} data-wire="" data-wire-text=""><span data-in="mask" style={d(280)}>{WIP.intro[0]}</span></span>
          <span className={s.mask} data-wire="" data-wire-text=""><span data-in="mask" style={d(340)}>{WIP.intro[1]}</span></span>
        </p>
        <p className={`${s.contact} ${s.mask}`} data-wire="P · 18 · MAILTO" data-wire-text="">
          <span data-in="mask" style={d(400)}>
            {WIP.contact} <EmailLink email={email} />
          </span>
        </p>
      </header>
    </div>
  )
}
