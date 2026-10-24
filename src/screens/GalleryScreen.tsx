/** Gallery: browse, preview, select, delete, reuse into Studio (PRD §5.2). */
import { useEffect, useState } from 'react'
import { useGallery } from '../state/gallery'
import { emptyComposition } from '../render/compose'
import { TEMPLATES } from '../data/templates'
import { useEditor } from '../state/editor'
import { navigate } from '../route'
import { Button, Chip, ConfirmDialog, IconButton, Modal, Sheet } from '../components/ui'
import { Icon } from '../components/icons'
import { pooledUrl, revokeUrl } from '../lib/images'
import { getPhoto } from '../lib/db'
import { downloadBlob, exportFilename } from '../lib/share'
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

  useEffect(() => {
    void refresh()
  }, [refresh])

  const detail = entries.find((e) => e.id === detailId) ?? null

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
    <section aria-label="Keepsake Gallery" className="anim-enter">
      <div className="gallery-head">
        <h1>Gallery</h1>
        <Chip onClick={() => setSelectMode(!selectMode)} active={selectMode}>
          {selectMode ? 'Cancel' : 'Select'}
        </Chip>
        <IconButton icon="info" label="About Gallery storage" onClick={() => setShowStorageInfo(true)} />
        <IconButton icon="reset" label="Refresh Gallery" onClick={() => void refresh()} />
      </div>

      <StorageMeterLine estimate={estimate} persisted={persisted} />

      {storageUnavailable ? (
        <div className="card" role="alert" style={{ borderColor: 'var(--gold)' }}>
          <strong>Gallery storage is unavailable</strong>
          <p className="tiny muted" style={{ marginTop: 6 }}>
            {loadError ?? 'This browser context (for example private browsing) does not allow local storage, so photos cannot be kept between visits.'}
          </p>
        </div>
      ) : null}

      {loading && entries.length === 0 ? (
        <div className="gallery-grid" aria-busy="true" aria-label="Loading gallery">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="gallery-tile" style={{ opacity: 0.4, animation: 'ks-fade 1.2s ease-in-out infinite alternate' }} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 64 64" width="72" height="72" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <rect x="14" y="8" width="36" height="48" rx="4" />
            <circle cx="32" cy="30" r="9" />
            <path d="M24 46h16" />
          </svg>
          <h2>No photos yet</h2>
          <p className="muted">
            Photos you take in the booth appear here automatically — nothing to save, nothing uploaded.
          </p>
          <Button icon="camera" onClick={() => navigate('booth')}>
            Take your first strip
          </Button>
        </div>
      ) : (
        <div className="gallery-grid stagger">
          {entries.map((e) => (
            <GalleryTile
              key={e.id}
              entry={e}
              selectMode={selectMode}
              selected={selected.includes(e.id)}
              onOpen={() => setDetailId(e.id)}
              onToggle={() => toggleSelect(e.id)}
            />
          ))}
        </div>
      )}

      {selectMode && entries.length > 0 ? (
        <div className="select-bar" style={{ marginTop: 16 }}>
          <strong className="tiny">{selected.length} selected</strong>
          <span style={{ flex: 1 }} />
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
        <div style={{ display: 'grid', gap: 12 }} className="tiny">
          <p className="muted">
            Keepsake stores photos <strong>only in this browser, on this device</strong> — using IndexedDB, not the cloud. There are no
            accounts and no backups.
          </p>
          <p className="muted">Things that can remove them:</p>
          <ul className="muted" style={{ paddingLeft: 20, display: 'grid', gap: 6 }}>
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
    return <p className="tiny muted" style={{ marginBottom: 12 }}>Browser-local storage · size estimates unavailable</p>
  }
  const pct = Math.min(100, (estimate.usage / estimate.quota) * 100)
  const level = pct > 90 ? 'full' : pct > 65 ? 'high' : ''
  return (
    <div className="storage-meter" style={{ marginBottom: 16, maxWidth: 420 }}>
      <div className="bar" role="meter" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Gallery storage used">
        <i className={level} style={{ width: `${Math.max(2, pct)}%` }} />
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
  selectMode,
  selected,
  onOpen,
  onToggle,
}: {
  entry: GalleryEntry
  selectMode: boolean
  selected: boolean
  onOpen: () => void
  onToggle: () => void
}) {
  return (
    <button
      className="gallery-tile"
      aria-pressed={selectMode ? selected : undefined}
      aria-label={
        selectMode
          ? `${selected ? 'Deselect' : 'Select'} ${entry.kind === 'strip' ? 'saved strip' : 'photo'} from ${new Date(entry.createdAt).toLocaleDateString()}`
          : `Open ${entry.kind === 'strip' ? 'saved strip' : 'photo'} from ${new Date(entry.createdAt).toLocaleDateString()}`
      }
      onClick={selectMode ? onToggle : onOpen}
    >
      {entry.corrupt || !entry.thumbUrl ? (
        <span className="tiny muted" style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
          <Icon name="info" size={20} />
        </span>
      ) : (
        <img src={entry.thumbUrl} alt="" loading="lazy" />
      )}
      {entry.kind === 'strip' ? <span className="kind-tag">STRIP</span> : null}
    </button>
  )
}

function GalleryDetail({ entry, onClose, onDelete }: { entry: GalleryEntry | null; onClose: () => void; onDelete: (id: string) => void }) {
  const [fullUrl, setFullUrl] = useState<string | null>(null)

  useEffect(() => {
    let url: string | null = null
    let alive = true
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

  if (!entry) return null
  return (
    <Modal open={!!entry} title={entry.kind === 'strip' ? 'Saved strip' : 'Photo'} onClose={onClose}>
      <div className="gallery-detail">
        {fullUrl ? <img src={fullUrl} alt={entry.label ?? 'Gallery photo'} /> : <div style={{ height: 200, display: 'grid', placeItems: 'center' }} className="muted tiny">Loading…</div>}
        <p className="mono muted" style={{ textAlign: 'center' }}>
          {new Date(entry.createdAt).toLocaleString()} · {entry.width}×{entry.height} · {formatBytes(entry.bytes)}
          {entry.label ? ` · ${entry.label}` : ''}
        </p>
        {entry.corrupt ? (
          <p className="tiny" style={{ color: 'var(--danger)' }} role="alert">
            This record looks damaged — the image data may be missing.
          </p>
        ) : null}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
          {fullUrl ? (
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
