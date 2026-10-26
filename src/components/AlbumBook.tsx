/**
 * 3D flip album (Phase 22, rebuilt per owner feedback): the page-flip engine is
 * react-pageflip (StPageFlip, MIT) — real book geometry with drag-corner
 * folding, soft shadows, swipe, and hard covers — instead of the hand-rolled
 * rotateY that read flat. Pages render through thumbs (and the live-strip
 * player while open); strips still come from the same records, no new storage.
 */
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import HTMLFlipBook from 'react-pageflip'
import { useReducedMotion } from 'motion/react'
import type { GalleryEntry } from '../types'
import { LiveStripPlayer } from './LiveStrip'
import { cn } from '../lib/cn'

const PAGE_W = 300
const PAGE_H = 420

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
  { page: AlbumPageData; open: boolean }
>(function AlbumPage({ page, open }, ref) {
  const isLive = page.kind === 'strip' && page.entry?.kind === 'live-strip' && !!page.entry?.liveStrip
  return (
    <div
      ref={ref}
      data-density={page.kind !== 'strip' ? 'hard' : undefined}
      className={cn('overflow-hidden', page.kind !== 'strip' ? 'bg-ink text-bg' : 'bg-surface')}
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
    </div>
  )
})

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
      setScale(Math.min(1, w / (PAGE_W * 2 + 8)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const flipNext = () => bookRef.current?.pageFlip().flipNext()
  const flipPrev = () => bookRef.current?.pageFlip().flipPrev()

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
        className="mx-auto"
        style={{
          width: PAGE_W * 2 + 8,
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
        }}
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
            <AlbumPage key={`${p.kind}-${i}`} page={p} open={Math.abs(i - page) <= 1} />
          ))}
        </HTMLFlipBook>
      </div>

      <div className="mt-2 flex items-center justify-center gap-3">
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
