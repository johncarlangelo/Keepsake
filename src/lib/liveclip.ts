/**
 * Live-photo clips (Phase 20, D-034): a short recording around each shutter
 * press, stored additively beside the still. MediaRecorder-based; codec list
 * prefers MP4 (iOS Safari) and falls back to WebM (Chrome/Android/Firefox).
 * The camera stream is NEVER stopped by the recorder — callers own its life.
 */

export const LIVE_MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
] as const

export type MimeSupported = (mime: string) => boolean

const defaultSupported: MimeSupported = (mime) =>
  typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(mime)

/** First supported recording codec — MP4 for iOS Safari, WebM elsewhere. */
export function pickLiveMime(isSupported: MimeSupported = defaultSupported): string | null {
  for (const mime of LIVE_MIME_CANDIDATES) {
    try {
      if (isSupported(mime)) return mime
    } catch {
      /* isTypeSupported can throw on exotic inputs — keep looking */
    }
  }
  return null
}

/** Clip length: the whole countdown plus a beat after the shutter, or 3s flat when untimed. */
export function liveClipDurationMs(countdown: 0 | 3 | 5): number {
  return countdown > 0 ? countdown * 1000 + 1200 : 3000
}

export function liveClipExt(mime: string): 'mp4' | 'webm' {
  return /mp4/i.test(mime) ? 'mp4' : 'webm'
}

export function supportsLiveCapture(): boolean {
  return (
    typeof MediaRecorder !== 'undefined' &&
    typeof MediaStream !== 'undefined' &&
    pickLiveMime() !== null
  )
}

export interface LiveRecording {
  /** Finalize and get the clip; resolves null when nothing was recorded. */
  stop: () => Promise<Blob | null>
  /** Abort without producing a clip (session ended / shot discarded). */
  cancel: () => void
  mime: string
}

/**
 * Record `stream` for ~durationMs. The stream's tracks keep running — only the
 * recorder stops, so the camera (and any following shot) is unaffected.
 */
export function startLiveClip(stream: MediaStream, mime: string, durationMs: number): LiveRecording | null {
  if (typeof MediaRecorder === 'undefined') return null
  let recorder: MediaRecorder
  try {
    recorder = new MediaRecorder(stream, { mimeType: mime })
  } catch {
    return null
  }
  const chunks: Blob[] = []
  let timer: number | null = null
  let finalized = false
  let stopFired = false
  let pending: ((v: Blob | null) => void) | null = null

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }

  const blobFrom = () => (chunks.length > 0 ? new Blob(chunks, { type: recorder.mimeType || mime }) : null)

  // 'stop' fires after the final dataavailable — this is the only reliable
  // "recording is complete" signal (a no-timeslice recorder emits nothing until stop)
  recorder.addEventListener('stop', () => {
    stopFired = true
    pending?.(blobFrom())
    pending = null
  })

  const requestStop = () => {
    if (finalized) return
    finalized = true
    try {
      recorder.stop()
    } catch {
      /* already inactive */
    }
  }

  recorder.start()
  timer = window.setTimeout(requestStop, durationMs)

  return {
    mime,
    stop: async () => {
      if (timer !== null) {
        window.clearTimeout(timer)
        timer = null
      }
      if (stopFired) return blobFrom()
      return new Promise<Blob | null>((resolve) => {
        pending = resolve
        requestStop()
      })
    },
    cancel: () => {
      if (timer !== null) {
        window.clearTimeout(timer)
        timer = null
      }
      pending = null
      finalized = true
      try {
        if (recorder.state !== 'inactive') recorder.stop()
      } catch {
        /* already inactive */
      }
    },
  }
}
