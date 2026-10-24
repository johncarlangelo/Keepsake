/** Vector sticker registry — SVG path data in a 0–100 box, drawn via Path2D. */
import type { StickerDef } from '../types'

/** six-petal flower, generated deterministically (still pure data at module load) */
function flowerPath(petals = 6, rOuter = 46, rInner = 18): string {
  const parts: string[] = []
  for (let i = 0; i < petals; i++) {
    const a0 = (i / petals) * Math.PI * 2
    const a1 = ((i + 0.5) / petals) * Math.PI * 2
    const a2 = ((i + 1) / petals) * Math.PI * 2
    const p0 = [50 + Math.cos(a0) * rInner, 50 + Math.sin(a0) * rInner]
    const tip = [50 + Math.cos(a1) * rOuter, 50 + Math.sin(a1) * rOuter]
    const p1 = [50 + Math.cos(a2) * rInner, 50 + Math.sin(a2) * rInner]
    const cp = [50 + Math.cos(a1) * rInner * 1.35, 50 + Math.sin(a1) * rInner * 1.35]
    if (i === 0) parts.push(`M${p0[0]!.toFixed(1)} ${p0[1]!.toFixed(1)}`)
    parts.push(
      `Q${tip[0]!.toFixed(1)} ${tip[1]!.toFixed(1)} ${p1[0]!.toFixed(1)} ${p1[1]!.toFixed(1)}`,
      `Q${cp[0]!.toFixed(1)} ${cp[1]!.toFixed(1)} ${i === petals - 1 ? `M${p0[0]!.toFixed(1)} ${p0[1]!.toFixed(1)}` : ''}`.trim()
    )
  }
  return `${parts.filter(Boolean).join(' ')} Z`
}

/** six-arm snow sparkle */
function snowPath(arms = 6): string {
  const parts: string[] = []
  for (let i = 0; i < arms; i++) {
    const a = (i / arms) * Math.PI * 2
    const x = 50 + Math.cos(a) * 44
    const y = 50 + Math.sin(a) * 44
    const b = a + Math.PI / 2
    const w = 5
    parts.push(`L${(50 + Math.cos(a) * 18 + Math.cos(b) * w).toFixed(1)} ${(50 + Math.sin(a) * 18 + Math.sin(b) * w).toFixed(1)} L${x.toFixed(1)} ${y.toFixed(1)} L${(50 + Math.cos(a) * 18 - Math.cos(b) * w).toFixed(1)} ${(50 + Math.sin(a) * 18 - Math.sin(b) * w).toFixed(1)}`)
  }
  return `M50 6 ${parts.join(' ')} Z`
}

export const STICKERS: StickerDef[] = [
  {
    id: 'heart',
    name: 'Heart',
    defaultColor: '#C4797F',
    path: 'M50 88 C22 64 8 48 8 32 C8 18 19 10 30 10 C39 10 46 15 50 22 C54 15 61 10 70 10 C81 10 92 18 92 32 C92 48 78 64 50 88 Z',
  },
  {
    id: 'star',
    name: 'Star',
    defaultColor: '#B98A2F',
    path: 'M50 6 L61 38 L95 38 L67 58 L78 92 L50 70 L22 92 L33 58 L5 38 L39 38 Z',
  },
  {
    id: 'sparkle',
    name: 'Sparkle',
    defaultColor: '#B98A2F',
    path: 'M50 4 C55 30 62 40 96 50 C62 60 55 70 50 96 C45 70 38 60 4 50 C38 40 45 30 50 4 Z',
  },
  {
    id: 'moon',
    name: 'Crescent',
    defaultColor: '#B98A2F',
    path: 'M64 8 A44 44 0 1 0 64 92 A36 36 0 1 1 64 8 Z',
  },
  {
    id: 'cloud',
    name: 'Cloud',
    defaultColor: '#9AB6C9',
    path: 'M25 72 A17 17 0 0 1 25 38 A22 22 0 0 1 67 30 A17 17 0 0 1 78 72 Z',
  },
  {
    id: 'bow',
    name: 'Bow',
    defaultColor: '#C4797F',
    path: 'M50 46 C36 24 14 26 12 42 C10 56 32 60 50 54 Z M50 46 C64 24 86 26 88 42 C90 56 68 60 50 54 Z M50 46 L43 80 L57 80 Z',
  },
  {
    id: 'tape',
    name: 'Washi',
    defaultColor: 'rgba(214,180,140,0.8)',
    path: 'M14 38 L86 38 L94 56 L86 66 L14 66 L6 56 Z',
  },
  {
    id: 'bubble',
    name: 'Speech',
    defaultColor: '#F4E3DC',
    path: 'M16 18 H84 A8 8 0 0 1 92 26 V54 A8 8 0 0 1 84 62 H46 L30 82 L34 62 H16 A8 8 0 0 1 8 54 V26 A8 8 0 0 1 16 18 Z',
  },
  {
    id: 'crown',
    name: 'Crown',
    defaultColor: '#B98A2F',
    path: 'M12 76 L10 38 L29 52 L50 20 L71 52 L90 38 L88 76 Z',
  },
  {
    id: 'flower',
    name: 'Flower',
    defaultColor: '#C4797F',
    path: flowerPath(),
  },
  {
    id: 'snow',
    name: 'Snow',
    defaultColor: '#9AB6C9',
    path: snowPath(),
  },
  {
    id: 'petal',
    name: 'Petal',
    defaultColor: '#7D8B6A',
    path: 'M50 6 C72 28 78 56 50 94 C22 56 28 28 50 6 Z',
  },
]

export const STICKER_PALETTE = ['#C4797F', '#B98A2F', '#7D8B6A', '#2B2118', '#FFFFFF', '#9AB6C9', '#A3565E']

export function getSticker(id: string): StickerDef | null {
  return STICKERS.find((s) => s.id === id) ?? null
}
