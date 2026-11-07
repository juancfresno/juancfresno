// ─── Feed: loose pieces posted on Dribbble and Instagram ─────────────────────
// Built by scripts/build-media.mjs from the scraped manifest: duplicates
// (Dribbble shots also posted on Instagram) and Biako pieces are left out —
// Biako is a separate personal project and stays out of the professional feed.
// Newest first. Pieces of the same project posted close together are grouped
// as a "session" (Figma "Feed · Desktop", 6770:9789); the rest go into "Sueltos".
import items from './generated/feed.json'
import { FEED_SELECTION } from './feed-selection'

export type FeedItem = {
  id: string
  title: string
  url: string
  source: 'dribbble' | 'instagram'
  date: string // YYYY-MM-DD
  src: string
  w: number
  h: number
}

export const FEED = items as FeedItem[]

// The curated pieces /feed shows (feed-selection.ts), in selection order.
const BY_ID = new Map(FEED.map((it) => [it.id, it]))
export const FEED_SELECTED: FeedItem[] = FEED_SELECTION.map((id) => BY_ID.get(id)).filter((it): it is FeedItem => !!it)

// Project names recognised in titles → session label.
const PROJECTS: [RegExp, string][] = [
  [/likitech|aplicaciones digitales de la identidad|portadas para cat[aá]logo/i, 'Likitech — Rebrand'],
  [/player ?up/i, 'PlayerUp App'],
  [/educa/i, 'Educa Projects'],
  [/responsive web ui|composiciones para m[oó]dulos|jugar con los componentes/i, 'Responsive Web UI'],
  [/shoeciety/i, 'Shoeciety'],
  [/awen/i, 'Awen'],
  [/correos/i, 'Correos'],
  [/casacarb/i, 'Casacarbón'],
  [/safeboda/i, 'SafeBoda'],
  [/icommunity/i, 'Icommunity'],
  [/daily ui/i, 'Daily UI Challenge'],
  [/preload|prealoder/i, 'Preloaders'],
  [/hamburger menu/i, 'Hamburger menu'],
  [/google/i, 'Google'],
  [/nintendo/i, 'Nintendo Classics'],
  [/wubalu/i, 'Wubalu App'],
  [/entradium/i, 'Entradium'],
  [/bunkr/i, 'Bunkr'],
  [/gra(f)?fiti|graffiti/i, 'Graffiti'],
  [/barcelona/i, 'FC Barcelona'],
  [/36daysoftype/i, '36 Days of Type'],
  [/teatro real|cas[oó]n|torre picasso|puerta de europa|congreso|madrid buildings/i, 'Madrid'],
  [/music player/i, 'Music Player UI'],
  [/puzzle|sixteen|menu game/i, 'Sixteen'],
  [/responsive blog/i, 'Responsive Blog'],
]

const projectOf = (title: string) => PROJECTS.find(([re]) => re.test(title))?.[1] ?? null

export type FeedGroup = { key: string; label: string; session: boolean; items: FeedItem[] }

// Pieces of the same project posted within this window (newest piece as
// reference) form one session; Dribbble and Instagram posts interleave by
// date, so strict adjacency would split them.
const WINDOW_DAYS = 60
const days = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 864e5

export function groupFeed(list: FeedItem[] = FEED): FeedGroup[] {
  const taken = new Set<string>()
  const units: { session: string | null; items: FeedItem[] }[] = []
  for (const it of list) {
    if (taken.has(it.id)) continue
    const p = projectOf(it.title)
    const same = p ? list.filter((x) => !taken.has(x.id) && projectOf(x.title) === p && days(x.date, it.date) <= WINDOW_DAYS) : [it]
    same.forEach((x) => taken.add(x.id))
    units.push({ session: p && same.length >= 2 ? p : null, items: same })
  }
  // Consecutive loose pieces are shown together as "Sueltos".
  const groups: FeedGroup[] = []
  for (const u of units) {
    const last = groups[groups.length - 1]
    if (!u.session && last && !last.session) last.items.push(...u.items)
    else if (!u.session) groups.push({ key: `sueltos-${u.items[0].id}`, label: 'Sueltos', session: false, items: [...u.items] })
    else groups.push({ key: `${u.session}-${u.items[0].id}`, label: `Sesión · ${u.session}`, session: true, items: u.items })
  }
  return groups
}

// "02/2026"
export const monthYear = (date: string) => `${date.slice(5, 7)}/${date.slice(0, 4)}`

// Range for a group header: "02/2026" or "06/2018 — 01/2019".
export function groupRange(g: FeedGroup) {
  const newest = monthYear(g.items[0].date)
  const oldest = monthYear(g.items[g.items.length - 1].date)
  return newest === oldest ? newest : `${oldest} — ${newest}`
}
