import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo'
import { INTROS, META } from '@/content/site'
import ContactBlock from '@/components/blocks/ContactBlock'
import Pending from '@/components/blocks/Pending'
import v from '@/components/blocks/v0.module.scss'
import n from '@/components/blocks/notFound.module.scss'

export const metadata: Metadata = pageMeta({ path: '/journal', title: META.journal.title, description: META.journal.description })

// Placeholder: intro from the copy doc; entries and layout come later.
export default function JournalPage() {
  return (
    <div className={v.page}>
      <section className={n.wrap}>
        <h1 className={n.title} style={{ fontSize: 'clamp(3rem, 9vw, 9rem)' }}>Journal</h1>
        <p className={n.line}>{INTROS.journal} <Pending>entries</Pending></p>
      </section>
      <ContactBlock />
    </div>
  )
}
