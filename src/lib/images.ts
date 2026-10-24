/** Image helpers: bitmap cache (LRU), object-URL pool, thumbnails, crop math. */
import type { Rect } from '../types'

/* ---------- ObjectUrlPool: all object URLs flow through here ---------- */

const activeUrls = new Map<string, Blob>()

export function pooledUrl(blob: Blob): string {
  const url = URL.createObjectURL(blob)
  activeUrls.set(url, blob)
  return url
}

export function revokeUrl(url: string): void {
  if (activeUrls.has(url)) {
    URL.revokeObjectURL(url)
    activeUrls.delete(url)
  }
}

export function revokeAll(): void {
  for (const url of activeUrls.keys()) URL.revokeObjectURL(url)
  activeUrls.clear()
}

/* ---------- Bitmap LRU cache: photoId -> ImageBitmap (cap 12) ---------- */

const CACHE_MAX = 12
const cache = new Map<string, ImageBitmap>()

export async function getBitmap(photoId: string, blob: Blob): Promise<ImageBitmap> {
  const hit = cache.get(photoId)
  if (hit) {
    cache.delete(photoId)
    cache.set(photoId, hit) // refresh LRU order
    return hit
  }
  const bmp = await decodeBlob(blob)
  cache.set(photoId, bmp)
  if (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) {
      const evicted = cache.get(oldest)
      cache.delete(oldest)
      evicted?.close()
    }
  }
  return bmp
}

export function dropBitmap(photoId: string): void {
  cache.get(photoId)?.close()
  cache.delete(photoId)
}

export function clearBitmaps(): void {
  for (const bmp of cache.values()) bmp.close()
  cache.clear()
}

async function decodeBlob(blob: Blob): Promise<ImageBitmap> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(blob)
  }
  // Legacy fallback via HTMLImageElement
  return new Promise<ImageBitmap>((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      // Cast is safe: renderer only uses drawImage-compatible surface
      resolve(img as unknown as ImageBitmap)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image could not be decoded'))
    }
    img.src = url
  })
}

/* ---------- thumbnails ---------- */

export async function makeThumb(source: CanvasImageSource, maxEdge = 320, mime = 'image/jpeg', quality = 0.82): Promise<Blob> {
  const sw = 'width' in source ? Number(source.width) : 0
  const sh = 'height' in source ? Number(source.height) : 0
  const scale = Math.min(1, maxEdge / Math.max(sw, sh))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(sw * scale))
  canvas.height = Math.max(1, Math.round(sh * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable for thumbnail')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  const blob = await canvasToBlob(canvas, mime, quality)
  if (!blob) throw new Error('Thumbnail encoding failed')
  return blob
}

export function canvasToBlob(canvas: HTMLCanvasElement, mime = 'image/png', quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mime, quality))
}

/* ---------- crop math (pure; tested) ---------- */

export interface CoverCrop {
  /** source-space rect to draw */
  sx: number
  sy: number
  sw: number
  sh: number
}

/**
 * Cover-fit a source image into a target aspect, with user zoom (≥1) and pan.
 * Pan (x,y) is normalized -0.5..0.5 of the post-zoom slack; clamped so the
 * crop window stays inside the source.
 */
export function coverCrop(
  srcW: number,
  srcH: number,
  targetAspect: number,
  zoom = 1,
  panX = 0,
  panY = 0
): CoverCrop {
  const safeW = Math.max(1, srcW)
  const safeH = Math.max(1, srcH)
  const srcAspect = safeW / safeH
  let cw: number
  let ch: number
  if (srcAspect > targetAspect) {
    // source wider: crop full height, width = height * targetAspect
    ch = safeH
    cw = safeH * targetAspect
  } else {
    cw = safeW
    ch = safeW / targetAspect
  }
  const z = Math.max(1, zoom)
  const windowW = cw / z
  const windowH = ch / z
  const cx = clamp((panX + 0.5) * safeW, windowW / 2, safeW - windowW / 2)
  const cy = clamp((panY + 0.5) * safeH, windowH / 2, safeH - windowH / 2)
  return {
    sx: cx - windowW / 2,
    sy: cy - windowH / 2,
    sw: windowW,
    sh: windowH,
  }
}

/** Rect helper: does a normalized rect stay within 0–1 with positive size? */
export function isValidNormalizedRect(r: Rect): boolean {
  return (
    r.x >= 0 && r.y >= 0 && r.w > 0 && r.h > 0 && r.x + r.w <= 1.0001 && r.y + r.h <= 1.0001
  )
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}
