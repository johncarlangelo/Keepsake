/** THE composition renderer — one code path for preview and export (DECISIONS D-005). */
import type { Composition, Rect, SlotEdit, TextConfig } from '../types'
import { getFilter } from '../data/filters'
import { getTemplate } from '../data/templates'
import { getFrame } from '../data/frames'
import { getSticker } from '../data/stickers'
import { coverCrop } from '../lib/images'
import { applyOverlays, buildFilterString, ctxFilterSupported, drawWithPixelFilter } from './filterRender'
import {
  drawBackground,
  drawDecor,
  drawSlotShadow,
  drawSlotStroke,
  roundRectPath,
  type FrameGeometry,
} from './frameRender'

export interface RenderImage {
  source: CanvasImageSource
  width: number
  height: number
}

export const AUTO_TEXT_COLOR = 'auto'

export function emptyComposition(templateId: string, photoIds: Array<string | null> = []): Composition {
  const template = getTemplate(templateId)
  return {
    templateId,
    frameId: 'classic-white',
    slots: template.slots.map((_, i) => emptySlot(photoIds[i] ?? null)),
    text: { caption: '', showDate: true, font: 'script', color: AUTO_TEXT_COLOR, align: 'center', size: 0.05 },
    stickers: [],
  }
}

export function emptySlot(photoId: string | null): SlotEdit {
  return { photoId, filterId: null, intensity: 1, crop: { zoom: 1, x: 0, y: 0 }, flip: false }
}

function fontString(kind: TextConfig['font'], px: number): string {
  switch (kind) {
    case 'script':
      // Caveat has a small x-height; nudge it up so script captions read at the same size
      return `600 ${(px * 1.15).toFixed(1)}px Caveat, cursive`
    case 'serif':
      return `600 ${px.toFixed(1)}px Fraunces, Georgia, serif`
    case 'mono':
      return `500 ${px.toFixed(1)}px ui-monospace, Menlo, Consolas, monospace`
    default:
      return `600 ${px.toFixed(1)}px -apple-system, "Segoe UI", Roboto, sans-serif`
  }
}

function formatDate(d = new Date()): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Compute the frame-relative geometry (pure; unit-tested). */
export function computeGeometry(templateId: string, frameId: string, W: number, H: number): FrameGeometry & { slotRects: Rect[] } {
  const template = getTemplate(templateId)
  const frame = getFrame(frameId)
  const content: Rect = {
    x: frame.padding.l * W,
    y: frame.padding.t * H,
    w: W - (frame.padding.l + frame.padding.r) * W,
    h: H - (frame.padding.t + frame.padding.b) * H,
  }
  const footer: Rect | null = template.footer
    ? {
        x: content.x,
        y: content.y + content.h * (1 - template.footer.h),
        w: content.w,
        h: content.h * template.footer.h,
      }
    : null
  const slotRects: Rect[] = template.slots.map((s) => ({
    x: content.x + s.x * content.w,
    y: content.y + s.y * content.h,
    w: s.w * content.w,
    h: s.h * content.h,
  }))
  return { W, H, content, footer, slotRects }
}

export interface RenderOptions {
  /** empty-slot treatment: near-invisible (editor canvas) or warm sample fills (pickers) */
  placeholder?: 'subtle' | 'sample'
  /** draw caption/date in the footer band (false for tiny previews where text is noise) */
  text?: boolean
}

const SAMPLE_FILLS = ['#E5C9BC', '#D7DECB', '#EBDFC2', '#D8CBDD', '#E9D4C9', '#CFD9D4']

/**
 * Render a composition onto a target canvas at the given pixel width.
 * Uses the same passes at preview and export sizes (ARCHITECHTURE §6.2).
 */
export function renderComposition(
  target: HTMLCanvasElement,
  comp: Composition,
  images: Record<string, RenderImage | undefined>,
  targetWidth: number,
  opts: RenderOptions = {}
): void {
  const { placeholder = 'subtle', text = true } = opts
  const ctx = target.getContext('2d')
  if (!ctx) return
  const template = getTemplate(comp.templateId)
  const frame = getFrame(comp.frameId)
  const scale = targetWidth / template.canvas.w
  const W = Math.round(targetWidth)
  const H = Math.round(template.canvas.h * scale)
  target.width = W
  target.height = H

  const geo = computeGeometry(comp.templateId, comp.frameId, W, H)

  // 1. background + texture
  drawBackground(ctx, W, H, frame, comp.frameColor)

  // 2. slots
  const useCtxFilter = ctxFilterSupported()
  geo.slotRects.forEach((rect, i) => {
    const slot = comp.slots[i] ?? emptySlot(null)
    const radius = (frame.slotRadius ?? 0) * Math.min(rect.w, rect.h)

    if (frame.slotShadow) drawSlotShadow(ctx, rect, radius, W)

    ctx.save()
    roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, radius)
    ctx.clip()

    const img = slot.photoId ? images[slot.photoId] : undefined
    if (img) {
      const aspect = rect.w / rect.h
      const crop = coverCrop(img.width, img.height, aspect, slot.crop.zoom, slot.crop.x, slot.crop.y)
      const filter = getFilter(slot.filterId)
      ctx.save()
      if (slot.flip) {
        ctx.translate(rect.x + rect.w, rect.y)
        ctx.scale(-1, 1)
        ctx.translate(-rect.x, -rect.y)
      }
      if (filter) {
        if (useCtxFilter) {
          ctx.filter = buildFilterString(filter.params, slot.intensity, rect.w / 600)
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img.source, crop.sx, crop.sy, crop.sw, crop.sh, rect.x, rect.y, rect.w, rect.h)
          ctx.filter = 'none'
        } else {
          drawWithPixelFilter(
            ctx, img.source, img.width, img.height,
            crop.sx, crop.sy, crop.sw, crop.sh,
            rect.x, rect.y, rect.w, rect.h,
            filter.params, slot.intensity, rect.w / 600
          )
        }
        applyOverlays(ctx, rect, filter.overlays, slot.intensity, `${comp.templateId}:${i}:${slot.filterId}`)
      } else {
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img.source, crop.sx, crop.sy, crop.sw, crop.sh, rect.x, rect.y, rect.w, rect.h)
      }
      ctx.restore()
    } else {
      // empty slot: quiet fill in the editor; warm sample fills in pickers/preview cards
      ctx.fillStyle =
        placeholder === 'sample'
          ? SAMPLE_FILLS[i % SAMPLE_FILLS.length] ?? 'rgba(43,33,24,0.05)'
          : 'rgba(43,33,24,0.05)'
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
    }
    ctx.restore()

    if (frame.slotStroke) {
      drawSlotStroke(ctx, rect, radius, frame.slotStroke.color, frame.slotStroke.width, W)
    }
  })

  // 3. frame decor (sprockets, tape, stitches, scatter, footer bars…)
  drawDecor(ctx, geo, frame)

  // 4. caption / date in footer band
  if (geo.footer && text) {
    const textColor = comp.text.color === AUTO_TEXT_COLOR ? frame.footerStyle?.color ?? '#2B2118' : comp.text.color
    drawFooterText(ctx, geo.footer, comp.text, textColor)
  }

  // 5. stickers on top
  for (const p of comp.stickers) {
    const def = getSticker(p.stickerId)
    if (!def) continue
    const size = p.scale * W
    ctx.save()
    ctx.translate(p.x * W, p.y * H)
    ctx.rotate((p.rotation * Math.PI) / 180)
    ctx.scale(size / 100, size / 100)
    ctx.translate(-50, -50)
    ctx.fillStyle = p.color
    ctx.fill(new Path2D(def.path))
    ctx.restore()
  }
}

function drawFooterText(ctx: CanvasRenderingContext2D, footer: Rect, text: TextConfig, color: string): void {
  const caption = text.caption.trim()
  if (!caption && !text.showDate) return

  const padX = footer.w * 0.04
  const maxWidth = footer.w - padX * 2
  const alignX = text.align === 'left' ? footer.x + padX : text.align === 'right' ? footer.x + footer.w - padX : footer.x + footer.w / 2
  ctx.save()
  ctx.fillStyle = color
  ctx.textAlign = text.align === 'center' ? 'center' : text.align
  ctx.textBaseline = 'middle'

  const dateStr = text.showDate ? formatDate() : ''
  const datePx = Math.max(10, footer.h * 0.28)

  if (caption) {
    // user size, clamped so a huge caption can't swallow the footer band, then shrink-to-fit
    let capPx = Math.max(12, Math.min(text.size * footer.w, footer.h * 0.55))
    ctx.font = fontString(text.font, capPx)
    while (ctx.measureText(caption).width > maxWidth && capPx > 10) {
      capPx *= 0.94
      ctx.font = fontString(text.font, capPx)
    }
    ctx.fillText(caption, alignX, footer.y + footer.h * (dateStr ? 0.32 : 0.55))
  }
  if (dateStr) {
    ctx.font = fontString('mono', datePx)
    ctx.fillText(dateStr, alignX, footer.y + footer.h * (caption ? 0.76 : 0.55))
  }
  ctx.restore()
}

/**
 * Render at export scale to an offscreen canvas. Fully synchronous: the export
 * click handler must reach the share/download call before iOS Safari expires
 * the tap's user activation (D-033) — no awaits before saving.
 */
export function renderExportCanvas(comp: Composition, images: Record<string, RenderImage | undefined>, scale: 2 | 3): HTMLCanvasElement {
  const template = getTemplate(comp.templateId)
  const canvas = document.createElement('canvas')
  renderComposition(canvas, comp, images, template.canvas.w * scale)
  return canvas
}
