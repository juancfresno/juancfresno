import { getSite, getUi } from '@/content/site'
import { localePath, type Locale } from '@/i18n/config'
import FloppyModule, { type FloppyItem } from './FloppyModule'

// Shell per disk, in order: ink, grey and blue (opaque, as in the Figma module), then two
// "90s translucent" tints. translucent = tinted see-through polycarbonate.
const SHELLS: { shell?: string; accent?: string; translucent?: boolean }[] = [
  {}, { shell: '#8F8D87' }, { shell: '#003DFF', accent: '#FCFCF7' },
  { shell: '#2F6BFF', translucent: true }, { shell: '#FF7A1A', translucent: true, accent: '#FCFCF7' },
]

// Label artwork per disk: PNG 2048 × 1700 exported from Figma (file AXxkCCuckrXGKDUCk8lNyQ,
// page "↪ Floppy labels", frame "Floppy label / <n>") into public/lab/floppy/labels/<n>.png.
// To update one: edit its frame in Figma and export it again over the same file.
const LABELS: Record<string, { src: string; figma: string }> = {
  '001': { src: '/lab/floppy/labels/001.png', figma: '7168:336' },
  '002': { src: '/lab/floppy/labels/002.png', figma: '7168:617' },
  '003': { src: '/lab/floppy/labels/003.png', figma: '7168:902' },
  '004': { src: '/lab/floppy/labels/004.png', figma: '7168:1189' },
  '005': { src: '/lab/floppy/labels/005.png', figma: '7168:1474' },
}

// Lab module with the 3D floppies (Figma 7025:21805), for Home and Lab.
export default function FloppyBand({ locale }: { locale: Locale }) {
  const { EXPERIMENTS } = getSite(locale)
  const ui = getUi(locale)
  const items: FloppyItem[] = EXPERIMENTS.map((e, i) => ({
    n: e.n, name: e.name, kind: e.kind, year: e.year, what: e.card, how: e.how, built: e.built, href: localePath(locale, `/lab/${e.slug}`),
    label: LABELS[e.n]?.src, ...SHELLS[i % SHELLS.length],
  }))
  return <FloppyModule items={items} labName={ui.lab.h1} labHref={localePath(locale, '/lab')} strings={ui.lab.floppy} />
}
