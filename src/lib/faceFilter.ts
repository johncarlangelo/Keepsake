/**
 * Face-tracking engine (Phase 21, D-036): MediaPipe Face Landmarker, fully
 * local. The model (~3.7 MB) and WASM runtime are bundled in `public/mediapipe/`
 * and loaded LAZILY on the first filter activation — the site never fetches
 * them otherwise, and no request ever leaves the device. Detection is
 * throttled (~15 Hz) and point-smoothed; the video itself renders at full
 * frame rate, so prop positions interpolate between inferences.
 */
import type { FaceLandmarker } from '@mediapipe/tasks-vision'
import type { FacePoint } from '../data/faceFilters'

export interface FaceFrame {
  /** smoothed landmark points, normalized 0..1 in RAW (unmirrored) video space */
  pts: FacePoint[]
  /** blendshape scores by name (jawOpen, mouthSmileLeft, …) */
  bs: Record<string, number>
}

export function supportsFaceFilters(): boolean {
  try {
    return typeof WebAssembly !== 'undefined'
  } catch {
    return false
  }
}

/** Run detection at most this often (ms) — the video renders at full fps regardless. */
export const DETECT_INTERVAL_MS = 66

export function shouldDetect(lastTs: number, tsMs: number, minInterval = DETECT_INTERVAL_MS): boolean {
  return tsMs - lastTs >= minInterval
}

/** exponential smoothing for one point (k = fraction of the new value to take) */
export function smoothPoint(prev: FacePoint | undefined, next: FacePoint, k = 0.55): FacePoint {
  if (!prev) return next
  return { x: prev.x + (next.x - prev.x) * k, y: prev.y + (next.y - prev.y) * k }
}

/**
 * object-fit: cover mapping of a video frame into a display box — pure so the
 * live overlay and the capture bake can share identical math (tests assert it).
 */
export function coverTransform(
  videoW: number,
  videoH: number,
  boxW: number,
  boxH: number
): { scale: number; dx: number; dy: number } {
  if (!videoW || !videoH || !boxW || !boxH) return { scale: 1, dx: 0, dy: 0 }
  const scale = Math.max(boxW / videoW, boxH / videoH)
  return {
    scale,
    dx: (boxW - videoW * scale) / 2,
    dy: (boxH - videoH * scale) / 2,
  }
}

let trackerPromise: Promise<FaceLandmarker> | null = null

function assetUrl(rel: string): string {
  return new URL(rel, document.baseURI).href
}

/** Lazily create (once) the FaceLandmarker; GPU delegate with CPU fallback. */
export async function loadFaceLandmarker(): Promise<FaceLandmarker> {
  if (!trackerPromise) {
    trackerPromise = (async () => {
      const vision = await import('@mediapipe/tasks-vision')
      const fileset = await vision.FilesetResolver.forVisionTasks(assetUrl('mediapipe/wasm'))
      const make = (delegate: 'GPU' | 'CPU') =>
        vision.FaceLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: assetUrl('mediapipe/models/face_landmarker.task'),
            delegate,
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
        })
      try {
        return await make('GPU')
      } catch {
        return await make('CPU')
      }
    })().catch((err) => {
      trackerPromise = null // allow a retry after a transient failure
      throw err
    })
  }
  return trackerPromise
}

/**
 * Wraps the landmarker with throttling + temporal smoothing and keeps the
 * latest frame available for the capture bake. Not recreated per session.
 */
export class FaceTracker {
  private lm: FaceLandmarker | null = null
  private loading: Promise<void> | null = null
  private lastDetectTs = -Infinity
  private smoothed = new Map<number, FacePoint>()
  last: FaceFrame | null = null

  get ready(): boolean {
    return this.lm !== null
  }

  async ensureLoaded(): Promise<void> {
    if (this.lm) return
    if (!this.loading) {
      this.loading = loadFaceLandmarker().then((lm) => {
        this.lm = lm
      })
    }
    await this.loading
  }

  /**
   * Detect at most every DETECT_INTERVAL_MS; returns the latest frame
   * (smoothed) whether or not a new inference just ran.
   */
  detect(video: HTMLVideoElement, tsMs: number): FaceFrame | null {
    if (!this.lm || video.readyState < 2) return this.last
    if (!shouldDetect(this.lastDetectTs, tsMs)) return this.last
    this.lastDetectTs = tsMs
    try {
      const res = this.lm.detectForVideo(video, tsMs)
      const lm = res.faceLandmarks?.[0]
      if (lm) {
        const pts: FacePoint[] = lm.map((p, i) => {
          const next = { x: p.x, y: p.y }
          const s = smoothPoint(this.smoothed.get(i), next)
          this.smoothed.set(i, s)
          return s
        })
        const bs: Record<string, number> = {}
        for (const c of res.faceBlendshapes?.[0]?.categories ?? []) bs[c.categoryName] = c.score
        this.last = { pts, bs }
      } else {
        this.last = null // no face — props disappear, nothing stale draws
        this.smoothed.clear()
      }
    } catch {
      /* a failed frame is skipped; the next tick retries */
    }
    return this.last
  }

  close(): void {
    try {
      this.lm?.close()
    } catch {
      /* already closed */
    }
    this.lm = null
    this.loading = null
    trackerPromise = null
    this.last = null
    this.smoothed.clear()
  }
}
