/** Shared strip preview canvas — renders via the same engine as export (D-005). */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Composition, PlacedSticker } from '../types'
import { computeGeometry, renderComposition, type RenderImage, type RenderOptions } from '../render/compose'
import { getTemplate } from '../data/templates'
import { endInteraction, useEditor } from '../state/editor'
import { getPhoto } from '../lib/db'
import { getBitmap } from '../lib/images'
import { Icon } from './icons'

const MAX_RENDER_W = 1400

export function StripCanvas({
  comp,
  images,
  className,
  interactive = false,
  onSlotTap,
  renderOpts,
}: {
  comp: Composition
  images: Record<string, RenderImage | undefined>
  className?: string
  interactive?: boolean
  onSlotTap?: (index: number | null) => void
  renderOpts?: RenderOptions
}) {
  const template = getTemplate(comp.templateId)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [cssW, setCssW] = useState(0)
  const [fontsReady, setFontsReady] = useState(false)
  const { selectedSlot, selectedSticker, selectSlot, selectSticker, updateSticker, beginInteraction } = useEditor()

  useEffect(() => {
    let alive = true
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts
    if (fonts) {
      fonts.ready.then(() => alive && setFontsReady(true)).catch(() => setFontsReady(true))
    } else {
      setFontsReady(true)
    }
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0]?.contentRect.width ?? 0)
      // ignore sub-pixel chatter so intrinsic-size canvases converge instead of looping
      setCssW((prev) => (Math.abs(prev - w) <= 1 ? prev : w))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || cssW < 40) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    renderComposition(canvas, comp, images, Math.min(MAX_RENDER_W, Math.round(cssW * dpr)), renderOpts)
  }, [comp, images, cssW, fontsReady, renderOpts])

  const geo = useMemo(() => {
    if (cssW < 40) return null
    return computeGeometry(comp.templateId, comp.frameId, 1000, Math.round((1000 * template.canvas.h) / template.canvas.w))
  }, [comp.templateId, comp.frameId, cssW, template.canvas.h, template.canvas.w])

  const overlay = interactive ? (
    <StripOverlay
      comp={comp}
      geo={geo}
      selectedSlot={selectedSlot}
      selectedSticker={selectedSticker}
      onSlotTap={(i) => {
        selectSlot(i)
        onSlotTap?.(i)
      }}
      onStickerSelect={selectSticker}
      onStickerDrag={updateSticker}
      beginInteraction={beginInteraction}
    />
  ) : null

  return (
    <div className={className} style={{ display: 'flex', minHeight: 0 }}>
      <div
        ref={wrapRef}
        style={{
          aspectRatio: `${template.canvas.w} / ${template.canvas.h}`,
          height: '100%',
          maxWidth: '100%',
          margin: '0 auto',
          position: 'relative',
        }}
      >
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', borderRadius: 'inherit' }} aria-label="Photo strip preview" role="img" />
        {overlay}
      </div>
    </div>
  )
}

/* ---------- interaction overlay ---------- */

interface OverlayGeo {
  slotRects: Array<{ x: number; y: number; w: number; h: number }>
  W: number
  H: number
}

function StripOverlay({
  comp,
  geo,
  selectedSlot,
  selectedSticker,
  onSlotTap,
  onStickerSelect,
  onStickerDrag,
  beginInteraction,
}: {
  comp: Composition
  geo: OverlayGeo | null
  selectedSlot: number | null
  selectedSticker: string | null
  onSlotTap: (i: number | null) => void
  onStickerSelect: (uid: string | null) => void
  onStickerDrag: (uid: string, patch: Partial<PlacedSticker>) => void
  beginInteraction: () => void
}) {
  const dragRef = useRef<{ uid: string; offX: number; offY: number } | null>(null)

  if (!geo) return null

  const pct = (v: number, total: number) => `${(v / total) * 100}%`

  function hitSticker(clientX: number, clientY: number, target: HTMLElement): string | null {
    const rect = target.getBoundingClientRect()
    const nx = (clientX - rect.left) / rect.width
    const ny = (clientY - rect.top) / rect.height
    for (let i = comp.stickers.length - 1; i >= 0; i--) {
      const s = comp.stickers[i]!
      if (Math.abs(nx - s.x) <= s.scale / 2 && Math.abs(ny - s.y) <= s.scale / 2) return s.uid
    }
    return null
  }

  return (
    <div
      style={{ position: 'absolute', inset: 0 }}
      onPointerDown={(e) => {
        const target = e.currentTarget as HTMLElement
        const stickerUid = hitSticker(e.clientX, e.clientY, target)
        if (stickerUid) {
          const s = comp.stickers.find((x) => x.uid === stickerUid)
          const rect = target.getBoundingClientRect()
          dragRef.current = s ? { uid: stickerUid, offX: s.x - (e.clientX - rect.left) / rect.width, offY: s.y - (e.clientY - rect.top) / rect.height } : null
          onStickerSelect(stickerUid)
          beginInteraction()
          target.setPointerCapture(e.pointerId)
        } else {
          onStickerSelect(null)
        }
      }}
      onPointerMove={(e) => {
        const drag = dragRef.current
        if (!drag) return
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        const nx = Math.min(1.2, Math.max(-0.2, (e.clientX - rect.left) / rect.width + drag.offX))
        const ny = Math.min(1.2, Math.max(-0.2, (e.clientY - rect.top) / rect.height + drag.offY))
        onStickerDrag(drag.uid, { x: nx, y: ny })
      }}
      onPointerUp={() => {
        dragRef.current = null
        endInteraction()
      }}
      onPointerCancel={() => {
        dragRef.current = null
        endInteraction()
      }}
    >
      {/* slot tap targets */}
      {geo.slotRects.map((r, i) => {
        const slot = comp.slots[i]
        const isEmpty = !slot?.photoId
        const selected = selectedSlot === i
        return (
          <button
            key={i}
            aria-label={isEmpty ? `Empty slot ${i + 1}, add a photo` : `Photo slot ${i + 1}, select to edit`}
            onClick={() => onSlotTap(selected ? null : i)}
            style={{
              position: 'absolute',
              left: pct(r.x, geo.W),
              top: pct(r.y, geo.H),
              width: pct(r.w, geo.W),
              height: pct(r.h, geo.H),
              border: selected ? '2px solid var(--rose)' : 'none',
              borderRadius: 8,
              background: isEmpty ? 'rgba(43,33,24,0.08)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,253,246,0.9)',
              cursor: 'pointer',
            }}
          >
            {isEmpty ? <Icon name="plus" size={28} /> : null}
          </button>
        )
      })}
      {/* selection ring for active sticker */}
      {(() => {
        const s = comp.stickers.find((x) => x.uid === selectedSticker)
        if (!s) return null
        return (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: `${s.x * 100}%`,
              top: `${s.y * 100}%`,
              width: `${s.scale * 100}%`,
              height: `${s.scale * 100}%`,
              transform: 'translate(-50%, -50%)',
              border: '2px dashed var(--rose)',
              borderRadius: 12,
              pointerEvents: 'none',
              boxSizing: 'border-box',
            }}
          />
        )
      })()}
    </div>
  )
}

/** Resolve RenderImage map for the photoIds used by a composition (LRU-backed). */
export function useRenderImages(photoIds: Array<string | null>): Record<string, RenderImage | undefined> {
  const [images, setImages] = useState<Record<string, RenderImage | undefined>>({})
  const key = photoIds.filter(Boolean).join(',') || 'none'

  useEffect(() => {
    let alive = true
    const ids = key === 'none' ? [] : key.split(',')
    void (async () => {
      const out: Record<string, RenderImage | undefined> = {}
      for (const id of ids) {
        try {
          const rec = await getPhoto(id)
          if (!rec) continue
          const bmp = await getBitmap(id, rec.blob)
          out[id] = { source: bmp as unknown as CanvasImageSource, width: bmp.width, height: bmp.height }
        } catch {
          /* missing photo renders as empty slot */
        }
      }
      if (alive) setImages(out)
    })()
    return () => {
      alive = false
    }
  }, [key])

  return images
}
