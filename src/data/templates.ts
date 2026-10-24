/** Strip template registry — pure data, normalized geometry (see ARCHITECHTURE §6.1). */
import type { Rect, StripTemplate } from '../types'

/** helper: N equal stacked slots (classic vertical strip) */
function stack(n: number, opts: { mx: number; top: number; bottom: number; gap: number }): Rect[] {
  const avail = 1 - opts.top - opts.bottom
  const h = (avail - (n - 1) * opts.gap) / n
  return Array.from({ length: n }, (_, i) => ({
    x: opts.mx,
    y: opts.top + i * (h + opts.gap),
    w: 1 - 2 * opts.mx,
    h,
  }))
}

/** helper: cols × rows grid */
function grid(cols: number, rows: number, opts: { mx: number; top: number; bottom: number; gx: number; gy: number }): Rect[] {
  const cw = (1 - 2 * opts.mx - (cols - 1) * opts.gx) / cols
  const avail = 1 - opts.top - opts.bottom
  const ch = (avail - (rows - 1) * opts.gy) / rows
  const out: Rect[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push({ x: opts.mx + c * (cw + opts.gx), y: opts.top + r * (ch + opts.gy), w: cw, h: ch })
    }
  }
  return out
}

/** helper: N equal cells in a horizontal row */
function row(n: number, opts: { mx: number; top: number; h: number; gap: number }): Rect[] {
  const cw = (1 - 2 * opts.mx - (n - 1) * opts.gap) / n
  return Array.from({ length: n }, (_, i) => ({
    x: opts.mx + i * (cw + opts.gap),
    y: opts.top,
    w: cw,
    h: opts.h,
  }))
}

export const TEMPLATES: StripTemplate[] = [
  {
    id: 'classic-4',
    name: 'Classic Four',
    category: 'classic',
    shots: 4,
    canvas: { w: 600, h: 1840 },
    slots: stack(4, { mx: 0.06, top: 0.035, bottom: 0.115, gap: 0.02 }),
    footer: { h: 0.09 },
    orientation: 'portrait',
    reorderable: true,
  },
  {
    id: 'classic-3',
    name: 'Classic Three',
    category: 'classic',
    shots: 3,
    canvas: { w: 600, h: 1450 },
    slots: stack(3, { mx: 0.06, top: 0.035, bottom: 0.115, gap: 0.022 }),
    footer: { h: 0.09 },
    orientation: 'portrait',
    reorderable: true,
  },
  {
    id: 'classic-6',
    name: 'Classic Six',
    category: 'classic',
    shots: 6,
    canvas: { w: 600, h: 2600 },
    slots: stack(6, { mx: 0.06, top: 0.03, bottom: 0.11, gap: 0.016 }),
    footer: { h: 0.075 },
    orientation: 'portrait',
    reorderable: true,
  },
  {
    id: 'vertical-5',
    name: 'Tall Five',
    category: 'classic',
    shots: 5,
    canvas: { w: 600, h: 2200 },
    slots: stack(5, { mx: 0.06, top: 0.032, bottom: 0.112, gap: 0.018 }),
    footer: { h: 0.08 },
    orientation: 'portrait',
    reorderable: true,
  },
  {
    id: 'fourcut-kr',
    name: 'Four-Cut (Korean)',
    category: 'fourcut',
    shots: 4,
    canvas: { w: 1200, h: 1800 },
    slots: grid(2, 2, { mx: 0.05, top: 0.04, bottom: 0.095, gx: 0.02, gy: 0.02 }),
    footer: { h: 0.07 },
    orientation: 'portrait',
    reorderable: true,
  },
  {
    id: 'fourcut-tight',
    name: 'Four-Cut Tight',
    category: 'fourcut',
    shots: 4,
    canvas: { w: 1200, h: 1750 },
    slots: grid(2, 2, { mx: 0.03, top: 0.03, bottom: 0.115, gx: 0.014, gy: 0.014 }),
    footer: { h: 0.095 },
    orientation: 'portrait',
    reorderable: true,
  },
  {
    id: 'duo-stack',
    name: 'Duo Stack',
    category: 'grid',
    shots: 2,
    canvas: { w: 600, h: 1000 },
    slots: stack(2, { mx: 0.06, top: 0.04, bottom: 0.13, gap: 0.025 }),
    footer: { h: 0.1 },
    orientation: 'portrait',
    reorderable: true,
  },
  {
    id: 'duo-side',
    name: 'Duo Side-by-Side',
    category: 'grid',
    shots: 2,
    canvas: { w: 1200, h: 760 },
    slots: grid(2, 1, { mx: 0.05, top: 0.05, bottom: 0.1, gx: 0.02, gy: 0 }),
    footer: { h: 0.075 },
    orientation: 'landscape',
    reorderable: true,
  },
  {
    id: 'trio-column',
    name: 'Trio Column',
    category: 'grid',
    shots: 3,
    canvas: { w: 600, h: 1900 },
    slots: stack(3, { mx: 0.055, top: 0.035, bottom: 0.11, gap: 0.02 }),
    footer: { h: 0.085 },
    orientation: 'portrait',
    reorderable: true,
  },
  {
    id: 'grid-6',
    name: 'Grid Six',
    category: 'grid',
    shots: 6,
    canvas: { w: 1200, h: 1750 },
    slots: grid(2, 3, { mx: 0.05, top: 0.04, bottom: 0.1, gx: 0.02, gy: 0.02 }),
    footer: { h: 0.08 },
    orientation: 'portrait',
    reorderable: true,
  },
  {
    id: 'hero-4',
    name: 'Hero + Three',
    category: 'hero',
    shots: 4,
    canvas: { w: 1200, h: 1500 },
    slots: [
      { x: 0.05, y: 0.04, w: 0.9, h: 0.48 },
      ...row(3, { mx: 0.05, top: 0.54, h: 0.3, gap: 0.02 }),
    ],
    footer: { h: 0.1 },
    orientation: 'portrait',
  },
  {
    id: 'hero-3',
    name: 'Hero + Duo',
    category: 'hero',
    shots: 3,
    canvas: { w: 1200, h: 1500 },
    slots: [
      { x: 0.05, y: 0.04, w: 0.9, h: 0.5 },
      { x: 0.05, y: 0.56, w: 0.44, h: 0.28 },
      { x: 0.51, y: 0.56, w: 0.44, h: 0.28 },
    ],
    footer: { h: 0.1 },
    orientation: 'portrait',
  },
  {
    id: 'mosaic-4',
    name: 'Mosaic',
    category: 'hero',
    shots: 4,
    canvas: { w: 1200, h: 1400 },
    slots: [
      { x: 0.05, y: 0.04, w: 0.55, h: 0.8 },
      { x: 0.64, y: 0.04, w: 0.31, h: 0.2533 },
      { x: 0.64, y: 0.3133, w: 0.31, h: 0.2533 },
      { x: 0.64, y: 0.5867, w: 0.31, h: 0.2533 },
    ],
    footer: { h: 0.1 },
    orientation: 'portrait',
  },
  {
    id: 'collage-3',
    name: 'Mixed Collage',
    category: 'collage',
    shots: 3,
    canvas: { w: 1200, h: 1400 },
    slots: [
      { x: 0.05, y: 0.04, w: 0.62, h: 0.38 },
      { x: 0.69, y: 0.04, w: 0.26, h: 0.38 },
      { x: 0.05, y: 0.44, w: 0.9, h: 0.4 },
    ],
    footer: { h: 0.1 },
    orientation: 'portrait',
  },
  {
    id: 'cinema-2',
    name: 'Cinema Duo',
    category: 'film',
    shots: 2,
    canvas: { w: 1200, h: 900 },
    slots: stack(2, { mx: 0.05, top: 0.05, bottom: 0.15, gap: 0.025 }),
    footer: { h: 0.1 },
    orientation: 'landscape',
    reorderable: true,
  },
  {
    id: 'filmstrip-4',
    name: 'Filmstrip',
    category: 'film',
    shots: 4,
    canvas: { w: 1800, h: 560 },
    slots: row(4, { mx: 0.04, top: 0.14, h: 0.66, gap: 0.015 }),
    footer: { h: 0.13 },
    orientation: 'landscape',
    reorderable: true,
  },
  {
    id: 'single-polaroid',
    name: 'Single Polaroid',
    category: 'single',
    shots: 1,
    canvas: { w: 900, h: 1100 },
    slots: [{ x: 0.08, y: 0.06, w: 0.84, h: 0.74 }],
    footer: { h: 0.18 },
    orientation: 'portrait',
  },
  {
    id: 'single-portrait',
    name: 'Single Portrait',
    category: 'single',
    shots: 1,
    canvas: { w: 800, h: 1000 },
    slots: [{ x: 0.07, y: 0.05, w: 0.86, h: 0.79 }],
    footer: { h: 0.11 },
    orientation: 'portrait',
  },
]

export const DEFAULT_TEMPLATE_ID = 'classic-4'

export function getTemplate(id: string): StripTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]!
}

/** Aspect ratio (w/h) of a slot in design space. */
export function slotAspect(t: StripTemplate, index: number): number {
  const s = t.slots[index]!
  return (s.w * t.canvas.w) / (s.h * t.canvas.h)
}

/** Slot rects in canvas pixel space. */
export function slotRects(t: StripTemplate, canvasW: number, canvasH: number): Array<{ x: number; y: number; w: number; h: number }> {
  return t.slots.map((s) => ({
    x: s.x * canvasW,
    y: s.y * canvasH,
    w: s.w * canvasW,
    h: s.h * canvasH,
  }))
}

/** Are all slots interchangeable (equal geometry)? Used to hint reordering UX. */
export function hasEqualSlots(t: StripTemplate): boolean {
  const first = t.slots[0]!
  return t.slots.every((s) => Math.abs(s.w - first.w) < 1e-6 && Math.abs(s.h - first.h) < 1e-6)
}
