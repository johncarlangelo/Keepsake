/** Filter preset registry — params compile to CSS-style filter chains + canvas overlays (D-006). */
import type { FilterPreset } from '../types'

export const FILTER_CATEGORIES = [
  'Analog Film',
  'Disposable',
  'Vintage',
  'Warm & Golden',
  'Cool & Muted',
  'Soft Glow',
  'Y2K Digicam',
  'Monochrome',
  'Dramatic',
  'Pastel & Romantic',
] as const

const F = (
  id: string,
  name: string,
  category: FilterPreset['category'],
  params: FilterPreset['params'],
  overlays: FilterPreset['overlays'] = {}
): FilterPreset => ({ id, name, category, params, overlays })

export const FILTERS: FilterPreset[] = [
  /* Analog Film */
  F('portra-warm', 'Portra Warm', 'Analog Film', { brightness: 1.04, contrast: 1.02, saturation: 1.08, hue: 4 }, { grain: 0.12, vignette: 0.15 }),
  F('cinestill-night', 'Cinestill Night', 'Analog Film', { brightness: 1.02, contrast: 1.12, saturation: 1.05, hue: -6 }, { leak: 'cool', leakStrength: 0.28, grain: 0.18 }),
  F('gold-200', 'Gold 200', 'Analog Film', { brightness: 1.05, contrast: 1.05, saturation: 1.15, hue: 8 }, { leak: 'gold', leakStrength: 0.2, grain: 0.1 }),
  F('ektar-vivid', 'Ektar Vivid', 'Analog Film', { contrast: 1.18, saturation: 1.35 }, { vignette: 0.2 }),
  F('superia-green', 'Superia Street', 'Analog Film', { brightness: 1.02, contrast: 1.04, saturation: 1.1, hue: -10 }, { grain: 0.12 }),

  /* Disposable */
  F('flash-pop', 'Flash Pop', 'Disposable', { brightness: 1.12, contrast: 1.1, saturation: 1.2 }, { vignette: 0.35, grain: 0.15 }),
  F('quicksnap-blue', 'QuickSnap', 'Disposable', { brightness: 1.03, contrast: 1.06, saturation: 0.95, hue: 6 }, { leak: 'cool', leakStrength: 0.18, grain: 0.2 }),
  F('retro-flash', 'Retro Flash', 'Disposable', { brightness: 1.08, contrast: 0.95, saturation: 1.1, blur: 0.6 }, { vignette: 0.25 }),

  /* Vintage */
  F('faded-70s', "Faded '70s", 'Vintage', { brightness: 1.02, contrast: 0.85, saturation: 0.75, sepia: 0.25 }, { fade: 0.3, grain: 0.18 }),
  F('sepia-script', 'Sepia Script', 'Vintage', { brightness: 1.02, contrast: 0.9, sepia: 0.55 }, { grain: 0.12, vignette: 0.2 }),
  F('attic-find', 'Attic Find', 'Vintage', { brightness: 0.95, contrast: 0.8, saturation: 0.6, sepia: 0.35 }, { fade: 0.35, grain: 0.25 }),
  F('old-tin', 'Old Tin', 'Vintage', { grayscale: 0.3, sepia: 0.5, contrast: 1.15 }, { vignette: 0.45, grain: 0.3 }),

  /* Warm & Golden */
  F('golden-hour', 'Golden Hour', 'Warm & Golden', { brightness: 1.06, saturation: 1.12, hue: 10 }, { leak: 'gold', leakStrength: 0.3 }),
  F('honey-glow', 'Honey Glow', 'Warm & Golden', { brightness: 1.08, contrast: 0.98, saturation: 1.05 }, { leak: 'warm', leakStrength: 0.25, fade: 0.1 }),
  F('terracotta', 'Terracotta', 'Warm & Golden', { saturation: 1.05, hue: 14, contrast: 1.05 }, { leak: 'warm', leakStrength: 0.2 }),

  /* Cool & Muted */
  F('overcast', 'Overcast', 'Cool & Muted', { brightness: 1.01, contrast: 0.95, saturation: 0.8, hue: -8 }),
  F('nordic-blue', 'Nordic Blue', 'Cool & Muted', { brightness: 1.02, contrast: 1.05, saturation: 0.9, hue: -15 }, { leak: 'cool', leakStrength: 0.2 }),
  F('sage-muted', 'Sage Muted', 'Cool & Muted', { brightness: 1.02, saturation: 0.7, hue: 18 }, { fade: 0.15 }),

  /* Soft Glow */
  F('dream-haze', 'Dream Haze', 'Soft Glow', { brightness: 1.1, blur: 1 }, { fade: 0.25, leak: 'rose', leakStrength: 0.15 }),
  F('silk-soft', 'Silk Soft', 'Soft Glow', { brightness: 1.05, contrast: 0.9, saturation: 1.05, blur: 0.5 }, { fade: 0.2 }),
  F('morning-light', 'Morning Light', 'Soft Glow', { brightness: 1.08, blur: 0.4 }, { leak: 'warm', leakStrength: 0.35 }),

  /* Y2K Digicam */
  F('digicam-blue', 'Digicam Blue', 'Y2K Digicam', { brightness: 1.05, contrast: 1.1, saturation: 1.15, hue: -18 }, { leak: 'cool', leakStrength: 0.3, grain: 0.1 }),
  F('milky-flash', 'Milky Flash', 'Y2K Digicam', { brightness: 1.15, contrast: 0.92, saturation: 1.1 }, { fade: 0.2, grain: 0.08 }),
  F('vhs-night', 'VHS Night', 'Y2K Digicam', { contrast: 1.2, saturation: 1.2, hue: -25, blur: 0.4 }, { leak: 'cool', leakStrength: 0.25, grain: 0.3 }),
  F('y2k-pink', 'Y2K Pink', 'Y2K Digicam', { brightness: 1.06, saturation: 1.2, hue: 18 }, { leak: 'rose', leakStrength: 0.35 }),

  /* Monochrome */
  F('silver-classic', 'Silver Classic', 'Monochrome', { grayscale: 1, contrast: 1.05 }),
  F('ink-contrast', 'Ink Contrast', 'Monochrome', { grayscale: 1, contrast: 1.3 }, { vignette: 0.3 }),
  F('platinum-fade', 'Platinum Fade', 'Monochrome', { grayscale: 1, brightness: 1.05 }, { fade: 0.3, grain: 0.1 }),
  F('warm-mono', 'Warm Mono', 'Monochrome', { grayscale: 0.85, sepia: 0.18, brightness: 1.03 }),

  /* Dramatic */
  F('noir-deep', 'Noir Deep', 'Dramatic', { grayscale: 1, contrast: 1.45, brightness: 0.95 }, { vignette: 0.5 }),
  F('crimson-dusk', 'Crimson Dusk', 'Dramatic', { contrast: 1.25, saturation: 1.25 }, { vignette: 0.4, leak: 'warm', leakStrength: 0.2 }),
  F('thunder', 'Thunder', 'Dramatic', { contrast: 1.3, brightness: 0.92, saturation: 0.85 }, { vignette: 0.45 }),

  /* Pastel & Romantic */
  F('petal', 'Petal', 'Pastel & Romantic', { brightness: 1.08, saturation: 0.9, hue: 12 }, { fade: 0.25, leak: 'rose', leakStrength: 0.3 }),
  F('candy-floss', 'Candy Floss', 'Pastel & Romantic', { brightness: 1.1, saturation: 1.15, hue: 20 }, { fade: 0.2, leak: 'rose', leakStrength: 0.25 }),
  F('first-love', 'First Love', 'Pastel & Romantic', { brightness: 1.05, contrast: 0.95, saturation: 1.1, hue: 10, blur: 0.4 }, { leak: 'rose', leakStrength: 0.2 }),
]

export const NO_FILTER = 'none'

export function getFilter(id: string | null): FilterPreset | null {
  if (!id || id === NO_FILTER) return null
  return FILTERS.find((f) => f.id === id) ?? null
}
