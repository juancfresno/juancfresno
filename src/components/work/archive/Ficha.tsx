'use client'

import { useUi } from '@/i18n/client'
import type { WorkItem } from './types'
import s from './open.module.scss'

// Ficha shared by the three open views: Client · Via (only through a studio)
// · Year · Role, mono labels over body values.
export function FichaList({ it, className }: { it: WorkItem; className?: string }) {
  const t = useUi().work
  const rows: [string, string][] = [[t.client, it.client]]
  if (it.studio) rows.push([t.via, it.studio])
  rows.push([t.year, it.year], [t.role, it.role])
  return (
    <dl className={`${s.ficha} ${className ?? ''}`}>
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Chips({ chips, className }: { chips: string[]; className?: string }) {
  return (
    <ul className={`${s.chips} ${className ?? ''}`}>
      {chips.map((c) => <li key={c}>{c}</li>)}
    </ul>
  )
}
