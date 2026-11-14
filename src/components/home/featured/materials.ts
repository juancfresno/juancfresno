// Card materials for the featured pieces (side tab, MaterialMenu). Every
// material turns a held card into a WebGL2 canvas with the same interface
// (press / move / release / destroy) and hands the <img> back when it settles.
//  · cloth  — the satin drape (cloth.ts, preset cloth)
//  · silk   — the same simulation, finer and livelier (cloth.ts, preset silk)
//  · liquid — a water layer over the image (liquid.ts)
//  · paper  — a printed sheet that peels and curls (paper.ts)
//  · grid / halftone / net — pixel meshes (pixels.ts)

import { createCloth, type Cloth } from './cloth'
import { createLiquid } from './liquid'
import { createPaper } from './paper'
import { createPixels } from './pixels'

export const MATERIALS = ['cloth', 'silk', 'liquid', 'paper', 'grid', 'halftone', 'net'] as const
// Menu groups, in order.
export const MATERIAL_GROUPS = [
  { id: 'matter', items: ['cloth', 'silk', 'liquid', 'paper'] },
  { id: 'pixel', items: ['grid', 'halftone', 'net'] },
] as const
export type MaterialId = (typeof MATERIALS)[number]
export type Material = Cloth

// Canvas spill around the card, × its smaller side (room to move + shadows).
export const MATERIAL_PAD: Record<MaterialId, number> = { cloth: 0.45, silk: 0.6, liquid: 0, paper: 0.08, grid: 0.14, halftone: 0.03, net: 0.5 }

export const isMaterial = (v: unknown): v is MaterialId => typeof v === 'string' && (MATERIALS as readonly string[]).includes(v)

type Opts = { canvas: HTMLCanvasElement; img: HTMLImageElement; w: number; h: number; pad: number; onSleep: () => void }

export function createMaterial(id: MaterialId, o: Opts): Material | null {
  if (id === 'liquid') return createLiquid(o)
  if (id === 'paper') return createPaper(o)
  if (id === 'grid' || id === 'halftone' || id === 'net') return createPixels({ ...o, kind: id })
  return createCloth({ ...o, preset: id })
}
