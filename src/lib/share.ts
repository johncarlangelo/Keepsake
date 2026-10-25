/** Export filename builder + download / Web Share helpers. */

export function exportFilename(prefix = 'keepsake', date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  const stamp = `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}`
  return `${prefix}-${stamp}.png`
}

/**
 * iOS/iPadOS detection. iPadOS 13+ reports as desktop "Macintosh" in Safari,
 * so touch points are the tell (D-033).
 */
export function isIos(ua: string = navigator.userAgent, maxTouchPoints = navigator.maxTouchPoints ?? 0): boolean {
  return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/i.test(ua) && maxTouchPoints > 1)
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

/** Synchronously decode a data URL into a Blob (no awaits — gesture-safe). */
export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',')
  const head = dataUrl.slice(0, comma)
  const b64 = dataUrl.slice(comma + 1)
  const mime = /:(.*?);/.exec(head)?.[1] ?? 'application/octet-stream'
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/**
 * PNG-encode a canvas synchronously via toDataURL. canvas.toBlob is async,
 * and on iOS Safari the await eats the tap's transient user activation — the
 * download/share that follows would be blocked (D-033). This keeps the whole
 * export inside the gesture.
 */
export function canvasToPngSync(canvas: HTMLCanvasElement): Blob {
  const dataUrl = canvas.toDataURL('image/png')
  const blob = dataUrlToBlob(dataUrl)
  if (blob.size === 0) throw new Error('PNG encoding failed')
  return blob
}

/**
 * Save a PNG with the right mechanism per platform, synchronously from the
 * user gesture. iOS: the share sheet ("Save to Photos") — <a download> with a
 * blob URL is unreliable there, especially outside a gesture. Everywhere else:
 * the classic anchor download.
 */
export function savePngFromBlob(
  blob: Blob,
  filename: string,
  ua: string = navigator.userAgent,
  maxTouchPoints = navigator.maxTouchPoints ?? 0
): 'shared' | 'downloaded' {
  const file = new File([blob], filename, { type: 'image/png' })
  let canFileShare = false
  try {
    canFileShare = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
  } catch {
    canFileShare = false
  }
  if (isIos(ua, maxTouchPoints) && canFileShare) {
    // fire within the activation window; the promise settles whenever
    void navigator.share({ files: [file], title: 'Keepsake' }).catch(() => {})
    return 'shared'
  }
  downloadBlob(blob, filename)
  return 'downloaded'
}

/** Rough user-facing platform hint for saving when no share/download works. */
export function platformSaveHint(ua: string): string {
  if (/iphone|ipad|ipod/i.test(ua)) {
    return 'Tip: the share sheet opens — choose "Save Image" to add the strip to your Photos.'
  }
  if (/android/i.test(ua)) {
    return 'Tip: use Share to save into your gallery app, or Download and check your Files app.'
  }
  return 'Your browser will save the PNG to your Downloads folder.'
}
