import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo'
import { PERSON_BASE as PERSON, getUi } from '@/content/site'
import { localeOf, type LangParams } from '@/i18n/server'
import Pending from '@/components/blocks/Pending'
import v from '@/components/blocks/v0.module.scss'
import n from '@/components/blocks/notFound.module.scss'

type Props = { params: Promise<LangParams> }

// Aviso legal (LSSI-CE, art. 10): owner, tax ID, address, contact. Skeleton:
// Juan fills the <Pending> fields; text to be reviewed before publishing.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = await localeOf(params)
  const t = getUi(l).legal
  return {
    ...pageMeta({ locale: l, path: '/legal', title: t.title, description: t.description(PERSON.name) }),
    robots: { index: false, follow: true },
  }
}

export default async function LegalPage({ params }: Props) {
  const l = await localeOf(params)
  const ui = getUi(l)
  const t = ui.legal
  return (
    <div className={v.page}>
      <section className={n.wrap}>
        <h1 className={n.title} style={{ fontSize: 'clamp(3rem, 9vw, 9rem)' }}>{t.h1}</h1>
        <div className={n.line} style={{ display: 'grid', gap: '1.5em', maxWidth: '48rem' }}>
          <p>{t.law}</p>
          <p>
            {t.owner}: <Pending>{ui.pending.legalName}</Pending>{t.trading(PERSON.name)}<br />
            {t.nif}: <Pending>{ui.pending.nif}</Pending><br />
            {t.address}: <Pending>{ui.pending.address}</Pending><br />
            {t.email}: <a href={`mailto:${PERSON.email}`}>{PERSON.email}</a><br />
            {t.activity}
          </p>
          <p>{t.hosting}</p>
          <p>
            {t.privacy} <Pending>{ui.pending.legalReview}</Pending>
          </p>
        </div>
      </section>
    </div>
  )
}
