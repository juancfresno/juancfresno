import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo'
import { PERSON } from '@/content/site'
import Pending from '@/components/blocks/Pending'
import v from '@/components/blocks/v0.module.scss'
import n from '@/components/blocks/notFound.module.scss'

// Aviso legal (LSSI-CE, art. 10): owner, tax ID, address, contact. Skeleton:
// Juan fills the <Pending> fields; text to be reviewed before publishing.
export const metadata: Metadata = {
  ...pageMeta({ path: '/legal', title: 'Legal notice', description: `Legal notice (aviso legal) and privacy for juancfresno.com, the website of ${PERSON.name}.` }),
  robots: { index: false, follow: true },
}

export default function LegalPage() {
  return (
    <div className={v.page}>
      <section className={n.wrap}>
        <h1 className={n.title} style={{ fontSize: 'clamp(3rem, 9vw, 9rem)' }}>Legal</h1>
        <div className={n.line} style={{ display: 'grid', gap: '1.5em', maxWidth: '48rem' }}>
          <p>
            Legal notice (aviso legal) under Spanish Law 34/2002 (LSSI-CE).
          </p>
          <p>
            Owner: <Pending>full legal name</Pending>, trading as {PERSON.name}.<br />
            NIF: <Pending>NIF</Pending><br />
            Address: <Pending>tax address</Pending><br />
            Email: <a href={`mailto:${PERSON.email}`}>{PERSON.email}</a><br />
            Activity: independent art direction and design services.
          </p>
          <p>
            Hosting: Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA.
          </p>
          <p>
            Privacy and cookies: this site sets no tracking or advertising cookies. Visits are measured with Vercel Web Analytics, which is cookieless and does not store personal data. If you write to me, I use your email only to reply. <Pending>legal review</Pending>
          </p>
        </div>
      </section>
    </div>
  )
}
