import type { Metadata } from 'next'
import { PROJECTS } from '@/content/site'
import ProjectIndex from '@/components/blocks/ProjectIndex'
import ContactBlock from '@/components/blocks/ContactBlock'
import s from '@/components/blocks/blocks.module.scss'

export const metadata: Metadata = { title: 'Projects' }

export default function ProjectsPage() {
  return (
    <div className={s.page}>
      <header className={s.hero}>
        <p className={s.heroMeta}>{'{ proyectos }'} · {String(PROJECTS.length).padStart(2, '0')} cases</p>
        <h1 className={s.heroTitle}>Projects</h1>
        <p className={s.text}>Todos los proyectos, el más reciente arriba. Los marcados con ↘ tienen caso.</p>
      </header>
      <ProjectIndex projects={PROJECTS} />
      <ContactBlock />
    </div>
  )
}
