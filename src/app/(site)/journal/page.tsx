import type { Metadata } from 'next'
import ContactBlock from '@/components/blocks/ContactBlock'
import Pending from '@/components/blocks/Pending'
import s from '@/components/blocks/blocks.module.scss'

export const metadata: Metadata = { title: 'Journal' }

// Placeholder: section defined, content and layout come from Figma.
export default function JournalPage() {
  return (
    <div className={s.page}>
      <header className={s.hero}>
        <p className={s.heroMeta}>Textos · proceso y criterio</p>
        <h1 className={s.heroTitle}>Journal</h1>
        <p className={s.text}>Proceso, decisiones y opinión. Cómo trabajo, qué descarto y cómo dirijo la IA. <Pending>contenido</Pending></p>
      </header>
      <ContactBlock />
    </div>
  )
}
