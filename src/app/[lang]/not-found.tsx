'use client'

import Link from 'next/link'
import { getSite } from '@/content/site'
import { useHref, useLocale, useUi } from '@/i18n/client'
import v from '@/components/blocks/v0.module.scss'
import n from '@/components/blocks/notFound.module.scss'

// 404 — Figma 6889:1541: thin "404", the copy line, two links and dashed
// boxes labelled like the site transition, as if the page had been cut.
// Client component: not-found files get no params, the locale comes from the
// layout's provider. Title per locale: [...rest]/page.tsx (Next adds noindex).
export default function NotFound() {
  const l = useLocale()
  const ui = useUi()
  const href = useHref()
  const { NOT_FOUND } = getSite(l)
  const cut = ui.notFound.cut
  return (
    <div className={v.page}>
      <section className={n.wrap}>
        <div className={n.top}>
          <h1 className={n.title}>{NOT_FOUND.title}</h1>
          <div className={n.cuts} aria-hidden="true">
            <span style={{ height: '50%' }}><em>IMG 16:9 · {cut}</em></span>
            <span style={{ height: '9%', width: '82%' }}><em>H2 · 40 · {cut}</em></span>
            <span style={{ height: '5%', width: '61%' }}><em>P · 18 · {cut}</em></span>
            <span style={{ height: '5%' }}><em>P · 18 · {cut}</em></span>
          </div>
        </div>
        <p className={n.line}>{NOT_FOUND.line}</p>
        <p className={n.links}>
          <Link href={href('/')} className={v.label}>{NOT_FOUND.home}</Link>
          <Link href={href('/work')} className={v.label}>{NOT_FOUND.work}</Link>
        </p>
      </section>
    </div>
  )
}
