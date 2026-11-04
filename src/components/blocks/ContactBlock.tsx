import { PERSON, SOCIALS, CONTACT } from '@/content/site'
import Pending from './Pending'
import s from './blocks.module.scss'

// Closing contact block, shared by every page: email, call, availability, socials.
export default function ContactBlock() {
  return (
    <section className={s.contact} aria-label="Contacto">
      <p className={s.label}>{CONTACT.kicker}</p>
      <p className={s.contactText}>{CONTACT.text}</p>
      <a className={s.contactEmail} href={`mailto:${PERSON.email}`}>{PERSON.email}</a>
      <div className={s.contactRow}>
        {PERSON.callUrl ? (
          <a className={s.button} href={PERSON.callUrl}>Reservar llamada · 15 min</a>
        ) : (
          <span className={s.button}>Reservar llamada · 15 min <Pending>enlace</Pending></span>
        )}
        <span className={s.availability}>● {PERSON.availability.text}{PERSON.availability.pending && <Pending />}</span>
      </div>
      <ul className={s.socials}>
        {SOCIALS.map((x) => (
          <li key={x.label}><a href={x.href} target="_blank" rel="noreferrer">{x.label} ↗</a></li>
        ))}
      </ul>
    </section>
  )
}
