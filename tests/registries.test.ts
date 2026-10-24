import { describe, expect, it } from 'vitest'
import { FILTERS, FILTER_CATEGORIES, getFilter, NO_FILTER } from '../src/data/filters'
import { buildFilterString, lerpParams, IDENTITY } from '../src/render/filterRender'
import { FRAMES, getFrame, DEFAULT_FRAME_ID } from '../src/data/frames'
import { STICKERS, getSticker, STICKER_PALETTE } from '../src/data/stickers'

describe('filter registry (VERIFY A2)', () => {
  it('has at least 25 presets across at least 8 categories', () => {
    expect(FILTERS.length).toBeGreaterThanOrEqual(25)
    expect(new Set(FILTERS.map((f) => f.category)).size).toBeGreaterThanOrEqual(8)
    expect(FILTER_CATEGORIES.length).toBeGreaterThanOrEqual(8)
  })

  it('has unique ids and valid categories', () => {
    const ids = new Set(FILTERS.map((f) => f.id))
    expect(ids.size).toBe(FILTERS.length)
    for (const f of FILTERS) {
      expect(FILTER_CATEGORIES).toContain(f.category)
    }
  })

  it('keeps parameters in sane ranges', () => {
    for (const f of FILTERS) {
      const p = f.params
      if (p.brightness !== undefined) {
        expect(p.brightness, f.id).toBeGreaterThan(0.5)
        expect(p.brightness, f.id).toBeLessThan(1.6)
      }
      if (p.contrast !== undefined) {
        expect(p.contrast, f.id).toBeGreaterThan(0.5)
        expect(p.contrast, f.id).toBeLessThan(1.8)
      }
      if (p.saturation !== undefined) {
        expect(p.saturation, f.id).toBeGreaterThanOrEqual(0)
        expect(p.saturation, f.id).toBeLessThan(2)
      }
      if (p.sepia !== undefined) {
        expect(p.sepia, f.id).toBeGreaterThanOrEqual(0)
        expect(p.sepia, f.id).toBeLessThanOrEqual(1)
      }
      if (p.grayscale !== undefined) {
        expect(p.grayscale, f.id).toBeGreaterThanOrEqual(0)
        expect(p.grayscale, f.id).toBeLessThanOrEqual(1)
      }
      if (p.blur !== undefined) {
        expect(p.blur, f.id).toBeGreaterThanOrEqual(0)
        expect(p.blur, f.id).toBeLessThan(3)
      }
      if (p.hue !== undefined) expect(Math.abs(p.hue), f.id).toBeLessThanOrEqual(30)
      if (f.overlays.grain) expect(f.overlays.grain, f.id).toBeLessThanOrEqual(0.6)
      if (f.overlays.vignette) expect(f.overlays.vignette, f.id).toBeLessThanOrEqual(0.7)
    }
  })

  it('intensity 0 collapses to identity', () => {
    for (const f of FILTERS) {
      expect(lerpParams(f.params, 0)).toEqual(IDENTITY)
    }
  })

  it('intensity 1 keeps the preset; buildFilterString degrades to none', () => {
    const f = getFilter('golden-hour')!
    expect(lerpParams(f.params, 1).saturation).toBeCloseTo(f.params.saturation!)
    expect(buildFilterString(f.params, 0)).toBe('none')
    expect(buildFilterString(f.params, 1)).toContain('saturate')
  })

  it('resolves presets and rejects unknown ids', () => {
    expect(getFilter(NO_FILTER)).toBeNull()
    expect(getFilter(null)).toBeNull()
    expect(getFilter('nope')).toBeNull()
  })
})

describe('frame registry (VERIFY A3)', () => {
  it('has at least 20 presets with unique ids', () => {
    expect(FRAMES.length).toBeGreaterThanOrEqual(20)
    expect(new Set(FRAMES.map((f) => f.id)).size).toBe(FRAMES.length)
  })

  it('keeps paddings small and positive', () => {
    for (const f of FRAMES) {
      for (const side of [f.padding.t, f.padding.r, f.padding.b, f.padding.l] as number[]) {
        expect(side, f.id).toBeGreaterThan(0)
        expect(side, f.id).toBeLessThan(0.15)
      }
    }
  })

  it('has a valid default and graceful fallback', () => {
    expect(getFrame(DEFAULT_FRAME_ID).id).toBe(DEFAULT_FRAME_ID)
    expect(getFrame('missing').id).toBe(FRAMES[0]!.id)
  })

  it('includes a custom-color frame', () => {
    expect(FRAMES.some((f) => f.customColor)).toBe(true)
  })
})

describe('sticker registry (VERIFY A4)', () => {
  it('has at least 10 stickers with parseable-ish path data', () => {
    expect(STICKERS.length).toBeGreaterThanOrEqual(10)
    expect(new Set(STICKERS.map((s) => s.id)).size).toBe(STICKERS.length)
    for (const s of STICKERS) {
      expect(s.path.length, s.id).toBeGreaterThan(20)
      expect(s.path).toMatch(/^[MZQLAC ]/)
    }
    expect(getSticker('heart')).not.toBeNull()
    expect(getSticker('nope')).toBeNull()
  })

  it('exposes a color palette', () => {
    expect(STICKER_PALETTE.length).toBeGreaterThanOrEqual(5)
  })
})
