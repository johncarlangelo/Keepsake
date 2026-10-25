/**
 * Live strip player (Phase 20, D-034): the EXACT still strip render — same
 * StripCanvas/renderer, so frame, decor, and text are pixel-identical by
 * construction — with each slot's live clip overlaid on its rect. Clips of
 * mirrored selfie captures are flipped to match the stills.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { computeGeometry } from '../render/compose'
import { getTemplate } from '../data/templates'
import { getFrame } from '../data/frames'
import { useLiveClips, useRenderImages, StripCanvas } from './StripCanvas'
import type { Composition, LiveStripData } from '../types'
import { cn } from '../lib/cn'

export function LiveStripPlayer({
  liveStrip,
  date,
  className,
}: {
  liveStrip: LiveStripData
  /** date baked into the strip's footer (defaults to today, like the studio) */
  date?: Date
  className?: string
}) {
  const template = getTemplate(liveStrip.templateId)
  const frame = getFrame(liveStrip.frameId)
  const images = useRenderImages(liveStrip.slots)
  const clips = useLiveClips(liveStrip.slots, true)

  /* the same Composition shape the still strip renders */
  const comp: Composition = useMemo(
    () => ({
      templateId: liveStrip.templateId,
      frameId: liveStrip.frameId,
      frameColor: liveStrip.frameColor ?? undefined,
      text: liveStrip.text,
      slots: liveStrip.slots.map((id) => ({
        photoId: id || null,
        filterId: null,
        intensity: 1,
        crop: { zoom: 1, x: 0, y: 0 },
        flip: false,
      })),
      stickers: [],
    }),
    [liveStrip]
  )

  const geo = useMemo(
    () =>
      computeGeometry(
        liveStrip.templateId,
        liveStrip.frameId,
        1000,
        Math.round((1000 * template.canvas.h) / template.canvas.w)
      ),
    [liveStrip.templateId, liveStrip.frameId, template.canvas.h, template.canvas.w]
  )

  /* measured player width → px scale from the 1000-unit geometry (the canvas
     fills this box exactly: same aspect ratio) */
  const boxRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0]?.contentRect.width ?? 0)
      setWidth((prev) => (Math.abs(prev - w) <= 1 ? prev : w))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const s = width > 40 ? width / geo.W : 0

  const pct = (v: number, total: number) => `${(v / total) * 100}%`

  return (
    <div
      ref={boxRef}
      role="img"
      aria-label="Live strip — every photo replays its moment"
      className={cn('relative overflow-hidden', className)}
      style={{ aspectRatio: `${template.canvas.w} / ${template.canvas.h}`, height: '100%', maxWidth: '100%', margin: '0 auto' }}
    >
      {/* the still strip itself — identical frame, decor, and text */}
      <StripCanvas comp={comp} images={images} renderOpts={{ placeholder: 'sample', text: true, date }} />

      {liveStrip.slots.map((photoId, i) => {
        const r = geo.slotRects[i]
        if (!r) return null
        const clip = photoId ? clips[photoId] : undefined
        if (!clip) return null // still shows through — graceful degradation
        const radius = (frame.slotRadius ?? 0) * Math.min(r.w, r.h) * s
        return (
          <video
            key={`${photoId}-${i}`}
            src={clip.url}
            autoPlay
            loop
            muted
            playsInline
            className={cn('absolute object-cover', clip.mirrored && '-scale-x-100')}
            style={{
              left: pct(r.x, geo.W),
              top: pct(r.y, geo.H),
              width: pct(r.w, geo.W),
              height: pct(r.h, geo.H),
              borderRadius: `${radius}px`,
            }}
          />
        )
      })}
    </div>
  )
}
