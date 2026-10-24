/** Filter rendering: CSS-filter string path, per-pixel fallback, overlay passes. See D-006. */
import type { FilterParams, OverlaySpec, Rect } from '../types'
import { grainTile, hashSeed, makePattern } from './patterns'

/* ---------- identity / lerp ---------- */

export const IDENTITY: Required<FilterParams> = {
  brightness: 1,
  contrast: 1,
  saturation: 1,
  hue: 0,
  sepia: 0,
  grayscale: 0,
  blur: 0,
}

export function lerpParams(p: FilterParams, intensity: number): Required<FilterParams> {
  const t = Math.min(1, Math.max(0, intensity))
  const mix = (a: number | undefined, identity: number) => identity + ((a ?? identity) - identity) * t
  return {
    brightness: mix(p.brightness, 1),
    contrast: mix(p.contrast, 1),
    saturation: mix(p.saturation, 1),
    hue: mix(p.hue, 0),
    sepia: mix(p.sepia, 0),
    grayscale: mix(p.grayscale, 0),
    blur: mix(p.blur, 0),
  }
}

/* ---------- CSS filter string (for ctx.filter and DOM previews) ---------- */

export function buildFilterString(p: FilterParams, intensity: number, scaleHint = 1): string {
  const q = lerpParams(p, intensity)
  const parts: string[] = []
  if (Math.abs(q.brightness - 1) > 0.001) parts.push(`brightness(${q.brightness.toFixed(3)})`)
  if (Math.abs(q.contrast - 1) > 0.001) parts.push(`contrast(${q.contrast.toFixed(3)})`)
  if (Math.abs(q.saturation - 1) > 0.001) parts.push(`saturate(${q.saturation.toFixed(3)})`)
  if (Math.abs(q.hue) > 0.01) parts.push(`hue-rotate(${q.hue.toFixed(1)}deg)`)
  if (q.sepia > 0.001) parts.push(`sepia(${q.sepia.toFixed(3)})`)
  if (q.grayscale > 0.001) parts.push(`grayscale(${q.grayscale.toFixed(3)})`)
  if (q.blur > 0.01) parts.push(`blur(${(q.blur * scaleHint).toFixed(2)}px)`)
  return parts.length ? parts.join(' ') : 'none'
}

/* ---------- capability detection ---------- */

let filterSupport: boolean | null = null

export function ctxFilterSupported(): boolean {
  if (filterSupport !== null) return filterSupport
  try {
    const c = document.createElement('canvas')
    c.width = c.height = 1
    const ctx = c.getContext('2d')
    if (!ctx || !('filter' in ctx)) {
      filterSupport = false
      return false
    }
    ctx.filter = 'blur(1px)'
    filterSupport = ctx.filter === 'blur(1px)'
  } catch {
    filterSupport = false
  }
  return filterSupport
}

/* ---------- per-pixel fallback (color matrix) ---------- */

type Mat3 = number[] // row-major 3x3

function multiply(a: Mat3, b: Mat3): Mat3 {
  const out = new Array(9).fill(0) as Mat3
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out[r * 3 + c] =
        a[r * 3]! * b[c]! +
        a[r * 3 + 1]! * b[3 + c]! +
        a[r * 3 + 2]! * b[6 + c]!
    }
  }
  return out
}

function brightnessMat(k: number): Mat3 {
  return [k, 0, 0, 0, k, 0, 0, 0, k]
}
function saturationMat(k: number): Mat3 {
  const lr = 0.213
  const lg = 0.715
  const lb = 0.072
  return [
    lr * (1 - k) + k, lg * (1 - k), lb * (1 - k),
    lr * (1 - k), lg * (1 - k) + k, lb * (1 - k),
    lr * (1 - k), lg * (1 - k), lb * (1 - k) + k,
  ]
}
function sepiaMat(k: number): Mat3 {
  const s: Mat3 = [0.393, 0.769, 0.189, 0.349, 0.686, 0.168, 0.272, 0.534, 0.131]
  if (k >= 1) return s
  const id = [1, 0, 0, 0, 1, 0, 0, 0, 1] as Mat3
  return id.map((v, i) => v + (s[i]! - v) * k) as Mat3
}
function grayscaleMat(k: number): Mat3 {
  return saturationMat(1 - k)
}
function hueMat(deg: number): Mat3 {
  const rad = (deg * Math.PI) / 180
  const c = Math.cos(rad)
  const s = Math.sin(rad)
  // standard SVG feColorMatrix hueRotate matrix
  return [
    0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072,
  ]
}

/**
 * Process a source canvas through the color part of the filter via a 3×3 matrix.
 * Contrast is affine so it is applied around 0.5 before/after the matrix.
 */
export function applyColorMatrix(canvas: HTMLCanvasElement, p: FilterParams, intensity: number): HTMLCanvasElement {
  const q = lerpParams(p, intensity)
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = img.data

  let m: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1]
  if (Math.abs(q.brightness - 1) > 0.001) m = multiply(brightnessMat(q.brightness), m)
  if (Math.abs(q.saturation - 1) > 0.001) m = multiply(saturationMat(q.saturation), m)
  if (q.sepia > 0.001) m = multiply(sepiaMat(q.sepia), m)
  if (q.grayscale > 0.001) m = multiply(grayscaleMat(q.grayscale), m)
  if (Math.abs(q.hue) > 0.01) m = multiply(hueMat(q.hue), m)

  const contrast = q.contrast
  const pre = -0.5 * contrast + 0.5 // contrast * v + pre  ⇒  contrast around 0.5

  for (let i = 0; i < d.length; i += 4) {
    let r = contrast * d[i]! + pre
    let g = contrast * d[i + 1]! + pre
    let b = contrast * d[i + 2]! + pre
    r = m[0]! * r + m[1]! * g + m[2]! * b
    g = m[3]! * r + m[4]! * g + m[5]! * b
    b = m[6]! * r + m[7]! * g + m[8]! * b
    d[i] = r < 0 ? 0 : r > 255 ? 255 : r
    d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g
    d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

/** Cheap blur approximation: downsample then upsample with smoothing. */
export function applyCheapBlur(canvas: HTMLCanvasElement, blurPx: number): HTMLCanvasElement {
  if (blurPx < 0.5) return canvas
  const small = document.createElement('canvas')
  const factor = Math.max(2, Math.min(8, Math.round(blurPx / 1.5)))
  small.width = Math.max(1, Math.round(canvas.width / factor))
  small.height = Math.max(1, Math.round(canvas.height / factor))
  const sctx = small.getContext('2d')
  const ctx = canvas.getContext('2d')
  if (!sctx || !ctx) return canvas
  sctx.imageSmoothingEnabled = true
  sctx.imageSmoothingQuality = 'high'
  sctx.drawImage(canvas, 0, 0, small.width, small.height)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(small, 0, 0, canvas.width, canvas.height)
  return canvas
}

/**
 * Draw an image through the filter when ctx.filter is unsupported:
 * render source → process pixels → draw result with the given drawImage args.
 */
export function drawWithPixelFilter(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceW: number,
  sourceH: number,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  params: FilterParams,
  intensity: number,
  scaleHint: number
): void {
  const q = lerpParams(params, intensity)
  const temp = document.createElement('canvas')
  temp.width = Math.max(1, Math.round(sw))
  temp.height = Math.max(1, Math.round(sh))
  const tctx = temp.getContext('2d')
  if (!tctx) {
    ctx.drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh)
    return
  }
  tctx.drawImage(source, sx, sy, sw, sh, 0, 0, temp.width, temp.height)
  applyColorMatrix(temp, q, 1)
  if (q.blur > 0.01) applyCheapBlur(temp, q.blur * scaleHint * (temp.width / Math.max(1, dw)))
  ctx.drawImage(temp, 0, 0, temp.width, temp.height, dx, dy, dw, dh)
}

/* ---------- overlay passes (universal) ---------- */

const LEAK_COLORS: Record<NonNullable<OverlaySpec['leak']>, [string, string]> = {
  warm: ['rgba(255,168,66,0.55)', 'rgba(255,120,40,0.0)'],
  cool: ['rgba(90,150,255,0.5)', 'rgba(120,80,255,0.0)'],
  gold: ['rgba(255,206,110,0.55)', 'rgba(255,180,80,0.0)'],
  rose: ['rgba(255,150,170,0.5)', 'rgba(255,190,200,0.0)'],
}

export function applyVignette(ctx: CanvasRenderingContext2D, rect: Rect, strength: number): void {
  if (strength <= 0.001) return
  const { x, y, w, h } = rect
  const r = Math.max(w, h) * 0.75
  const grad = ctx.createRadialGradient(x + w / 2, y + h / 2, r * 0.45, x + w / 2, y + h / 2, r)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(1, `rgba(20,12,6,${(strength * 0.9).toFixed(3)})`)
  ctx.save()
  ctx.fillStyle = grad
  ctx.fillRect(x, y, w, h)
  ctx.restore()
}

export function applyGrain(ctx: CanvasRenderingContext2D, rect: Rect, strength: number, seedKey: string): void {
  if (strength <= 0.001) return
  const tile = grainTile(hashSeed(seedKey))
  const pattern = makePattern(ctx, tile)
  if (!pattern) return
  ctx.save()
  ctx.globalCompositeOperation = 'overlay'
  ctx.globalAlpha = Math.min(0.6, strength * 0.75)
  ctx.fillStyle = pattern
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
  ctx.restore()
}

export function applyLeak(ctx: CanvasRenderingContext2D, rect: Rect, hue: NonNullable<OverlaySpec['leak']>, strength: number, angle = 0): void {
  if (strength <= 0.001) return
  const [c0, c1] = LEAK_COLORS[hue]
  const { x, y, w, h } = rect
  const diag = Math.hypot(w, h)
  const cx = x + w / 2
  const cy = y + h / 2
  const ax = Math.cos(angle) * diag * 0.5
  const ay = Math.sin(angle) * diag * 0.5
  const grad = ctx.createLinearGradient(cx - ax, cy - ay, cx + ax, cy + ay)
  grad.addColorStop(0, c0)
  grad.addColorStop(0.55, c0)
  grad.addColorStop(1, c1)
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.globalAlpha = Math.min(0.75, strength)
  ctx.fillStyle = grad
  ctx.fillRect(x, y, w, h)
  ctx.restore()
}

export function applyFade(ctx: CanvasRenderingContext2D, rect: Rect, strength: number): void {
  if (strength <= 0.001) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighten'
  ctx.fillStyle = `rgba(238,230,216,${(strength * 0.5).toFixed(3)})`
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
  ctx.restore()
}

export function applyOverlays(ctx: CanvasRenderingContext2D, rect: Rect, spec: OverlaySpec, intensity: number, seedKey: string): void {
  const t = Math.min(1, Math.max(0, intensity))
  if (spec.fade) applyFade(ctx, rect, spec.fade * t)
  if (spec.leak) {
    const angle = (hashSeed(seedKey) % 628) / 100
    applyLeak(ctx, rect, spec.leak, (spec.leakStrength ?? 0.3) * t, angle)
  }
  if (spec.vignette) applyVignette(ctx, rect, spec.vignette * t)
  if (spec.grain) applyGrain(ctx, rect, spec.grain * t, seedKey)
}
