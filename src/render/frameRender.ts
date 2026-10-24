/** Frame & decor rendering — declarative FrameTheme → canvas, all in normalized units. */
import type { FrameTheme, Motif, Rect } from '../types'
import { grainTile, hashSeed, makePattern, seededRandom } from './patterns'

/* ---------- motif mini-paths (0–100 box) ---------- */

const MOTIF_PATHS: Record<Motif, string> = {
  heart: 'M50 88 C22 64 8 48 8 32 C8 18 19 10 30 10 C39 10 46 15 50 22 C54 15 61 10 70 10 C81 10 92 18 92 32 C92 48 78 64 50 88 Z',
  star: 'M50 6 L61 38 L95 38 L67 58 L78 92 L50 70 L22 92 L33 58 L5 38 L39 38 Z',
  sparkle: 'M50 4 C55 30 62 40 96 50 C62 60 55 70 50 96 C45 70 38 60 4 50 C38 40 45 30 50 4 Z',
  daisy: 'M50 22 C58 8 74 12 74 26 C88 26 90 44 78 50 C90 58 86 74 72 74 C68 88 50 90 46 76 C32 84 18 74 24 60 C10 54 14 34 28 36 C28 22 42 16 50 22 Z',
  bow: 'M50 46 C36 24 14 26 12 42 C10 56 32 60 50 54 Z M50 46 C64 24 86 26 88 42 C90 56 68 60 50 54 Z M50 46 L43 80 L57 80 Z',
  dot: 'M50 12 A38 38 0 1 0 50 88 A38 38 0 1 0 50 12 Z',
  moon: 'M64 8 A44 44 0 1 0 64 92 A36 36 0 1 1 64 8 Z',
  bubble: 'M16 18 H84 A8 8 0 0 1 92 26 V54 A8 8 0 0 1 84 62 H46 L30 82 L34 62 H16 A8 8 0 0 1 8 54 V26 A8 8 0 0 1 16 18 Z',
}

function drawMotif(ctx: CanvasRenderingContext2D, motif: Motif, cx: number, cy: number, size: number, color: string, rotation = 0): void {
  ctx.save()
  ctx.translate(cx, cy)
  if (rotation) ctx.rotate((rotation * Math.PI) / 180)
  ctx.scale(size / 100, size / 100)
  ctx.translate(-50, -50)
  ctx.fillStyle = color
  ctx.fill(new Path2D(MOTIF_PATHS[motif]))
  ctx.restore()
}

/* ---------- background & texture ---------- */

export function resolveBg(frame: FrameTheme, customColor?: string): string | { grad: [string, string]; angle?: number } {
  if (customColor) return customColor
  return frame.bg
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  frame: FrameTheme,
  customColor?: string
): void {
  const bg = resolveBg(frame, customColor)
  if (typeof bg === 'string') {
    ctx.fillStyle = bg
  } else {
    const rad = ((bg.angle ?? 180) * Math.PI) / 180
    const diag = Math.hypot(W, H)
    const cx = W / 2
    const cy = H / 2
    const ax = (Math.cos(rad) * diag) / 2
    const ay = (Math.sin(rad) * diag) / 2
    const g = ctx.createLinearGradient(cx - ax, cy - ay, cx + ax, cy + ay)
    g.addColorStop(0, bg.grad[0])
    g.addColorStop(1, bg.grad[1])
    ctx.fillStyle = g
  }
  ctx.fillRect(0, 0, W, H)

  switch (frame.texture) {
    case 'paper':
    case 'noise': {
      const tile = grainTile(hashSeed(`tex-${frame.id}`))
      const pattern = makePattern(ctx, tile)
      if (pattern) {
        ctx.save()
        ctx.globalCompositeOperation = frame.texture === 'paper' ? 'multiply' : 'overlay'
        ctx.globalAlpha = frame.texture === 'paper' ? 0.045 : 0.06
        ctx.fillStyle = pattern
        ctx.fillRect(0, 0, W, H)
        ctx.restore()
      }
      break
    }
    case 'gingham': {
      const step = W / 26
      ctx.save()
      ctx.globalAlpha = 0.08
      ctx.strokeStyle = '#B98A2F'
      ctx.lineWidth = Math.max(1, step * 0.5)
      for (let x = 0; x < W; x += step) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, H)
        ctx.stroke()
      }
      for (let y = 0; y < H; y += step) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(W, y)
        ctx.stroke()
      }
      ctx.restore()
      break
    }
    case 'halftone': {
      const step = W / 40
      ctx.save()
      ctx.globalAlpha = 0.12
      ctx.fillStyle = frame.category === 'Y2K' ? '#C4797F' : '#8FA6BC'
      for (let y = step / 2; y < H; y += step) {
        for (let x = step / 2; x < W; x += step) {
          ctx.beginPath()
          ctx.arc(x, y, step * 0.16, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.restore()
      break
    }
    default:
      break
  }
}

/* ---------- decor ---------- */

export interface FrameGeometry {
  /** full canvas size */
  W: number
  H: number
  /** content area after frame padding */
  content: Rect
  /** footer band inside content (bottom strip under slots), if template has one */
  footer: Rect | null
}

function scatterArea(area: FrameGeometry, where: 'top' | 'bottom' | 'left' | 'right' | 'corners' | 'border'): Array<{ x: number; y: number }> {
  const { W, H, content } = area
  const band = Math.max(W, H) * 0.045
  const pts: Array<{ x: number; y: number }> = []
  const pushBand = (x0: number, x1: number, y0: number, y1: number) => {
    pts.push({ x: (x0 + x1) / 2, y: (y0 + y1) / 2 })
  }
  switch (where) {
    case 'top':
      for (let x = W * 0.08; x < W * 0.95; x += band * 1.6) pushBand(x, x + band, 0, content.y)
      break
    case 'bottom':
      for (let x = W * 0.08; x < W * 0.95; x += band * 1.6) pushBand(x, x + band, content.y + content.h, H)
      break
    case 'left':
      for (let y = H * 0.05; y < H * 0.97; y += band * 1.6) pushBand(0, content.x, y, y + band)
      break
    case 'right':
      for (let y = H * 0.05; y < H * 0.97; y += band * 1.6) pushBand(content.x + content.w, W, y, y + band)
      break
    case 'corners': {
      const m = band * 0.8
      pts.push({ x: m, y: m }, { x: W - m, y: m }, { x: m, y: H - m }, { x: W - m, y: H - m })
      break
    }
    case 'border':
    default:
      return [...scatterArea(area, 'top'), ...scatterArea(area, 'bottom'), ...scatterArea(area, 'left'), ...scatterArea(area, 'right')]
  }
  return pts
}

export function drawDecor(ctx: CanvasRenderingContext2D, geo: FrameGeometry, frame: FrameTheme): void {
  if (!frame.decor) return
  const { W, H } = geo
  for (const d of frame.decor) {
    switch (d.type) {
      case 'scatter': {
        const pts = scatterArea(geo, d.area)
        const rnd = seededRandom(hashSeed(`${frame.id}-scatter-${d.motif}`))
        const positions = (d.area === 'corners' ? pts.slice(0, Math.min(d.count, pts.length)) : shuffleTake(pts, d.count, rnd))
        positions.forEach((p, i) => {
          const size = d.size * W * (0.8 + rnd() * 0.5)
          const rot = rnd() * 360
          const cx = p.x + (rnd() - 0.5) * W * 0.012
          const cy = p.y + (rnd() - 0.5) * W * 0.012
          const color = i % 4 === 3 && d.motif !== 'dot' ? withAlpha(d.color, 0.55) : d.color
          drawMotif(ctx, d.motif, cx, cy, size, color, rot)
        })
        break
      }
      case 'sprockets': {
        const color = d.color ?? '#D8C9A8'
        const holeW = W * 0.028
        const holeH = holeW * 0.62
        const gap = W * 0.05
        const rows: number[] = []
        if (d.position === 'top' || d.position === 'both') rows.push(geo.content.y * 0.5)
        if (d.position === 'bottom' || d.position === 'both') rows.push(H - (H - (geo.content.y + geo.content.h)) * 0.5)
        ctx.save()
        ctx.fillStyle = color
        for (const cy of rows) {
          for (let x = gap; x < W - holeW; x += holeW + gap) {
            ctx.beginPath()
            roundRectPath(ctx, x, cy - holeH / 2, holeW, holeH, holeH * 0.3)
            ctx.fill()
          }
        }
        ctx.restore()
        break
      }
      case 'tape': {
        const size = W * 0.09
        ctx.save()
        ctx.fillStyle = d.color
        for (const corner of d.corners) {
          const cx = corner === 'tl' || corner === 'bl' ? W * 0.055 : W * 0.945
          const cy = corner === 'tl' || corner === 'tr' ? H * 0.045 : H * 0.955
          ctx.save()
          ctx.translate(cx, cy)
          ctx.rotate(corner === 'tl' || corner === 'br' ? -Math.PI / 9 : Math.PI / 9)
          ctx.fillRect(-size / 2, -size / 5, size, size / 2.5)
          ctx.restore()
        }
        ctx.restore()
        break
      }
      case 'stitch': {
        ctx.save()
        ctx.strokeStyle = d.color
        ctx.lineWidth = Math.max(1, W * 0.0022)
        ctx.setLineDash([W * 0.014, W * 0.01])
        const inset = W * 0.012
        ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2)
        ctx.restore()
        break
      }
      case 'frameNumbers': {
        if (!geo.footer) break
        ctx.save()
        ctx.fillStyle = d.color
        ctx.font = `500 ${Math.max(8, W * 0.016)}px ui-monospace, Menlo, Consolas, monospace`
        ctx.textBaseline = 'top'
        const y = geo.footer.y + geo.footer.h * 0.5
        ctx.fillText('KS·24A', geo.footer.x + W * 0.01, y)
        const label = '▸▸ 04'
        const tw = ctx.measureText(label).width
        ctx.fillText(label, geo.footer.x + geo.footer.w - tw - W * 0.01, y)
        ctx.restore()
        break
      }
      case 'footerBar': {
        if (!geo.footer) break
        const barH = Math.min(geo.footer.h * 0.14, W * 0.012)
        const y = geo.footer.y + geo.footer.h - barH * 2.4
        if (d.colors.length === 2) {
          const half = geo.footer.w / 2
          ctx.fillStyle = d.colors[0]
          ctx.fillRect(geo.footer.x, y, half, barH)
          ctx.fillStyle = d.colors[1]
          ctx.fillRect(geo.footer.x + half, y, half, barH)
        } else {
          ctx.fillStyle = d.colors[0]
          ctx.fillRect(geo.footer.x, y, geo.footer.w, barH)
        }
        break
      }
      case 'chromeLabel': {
        if (!geo.footer) break
        ctx.save()
        const fs = Math.max(9, W * 0.02)
        ctx.font = `700 ${fs}px ui-monospace, Menlo, Consolas, monospace`
        const grad = ctx.createLinearGradient(geo.footer.x, 0, geo.footer.x + geo.footer.w, 0)
        grad.addColorStop(0, '#8A8AB0')
        grad.addColorStop(0.5, '#FFFFFF')
        grad.addColorStop(1, '#8A8AB0')
        ctx.fillStyle = grad
        ctx.textBaseline = 'bottom'
        ctx.fillText(d.text, geo.footer.x, geo.footer.y + geo.footer.h - fs * 0.4)
        ctx.restore()
        break
      }
      case 'dots': {
        if (!geo.footer) break
        const n = 9
        const r = Math.max(1.2, W * 0.004)
        const y = geo.footer.y + geo.footer.h * 0.62
        const usable = geo.footer.w * 0.5
        ctx.save()
        ctx.fillStyle = d.color
        for (let i = 0; i < n; i++) {
          const x = geo.footer.x + geo.footer.w / 2 - usable / 2 + (usable / (n - 1)) * i
          ctx.beginPath()
          ctx.arc(x, y, r, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
        break
      }
    }
  }
}

function shuffleTake<T>(arr: T[], n: number, rnd: () => number): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    const tmp = copy[i]!
    copy[i] = copy[j]!
    copy[j] = tmp
  }
  return copy.slice(0, Math.min(n, copy.length))
}

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('rgba')) return color
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }
  return color
}

/* ---------- slot chrome ---------- */

export function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  ctx.arcTo(x + w, y, x + w, y + rr, rr)
  ctx.lineTo(x + w, y + h - rr)
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr)
  ctx.lineTo(x + rr, y + h)
  ctx.arcTo(x, y + h, x, y + h - rr, rr)
  ctx.lineTo(x, y + rr)
  ctx.arcTo(x, y, x + rr, y, rr)
  ctx.closePath()
}

export function drawSlotShadow(ctx: CanvasRenderingContext2D, rect: Rect, radius: number, W: number): void {
  ctx.save()
  ctx.shadowColor = 'rgba(43,33,24,0.35)'
  ctx.shadowBlur = W * 0.012
  ctx.shadowOffsetY = W * 0.004
  ctx.fillStyle = 'rgba(0,0,0,0.001)'
  roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, radius)
  ctx.fill()
  ctx.restore()
}

export function drawSlotStroke(ctx: CanvasRenderingContext2D, rect: Rect, radius: number, color: string, widthFrac: number, W: number): void {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(1, widthFrac * W)
  roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, radius)
  ctx.stroke()
  ctx.restore()
}
