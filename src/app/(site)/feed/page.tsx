import type { Metadata } from 'next'
import ContactBlock from '@/components/blocks/ContactBlock'
import Pending from '@/components/blocks/Pending'
import s from '@/components/blocks/blocks.module.scss'

export const metadata: Metadata = { title: 'Feed' }

// Placeholder: section defined, content and layout come from Figma.
export default function FeedPage() {
  return (
    <div className={s.page}>
      <header className={s.hero}>
        <p className={s.heroMeta}>Piezas sueltas · todo lo que sale en redes</p>
        <h1 className={s.heroTitle}>Feed</h1>
        <p className={s.text}>Piezas que no son caso: carteles, exploraciones, tipos y trabajos sin publicar. Todo lo que publico en redes tiene sitio aquí. <Pending>contenido</Pending></p>
      </header>
      <ContactBlock />
    </div>
  )
}
