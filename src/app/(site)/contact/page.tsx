import type { Metadata } from 'next'
import { CONTACT, INTROS, PERSON } from '@/content/site'
import V0Section from '@/components/blocks/V0Section'
import ContactBlock from '@/components/blocks/ContactBlock'
import v from '@/components/blocks/v0.module.scss'

export const metadata: Metadata = { title: 'Contact' }

// Figma: "Contact · Desktop" (6770:10917), dark theme. The title line from
// Figma, then the two open doors (write / book a call) from the shared block.
export default function ContactPage() {
  return (
    <div className={v.page}>
      <h1 className={v.intro}>{INTROS.contact}</h1>
      <V0Section label={`${CONTACT.title} · ${PERSON.location} ↘`}>
        <ContactBlock />
      </V0Section>
    </div>
  )
}
