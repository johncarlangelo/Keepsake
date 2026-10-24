/** Shared domain types for Keepsake. Keep this file dependency-free. */

/* ---------- Gallery / storage ---------- */

export type PhotoKind = 'capture' | 'strip'

export interface PhotoRecord {
  id: string
  kind: PhotoKind
  /** epoch ms */
  createdAt: number
  width: number
  height: number
  bytes: number
  /** original JPEG (capture) or PNG (strip) */
  blob: Blob
  /** ~320px JPEG thumbnail */
  thumb: Blob
  /** template/frame label for saved strips */
  label?: string
}

export interface GalleryEntry extends PhotoRecord {
  /** set when blob/thumb could not be decoded — never auto-deleted */
  corrupt: boolean
  thumbUrl?: string
}

export type SaveResult = { ok: true; record: PhotoRecord } | { ok: false; reason: 'quota' | 'unavailable' | 'unknown'; error?: unknown }

/* ---------- Geometry ---------- */

export interface Rect { x: number; y: number; w: number; h: number }

/* ---------- Strip templates ---------- */

export interface StripTemplate {
  id: string
  name: string
  category: 'classic' | 'fourcut' | 'grid' | 'hero' | 'film' | 'single' | 'collage'
  shots: number
  /** design-space canvas size in px; slots are normalized to this */
  canvas: { w: number; h: number }
  /** normalized 0–1 rects, gaps baked in */
  slots: Rect[]
  /** normalized footer band height reserved inside the canvas (below slots) */
  footer?: { h: number }
  orientation: 'portrait' | 'landscape'
  /** allow slot reordering in the editor */
  reorderable?: boolean
}

/* ---------- Filters ---------- */

export interface FilterParams {
  brightness?: number // 1 = identity
  contrast?: number
  saturation?: number
  hue?: number // deg
  sepia?: number // 0–1
  grayscale?: number // 0–1
  blur?: number // px at 600px reference width
}

export interface OverlaySpec {
  /** 0–1 film grain strength */
  grain?: number
  /** 0–1 vignette strength */
  vignette?: number
  /** light leak hue */
  leak?: 'warm' | 'cool' | 'gold' | 'rose' | null
  leakStrength?: number
  /** 0–1 matte fade (lifted blacks / milky highlight wash) */
  fade?: number
}

export interface FilterPreset {
  id: string
  name: string
  category:
    | 'Analog Film'
    | 'Disposable'
    | 'Vintage'
    | 'Warm & Golden'
    | 'Cool & Muted'
    | 'Soft Glow'
    | 'Y2K Digicam'
    | 'Monochrome'
    | 'Dramatic'
    | 'Pastel & Romantic'
  params: FilterParams
  overlays: OverlaySpec
}

/* ---------- Frames ---------- */

export type Motif = 'heart' | 'star' | 'sparkle' | 'daisy' | 'bow' | 'dot' | 'moon' | 'bubble'

export type FrameDecor =
  | { type: 'scatter'; motif: Motif; count: number; area: 'top' | 'bottom' | 'left' | 'right' | 'corners' | 'border'; color: string; size: number }
  | { type: 'sprockets'; position: 'top' | 'bottom' | 'both'; color?: string }
  | { type: 'tape'; corners: Array<'tl' | 'tr' | 'bl' | 'br'>; color: string }
  | { type: 'stitch'; color: string }
  | { type: 'frameNumbers'; color: string }
  | { type: 'footerBar'; colors: [string] | [string, string] }
  | { type: 'chromeLabel'; text: string }
  | { type: 'dots'; color: string; area: 'top' | 'bottom' }

export interface FrameTheme {
  id: string
  name: string
  category: 'Classic' | 'Editorial' | 'Romantic' | 'Playful' | 'Korean' | 'Y2K' | 'Film' | 'Scrapbook' | 'Elegant' | 'Seasonal' | 'Custom'
  /** padding fractions: l/r of canvas width, t/b of canvas height */
  padding: { t: number; r: number; b: number; l: number }
  bg: string | { grad: [string, string]; angle?: number }
  texture?: 'none' | 'paper' | 'noise' | 'gingham' | 'halftone'
  /** slot inset stroke: color + width as fraction of canvas width */
  slotStroke?: { color: string; width: number }
  /** slot corner radius as fraction of slot's short side */
  slotRadius?: number
  /** subtle drop behind each slot */
  slotShadow?: boolean
  decor?: FrameDecor[]
  footerStyle?: { font: 'script' | 'serif' | 'mono' | 'sans'; color: string; letterSpacing?: number; uppercase?: boolean }
  /** allow user color customization (replaces bg) */
  customColor?: boolean
}

/* ---------- Stickers ---------- */

export interface StickerDef {
  id: string
  name: string
  /** SVG path data in a 0–100 viewBox */
  path: string
  /** multi-color stickers paint [fill, accent] */
  accent?: string
  defaultColor: string
}

export interface PlacedSticker {
  uid: string
  stickerId: string
  /** normalized to canvas (0–1) */
  x: number
  y: number
  /** width as fraction of canvas width */
  scale: number
  /** degrees */
  rotation: number
  color: string
}

/* ---------- Composition / editor ---------- */

export interface SlotEdit {
  photoId: string | null
  filterId: string | null
  /** 0–1, default 1 */
  intensity: number
  /** crop: zoom ≥1 plus pan offsets (normalized to source size) */
  crop: { zoom: number; x: number; y: number }
  flip: boolean
}

export interface TextConfig {
  caption: string
  showDate: boolean
  font: 'script' | 'serif' | 'mono' | 'sans'
  color: string
  align: 'left' | 'center' | 'right'
  /** font size as fraction of canvas width */
  size: number
}

export interface Composition {
  templateId: string
  frameId: string
  slots: SlotEdit[]
  text: TextConfig
  stickers: PlacedSticker[]
  /** user-chosen custom frame color (frames with customColor) */
  frameColor?: string
}

export type View = 'booth' | 'studio' | 'gallery'

export interface AppSettings {
  countdown: 0 | 3 | 5
  sound: boolean
  mirrorSave: boolean
  lastTemplateId: string
  exportScale: 2 | 3
}
