import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo'
import { getSite, getUi } from '@/content/site'
import { localeOf, type LangParams } from '@/i18n/server'
import ContactBlock from '@/components/blocks/ContactBlock'
import Pending from '@/components/blocks/Pending'
import v from '@/components/blocks/v0.module.scss'
import n from '@/components/blocks/notFound.module.scss'

type Props = { params: Promise<LangParams> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = await localeOf(params)
  const { META } = getSite(l)
  return pageMeta({ locale: l, path: '/journal', title: META.journal.title, description: META.journal.description })
}

// Placeholder: intro from the copy doc; entries and layout come later.
export default async function JournalPage({ params }: Props) {
  const l = await localeOf(params)
  const { INTROS } = getSite(l)
  const ui = getUi(l)
  return (
    <div className={v.page}>
      <section className={n.wrap}>
        <h1 className={n.title} style={{ fontSize: 'clamp(3rem, 9vw, 9rem)' }}>{ui.journal.h1}</h1>
        <p className={n.line}>{INTROS.journal} <Pending>{ui.pending.entries}</Pending></p>
      </section>
      <ContactBlock locale={l} />
    </div>
  )
}
