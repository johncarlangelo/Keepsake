import { describe, expect, it } from 'vitest'
import { computeGeometry, emptyComposition, renderComposition, type RenderImage } from '../src/render/compose'

type MockCtx = CanvasRenderingContext2D & { __getEvents: () => Array<{ type: string }> }

function events(ctx: CanvasRenderingContext2D): Array<{ type: string }> {
  return (ctx as MockCtx).__getEvents()
}

/** deterministic fake image source: canvas stub via jest-canvas-mock */
function fakeImage(w: number, h: number): RenderImage {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return { source: c, width: w, height: h }
}

describe('composition engine (VERIFY A10)', () => {
  it('computes frame geometry with padding and footer', () => {
    const geo = computeGeometry('classic-4', 'classic-white', 600, 1840)
    expect(geo.content.x).toBeGreaterThan(0)
    expect(geo.content.w).toBeLessThan(600)
    expect(geo.footer).not.toBeNull()
    expect(geo.slotRects).toHaveLength(4)
    for (const r of geo.slotRects) {
      expect(r.x).toBeGreaterThanOrEqual(geo.content.x - 0.01)
      expect(r.x + r.w).toBeLessThanOrEqual(geo.content.x + geo.content.w + 0.01)
    }
  })

  it('renders slots with balanced save/restore and one drawImage per photo', () => {
    const comp = emptyComposition('classic-4', ['p1', 'p2', 'p3', 'p4'])
    const images: Record<string, RenderImage> = {
      p1: fakeImage(800, 600),
      p2: fakeImage(600, 800),
      p3: fakeImage(1000, 1000),
      p4: fakeImage(500, 500),
    }
    const canvas = document.createElement('canvas')
    renderComposition(canvas, comp, images, 600)
    const ev = events(canvas.getContext('2d')!)
    const saves = ev.filter((e) => e.type === 'save').length
    const restores = ev.filter((e) => e.type === 'restore').length
    const draws = ev.filter((e) => e.type === 'drawImage').length
    expect(saves).toBe(restores)
    expect(draws).toBe(4)
  })

  it('renders empty slots without drawImage', () => {
    const comp = emptyComposition('duo-stack', [])
    const canvas = document.createElement('canvas')
    renderComposition(canvas, comp, {}, 400)
    const draws = events(canvas.getContext('2d')!).filter((e) => e.type === 'drawImage').length
    expect(draws).toBe(0)
  })

  it('is deterministic across scales (same pass sequence at 400 and 1200 wide)', () => {
    const comp = emptyComposition('fourcut-kr', ['a', 'b'])
    comp.slots[0]!.filterId = 'golden-hour'
    comp.stickers.push({ uid: 's1', stickerId: 'heart', x: 0.5, y: 0.95, scale: 0.1, rotation: 10, color: '#C4797F' })
    const images = { a: fakeImage(640, 480), b: fakeImage(640, 480) }
    const seq = (w: number): string => {
      const c = document.createElement('canvas')
      renderComposition(c, comp, images, w)
      return events(c.getContext('2d')!)
        .map((e) => e.type)
        .join(',')
    }
    expect(seq(400)).toBe(seq(1200))
  })
})
