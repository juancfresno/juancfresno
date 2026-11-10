import { getSite } from '@/content/site'
import type { Locale } from '@/i18n/config'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import EmailLink from '@/components/wip/EmailLink'
import s from './homeContact.module.scss'

// Contact module of the home · Figma "04 · Archivo" (6856:14014): rule, mono
// label, one 24 px line, the email right-aligned (decodes on hover, copies on
// click: components/wip/EmailLink). Socials live in the global footer.
export default function HomeContact({ locale }: { locale: Locale }) {
  const { LANDING, PERSON } = getSite(locale)
  return (
    <section className={s.contact} aria-labelledby="home-contact-label">
      <ElasticLine className={s.rule} />
      <p id="home-contact-label" className={s.label}>{LANDING.contactLabel}</p>
      <p className={s.line}>{LANDING.contactLine}</p>
      <p className={`${s.line} ${s.email}`}><EmailLink email={PERSON.email} pillClassName={s.pill} /></p>
    </section>
  )
}
