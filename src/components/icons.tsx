/** Icon set via lucide-react — 24px, 1.5px stroke (DESIGN §10: SVG icons, never emoji). */
import type { JSX } from 'react'
import {
  Aperture,
  Check,
  ChevronLeft,
  ChevronRight,
  Camera,
  Download,
  Frame,
  Images,
  LayoutGrid,
  Plus,
  RotateCcw,
  Share2,
  SlidersHorizontal,
  Sticker,
  SwitchCamera,
  Trash2,
  Type,
  Undo2,
  Redo2,
  Wand2,
  X,
  Info,
} from 'lucide-react'

export type IconName =
  | 'aperture'
  | 'gallery'
  | 'wand'
  | 'undo'
  | 'redo'
  | 'reset'
  | 'download'
  | 'share'
  | 'trash'
  | 'close'
  | 'switch'
  | 'info'
  | 'check'
  | 'plus'
  | 'camera'
  | 'shutter'
  | 'text'
  | 'sticker'
  | 'frame'
  | 'layout'
  | 'sliders'
  | 'arrowLeft'
  | 'arrowRight'

const MAP: Record<IconName, typeof Aperture> = {
  aperture: Aperture,
  gallery: Images,
  wand: Wand2,
  undo: Undo2,
  redo: Redo2,
  reset: RotateCcw,
  download: Download,
  share: Share2,
  trash: Trash2,
  close: X,
  switch: SwitchCamera,
  info: Info,
  check: Check,
  plus: Plus,
  camera: Camera,
  shutter: Aperture,
  text: Type,
  sticker: Sticker,
  frame: Frame,
  layout: LayoutGrid,
  sliders: SlidersHorizontal,
  arrowLeft: ChevronLeft,
  arrowRight: ChevronRight,
}

export function Icon({ name, size = 24, className }: { name: IconName; size?: number; className?: string }): JSX.Element {
  const Cmp = MAP[name] ?? Aperture
  return <Cmp size={size} strokeWidth={1.75} className={className} aria-hidden="true" />
}

/** Keepsake wordmark glyph: aperture heart (brand mark stays custom) */
export function Logo({ size = 26 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 16.4c-2.6-2.1-4.4-3.6-4.4-5.4 0-1.2.9-2 1.9-2 .8 0 1.5.4 2.5 1.6 1-1.2 1.7-1.6 2.5-1.6 1 0 1.9.8 1.9 2 0 1.8-1.8 3.3-4.4 5.4z"
        fill="currentColor"
      />
    </svg>
  )
}
