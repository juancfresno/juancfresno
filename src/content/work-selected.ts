// ─── /work · "/ Selected projects" (Figma web/projects-grid 7297:9127) ────────
// Seven plates on a free layout. Positions are the Figma ones at 1680 (x, y of
// the image, its width and height; the info row sits 20–21 px under it), read
// as shares of the page width, so the block is liquid.
// Images: public/work/selected/*.webp, composed from the Figma fills (colour
// plate + screenshot where the frame has one).
// `slug` = a case in the list below: the plate opens it in the drawer. Plates
// without one are not linked (no case yet).
// TEXT: Figma only names Prolicht, Medida, GLYF and Biakone. The other three
// rows still say "Prolicht website" in the frame (placeholder), so their names
// here are read from the image (Shoeciety, Correos, El Zorro Gris): to confirm.
export type SelectedPlate = {
  id: string
  name: string
  code: string // left of the info row, as in Figma
  tags: string // mono, right of the info row
  src: string
  x: number; y: number; w: number; h: number // at 1680
  slug?: string
  card?: boolean // Prolicht: the marble card drawn over the image
}

export const SELECTED_H = 2729 // frame height at 1680

export const SELECTED: SelectedPlate[] = [
  { id: 'prolicht', name: 'Prolicht website', code: 'P — W', tags: 'Interaction', src: '/work/selected/prolicht.webp', x: 107, y: 130, w: 792, h: 493, card: true },
  { id: 'medida', name: 'Medida App', code: 'P — W', tags: 'Interaction', src: '/work/selected/medida.webp', x: 1185, y: 332, w: 388, h: 582 },
  { id: 'glyf', name: 'GLYF App', code: 'P — W', tags: 'Interaction', src: '/work/selected/glyf.webp', x: 175, y: 800, w: 659, h: 332 },
  { id: 'biakone', name: 'Biakone website', code: 'P — W', tags: 'Art direction — Interaction — AI dev', src: '/work/selected/biakone.webp', x: 848, y: 1283, w: 792, h: 447 },
  { id: 'shoeciety', name: 'Shoeciety', code: 'P — W', tags: 'Interaction', src: '/work/selected/shoeciety.webp', x: 107, y: 1368, w: 388, h: 583, slug: 'shoeciety' },
  { id: 'correos', name: 'Correos', code: 'P — W', tags: 'Interaction', src: '/work/selected/correos.webp', x: 1185, y: 1867, w: 388, h: 388, slug: 'correos' },
  { id: 'zorro-gris', name: 'El Zorro Gris', code: 'P — W', tags: 'Interaction', src: '/work/selected/web7.webp', x: 377, y: 2090, w: 657, h: 435 },
]
