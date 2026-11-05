import type { Metadata } from 'next'
import ContactBlock from '@/components/blocks/ContactBlock'
import { CONTACT, PERSON } from '@/content/site'
import s from '@/components/blocks/blocks.module.scss'

export const metadata: Metadata = { title: 'Contact' }

export default function ContactPage() {
  return (
    <div className={s.page}>
      <header className={s.hero}>
        <p className={s.heroMeta}>{PERSON.location}</p>
        <h1 className={s.heroTitle}>{CONTACT.title}</h1>
      </header>
      <ContactBlock />
    </div>
  )
}
