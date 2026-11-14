import { getSite, getUi } from '@/content/site'
import { localePath, type Locale } from '@/i18n/config'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import EmailLink from '@/components/wip/EmailLink'
import NavLinkItem from '@/components/ui/NavLink/NavLink'
import s from './Footer.module.scss'

// The middle of the full-screen footer · Figma "web/footer · full · feed lens"
// (7370:5290): one row at mid-height (the line on the left, the email on the
// right: decodes on hover, copies on click), a rule under it, and the Contact
// chip (web/nav-link, always on) right-aligned below.
export default function FooterClose({ locale }: { locale: Locale }) {
  const { LANDING, PERSON } = getSite(locale)
  const ui = getUi(locale)
  return (
    <section className={s.ask} aria-label={ui.nav.links.contact}>
      <div className={s.askRow}>
        <p className={s.askLine}>{LANDING.contactLine}</p>
        <p className={s.askEmail}><EmailLink email={PERSON.email} pillClassName={s.askPill} /></p>
      </div>
      <ElasticLine className={s.askRule} />
      <div className={s.askGo}>
        <NavLinkItem label={ui.nav.links.contact} href={localePath(locale, '/contact')} active />
      </div>
    </section>
  )
}
