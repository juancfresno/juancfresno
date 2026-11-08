'use client'

import { useState } from 'react'
import type { ArchiveRow } from '@/content/cases'
import s from './work.module.scss'
import { useUi } from '@/i18n/client'

// ─── Archive table ────────────────────────────────────────────────────────────
// Project · Via · Category · Role · Year, from the invoices (copy doc).
// Figma Work v1.0 (6884:611): the first 20 rows, then "Show all · N projects ↓"
// and the count "20 of N" on the right. Columns 4 · 3 · 2 · 2 · 1.
const FIRST = 20

export default function ArchiveTable({ rows }: { rows: ArchiveRow[] }) {
  const ui = useUi()
  const t = ui.archive
  const [open, setOpen] = useState(false)
  const collapsed = !open && rows.length > FIRST

  return (
    <div>
      <table className={s.table}>
        <thead>
          <tr>
            <th scope="col">{t.project}</th>
            <th scope="col">{t.via}</th>
            <th scope="col" className={s.tCat}>{t.category}</th>
            <th scope="col">{t.role}</th>
            <th scope="col" className={s.tYear}>{t.year}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.project}-${r.via}-${r.year}`} hidden={collapsed && i >= FIRST}>
              <td className={s.tProject}>
                {r.project}
                {r.nda && <span className={s.ndaTag}>{ui.index.nda}</span>}
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
          <button type="button" className={s.more} onClick={() => setOpen(true)}>{t.showAll(rows.length)}</button>
        ) : (
          <span className={s.more} aria-hidden="true">{t.total(rows.length)}</span>
        )}
        <span className={s.count}>{t.count(collapsed ? FIRST : rows.length, rows.length)}</span>
      </div>
    </div>
  )
}
