import { describe, expect, it } from 'vitest'
import { TEMPLATES, DEFAULT_TEMPLATE_ID, getTemplate, slotAspect, slotRects, hasEqualSlots } from '../src/data/templates'
import { isValidNormalizedRect } from '../src/lib/images'

describe('template registry (VERIFY A1)', () => {
  it('has at least 10 templates', () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(10)
  })

  it('covers shot counts 1, 2, 3, 4 and 6', () => {
    const shots = new Set(TEMPLATES.map((t) => t.shots))
    for (const n of [1, 2, 3, 4, 6]) expect(shots.has(n), `missing ${n}-shot template`).toBe(true)
  })

  it('includes at least 3 templates with unequal slot sizes', () => {
    const unequal = TEMPLATES.filter((t) => !hasEqualSlots(t))
    expect(unequal.length).toBeGreaterThanOrEqual(3)
    expect(unequal.map((t) => t.id)).toEqual(expect.arrayContaining(['hero-4', 'hero-3', 'mosaic-4', 'collage-3']))
  })

  it('declares slot counts matching slot arrays', () => {
    for (const t of TEMPLATES) {
      expect(t.slots.length, `${t.id}`).toBe(t.shots)
    }
  })

  it('all slot rects are normalized within 0–1 and positive', () => {
    for (const t of TEMPLATES) {
      for (const s of t.slots) {
        expect(isValidNormalizedRect(s), `${t.id} slot ${JSON.stringify(s)}`).toBe(true)
      }
    }
  })

  it('has unique ids and a valid default', () => {
    const ids = new Set(TEMPLATES.map((t) => t.id))
    expect(ids.size).toBe(TEMPLATES.length)
    expect(getTemplate(DEFAULT_TEMPLATE_ID).id).toBe(DEFAULT_TEMPLATE_ID)
    expect(getTemplate('does-not-exist').id).toBe(TEMPLATES[0]!.id)
  })

  it('computes design-space aspect ratios per slot', () => {
    const t = getTemplate('hero-4')
    // hero slot is landscape, bottom row slots are portrait
    expect(slotAspect(t, 0)).toBeGreaterThan(1)
    expect(slotAspect(t, 1)).toBeLessThan(1)
  })

  it('maps normalized slots into canvas pixel space', () => {
    const t = getTemplate('classic-4')
    const rects = slotRects(t, 600, 1840)
    expect(rects.length).toBe(4)
    expect(rects[0]!.x).toBeCloseTo(0.06 * 600)
    const last = rects[3]!
    expect(last.y + last.h).toBeLessThanOrEqual(1840 + 0.001)
  })
})
