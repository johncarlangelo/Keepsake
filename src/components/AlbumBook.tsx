/**
 * 3D flip album (Phase 22): the saved still strips (and live strips) presented
 * as a flipbook — CSS 3D page flips around a spine, no dependencies. Sheets
 * have a front and a back (cover sheet = front cover), one strip per page face,
 * mounted on paper like a physical album. Only sheets near the open spread
 * render real content; the rest are paper shells for stack thickness.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import type { GalleryEntry } from '../types'
import { LiveStripPlayer } from './LiveStrip'

export type AlbumContent =
  | { kind: 'cover' }
  | { kind: 'end' }
  | { kind: 'strip'; entry: GalleryEntry }

export interface AlbumSheet {
  front: AlbumContent
  back: AlbumContent
}

/** cover + strips (+ trailing end page) → two-page sheets */
export function buildSheets(entries: GalleryEntry[]): AlbumSheet[] {
  const content: AlbumContent[] = [{ kind: 'cover' }, ...entries.map((e) => ({ kind: 'strip', entry: e } as AlbumContent)), { kind: 'end' }]
  const sheets: AlbumSheet[] = []
  for (let i = 0; i < content.length; i += 2) {
    sheets.push({ front: content[i]!, back: content[i + 1] ?? { kind: 'end' } })
  }
  return sheets
}

/** stack order: next-to-flip sits on top of the right pile; latest flip on top of the left pile */
export function zFor(sheetIndex: number, flipCount: number, total: number): number {
  return sheetIndex < flipCount ? sheetIndex + 1 : total - sheetIndex + 10
}

/** only render real content for sheets near the open spread */
export function inWindow(sheetIndex: number, flipCount: number, windowSize = 2): boolean {
  return sheetIndex >= flipCount - windowSize && sheetIndex <= flipCount + windowSize
}

const PAGE_W = 300
const PAGE_H = 420
const FLIP_MS = 900

export function AlbumBook({ entries }: { entries: GalleryEntry[] }) {
  const sheets = useMemo(() => buildSheets(entries), [entries])
  const [flip, setFlip] = useState(0)
  const [dragAngle, setDragAngle] = useState<number | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const reduceMotion = useReducedMotion()

  /* fit the spread to the container width */
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver((es) => {
      const w = es[0]?.contentRect.width ?? 0
      setScale(Math.min(1, w / (PAGE_W * 2 + 24)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const canNext = flip < sheets.length
  const canPrev = flip > 0
  const next = () => canNext && setFlip((f) => Math.min(sheets.length, f + 1))
  const prev = () => canPrev && setFlip((f) => Math.max(0, f - 1))

  /* drag-to-flip the sheet currently on the right */
  const dragging = useRef(false)
  const onPointerDown = (e: React.PointerEvent) => {
    if (!canNext || reduceMotion) return
    dragging.current = true
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const rect = boxRef.current?.getBoundingClientRect()
    if (!rect) return
    const spineX = rect.left + (rect.width * scale) / 2
    const ratio = Math.min(1, Math.max(0, (spineX - e.clientX) / ((PAGE_W * scale) || 1)))
    setDragAngle(-ratio * 180)
  }
  const onPointerUp = () => {
    if (!dragging.current) return
    dragging.current = false
    if (dragAngle !== null && dragAngle <= -90) next()
    setDragAngle(null)
  }

  const pageContent = (c: AlbumContent, side: 'front' | 'back') => {
    if (c.kind === 'cover') {
      return (
        <div className="flex size-full flex-col items-center justify-center gap-1 bg-ink text-bg">
          <span className="font-display text-2xl font-bold">Keepsake</span>
          <span className="font-script text-lg text-blush">our moments</span>
          <span className="mt-3 font-mono text-[10px] tracking-widest opacity-70">
            {new Date().getFullYear()}
          </span>
        </div>
      )
    }
    if (c.kind === 'end') {
      return (
        <div className="flex size-full flex-col items-center justify-center gap-2 bg-surface-2 text-ink-faint">
          <span className="font-script text-2xl">the end ✦</span>
          <span className="text-xs">make more strips to fill these pages</span>
        </div>
      )
    }
    const entry = c.entry
    return (
      <div className="flex size-full flex-col items-center justify-center gap-1.5 bg-surface p-3">
        <div className="flex min-h-0 flex-1 items-center justify-center">
          {entry.kind === 'live-strip' && entry.liveStrip && side === 'front' ? (
            <div className="flex h-full w-full items-center justify-center">
              <LiveStripPlayer liveStrip={entry.liveStrip} date={new Date(entry.createdAt)} className="max-h-full" />
            </div>
          ) : entry.thumbUrl ? (
            <img src={entry.thumbUrl} alt="" className="max-h-full max-w-full object-contain shadow-1" />
          ) : null}
        </div>
        <span className="font-mono text-[9px] tracking-wider text-ink-faint">
          {new Date(entry.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </span>
      </div>
    )
  }

  const sheetNode = (k: number) => {
    const sheet = sheets[k]!
    const flipped = k < flip
    const inWin = inWindow(k, flip)
    // while a flip animates, live-strip fronts swap to their still (imperceptible, stops decode)
    const frontLive = sheet.front.kind === 'strip' && sheet.front.entry.kind === 'live-strip'
    const renderFront = !flipped || frontLive === false
    const dragging = dragAngle !== null && k === flip
    const angle = dragging ? dragAngle! : flipped ? -180 : 0
    return (
      <div
        key={k}
        className="absolute bottom-0 top-0"
        style={{
          left: '50%',
          width: PAGE_W,
          zIndex: zFor(k, flip, sheets.length),
          transform: `rotateY(${angle}deg)`,
          transformOrigin: 'left center',
          transformStyle: 'preserve-3d',
          transition: dragging || reduceMotion ? 'none' : `transform ${FLIP_MS}ms cubic-bezier(0.215, 0.61, 0.355, 1)`,
        }}
      >
        {/* front face */}
        <div
          className="absolute inset-0 overflow-hidden rounded-r-sm border border-line shadow-2 [backface-visibility:hidden]"
          style={{ background: 'var(--color-surface)' }}
        >
          {inWin && renderFront ? pageContent(sheet.front, 'front') : <PaperShell />}
        </div>
        {/* back face */}
        <div
          className="absolute inset-0 overflow-hidden rounded-l-sm border border-line shadow-2 [backface-visibility:hidden] [transform:rotateY(180deg)]"
          style={{ background: 'var(--color-surface)' }}
        >
          {inWin ? pageContent(sheet.back, 'back') : <PaperShell />}
        </div>
      </div>
    )
  }

  return (
    <div ref={boxRef} className="min-w-0 overflow-hidden" onKeyDown={(e) => {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }} tabIndex={0}>
      <div
        className="relative mx-auto"
        style={{
          width: PAGE_W * 2 + 24,
          height: PAGE_H + 16,
          perspective: 2400,
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
        }}
      >
        {/* bases under the sheets: left stack + right stack */}
        <div className="absolute bottom-0 top-0 left-0 rounded-l-sm border border-line bg-surface-2 shadow-1" style={{ width: PAGE_W }} />
        <div className="absolute bottom-0 top-0 rounded-r-sm border border-line bg-surface-2" style={{ left: '50%', width: PAGE_W }} />
        {/* spine shadow */}
        <div aria-hidden="true" className="absolute inset-y-2 left-1/2 w-6 -translate-x-1/2 bg-gradient-to-r from-transparent via-[rgba(43,33,24,0.18)] to-transparent" />
        {sheets.map((_, k) => {
          const visible = k >= flip - 3 && k <= flip + 3
          return visible ? sheetNode(k) : null
        })}
        {/* flip affordances: tap a page side (works alongside drag) */}
        <button aria-label="Previous page" onClick={prev} disabled={!canPrev}
          className="absolute bottom-0 top-0 left-0 cursor-w-resize opacity-0" style={{ width: PAGE_W, zIndex: 200 }} />
        <button aria-label="Next page" onClick={next} disabled={!canNext}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
          className="absolute bottom-0 top-0 cursor-e-resize opacity-0" style={{ left: '50%', width: PAGE_W, zIndex: 200 }} />
      </div>

      <div className="mt-2 flex items-center justify-center gap-3">
        <button aria-label="Previous page" onClick={prev} disabled={!canPrev}
          className="rounded-[999px] border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink-soft transition-colors hover:text-ink disabled:opacity-40">
          ←
        </button>
        <span className="min-w-24 text-center text-sm text-ink-soft">
          {Math.min(flip, sheets.length)} / {sheets.length}
        </span>
        <button aria-label="Next page" onClick={next} disabled={!canNext}
          className="rounded-[999px] border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink-soft transition-colors hover:text-ink disabled:opacity-40">
          →
        </button>
      </div>
    </div>
  )
}

/** faint stack-page look for out-of-window sheets */
function PaperShell() {
  return <div className="size-full bg-surface" />
}
