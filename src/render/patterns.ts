/** Deterministic pattern/RNG helpers — seeded so preview and export match exactly (D-005/D-006). */

/** mulberry32 PRNG */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashSeed(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const grainCanvases = new Map<number, HTMLCanvasElement>()

/** Grayscale noise tile (grayscale); cached by seed. */
export function grainTile(seed: number, size = 128): HTMLCanvasElement {
  const cached = grainCanvases.get(seed)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const img = ctx.createImageData(size, size)
    const rnd = seededRandom(seed)
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(rnd() * 256)
      img.data[i] = v
      img.data[i + 1] = v
      img.data[i + 2] = v
      img.data[i + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
  }
  grainCanvases.set(seed, canvas)
  return canvas
}

export function makePattern(ctx: CanvasRenderingContext2D, tile: HTMLCanvasElement): CanvasPattern | null {
  return ctx.createPattern(tile, 'repeat')
}
