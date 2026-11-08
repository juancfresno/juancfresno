'use client'

import { useState } from 'react'
import type { ArchiveRow } from '@/content/cases'
import s from './work.module.scss'

// ─── Archive table ────────────────────────────────────────────────────────────
// Project · Via · Category · Role · Year, from the invoices (copy doc).
// Figma Work v1.0 (6884:611): the first 20 rows, then "Show all · N projects ↓"
// and the count "20 of N" on the right. Columns 4 · 3 · 2 · 2 · 1.
const FIRST = 20

export default function ArchiveTable({ rows }: { rows: ArchiveRow[] }) {
  const [open, setOpen] = useState(false)
  const collapsed = !open && rows.length > FIRST

  return (
    <div>
      <table className={s.table}>
        <thead>
          <tr>
            <th scope="col">Project</th>
            <th scope="col">Via</th>
            <th scope="col" className={s.tCat}>Category</th>
            <th scope="col">Role</th>
            <th scope="col" className={s.tYear}>Year</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.project}-${r.via}-${r.year}`} hidden={collapsed && i >= FIRST}>
              <td className={s.tProject}>
                {r.project}
                {r.nda && <span className={s.ndaTag}>NDA</span>}
              </td>
              <td className={`${s.tCell} ${s.tVia}`}>{r.via}</td>
              <td className={`${s.tCell} ${s.tCat}`}>{r.category}</td>
              <td className={`${s.tCell} ${s.tRole}`}>{r.role}</td>
              <td className={s.tYear}>{r.year}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={s.moreRow}>
        {collapsed ? (
          <button type="button" className={s.more} onClick={() => setOpen(true)}>Show all · {rows.length} projects ↓</button>
        ) : (
          <span className={s.more} aria-hidden="true">{rows.length} projects</span>
        )}
        <span className={s.count}>{collapsed ? FIRST : rows.length} of {rows.length}</span>
      </div>
    </div>
  )
}
