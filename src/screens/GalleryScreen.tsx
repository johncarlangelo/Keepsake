/** Gallery: browse, preview, select, delete, reuse into Studio (PRD §5.2). */
import { useEffect, useRef, useState } from 'react'
import { useGallery } from '../state/gallery'
import { emptyComposition } from '../render/compose'
import { TEMPLATES } from '../data/templates'
import { useEditor } from '../state/editor'
import { navigate } from '../route'
import { Button, Chip, ConfirmDialog, EmptyState, IconButton, Modal, Segmented, Sheet } from '../components/ui'
import { Icon } from '../components/icons'
import { cn } from '../lib/cn'
import { SectionHeading } from '../components/showcase'
import { LiveStripPlayer } from '../components/LiveStrip'
import { AlbumBook } from '../components/AlbumBook'
import { useLiveClips, useRenderImages } from '../components/StripCanvas'
import { renderLiveStripVideo } from '../lib/liveExport'
import { pooledUrl, revokeUrl } from '../lib/images'
import { getPhoto } from '../lib/db'
import { downloadBlob, exportFilename, isIos, shareFile } from '../lib/share'
import { toast } from '../state/toast'
import type { GalleryEntry } from '../types'

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1048576).toFixed(1)} MB`
}

export function GalleryScreen() {
  const { entries, loading, loadError, storageUnavailable, estimate, persisted, selectMode, selected, refresh, remove, clearAll, setSelectMode, toggleSelect } = useGallery()
  const [detailId, setDetailId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [showStorageInfo, setShowStorageInfo] = useState(false)
  const [view, setView] = useState<'grid' | 'album'>('grid')

  useEffect(() => {
    void refresh()
  }, [refresh])

  const detail = entries.find((e) => e.id === detailId) ?? null
  const strips = entries.filter((e) => e.kind === 'strip' || e.kind === 'live-strip')
  const captures = entries.filter((e) => e.kind === 'capture')

  const createStrip = () => {
    const ids = selected.filter((id) => entries.find((e) => e.id === id)?.kind === 'capture')
    if (ids.length === 0) {
      toast('Pick at least one photo first.', { kind: 'error' })
      return
    }
    const fit = TEMPLATES.find((t) => t.shots === ids.length) ?? TEMPLATES.find((t) => t.shots >= ids.length && t.category === 'classic') ?? TEMPLATES[0]!
    useEditor.getState().load(emptyComposition(fit.id, ids))
    navigate('studio')
  }

  return (
    <section aria-label="Keepsake Gallery" className="animate-enter">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto">Gallery</h1>
        <Chip onClick={() => setSelectMode(!selectMode)} active={selectMode}>
          {selectMode ? 'Cancel' : 'Select'}
        </Chip>
        <IconButton icon="info" label="About Gallery storage" onClick={() => setShowStorageInfo(true)} />
        <IconButton icon="reset" label="Refresh Gallery" onClick={() => void refresh()} />
      </div>

      <StorageMeterLine estimate={estimate} persisted={persisted} />

      {entries.length > 0 && !storageUnavailable ? (
        <div className="mb-4">
          <Segmented
            label="Gallery view"
            value={view}
            onChange={(v) => setView(v as 'grid' | 'album')}
            options={[
              { value: 'grid', label: 'Grid' },
              {
                value: 'album',
                label: (
                  <>
                    Album
                    <span className="ml-1.5 rounded-full bg-blush px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-rose-ink uppercase">
                      work in progress
                    </span>
                  </>
                ),
              },
            ]}
          />
        </div>
      ) : null}

      {storageUnavailable ? (
        <div role="alert" className="rounded-md border border-gold bg-surface p-4 shadow-1">
          <strong>Gallery storage is unavailable</strong>
          <p className="muted mt-1.5 text-sm">
            {loadError ?? 'This browser context (for example private browsing) does not allow local storage, so photos cannot be kept between visits.'}
          </p>
        </div>
      ) : null}

      {loading && entries.length === 0 ? (
        <div aria-busy="true" aria-label="Loading gallery" className="grid min-w-0 gap-3 [grid-template-columns:repeat(auto-fill,minmax(104px,1fr))]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-md border border-line bg-surface-2 opacity-40 [animation:ks-fade_1.2s_ease-in-out_infinite_alternate]" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState>
          <div aria-hidden="true" className="relative h-28 w-24">
            {[-8, 0, 8].map((deg, i) => (
              <div
                key={deg}
                className="animate-develop absolute inset-x-0 mx-auto h-24 w-16 rounded-sm border border-line bg-surface p-1.5 shadow-2"
                style={{
                  transform: `rotate(${deg}deg)`,
                  top: i * 4,
                  animationDelay: `${i * 0.35}s`,
                }}
              >
                <div
                  className="h-12 w-full rounded-[2px]"
                  style={{ background: ['linear-gradient(135deg,#d9b8a6,#c98a8a)', 'linear-gradient(135deg,#aebf9f,#6e7f5e)', 'linear-gradient(135deg,#b9c6d8,#8a9b8a)'][i] }}
                />
                <div className="mt-1.5 h-1 w-8 rounded-full bg-surface-2" />
              </div>
            ))}
          </div>
          <h2>No photos yet</h2>
          <p className="muted">Photos you take in the booth appear here automatically — nothing to save, nothing uploaded.</p>
          <Button icon="camera" onClick={() => navigate('booth')}>
            Take your first strip
          </Button>
        </EmptyState>
      ) : view === 'album' && strips.length > 0 ? (
        <section aria-label="Strip album" className="animate-enter">
          <AlbumBook entries={strips} />
          <p className="muted mt-3 text-center text-xs">
            <span className="mr-1.5 rounded-full bg-blush px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-rose-ink uppercase">work in progress</span>
            early look — tap a page corner or use the arrows to flip · live strips play while their page is open
          </p>
        </section>
      ) : (
        <>
          <section aria-label="Finished strips" className="mb-8">
            <SectionHeading icon="heart" count={strips.length}>Finished strips</SectionHeading>
            {strips.length === 0 ? (
              <p className="muted text-sm">
                No finished strips yet — compose one in the Studio, then “Save strip to Gallery” from Export.
              </p>
            ) : (
              <div className="stagger grid min-w-0 gap-3 [grid-template-columns:repeat(auto-fill,minmax(104px,1fr))]">
                {strips.map((e) => (
                  <GalleryTile
                    key={e.id}
                    entry={e}
                    variant="strip"
                    selectMode={selectMode}
                    selected={selected.includes(e.id)}
                    onOpen={() => setDetailId(e.id)}
                    onToggle={() => toggleSelect(e.id)}
                  />
                ))}
              </div>
            )}
          </section>
          <section aria-label="Photos">
            <SectionHeading icon="aperture" count={captures.length}>Photos</SectionHeading>
            {captures.length === 0 ? (
              <p className="muted text-sm">Photos you take in the booth appear here automatically.</p>
            ) : (
              <div className="stagger grid min-w-0 gap-3 [grid-template-columns:repeat(auto-fill,minmax(104px,1fr))]">
                {captures.map((e) => (
                  <GalleryTile
                    key={e.id}
                    entry={e}
                    variant="photo"
                    selectMode={selectMode}
                    selected={selected.includes(e.id)}
                    onOpen={() => setDetailId(e.id)}
                    onToggle={() => toggleSelect(e.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {view === 'grid' && selectMode && entries.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-line bg-surface p-3 shadow-1">
          <strong className="text-sm">{selected.length} selected</strong>
          <span className="flex-1" />
          <Button size="sm" icon="wand" onClick={createStrip} disabled={selected.length === 0}>
            Create strip
          </Button>
          <Button size="sm" variant="danger" icon="trash" disabled={selected.length === 0} onClick={() => setConfirmDelete(selected)}>
            Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirmClear(true)}>
            Clear all
          </Button>
        </div>
      ) : null}

      <GalleryDetail
        entry={detail}
        onClose={() => setDetailId(null)}
        onDelete={(id) => setConfirmDelete([id])}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        title={confirmDelete && confirmDelete.length > 1 ? `Delete ${confirmDelete.length} photos?` : 'Delete this photo?'}
        message="This removes them from Keepsake's Gallery. This can't be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmDelete) void remove(confirmDelete)
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        open={confirmClear}
        title="Clear the whole Gallery?"
        message="Every photo and saved strip in Keepsake's browser-local Gallery will be removed. This can't be undone."
        confirmLabel="Clear Gallery"
        onConfirm={() => void clearAll()}
        onCancel={() => setConfirmClear(false)}
      />

      <Sheet open={showStorageInfo} title="Where your photos live" onClose={() => setShowStorageInfo(false)}>
        <div className="grid gap-3 text-sm">
          <p className="muted">
            Keepsake stores photos <strong>only in this browser, on this device</strong> — using IndexedDB, not the cloud. There are no
            accounts and no backups.
          </p>
          <p className="muted">Things that can remove them:</p>
          <ul className="muted grid list-disc gap-1.5 pl-5">
            <li>Clearing site data / "Clear History and Website Data"</li>
            <li>Private or incognito windows (nothing persists)</li>
            <li>Browser storage eviction when the device is low on space</li>
            <li>Switching browser profiles or devices</li>
          </ul>
          <p className="muted">
            For keepsakes you love, use <strong>Export → Download</strong> in the Studio to keep a copy outside the browser.
            {persisted === true ? ' This browser has granted persistent storage, which reduces eviction risk.' : ''}
          </p>
        </div>
      </Sheet>
    </section>
  )
}

function StorageMeterLine({ estimate, persisted }: { estimate: { usage: number; quota: number } | null; persisted: boolean | null }) {
  if (!estimate || estimate.quota === 0) {
    return <p className="muted mb-3 text-sm">Browser-local storage · size estimates unavailable</p>
  }
  const pct = Math.min(100, (estimate.usage / estimate.quota) * 100)
  const level = pct > 90 ? 'bg-danger' : pct > 65 ? 'bg-gold' : 'bg-sage'
  return (
    <div className="mb-4 flex max-w-[420px] flex-col gap-1 text-[0.8125rem] text-ink-soft">
      <div className="bar h-1.5 overflow-hidden rounded-full bg-surface-2" role="meter" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Gallery storage used">
        <i className={`block h-full rounded-full transition-[width] duration-200 ${level}`} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
      <span>
        {formatBytes(estimate.usage)} used of ~{formatBytes(estimate.quota)} available
        {persisted === true ? ' · persistent storage granted' : persisted === false ? ' · best-effort storage' : ''}
      </span>
    </div>
  )
}

function GalleryTile({
  entry,
  variant,
  selectMode,
  selected,
  onOpen,
  onToggle,
}: {
  entry: GalleryEntry
  variant: 'strip' | 'photo'
  selectMode: boolean
  selected: boolean
  onOpen: () => void
  onToggle: () => void
}) {
  /* live photos: press-and-hold replays the ~3s moment (Phase 20, D-034) */
  const [playUrl, setPlayUrl] = useState<string | null>(null)
  const holdRef = useRef<number | null>(null)

  const endHold = () => {
    if (holdRef.current !== null) {
      window.clearTimeout(holdRef.current)
      holdRef.current = null
    }
    setPlayUrl((u) => {
      if (u) revokeUrl(u)
      return null
    })
  }
  const startHold = () => {
    if (!entry.live || selectMode || holdRef.current !== null) return
    holdRef.current = window.setTimeout(() => {
      holdRef.current = null
      setPlayUrl(pooledUrl(entry.live!.blob))
    }, 280)
  }
  useEffect(() => endHold, [])

  const liveBadge = entry.live || entry.kind === 'live-strip' ? (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-[999px] bg-ink/85 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-bg"
    >
      <span className="inline-block size-1 rounded-full bg-rose-soft" /> LIVE
    </span>
  ) : null

  return (
    <button
      aria-pressed={selectMode ? selected : undefined}
      aria-label={
        selectMode
          ? `${selected ? 'Deselect' : 'Select'} ${variant === 'strip' ? 'finished strip' : 'photo'} from ${new Date(entry.createdAt).toLocaleDateString()}`
          : entry.live
            ? `Open photo from ${new Date(entry.createdAt).toLocaleDateString()} — press and hold to play its live moment`
            : `Open ${variant === 'strip' ? 'finished strip' : 'photo'} from ${new Date(entry.createdAt).toLocaleDateString()}`
      }
      onClick={selectMode ? onToggle : onOpen}
      onPointerDown={startHold}
      onPointerUp={endHold}
      onPointerLeave={endHold}
      onPointerCancel={endHold}
      onContextMenu={(e) => entry.live && e.preventDefault()}
      className={[
        'group relative select-none overflow-hidden rounded-md border border-line bg-surface-2 shadow-1',
        '[-webkit-touch-callout:none] [-webkit-user-select:none] [touch-action:manipulation]',
        'transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:shadow-2',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'aria-pressed:border-rose-deep aria-pressed:ring-2 aria-pressed:ring-rose-deep',
        variant === 'strip'
          ? 'h-[210px] wide:h-[250px] [&>img]:h-full [&>img]:object-contain [&>img]:p-2'
          : 'aspect-square [&>img]:h-full [&>img]:w-full [&>img]:object-cover [&>img]:transition-transform [&>img]:duration-300 group-hover:[&>img]:scale-105',
      ].join(' ')}
    >
      {entry.corrupt || !entry.thumbUrl ? (
        <span className="muted grid h-full place-items-center text-sm">
          <Icon name="info" size={20} />
        </span>
      ) : (
        <img src={entry.thumbUrl} alt="" loading="lazy" className="w-full" />
      )}
      {playUrl ? (
        <video src={playUrl} autoPlay loop muted playsInline className={cn('absolute inset-0 size-full object-cover', (entry.mirrored ?? true) && '-scale-x-100')} />
      ) : null}
      {liveBadge}
    </button>
  )
}

function GalleryDetail({ entry, onClose, onDelete }: { entry: GalleryEntry | null; onClose: () => void; onDelete: (id: string) => void }) {
  const [fullUrl, setFullUrl] = useState<string | null>(null)
  const [showLive, setShowLive] = useState(false)

  useEffect(() => {
    let url: string | null = null
    let alive = true
    setShowLive(false)
    if (entry) {
      void getPhoto(entry.id).then((rec) => {
        if (!alive || !rec) return
        url = pooledUrl(rec.blob)
        setFullUrl(url)
      })
    }
    return () => {
      alive = false
      if (url) revokeUrl(url)
      setFullUrl(null)
    }
  }, [entry])

  /* live clip object URL — created only while the live view is shown */
  const [liveUrl, setLiveUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!entry?.live || !showLive) {
      setLiveUrl(null)
      return
    }
    const url = pooledUrl(entry.live.blob)
    setLiveUrl(url)
    return () => revokeUrl(url)
  }, [entry, showLive])

  const isLiveStrip = entry?.kind === 'live-strip' && !!entry.liveStrip

  /* clip + still sources for the live strip player and its video export */
  const liveSlots = entry?.liveStrip?.slots ?? []
  const liveClips = useLiveClips(liveSlots, isLiveStrip)
  const liveImages = useRenderImages(liveSlots)
  const [exportingVideo, setExportingVideo] = useState(false)
  const exportVideo = async (): Promise<void> => {
    if (!entry?.liveStrip) return
    setExportingVideo(true)
    try {
      const { blob, ext } = await renderLiveStripVideo(entry.liveStrip, liveClips, liveImages)
      const name = exportFilename('keepsake-live', new Date(entry.createdAt), ext)
      if (isIos()) {
        const ok = await shareFile(blob, name)
        if (!ok) toast('Sharing was not available — try again or check permissions.', { kind: 'error' })
      } else {
        downloadBlob(blob, name)
        toast('Live strip video saved.')
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not export the live strip video.', { kind: 'error' })
    } finally {
      setExportingVideo(false)
    }
  }

  if (!entry) return null
  return (
    <Modal open={!!entry} title={entry.kind === 'live-strip' ? 'Live strip' : entry.kind === 'strip' ? 'Saved strip' : 'Photo'} onClose={onClose}>
      <div className="flex flex-col items-center gap-3">
        {entry.live && !isLiveStrip ? (
          <div className="flex justify-center">
            <Segmented
              label="Photo view"
              value={showLive ? 'live' : 'still'}
              onChange={(v) => setShowLive(v === 'live')}
              options={[
                { value: 'still', label: 'Still' },
                { value: 'live', label: 'Live ✦' },
              ]}
            />
          </div>
        ) : null}
        {isLiveStrip ? (
          <div className="flex h-[min(56dvh,600px)] w-full items-center justify-center">
            <LiveStripPlayer liveStrip={entry.liveStrip!} date={new Date(entry.createdAt)} />
          </div>
        ) : showLive && liveUrl ? (
          <video src={liveUrl} autoPlay loop muted playsInline controls className={cn('max-h-[52dvh] w-auto rounded-sm', (entry.mirrored ?? true) && '-scale-x-100')} />
        ) : fullUrl ? (
          <img src={fullUrl} alt={entry.label ?? 'Gallery photo'} className="max-h-[52dvh] w-auto rounded-sm object-contain" />
        ) : (
          <div className="muted grid h-50 place-items-center text-sm">Loading…</div>
        )}
        <p className="muted text-center font-mono text-[0.8125rem]">
          {new Date(entry.createdAt).toLocaleString()} · {entry.width}×{entry.height} · {formatBytes(entry.bytes)}
          {entry.live ? ` · live ${formatBytes(entry.live.bytes)}` : ''}
          {entry.label ? ` · ${entry.label}` : ''}
        </p>
        {entry.corrupt ? (
          <p role="alert" className="text-sm text-danger">
            This record looks damaged — the image data may be missing.
          </p>
        ) : null}
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          {isLiveStrip ? (
            <Button size="sm" variant="secondary" icon="download" disabled={exportingVideo} onClick={() => void exportVideo()}>
              {exportingVideo ? 'Recording…' : 'Download video'}
            </Button>
          ) : fullUrl ? (
            <Button size="sm" variant="secondary" icon="download" onClick={() => void downloadFromUrl(fullUrl!, entry)}>
              Download original
            </Button>
          ) : null}
          <Button size="sm" variant="danger" icon="trash" onClick={() => onDelete(entry.id)}>
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  )
}

async function downloadFromUrl(url: string, entry: GalleryEntry): Promise<void> {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    downloadBlob(blob, exportFilename(entry.kind === 'strip' ? 'keepsake-strip' : 'keepsake-photo', new Date(entry.createdAt)))
  } catch {
    toast('Could not prepare the download.', { kind: 'error' })
  }
}
