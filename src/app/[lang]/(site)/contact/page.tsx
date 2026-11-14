import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo'
import { getSite, getUi } from '@/content/site'
import { localeOf, type LangParams } from '@/i18n/server'
import { SOCIALS } from '@/content/socials'
import ContactStage from '@/components/contact/ContactStage'
import c from '@/components/contact/contact.module.scss'

type Props = { params: Promise<LangParams> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = await localeOf(params)
  const { META } = getSite(l)
  return pageMeta({ locale: l, path: '/contact', title: META.contact.title, description: META.contact.description })
}

// Contact v2 (14 Nov 2026), always in the brand blue
// (html[data-page-theme="blue"], see lib/pageTheme.ts): "/Contact" on the
// right, then one stage (components/contact/ContactStage): the LED stand-in
// that follows the pointer and talks, a dial to say who you are, and a
// one-sentence brief that leaves as an email draft. Email only: no call, no
// form, no global close.
export default async function ContactPage({ params }: Props) {
  const l = await localeOf(params)
  const { CONTACT, PERSON } = getSite(l)
  const ui = getUi(l)
  const linkedin = SOCIALS.find((s) => s.id === 'linkedin')!.href

  return (
    <div className={c.page}>
      <header className={c.hero}>
        <h1 className={c.name}>/{ui.contact.h1}</h1>
      </header>
      <ContactStage
        brief={CONTACT.brief}
        email={PERSON.email}
        linkedin={linkedin}
        repliesPending={PERSON.replies.pending}
        promise={CONTACT.write.promise}
      />
    </div>
  )
}
