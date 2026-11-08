import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo'
import { CONTACT, META, PERSON } from '@/content/site'
import Pending from '@/components/blocks/Pending'
import NavClock from '@/components/ui/NavClock/NavClock'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import CopyEmail from '@/components/close/CopyEmail'
import Socials from '@/components/close/Socials'
import v from '@/components/blocks/v0.module.scss'
import c from '@/components/contact/contact.module.scss'

export const metadata: Metadata = pageMeta({ path: '/contact', title: META.contact.title, description: META.contact.description })

// Mini diagrams of the three ways of working (Figma 6889:1437).
function Diagram({ id }: { id: string }) {
  if (id === 'embedded') {
    return (
      <div className={c.diagram} data-kind="embedded" aria-hidden="true">
        <span className={c.dLabel}>Your team</span>
        <span className={c.team}>{[0, 1, 2, 3, 4].map((i) => <i key={i} data-me={i === 2 || undefined} />)}</span>
      </div>
    )
  }
  if (id === 'overflow') {
    return (
      <div className={c.diagram} data-kind="overflow" aria-hidden="true">
        <span className={c.yours}><em>Yours</em>{[0, 1, 2, 3, 4, 5].map((i) => <i key={i} />)}</span>
        <span className={c.mine}><em>Mine · white label</em>{[0, 1, 2].map((i) => <i key={i} />)}</span>
      </div>
    )
  }
  return (
    <div className={c.diagram} data-kind="whole" aria-hidden="true">
      <span className={c.track}>{[1, 2, 3, 4].map((i) => <i key={i} style={{ left: `${i * 20}%` }} />)}</span>
      <em className={c.tStart}>First idea</em>
      <em className={c.tEnd}>Last interaction</em>
    </div>
  )
}

// Contact v1.0 — Figma "Contact · v1.0 · 1680" (6889:1345): label + local
// time, title, two equal doors (Write / Talk; Talk fills in pearl on hover),
// the three ways of working with studios with mini diagrams, rates + socials.
// No form and no global close.
export default function ContactPage() {
  const talkInner = (
    <>
      <span className={c.doorTop}><span>{CONTACT.doorTalk}</span><span className={c.doorN}>02</span></span>
      <span className={c.doorBody}>
        <span className={c.doorAction}>{CONTACT.talk.cta} <span className={c.arrow} aria-hidden="true">↗</span></span>
        <span className={c.doorLine}>
          <span className={c.doorText}>{CONTACT.talk.text}</span>
          {!PERSON.callUrl && <Pending>call link</Pending>}
        </span>
      </span>
    </>
  )

  return (
    <div className={v.page}>
      <section className={c.hero}>
        <div className={c.meta}>
          <p className={c.label}>{CONTACT.label}</p>
          <p className={c.time}><i aria-hidden="true" /><NavClock /> · {CONTACT.monoTail}</p>
        </div>
        <h1 className={c.title}>{CONTACT.title}</h1>
      </section>

      <section className={c.doorsWrap} aria-label="Two ways to start">
        <div className={c.doors}>
          <div className={c.door}>
            <span className={c.doorTop}><span>{CONTACT.doorWrite}</span><span className={c.doorN}>01</span></span>
            <span className={c.doorBody}>
              <CopyEmail size="md" className={c.doorEmail} />
              <span className={c.doorLine}>
                <span className={c.doorText}>{CONTACT.write.text} {CONTACT.write.promise}</span>
                {PERSON.replies.pending && <Pending>24 h</Pending>}
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

      <section className={c.modesWrap} aria-label="How I work with studios">
        <div className={c.head}>
          <ElasticLine className={c.headRule} />
          <p className={c.label}>{CONTACT.modesLabel}</p>
        </div>
        <ol className={c.modes}>
          {CONTACT.modes.map((m, i) => (
            <li key={m.id}>
              <Diagram id={m.id} />
              <p className={c.modeTitle}><span>{String(i + 1).padStart(2, '0')}</span><span className={c.modeName}>{m.name}</span></p>
              <p className={c.modeText}>{m.text}</p>
            </li>
          ))}
        </ol>
        <div className={c.foot}>
          <p className={c.small}>{CONTACT.small}</p>
          <Socials />
        </div>
      </section>
    </div>
  )
}
