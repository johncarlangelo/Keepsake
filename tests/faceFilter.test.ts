import { describe, expect, it } from 'vitest'
import { FACE_FILTERS, getFaceFilter } from '../src/data/faceFilters'
import { coverTransform, shouldDetect, smoothPoint } from '../src/lib/faceFilter'

/** synthetic 468-point face: an ellipse of points + a few blendshapes */
function makeFace(w = 640, h = 480) {
  const pts = Array.from({ length: 468 }, (_, i) => {
    const a = (i / 468) * Math.PI * 2
    return { x: w / 2 + Math.cos(a) * w * 0.2, y: h / 2 + Math.sin(a) * h * 0.35 }
  })
  return { pts, bs: { jawOpen: 0.6, mouthSmileLeft: 0.5, mouthSmileRight: 0.4 } }
}

describe('face filters (Phase 21, D-036)', () => {
  it('ships six uniquely-id filters with draw functions', () => {
    expect(FACE_FILTERS).toHaveLength(6)
    const ids = new Set(FACE_FILTERS.map((f) => f.id))
    expect(ids.size).toBe(6)
    for (const f of FACE_FILTERS) {
      expect(typeof f.draw).toBe('function')
      expect(f.name.length).toBeGreaterThan(0)
      expect(f.mechanic.length).toBeGreaterThan(0)
    }
  })

  it('resolves filters by id and null otherwise', () => {
    expect(getFaceFilter('dog')?.name).toBe('Doggo')
    expect(getFaceFilter('nope')).toBeNull()
    expect(getFaceFilter(null)).toBeNull()
  })

  it('every filter draws without throwing on a synthetic face', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 480
    const ctx = canvas.getContext('2d')
    expect(ctx).toBeTruthy()
    for (const f of FACE_FILTERS) {
      expect(() => f.draw(ctx!, makeFace(), { time: 1234 })).not.toThrow()
    }
  })

  it('throttles detection to the inference budget', () => {
    expect(shouldDetect(0, 10)).toBe(false)
    expect(shouldDetect(0, 66)).toBe(true)
    expect(shouldDetect(0, 65.9)).toBe(false)
    expect(shouldDetect(0, 100, 120)).toBe(false)
    expect(shouldDetect(0, 120, 120)).toBe(true)
  })

  it('smooths points toward the next value', () => {
    expect(smoothPoint(undefined, { x: 10, y: 20 })).toEqual({ x: 10, y: 20 })
    const s = smoothPoint({ x: 0, y: 0 }, { x: 10, y: -10 }, 0.5)
    expect(s.x).toBeCloseTo(5)
    expect(s.y).toBeCloseTo(-5)
  })

  it('computes cover-crop transforms for the overlay and bake', () => {
    // wider box than video: x fills, y centers
    const wide = coverTransform(300, 600, 300, 300)
    expect(wide.scale).toBeCloseTo(1)
    expect(wide.dx).toBeCloseTo(0)
    expect(wide.dy).toBeCloseTo(-150)
    // taller box than video: y fills, x centers
    const tall = coverTransform(600, 300, 300, 300)
    expect(tall.scale).toBeCloseTo(1)
    expect(tall.dx).toBeCloseTo(-150)
    expect(tall.dy).toBeCloseTo(0)
    // square box + 4:3 video: the HEIGHT drives cover (2.667), x centers with crop
    const up = coverTransform(640, 480, 1280, 1280)
    expect(up.scale).toBeCloseTo(1280 / 480)
    expect(up.dx).toBeCloseTo((1280 - 640 * (1280 / 480)) / 2)
    expect(up.dy).toBeCloseTo(0)
    // degenerate inputs are safe
    expect(coverTransform(0, 0, 0, 0)).toEqual({ scale: 1, dx: 0, dy: 0 })
  })
})
