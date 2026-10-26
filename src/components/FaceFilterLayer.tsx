/**
 * Live-preview face-filter overlay (Phase 21, D-036): a canvas over the camera
 * video that runs the throttled MediaPipe loop and draws the selected filter.
 * The preview always mirrors the feed, so the drawing space mirrors too — the
 * capture bake applies the same math with the capture's own mirror flag.
 * Renders nothing (and runs nothing) when no filter is selected.
 */
import { useEffect, useRef, useState } from 'react'
import { getFaceFilter, type FaceFrame } from '../data/faceFilters'
import { coverTransform, FaceTracker } from '../lib/faceFilter'

export function FaceFilterLayer({
  videoRef,
  filterId,
  faceRef,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>
  filterId: string | null
  /** latest smoothed face, consumed by the capture bake in BoothScreen */
  faceRef: React.MutableRefObject<FaceFrame | null>
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const trackerRef = useRef<FaceTracker | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')

  useEffect(() => {
    if (!filterId) return
    let cancelled = false
    let raf = 0
    setStatus('loading')
    const tracker = trackerRef.current ?? new FaceTracker()
    trackerRef.current = tracker

    void (async () => {
      try {
        await tracker.ensureLoaded()
        if (cancelled) return
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
        return
      }

      const draw = () => {
        if (cancelled) return
        const video = videoRef.current
        const canvas = canvasRef.current
        const def = getFaceFilter(filterId)
        if (video && canvas && def && video.videoWidth) {
          const boxW = video.clientWidth
          const boxH = video.clientHeight
          const dpr = Math.min(2, window.devicePixelRatio || 1)
          const pw = Math.round(boxW * dpr)
          const ph = Math.round(boxH * dpr)
          if (canvas.width !== pw || canvas.height !== ph) {
            canvas.width = pw
            canvas.height = ph
          }
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.clearRect(0, 0, pw, ph)
            const frame = tracker.detect(video, performance.now())
            faceRef.current = frame
            if (frame) {
              // the video is CSS-mirrored in the preview; mirror the drawing
              // space identically, then map the raw video frame through
              // cover-crop (pw/ph are already dpr-scaled, so dx/dy/scale are
              // in canvas px directly)
              ctx.save()
              ctx.translate(pw, 0)
              ctx.scale(-1, 1)
              const { scale, dx, dy } = coverTransform(video.videoWidth, video.videoHeight, pw, ph)
              ctx.translate(dx, dy)
              ctx.scale(scale, scale)
              const pts = frame.pts.map((p) => ({ x: p.x * video.videoWidth, y: p.y * video.videoHeight }))
              def.draw(ctx, { pts, bs: frame.bs }, { time: performance.now() })
              ctx.restore()
            }
          }
        }
        raf = requestAnimationFrame(draw)
      }
      raf = requestAnimationFrame(draw)
    })()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      faceRef.current = null
    }
  }, [filterId, videoRef, faceRef])

  if (!filterId) return null

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <canvas ref={canvasRef} className="size-full" />
      {status === 'loading' ? (
        <div className="absolute inset-x-0 top-3 flex justify-center">
          <span className="rounded-[999px] bg-ink/80 px-3 py-1 text-xs font-semibold text-bg backdrop-blur">
            Loading face tracking…
          </span>
        </div>
      ) : null}
      {status === 'error' ? (
        <div className="absolute inset-x-0 top-3 flex justify-center">
          <span className="rounded-[999px] bg-danger/90 px-3 py-1 text-xs font-semibold text-white">
            Face tracking couldn't start here
          </span>
        </div>
      ) : null}
    </div>
  )
}
