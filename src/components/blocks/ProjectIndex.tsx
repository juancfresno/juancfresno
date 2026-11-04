import Link from 'next/link'
import type { Project } from '@/content/site'
import Pending from './Pending'
import s from './blocks.module.scss'

// Project index: one row per project — year, name, client/studio, discipline.
export default function ProjectIndex({ projects }: { projects: Project[] }) {
  return (
    <ol className={s.index}>
      {projects.map((p) => (
        <li key={p.slug} className={s.indexRow}>
          <span className={s.indexYear}>{p.year ?? <Pending>año</Pending>}</span>
          {p.caseStudy ? (
            <Link href={`/projects/${p.slug}`} className={s.indexName}>{p.name} <span aria-hidden="true">↘</span></Link>
          ) : (
            <span className={s.indexName}>{p.name}</span>
          )}
          <span className={s.indexMeta}>{p.studio ? `para ${p.studio}` : <Pending>para @estudio</Pending>}</span>
          <span className={s.indexTag}>{p.discipline}</span>
        </li>
      ))}
    </ol>
  )
}
