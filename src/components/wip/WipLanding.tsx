import { getSite } from '@/content/site'
import { FEED, FEED_SELECTED } from '@/content/feed'
import { PERSON_BASE } from '@/content/person'
import type { Locale } from '@/i18n/config'
import HeadlineCycle from '@/components/home/HeadlineCycle'
import { headlineCycle } from '@/content/headline'
import CursorTrail, { type TrailItem } from './trail/CursorTrail'
import Grain from './Grain'
import TrailHint from './TrailHint'
import s from './wip.module.scss'

// Temporary landing while v1.0 is finished (lib/wip.ts). Figma "Home · v0"
// (6944:8590): two-line greeting + role, disciplines in mono, two-line intro,
// the contact line with the email, the cursor image trail with its resting
// hint, and an animated grain over everything. Copy: WIP in site.*.ts.
// The feed manifest already leaves out duplicates and Biako (build-media);
// ids are de-duplicated again here, and the trail uses the 600 px thumbnails.
export default function WipLanding({ locale }: { locale: Locale }) {
  const { WIP } = getSite(locale)
  const email = PERSON_BASE.email
  const seen = new Set<string>()
  const items: TrailItem[] = []
  for (const it of FEED) {
    if (seen.has(it.id)) continue
    seen.add(it.id)
    items.push({ src: `/feed/t/${it.id}.webp`, r: +(it.w / it.h).toFixed(3) })
  }

  return (
    <div className={s.page}>
      <CursorTrail items={items} canvasItems={FEED_SELECTED} />
      <Grain />
      <header className={s.hero}>
        <h1 className={s.head}>
          <HeadlineCycle lines={headlineCycle({ lang: locale, a: WIP.line1, b: WIP.title })} aClass={s.name} bClass={s.title} />
        </h1>
        <p className={s.disciplines}>{WIP.disciplines}</p>
        <p className={s.intro}>
          {WIP.intro[0]}
          <br />
          {WIP.intro[1]}
        </p>
        <p className={s.contact}>
          {WIP.contact} <a className={s.email} href={`mailto:${email}`}>{email}</a>
        </p>
      </header>
      <TrailHint mouse={WIP.hint.mouse} touch={WIP.hint.touch} />
    </div>
  )
}
