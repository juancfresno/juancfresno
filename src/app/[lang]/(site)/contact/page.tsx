import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo'
import { getSite, getUi } from '@/content/site'
import { localeOf, type LangParams } from '@/i18n/server'
import Pending from '@/components/blocks/Pending'
import CopyEmail from '@/components/close/CopyEmail'
import c from '@/components/contact/contact.module.scss'

type Props = { params: Promise<LangParams> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = await localeOf(params)
  const { META } = getSite(l)
  return pageMeta({ locale: l, path: '/contact', title: META.contact.title, description: META.contact.description })
}

// Contact — Figma "contact" (AXxkCCuckrXGKDUCk8lNyQ · 7014:18145, Juan,
// 10 Nov 2026), always in the brand blue (html[data-page-theme="blue"], see
// lib/pageTheme.ts): hero with the page name on the right + one line (same
// pattern as Work), then the two equal doors (Write / Talk; Talk fills in
// pearl on hover). No form, no ways-of-working band, no global close.
export default async function ContactPage({ params }: Props) {
  const l = await localeOf(params)
  const { CONTACT, PERSON } = getSite(l)
  const ui = getUi(l)
  const talkInner = (
    <>
      <span className={c.doorTop}><span>{CONTACT.doorTalk}</span><span className={c.doorN}>02</span></span>
      <span className={c.doorBody}>
        <span className={c.doorAction}>{CONTACT.talk.cta}{'\u00a0'}<span className={c.arrow} aria-hidden="true">↗</span></span>
        <span className={c.doorLine}>
          <span className={c.doorText}>{CONTACT.talk.text}</span>
          {!PERSON.callUrl && <Pending>{ui.pending.call}</Pending>}
        </span>
      </span>
    </>
  )

  return (
    <div className={c.page}>
      <header className={c.hero}>
        <h1 className={c.name}>/{ui.contact.h1}</h1>
        <p className={c.intro}>{CONTACT.title}</p>
      </header>

      <section className={c.doorsWrap} aria-label={ui.contact.doors}>
        <div className={c.doors}>
          <div className={c.door}>
            <span className={c.doorTop}><span>{CONTACT.doorWrite}</span><span className={c.doorN}>01</span></span>
            <span className={c.doorBody}>
              <CopyEmail size="md" className={c.doorEmail} />
              <span className={c.doorLine}>
                <span className={c.doorText}>{CONTACT.write.text} {CONTACT.write.promise}</span>
                {PERSON.replies.pending && <Pending>{ui.pending.h24}</Pending>}
              </span>
            </span>
          </div>
          {PERSON.callUrl ? (
            <a className={`${c.door} ${c.doorTalk}`} href={PERSON.callUrl} target="_blank" rel="noopener noreferrer" data-no-transition>{talkInner}</a>
          ) : (
            <div className={`${c.door} ${c.doorTalk}`} aria-disabled="true">{talkInner}</div>
          )}
        </div>
      </section>
    </div>
  )
}
