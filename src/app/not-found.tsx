import type { Metadata } from 'next'
import Link from 'next/link'
import { META, NOT_FOUND } from '@/content/site'
import v from '@/components/blocks/v0.module.scss'
import n from '@/components/blocks/notFound.module.scss'

export const metadata: Metadata = {
  title: META.notFound.title,
  robots: { index: false, follow: true },
}

// 404 — Figma 6889:1541: thin "404", the copy line, two links and dashed
// boxes labelled like the site transition, as if the page had been cut.
export default function NotFound() {
  return (
    <div className={v.page}>
      <section className={n.wrap}>
        <div className={n.top}>
          <h1 className={n.title}>{NOT_FOUND.title}</h1>
          <div className={n.cuts} aria-hidden="true">
            <span style={{ height: '50%' }}><em>IMG 16:9 · cut</em></span>
            <span style={{ height: '9%', width: '82%' }}><em>H2 · 40 · cut</em></span>
            <span style={{ height: '5%', width: '61%' }}><em>P · 18 · cut</em></span>
            <span style={{ height: '5%' }}><em>P · 18 · cut</em></span>
          </div>
        </div>
        <p className={n.line}>{NOT_FOUND.line}</p>
        <p className={n.links}>
          <Link href="/" className={v.label}>{NOT_FOUND.home}</Link>
          <Link href="/work" className={v.label}>{NOT_FOUND.work}</Link>
        </p>
      </section>
    </div>
  )
}
