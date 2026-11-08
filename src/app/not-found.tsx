import type { Metadata } from 'next'
import Link from 'next/link'
import { META, NOT_FOUND } from '@/content/site'
import v from '@/components/blocks/v0.module.scss'
import n from '@/components/blocks/notFound.module.scss'

export const metadata: Metadata = {
  title: META.notFound.title,
  robots: { index: false, follow: true },
}

// 404 (copy doc): one dry line and two ways out.
export default function NotFound() {
  return (
    <div className={v.page}>
      <section className={n.wrap}>
        <h1 className={n.title}>{NOT_FOUND.title}</h1>
        <p className={n.line}>{NOT_FOUND.line}</p>
        <p className={n.links}>
          <Link href="/" className={v.label}>{NOT_FOUND.home}</Link>
          <Link href="/work" className={v.label}>{NOT_FOUND.work}</Link>
        </p>
      </section>
    </div>
  )
}
