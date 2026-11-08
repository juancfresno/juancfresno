'use client'

import { useMemo, useState } from 'react'
import type { ArchiveRow } from '@/content/cases'
import s from './work.module.scss'

// ─── Archive table ────────────────────────────────────────────────────────────
// Project · Via · Category · Role · Year, from the invoices (copy doc). Filter
// chips by category (each category is split on " · ", so "Web · Art Direction"
// counts for both; only categories with 3+ rows get a chip). With no filter
// the list shows the first 20 rows and a "Show all" button.
const FIRST = 20

export default function ArchiveTable({ rows }: { rows: ArchiveRow[] }) {
  const [cat, setCat] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const cats = useMemo(() => {
    const count = new Map<string, number>()
    rows.forEach((r) => r.category.split(' · ').forEach((c) => { if (c !== '—') count.set(c, (count.get(c) ?? 0) + 1) }))
    return [...count.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1])
  }, [rows])

  const list = cat ? rows.filter((r) => r.category.split(' · ').includes(cat)) : rows
  const collapsed = !cat && !open && list.length > FIRST

  return (
    <div>
      <div className={s.filters} role="group" aria-label="Filter by category">
        <button type="button" className={s.chip} aria-pressed={cat === null} onClick={() => setCat(null)}>
          All<sup>{rows.length}</sup>
        </button>
        {cats.map(([c, n]) => (
          <button key={c} type="button" className={s.chip} aria-pressed={cat === c} onClick={() => setCat(cat === c ? null : c)}>
            {c}<sup>{n}</sup>
          </button>
        ))}
      </div>

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
          {list.map((r, i) => (
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

      {collapsed && (
        <button type="button" className={s.more} onClick={() => setOpen(true)}>
          Show all {list.length} ↓
        </button>
      )}
    </div>
  )
}
