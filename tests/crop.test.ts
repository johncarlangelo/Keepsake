import { describe, expect, it } from 'vitest'
import { coverCrop, clamp } from '../src/lib/images'

describe('cover-crop math (VERIFY A5)', () => {
  it('crops width when the source is wider than the target aspect', () => {
    const c = coverCrop(1000, 1000, 0.5) // target portrait 1:2
    expect(c.sh).toBeCloseTo(1000)
    expect(c.sw).toBeCloseTo(500)
    expect(c.sx).toBeCloseTo(250)
    expect(c.sy).toBeCloseTo(0)
  })

  it('crops height when the source is taller', () => {
    const c = coverCrop(1000, 2000, 1) // square target
    expect(c.sw).toBeCloseTo(1000)
    expect(c.sh).toBeCloseTo(1000)
    expect(c.sy).toBeCloseTo(500)
  })

  it('zoom shrinks the crop window around the center', () => {
    const c = coverCrop(1000, 1000, 1, 2, 0, 0)
    expect(c.sw).toBeCloseTo(500)
    expect(c.sh).toBeCloseTo(500)
    expect(c.sx).toBeCloseTo(250)
  })

  it('pan moves the window and clamps to source bounds', () => {
    const far = coverCrop(1000, 1000, 1, 2, 0.49, 0)
    expect(far.sx).toBeCloseTo(500) // window 500 wide → max sx = 500
    expect(far.sx + far.sw).toBeLessThanOrEqual(1000.001)
    const neg = coverCrop(1000, 1000, 1, 2, -0.49, 0)
    expect(neg.sx).toBeGreaterThanOrEqual(-0.001)
  })

  it('never returns zero or negative windows', () => {
    for (const aspect of [0.25, 0.5, 1, 2, 4, 9]) {
      const c = coverCrop(8, 12, aspect, 1, 0, 0)
      expect(c.sw).toBeGreaterThan(0)
      expect(c.sh).toBeGreaterThan(0)
    }
  })

  it('clamp helper works', () => {
    expect(clamp(5, 0, 3)).toBe(3)
    expect(clamp(-1, 0, 3)).toBe(0)
  })
})
