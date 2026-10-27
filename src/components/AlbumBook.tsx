/**
 * 3D flip album (Phase 22): page-flip engine is react-pageflip (StPageFlip,
 * MIT). The 3D READ comes from styling around the engine: a hardcover that
 * overhangs the page block, visible page-stack edges that thin as you flip,
 * gutter curvature shading on both pages, top-light sheen, and a table shadow
 * that grounds the book. All layers are transform/opacity-only.
 */
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import HTMLFlipBook from 'react-pageflip'
import { useReducedMotion } from 'motion/react'
import type { GalleryEntry } from '../types'
import { LiveStripPlayer } from './LiveStrip'
import { cn } from '../lib/cn'

const PAGE_W = 300
const PAGE_H = 420
const COVER_PAD = 14

export interface AlbumPageData {
  kind: 'cover' | 'strip' | 'end'
  entry?: GalleryEntry
}

/** cover, one page per strip, and a closing page */
export function buildPages(entries: GalleryEntry[]): AlbumPageData[] {
  return [
    { kind: 'cover' },
    ...entries.map((e) => ({ kind: 'strip' as const, entry: e })),
    { kind: 'end' },
  ]
}

interface FlipBookApi {
  pageFlip(): {
    flipNext(): void
    flipPrev(): void
    getCurrentPageIndex(): number
  }
}

const AlbumPage = forwardRef<
  HTMLDivElement,
  { page: AlbumPageData; open: boolean; side: 'left' | 'right' }
>(function AlbumPage({ page, open, side }, ref) {
  const isLive = page.kind === 'strip' && page.entry?.kind === 'live-strip' && !!page.entry?.liveStrip
  return (
    <div
      ref={ref}
      data-density={page.kind !== 'strip' ? 'hard' : undefined}
      className={cn('relative overflow-hidden', page.kind !== 'strip' ? 'bg-ink text-bg' : 'bg-surface')}
      style={{ width: PAGE_W, height: PAGE_H }}
    >
      {page.kind === 'cover' ? (
        <div className="flex size-full flex-col items-center justify-center gap-1">
          <span className="font-display text-2xl font-bold">Keepsake</span>
          <span className="font-script text-lg text-blush">our moments</span>
          <span className="mt-3 font-mono text-[10px] tracking-widest opacity-70">
            {new Date().getFullYear()}
          </span>
        </div>
      ) : page.kind === 'end' ? (
        <div className="flex size-full flex-col items-center justify-center gap-2">
          <span className="font-script text-2xl text-blush">the end ✦</span>
          <span className="text-xs opacity-75">make more strips to fill these pages</span>
        </div>
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-1.5 p-3">
          <div className="flex min-h-0 flex-1 items-center justify-center">
            {isLive && page.entry!.liveStrip && open ? (
              <div className="flex h-full w-full items-center justify-center">
                <LiveStripPlayer liveStrip={page.entry!.liveStrip} date={new Date(page.entry!.createdAt)} className="max-h-full" />
              </div>
            ) : page.entry!.thumbUrl ? (
              <img src={page.entry!.thumbUrl} alt="" className="max-h-full max-w-full object-contain shadow-1" />
            ) : null}
          </div>
          <span className="font-mono text-[9px] tracking-wider opacity-60">
            {new Date(page.entry!.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        </div>
      )}
      {/* gutter curvature + top-light sheen — the depth cue that sells the spread */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            side === 'right'
              ? 'linear-gradient(90deg, rgba(43,33,24,0.22), rgba(43,33,24,0.05) 7%, transparent 14%), linear-gradient(160deg, rgba(255,255,255,0.28), transparent 30%)'
              : 'linear-gradient(270deg, rgba(43,33,24,0.22), rgba(43,33,24,0.05) 7%, transparent 14%), linear-gradient(200deg, rgba(255,255,255,0.28), transparent 30%)',
        }}
      />
    </div>
  )
})

/** layered page-edge lines that suggest the stack thickness on one side */
function StackEdge({ side, count }: { side: 'left' | 'right'; count: number }) {
  const lines = Array.from({ length: Math.max(count, side === 'right' ? 1 : 0) }, (_, i) => i)
  if (side === 'right' && lines.length === 0) return null
  return (
    <div
      aria-hidden="true"
      className="absolute inset-y-3 flex flex-col justify-evenly"
      style={{ [side]: COVER_PAD - 5, width: 5 }}
    >
      {lines.map((i) => (
        <div
          key={i}
          className="h-[2px] rounded-full bg-[#efe6d2]"
          style={{ marginLeft: side === 'right' ? i * 1.5 : 0, marginRight: side === 'left' ? i * 1.5 : 0 }}
        />
      ))}
    </div>
  )
}

export function AlbumBook({ entries }: { entries: GalleryEntry[] }) {
  const pages = useMemo(() => buildPages(entries), [entries])
  const bookRef = useRef<FlipBookApi | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)
  const [scale, setScale] = useState(1)
  const reduceMotion = useReducedMotion()

  /* fit the spread to the container width (transform-only, no layout shift) */
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver((es) => {
      const w = es[0]?.contentRect.width ?? 0
      setScale(Math.min(1, w / (PAGE_W * 2 + COVER_PAD * 2)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const flipNext = () => bookRef.current?.pageFlip().flipNext()
  const flipPrev = () => bookRef.current?.pageFlip().flipPrev()

  /* stack thickness follows the reading position */
  const flippedSheets = Math.ceil(page / 2)
  const totalSheets = Math.ceil(pages.length / 2)
  const leftStack = Math.min(4, Math.ceil(flippedSheets / 2))
  const rightStack = Math.min(4, Math.max(1, Math.ceil((totalSheets - flippedSheets) / 2)))

  return (
    <div
      ref={boxRef}
      className="min-w-0 overflow-hidden"
      tabIndex={0}
      aria-label="Strip flipbook album"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') flipNext()
        if (e.key === 'ArrowLeft') flipPrev()
      }}
    >
      <div
        className="relative mx-auto"
        style={{
          width: PAGE_W * 2 + COVER_PAD * 2,
          height: PAGE_H + COVER_PAD * 2 + 10,
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
        }}
      >
        {/* table shadow grounding the book */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 h-9 w-[82%] -translate-x-1/2 rounded-full bg-[rgba(43,33,24,0.3)] blur-md"
          style={{ bottom: -14 }}
        />
        {/* the hardcover: back cover always under the right pages; the front
            cover swings into view (with its stack) as pages are flipped */}
        <div
          className="absolute rounded-lg"
          style={{
            left: PAGE_W,
            width: PAGE_W + COVER_PAD * 2,
            top: 0,
            bottom: 0,
            background: 'linear-gradient(145deg, #3a2d21, #241b12 65%)',
            boxShadow: '0 18px 40px rgba(43,33,24,0.35), inset 0 1px 0 rgba(255,253,246,0.12)',
          }}
        />
        <div
          className="absolute rounded-lg transition-[opacity,transform] duration-500"
          style={{
            left: 0,
            width: PAGE_W + COVER_PAD * 2,
            top: 0,
            bottom: 0,
            background: 'linear-gradient(215deg, #3a2d21, #241b12 65%)',
            boxShadow: '0 18px 40px rgba(43,33,24,0.35), inset 0 1px 0 rgba(255,253,246,0.12)',
            opacity: flippedSheets > 0 ? 1 : 0,
            transform: flippedSheets > 0 ? 'none' : 'translateX(-24px)',
            pointerEvents: 'none',
          }}
        />
        {/* page-stack edges (they thin as the book is read) */}
        {flippedSheets > 0 ? <StackEdge side="left" count={leftStack} /> : null}
        <StackEdge side="right" count={rightStack} />

        {/* the flipbook, inset on the cover */}
        <div
          className="absolute"
          style={{ left: COVER_PAD, top: COVER_PAD, width: PAGE_W * 2 + 8, height: PAGE_H + 8 }}
        >
          <HTMLFlipBook
            ref={bookRef as never}
            width={PAGE_W}
            height={PAGE_H}
            size="fixed"
            style={{}}
            minWidth={200}
            maxWidth={PAGE_W}
            minHeight={280}
            maxHeight={PAGE_H}
            startPage={0}
            autoSize={false}
            showCover
            drawShadow
            maxShadowOpacity={0.5}
            flippingTime={reduceMotion ? 1 : 800}
            usePortrait={false}
            mobileScrollSupport
            swipeDistance={25}
            clickEventForward
            useMouseEvents
            showPageCorners
            disableFlipByClick={false}
            startZIndex={5}
            onFlip={(e: { data: number | string }) => setPage(Number(e.data))}
            className="mx-auto"
          >
            {pages.map((p, i) => (
              <AlbumPage
                key={`${p.kind}-${i}`}
                page={p}
                open={Math.abs(i - page) <= 1}
                side={i % 2 === 0 ? 'right' : 'left'}
              />
            ))}
          </HTMLFlipBook>
        </div>

        {/* gutter shadow cast over the open spread */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-[14px] z-[6] w-10 -translate-x-1/2 bg-gradient-to-r from-transparent via-[rgba(43,33,24,0.3)] to-transparent"
          style={{ left: `calc(50% + ${COVER_PAD}px)` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-center gap-3">
        <button
          aria-label="Previous page"
          onClick={flipPrev}
          disabled={page === 0}
          className="min-h-11 rounded-[999px] border border-line bg-surface px-4 text-sm font-semibold text-ink-soft transition-colors hover:text-ink disabled:opacity-40"
        >
          ←
        </button>
        <span className="min-w-24 text-center text-sm text-ink-soft">
          {Math.min(page + 1, pages.length)} / {pages.length}
        </span>
        <button
          aria-label="Next page"
          onClick={flipNext}
          disabled={page >= pages.length - 1}
          className="min-h-11 rounded-[999px] border border-line bg-surface px-4 text-sm font-semibold text-ink-soft transition-colors hover:text-ink disabled:opacity-40"
        >
          →
        </button>
      </div>
    </div>
  )
}
