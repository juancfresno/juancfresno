import type { Metadata } from 'next'
import { CONTACT, META, PERSON } from '@/content/site'
import Pending from '@/components/blocks/Pending'
import V0Section from '@/components/blocks/V0Section'
import NavClock from '@/components/ui/NavClock/NavClock'
import CopyEmail from '@/components/close/CopyEmail'
import CallLink from '@/components/close/CallLink'
import Socials from '@/components/close/Socials'
import v from '@/components/blocks/v0.module.scss'
import c from '@/components/contact/contact.module.scss'

export const metadata: Metadata = {
  title: META.contact.title,
  description: META.contact.description,
  alternates: { canonical: '/contact' },
}

// Contact v1.0 (copy doc): two doors, write or talk; local time; the three
// ways of working with studios; rates on request; socials with hover clips.
// No form. Layout of our own until the Figma "↪ Visual v1.0" frame lands.
export default function ContactPage() {
  return (
    <div className={v.page}>
      <header className={c.hero}>
        <h1 className={c.title}>{CONTACT.title}</h1>
        <p className={c.mono}><NavClock /> · {CONTACT.monoTail}</p>
      </header>

      <section className={c.doors} aria-label="Two ways to start">
        <div className={c.door}>
          <p className={c.doorLabel}><span>01</span> {CONTACT.write.label}</p>
          <CopyEmail size="md" />
          <p className={c.doorText}>{CONTACT.write.text} {CONTACT.write.promise}{PERSON.replies.pending && <Pending>confirm</Pending>}</p>
        </div>
        <div className={c.door}>
          <p className={c.doorLabel}><span>02</span> {CONTACT.talk.label}</p>
          <div className={c.callBig}><CallLink label={CONTACT.talk.cta} /></div>
          <p className={c.doorText}>{CONTACT.talk.text}</p>
        </div>
      </section>

      <V0Section label={CONTACT.modesLabel}>
        <ol className={c.modes}>
          {CONTACT.modes.map((m, i) => (
            <li key={m.name}>
              <span className={c.modeN}>{String(i + 1).padStart(2, '0')}</span>
              <h2 className={c.modeName}>{m.name}</h2>
              <p className={c.modeText}>{m.text}</p>
            </li>
          ))}
        </ol>
        <div className={c.foot}>
          <p className={c.small}>{CONTACT.small}</p>
          <Socials />
        </div>
      </V0Section>
    </div>
  )
}
