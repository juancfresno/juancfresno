import { getSite, getUi } from '@/content/site'
import { localePath, type Locale } from '@/i18n/config'
import FloppyModule, { type FloppyItem } from './FloppyModule'

// Shell colours per disk, in order, as in the Figma module (ink, light grey, blue).
// A project can carry its own label artwork: public/lab/floppy/labels/<n>.png (2048 × 1700).
const SHELLS: { shell?: string; accent?: string }[] = [{}, { shell: '#8F8D87' }, { shell: '#003DFF', accent: '#FCFCF7' }]
const LABELS: Record<string, string> = {}

// Lab module with the 3D floppies (Figma 7025:21805), for Home and Lab.
export default function FloppyBand({ locale }: { locale: Locale }) {
  const { EXPERIMENTS } = getSite(locale)
  const ui = getUi(locale)
  const items: FloppyItem[] = EXPERIMENTS.map((e, i) => ({
    n: e.n, name: e.name, kind: e.kind, year: e.year, what: e.card, href: localePath(locale, `/lab/${e.slug}`),
    label: LABELS[e.n], ...SHELLS[i % SHELLS.length],
  }))
  return <FloppyModule items={items} labName={ui.lab.h1} labHref={localePath(locale, '/lab')} strings={ui.lab.floppy} />
}
