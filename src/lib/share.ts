/** Export filename builder + download / Web Share helpers. */
import { canvasToBlob } from './images'

export function exportFilename(prefix = 'keepsake', date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  const stamp = `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}`
  return `${prefix}-${stamp}.png`
}

export function canShareFiles(): boolean {
  try {
    return typeof navigator.canShare === 'function' && typeof File !== 'undefined' && navigator.canShare({ files: [new File([new Blob()], 'x.png', { type: 'image/png' })] })
  } catch {
    return false
  }
}

export async function sharePng(blob: Blob, filename: string): Promise<boolean> {
  try {
    const file = new File([blob], filename, { type: 'image/png' })
    if (navigator.canShare && !navigator.canShare({ files: [file] })) return false
    await navigator.share({ files: [file], title: 'Keepsake' })
    return true
  } catch (err) {
    if ((err as DOMException)?.name === 'AbortError') return true // user closed the sheet
    return false
  }
}

/** Download via anchor + object URL; revokes after 10 s (ARCHITECHTURE §7). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await canvasToBlob(canvas, 'image/png')
  if (!blob) throw new Error('PNG encoding failed')
  return blob
}

/** Rough user-facing platform hint for saving when no share/download works. */
export function platformSaveHint(ua: string): string {
  if (/iphone|ipad|ipod/i.test(ua)) {
    return 'Tip: press the image preview and choose "Add to Photos", or share it from the sheet.'
  }
  if (/android/i.test(ua)) {
    return 'Tip: use Share to save into your gallery app, or Download and check your Files app.'
  }
  return 'Your browser will save the PNG to your Downloads folder.'
}
