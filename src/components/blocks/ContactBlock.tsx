import { CLOSE, PERSON } from '@/content/site'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import NavClock from '@/components/ui/NavClock/NavClock'
import CopyEmail from '@/components/close/CopyEmail'
import CallLink from '@/components/close/CallLink'
import Socials from '@/components/close/Socials'
import Pending from './Pending'
import s from '@/components/close/close.module.scss'

// Global close / pre-footer (copy doc "Mood · Cierre"): label, headline with
// voice, big email + Copy, the call as second action, a mono line with local
// time and the reply promise, rates on request, socials with hover clips.
// Every page except Contact and the end of a case (those use their own).
export default function ContactBlock() {
  return (
    <section className={s.close} aria-labelledby="close-title">
      <ElasticLine className={s.rule} />
      <p className={s.label}>{CLOSE.label}</p>
      <div className={s.grid}>
        <div className={s.head}>
          <h2 id="close-title" className={s.headline}>{CLOSE.headline}</h2>
          <p className={s.sub}>{CLOSE.sub}</p>
        </div>
        <div className={s.actions}>
          <CopyEmail />
          <CallLink label={CLOSE.call} />
        </div>
      </div>
      <div className={s.foot}>
        <p className={s.mono}>
          <NavClock /> · {PERSON.replies.text}{PERSON.replies.pending && <Pending>confirm</Pending>}
        </p>
        <p className={s.small}>{CLOSE.small}</p>
        <Socials />
      </div>
    </section>
  )
}
