/** Frame & theme registry — declarative decor rendered by render/frameRender.ts. */
import type { FrameTheme } from '../types'

export const FRAME_CATEGORIES = [
  'Classic',
  'Editorial',
  'Romantic',
  'Playful',
  'Korean',
  'Y2K',
  'Film',
  'Scrapbook',
  'Elegant',
  'Seasonal',
  'Custom',
] as const

export const FRAMES: FrameTheme[] = [
  /* Classic */
  { id: 'classic-white', name: 'Classic White', category: 'Classic', padding: { t: 0.028, r: 0.05, b: 0.06, l: 0.05 }, bg: '#FFFFFF', slotShadow: true, footerStyle: { font: 'serif', color: '#2B2118' } },
  { id: 'classic-ivory', name: 'Classic Ivory', category: 'Classic', padding: { t: 0.03, r: 0.052, b: 0.062, l: 0.052 }, bg: '#F7F1E5', texture: 'paper', slotShadow: true, footerStyle: { font: 'serif', color: '#2B2118' } },
  { id: 'classic-black', name: 'Classic Black', category: 'Classic', padding: { t: 0.028, r: 0.05, b: 0.06, l: 0.05 }, bg: '#2B2118', slotStroke: { color: 'rgba(255,253,246,0.18)', width: 0.003 }, slotShadow: true, footerStyle: { font: 'serif', color: '#F7F1E5' } },
  { id: 'glossy-white', name: 'Glossy Booth', category: 'Classic', padding: { t: 0.032, r: 0.056, b: 0.066, l: 0.056 }, bg: { grad: ['#FFFFFF', '#F1EADB'], angle: 180 }, slotRadius: 0.035, slotShadow: true, footerStyle: { font: 'sans', color: '#6E5F4E' } },

  /* Editorial */
  { id: 'editorial-min', name: 'Editorial Minimal', category: 'Editorial', padding: { t: 0.03, r: 0.045, b: 0.058, l: 0.045 }, bg: '#FFFDF6', footerStyle: { font: 'mono', color: '#6E5F4E', letterSpacing: 2 } },
  { id: 'editorial-stitch', name: 'Stitched Edge', category: 'Editorial', padding: { t: 0.032, r: 0.048, b: 0.06, l: 0.048 }, bg: '#FFFDF6', decor: [{ type: 'stitch', color: '#2B2118' }], footerStyle: { font: 'mono', color: '#2B2118', letterSpacing: 2 } },

  /* Romantic */
  { id: 'blush-romance', name: 'Blush Romance', category: 'Romantic', padding: { t: 0.034, r: 0.052, b: 0.08, l: 0.052 }, bg: { grad: ['#F8E9E3', '#F3D9DE'], angle: 160 }, slotRadius: 0.04, decor: [{ type: 'scatter', motif: 'heart', count: 9, area: 'bottom', color: '#D8A0A6', size: 0.028 }], footerStyle: { font: 'script', color: '#A3565E' } },
  { id: 'hearts-confetti', name: 'Hearts Confetti', category: 'Romantic', padding: { t: 0.036, r: 0.054, b: 0.082, l: 0.054 }, bg: '#FDF3F0', texture: 'paper', decor: [{ type: 'scatter', motif: 'heart', count: 18, area: 'border', color: '#C4797F', size: 0.024 }], footerStyle: { font: 'script', color: '#A3565E' } },

  /* Playful */
  { id: 'doodle-daisy', name: 'Doodle Daisy', category: 'Playful', padding: { t: 0.036, r: 0.054, b: 0.084, l: 0.054 }, bg: '#FDF8EA', texture: 'paper', slotRadius: 0.05, decor: [{ type: 'scatter', motif: 'daisy', count: 14, area: 'border', color: '#B98A2F', size: 0.026 }, { type: 'dots', color: '#9A8B77', area: 'bottom' }], footerStyle: { font: 'script', color: '#6E5F4E' } },
  { id: 'starry-night', name: 'Starry Night', category: 'Playful', padding: { t: 0.032, r: 0.05, b: 0.078, l: 0.05 }, bg: { grad: ['#2E2A45', '#1F1C33'], angle: 160 }, decor: [{ type: 'scatter', motif: 'star', count: 16, area: 'border', color: '#E8D9A0', size: 0.022 }, { type: 'scatter', motif: 'sparkle', count: 6, area: 'corners', color: '#F4E3DC', size: 0.02 }], footerStyle: { font: 'sans', color: '#E8D9A0' } },

  /* Korean */
  { id: 'korean-clean', name: 'Four-Cut Clean', category: 'Korean', padding: { t: 0.022, r: 0.035, b: 0.075, l: 0.035 }, bg: '#FFFFFF', decor: [{ type: 'footerBar', colors: ['#C4797F'] }], footerStyle: { font: 'sans', color: '#2B2118', letterSpacing: 3 } },
  { id: 'korean-pastel', name: 'Pastel Booth', category: 'Korean', padding: { t: 0.024, r: 0.038, b: 0.078, l: 0.038 }, bg: { grad: ['#EAF4F4', '#FDF6EC'], angle: 180 }, slotRadius: 0.04, decor: [{ type: 'dots', color: '#7D8B6A', area: 'bottom' }], footerStyle: { font: 'sans', color: '#6E5F4E', letterSpacing: 2 } },

  /* Y2K */
  { id: 'y2k-chrome', name: 'Y2K Chrome', category: 'Y2K', padding: { t: 0.03, r: 0.048, b: 0.08, l: 0.048 }, bg: { grad: ['#E9E9F2', '#C7C7DA'], angle: 200 }, slotRadius: 0.04, slotStroke: { color: '#FFFFFF', width: 0.005 }, decor: [{ type: 'chromeLabel', text: 'KEEPSAKE ✦ EST. 2000' }], footerStyle: { font: 'mono', color: '#4A4A66', letterSpacing: 2 } },
  { id: 'y2k-pink', name: 'Bubblegum', category: 'Y2K', padding: { t: 0.032, r: 0.05, b: 0.082, l: 0.05 }, bg: '#FFF0F5', texture: 'halftone', decor: [{ type: 'footerBar', colors: ['#FF8AC2', '#8AE0FF'] }, { type: 'scatter', motif: 'star', count: 8, area: 'corners', color: '#FF8AC2', size: 0.02 }], footerStyle: { font: 'sans', color: '#A3565E', letterSpacing: 1 } },

  /* Film */
  { id: 'film-sprocket', name: 'Sprocket Dark', category: 'Film', padding: { t: 0.055, r: 0.055, b: 0.095, l: 0.055 }, bg: '#1E1A16', texture: 'noise', decor: [{ type: 'sprockets', position: 'both', color: '#D8C9A8' }, { type: 'frameNumbers', color: '#D8C9A8' }], footerStyle: { font: 'mono', color: '#D8C9A8', letterSpacing: 2 } },
  { id: 'film-negative', name: 'Negative Strip', category: 'Film', padding: { t: 0.05, r: 0.05, b: 0.09, l: 0.05 }, bg: '#2B2118', texture: 'noise', decor: [{ type: 'sprockets', position: 'both', color: '#E4A661' }, { type: 'frameNumbers', color: '#E4A661' }], footerStyle: { font: 'mono', color: '#E4A661', letterSpacing: 3 } },
  { id: 'film-light', name: 'Archive Print', category: 'Film', padding: { t: 0.032, r: 0.05, b: 0.075, l: 0.05 }, bg: '#F3EBDB', texture: 'paper', decor: [{ type: 'frameNumbers', color: '#9A8B77' }], footerStyle: { font: 'mono', color: '#6E5F4E', letterSpacing: 1 } },

  /* Scrapbook */
  { id: 'scrapbook-tape', name: 'Scrapbook Tape', category: 'Scrapbook', padding: { t: 0.04, r: 0.056, b: 0.088, l: 0.056 }, bg: '#F5EEDC', texture: 'paper', slotRadius: 0.02, decor: [{ type: 'tape', corners: ['tl', 'br'], color: 'rgba(214,180,140,0.75)' }, { type: 'stitch', color: '#B98A2F' }], footerStyle: { font: 'script', color: '#6E5F4E' } },
  { id: 'scrapbook-gingham', name: 'Gingham Picnic', category: 'Scrapbook', padding: { t: 0.038, r: 0.054, b: 0.086, l: 0.054 }, bg: '#F8F3E4', texture: 'gingham', decor: [{ type: 'tape', corners: ['tr', 'bl'], color: 'rgba(196,121,127,0.55)' }], footerStyle: { font: 'script', color: '#A3565E' } },

  /* Elegant */
  { id: 'elegant-mono', name: 'Gallery Mono', category: 'Elegant', padding: { t: 0.036, r: 0.055, b: 0.08, l: 0.055 }, bg: '#FFFFFF', slotStroke: { color: '#2B2118', width: 0.0022 }, decor: [{ type: 'stitch', color: '#2B2118' }], footerStyle: { font: 'serif', color: '#2B2118', letterSpacing: 2 } },
  { id: 'elegant-ink', name: 'Ink & Gold', category: 'Elegant', padding: { t: 0.036, r: 0.055, b: 0.08, l: 0.055 }, bg: '#2B2118', slotStroke: { color: '#B98A2F', width: 0.003 }, footerStyle: { font: 'serif', color: '#B98A2F', letterSpacing: 2 } },

  /* Seasonal */
  { id: 'seasonal-snow', name: 'First Snow', category: 'Seasonal', padding: { t: 0.034, r: 0.052, b: 0.08, l: 0.052 }, bg: { grad: ['#F4F8FB', '#E9F0F6'], angle: 180 }, texture: 'halftone', decor: [{ type: 'scatter', motif: 'dot', count: 26, area: 'border', color: '#B9CBD9', size: 0.012 }, { type: 'scatter', motif: 'sparkle', count: 6, area: 'corners', color: '#D8E4EE', size: 0.018 }], footerStyle: { font: 'sans', color: '#6E5F4E' } },
  { id: 'seasonal-blossom', name: 'Blossom', category: 'Seasonal', padding: { t: 0.036, r: 0.052, b: 0.084, l: 0.052 }, bg: { grad: ['#FBEFF2', '#F9F5EC'], angle: 160 }, decor: [{ type: 'scatter', motif: 'daisy', count: 12, area: 'bottom', color: '#E5A9B4', size: 0.03 }, { type: 'scatter', motif: 'daisy', count: 6, area: 'top', color: '#EFC7CE', size: 0.024 }], footerStyle: { font: 'script', color: '#A3565E' } },
  { id: 'seasonal-festive', name: 'Festive Eve', category: 'Seasonal', padding: { t: 0.034, r: 0.052, b: 0.08, l: 0.052 }, bg: '#F3EFE6', texture: 'paper', decor: [{ type: 'scatter', motif: 'star', count: 10, area: 'corners', color: '#B98A2F', size: 0.02 }, { type: 'stitch', color: '#A83A32' }], footerStyle: { font: 'script', color: '#A83A32' } },

  /* Custom */
  { id: 'custom-color', name: 'Your Color', category: 'Custom', padding: { t: 0.03, r: 0.05, b: 0.07, l: 0.05 }, bg: '#F4E3DC', customColor: true, slotShadow: true, footerStyle: { font: 'sans', color: '#2B2118' } },
]

export const DEFAULT_FRAME_ID = 'classic-white'

export function getFrame(id: string): FrameTheme {
  return FRAMES.find((f) => f.id === id) ?? FRAMES[0]!
}
