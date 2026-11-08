import { getSite, getUi } from '@/content/site'
import { FEED } from '@/content/feed'
import type { Locale } from '@/i18n/config'
import HelloCycle from '@/components/home/HelloCycle'
import CursorTrail, { type TrailItem } from './CursorTrail'
import h from '@/components/home/home.module.scss'
import s from './wip.module.scss'

// Temporary landing while v1.0 is finished (lib/wip.ts). The v1 home hero
// (Hello cycle, role, disciplines, meta + intro ending in the signature), a
// dashed "work in progress" tag, and a cursor trail of the social feed.
// The feed manifest already leaves out duplicates and Biako (build-media);
// ids are de-duplicated again here, and the trail uses the 600 px thumbnails.
export default function WipLanding({ locale }: { locale: Locale }) {
  const { HOME } = getSite(locale)
  const ui = getUi(locale)
  const intro = HOME.intro.replace(HOME.signature, '').trim()
  const seen = new Set<string>()
  const items: TrailItem[] = []
  for (const it of FEED) {
    if (seen.has(it.id)) continue
    seen.add(it.id)
    items.push({ src: `/feed/t/${it.id}.webp`, r: +(it.w / it.h).toFixed(3) })
  }

  return (
    <div className={s.page}>
      <CursorTrail items={items} />
      <header className={`${h.hero} ${s.hero}`}>
        <p className={s.tag}>
          <span className={s.dot} aria-hidden="true" />
          {ui.wip.tag}
        </p>
        <h1 className={h.heroHead}>
          <span className={h.name}>
            <HelloCycle words={HOME.greetings} /> {HOME.nameLine}
          </span>
          <span className={h.srOnly}> — </span>
          <span className={h.title}>{HOME.title}</span>
        </h1>
        <p className={h.disciplines}>
          {HOME.disciplines.map((d, i) => (
            <span key={d}><span className={h.disc}>{d}{i < HOME.disciplines.length - 1 && <span className={h.dash}> —</span>}</span>{' '}</span>
          ))}
        </p>
        <div className={`${h.introRow} ${s.introRow}`}>
          <div className={h.meta}>{HOME.meta.map((x) => <p key={x}>{x}</p>)}</div>
          <p className={h.intro}>{intro} <span className={h.signature}>{HOME.signature}</span></p>
        </div>
      </header>
    </div>
  )
}
