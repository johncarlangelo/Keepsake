/** Studio: strip editor — layout, filters, frames, text, stickers, adjust, export. */
import { useEffect, useMemo, useState } from 'react'
import { useEditor, endInteraction } from '../state/editor'
import { useGallery } from '../state/gallery'
import { useSettings } from '../state/settings'
import { useRenderImages, StripCanvas } from '../components/StripCanvas'
import { TemplatePicker, FramePicker } from '../components/pickers'
import { FilterPicker } from '../components/FilterPicker'
import { StickerTray, TextPanel } from '../components/decorations'
import { Button, Chip, ConfirmDialog, Segmented, Sheet, Slider } from '../components/ui'
import { Icon } from '../components/icons'
import { getTemplate } from '../data/templates'
import { getFrame } from '../data/frames'
import { renderExportCanvas } from '../render/compose'
import { canvasToPngBlob } from '../lib/share'
import { canShareFiles, downloadBlob, exportFilename, platformSaveHint, sharePng } from '../lib/share'
import { makeThumb } from '../lib/images'
import { newId, putPhoto } from '../lib/db'
import { navigate } from '../route'
import { toast } from '../state/toast'

const TABS = [
  { id: 'layout', label: 'Layout', icon: 'layout' },
  { id: 'filter', label: 'Filter', icon: 'sliders' },
  { id: 'frame', label: 'Frame', icon: 'frame' },
  { id: 'text', label: 'Text', icon: 'text' },
  { id: 'stickers', label: 'Stickers', icon: 'sticker' },
] as const

export function StudioScreen() {
  const editor = useEditor()
  const { comp, selectedSlot, toolTab } = editor
  const { settings, update } = useSettings()
  const [showExport, setShowExport] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [pickerSlot, setPickerSlot] = useState<number | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [exporting, setExporting] = useState(false)

  const photoIds = useMemo(() => (comp ? comp.slots.map((s) => s.photoId) : []), [comp])
  const images = useRenderImages(photoIds)
  const sampleImage = useMemo(() => {
    const id = selectedSlot !== null ? photoIds[selectedSlot] : photoIds.find(Boolean)
    return id ? images[id] : undefined
  }, [images, photoIds, selectedSlot])

  /* keyboard: undo/redo, sticker nudge/delete */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const state = useEditor.getState()
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) state.redo()
        else state.undo()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        state.redo()
        return
      }
      if (state.selectedSticker) {
        const s = state.comp?.stickers.find((x) => x.uid === state.selectedSticker)
        if (!s) return
        const step = e.shiftKey ? 0.05 : 0.01
        if (e.key === 'ArrowLeft') { e.preventDefault(); state.updateSticker(s.uid, { x: s.x - step }) }
        else if (e.key === 'ArrowRight') { e.preventDefault(); state.updateSticker(s.uid, { x: s.x + step }) }
        else if (e.key === 'ArrowUp') { e.preventDefault(); state.updateSticker(s.uid, { y: s.y - step }) }
        else if (e.key === 'ArrowDown') { e.preventDefault(); state.updateSticker(s.uid, { y: s.y + step }) }
        else if (e.key === 'Delete' || e.key === 'Backspace') {
          const tag = (e.target as HTMLElement)?.tagName
          if (tag === 'INPUT' || tag === 'TEXTAREA') return
          e.preventDefault()
          state.removeSticker(s.uid)
        }
      }
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])

  if (!comp) {
    return (
      <section className="empty-state anim-enter" aria-label="Studio is empty">
        <Icon name="wand" size={72} />
        <h2>Nothing in the Studio yet</h2>
        <p className="muted">Take photos in the Booth or pick some from your Gallery to start a strip.</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button icon="camera" onClick={() => navigate('booth')}>
            Go to Booth
          </Button>
          <Button variant="secondary" icon="gallery" onClick={() => navigate('gallery')}>
            Open Gallery
          </Button>
        </div>
      </section>
    )
  }

  const template = getTemplate(comp.templateId)
  const frame = getFrame(comp.frameId)
  const selectedSlotEdit = selectedSlot !== null ? comp.slots[selectedSlot] : undefined
  const tabs = selectedSlot !== null ? [...TABS, { id: 'adjust' as const, label: 'Adjust', icon: 'sliders' as const }] : TABS

  const onSlotTap = (i: number | null) => {
    editor.selectSlot(i)
    if (i !== null && !comp.slots[i]?.photoId) {
      setPickerSlot(i)
      setShowPicker(true)
    }
  }

  const runExport = async (mode: 'share' | 'download' | 'gallery'): Promise<void> => {
    setExporting(true)
    try {
      const canvas = await renderExportCanvas(comp, images, settings.exportScale)
      const blob = await canvasToPngBlob(canvas)
      if (mode === 'download') {
        downloadBlob(blob, exportFilename())
        toast('Saved to your downloads.')
      } else if (mode === 'share') {
        const ok = await sharePng(blob, exportFilename())
        if (!ok) toast('Sharing was not available — try Download instead.', { kind: 'error' })
      } else {
        const thumb = await makeThumb(canvas, 360)
        const res = await putPhoto({
          id: newId(),
          kind: 'strip',
          createdAt: Date.now(),
          width: canvas.width,
          height: canvas.height,
          bytes: blob.size,
          blob,
          thumb,
          label: `${template.name} · ${frame.name}`,
        })
        if (res.ok) {
          toast('Strip saved to your Gallery.')
          void useGallery.getState().refresh()
        } else {
          toast('Could not save the strip to storage.', { kind: 'error' })
        }
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Export failed.', { kind: 'error' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <section className="studio-root anim-enter" aria-label="Strip studio">
      <div className="studio-toolbar">
        <Button variant="ghost" size="sm" icon="undo" onClick={() => editor.undo()} disabled={editor.past.length === 0} aria-label="Undo (Ctrl+Z)">
          <span className="btn-label">Undo</span>
        </Button>
        <Button variant="ghost" size="sm" icon="redo" onClick={() => editor.redo()} disabled={editor.future.length === 0} aria-label="Redo (Ctrl+Shift+Z)">
          <span className="btn-label">Redo</span>
        </Button>
        <Button variant="ghost" size="sm" icon="reset" onClick={() => setConfirmReset(true)} aria-label="Reset edits">
          <span className="btn-label">Reset</span>
        </Button>
        <span className="tiny muted" style={{ marginLeft: 4 }}>
          {template.name} · {frame.name}
        </span>
        <span style={{ flex: 1 }} />
        <Button icon="download" onClick={() => setShowExport(true)}>
          Export
        </Button>
      </div>

      <div className="studio-canvas-area" key={`${comp.templateId}:${comp.frameId}`}>
        <StripCanvas comp={comp} images={images} interactive onSlotTap={onSlotTap} />
      </div>

      <div className="studio-side">
        <div className="studio-tabs" role="tablist" aria-label="Edit tools">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={toolTab === t.id} className="studio-tab" onClick={() => editor.setToolTab(t.id)}>
              <Icon name={t.icon} size={16} /> {t.label}
            </button>
          ))}
        </div>

        <div className="studio-panel" role="tabpanel">
          {toolTab === 'layout' ? (
            <div>
              <p className="tiny muted" style={{ marginBottom: 10 }}>
                Switching layouts keeps your photos in reading order.
              </p>
              <TemplatePicker selectedId={comp.templateId} onSelect={editor.setTemplate} images={images} />
            </div>
          ) : null}

          {toolTab === 'filter' ? (
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                <span className="tiny muted">
                  {editor.applyToAll || selectedSlot === null ? 'Whole strip' : `Slot ${selectedSlot + 1}`}
                </span>
                <span style={{ flex: 1 }} />
                <Chip active={editor.applyToAll} onClick={() => editor.setApplyToAll(!editor.applyToAll)}>
                  Apply to all photos
                </Chip>
              </div>
              {selectedSlot === null && !editor.applyToAll ? (
                <p className="tiny muted" style={{ marginBottom: 8 }}>
                  Tip: tap a photo on the strip to filter just that one.
                </p>
              ) : null}
              <FilterPicker
                selectedId={editor.applyToAll || selectedSlot === null ? comp.slots.find((s) => s.filterId)?.filterId ?? null : selectedSlotEdit?.filterId ?? null}
                intensity={selectedSlotEdit?.intensity ?? 1}
                onSelect={(id) => {
                  if (editor.applyToAll || selectedSlot === null) editor.applyFilterToAll(id)
                  else editor.setSlotFilter(selectedSlot, id)
                }}
                onIntensity={(v) => {
                  if (!useEditor.getState().interacting) editor.beginInteraction()
                  if (editor.applyToAll || selectedSlot === null) {
                    for (let i = 0; i < comp.slots.length; i++) editor.setSlotIntensity(i, v)
                  } else if (selectedSlot !== null) {
                    editor.setSlotIntensity(selectedSlot, v)
                  }
                }}
                onIntensityCommit={endInteraction}
                sampleImage={sampleImage}
              />
            </div>
          ) : null}

          {toolTab === 'frame' ? (
            <div>
              <FramePicker selectedId={comp.frameId} onSelect={editor.setFrame} templateId={comp.templateId} images={images} />
              {frame.customColor ? (
                <div style={{ marginTop: 14 }}>
                  <span className="tiny muted">Frame color</span>
                  <div className="chip-row" role="group" aria-label="Frame color">
                    {['#F4E3DC', '#F7F1E5', '#FFFFFF', '#2B2118', '#EAF4F4', '#FBEFF2', '#E8E8F2', '#F3EFE6'].map((c) => (
                      <Chip key={c} active={comp.frameColor === c} onClick={() => editor.setCustomColor(c)} aria-label={`Frame color ${c}`}>
                        <span style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: '1px solid rgba(0,0,0,0.15)', display: 'inline-block' }} />
                      </Chip>
                    ))}
                    {comp.frameColor ? (
                      <Chip onClick={() => editor.setCustomColor(undefined)}>Reset</Chip>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {toolTab === 'text' ? (
            <div onFocusCapture={() => { if (!useEditor.getState().interacting) editor.beginInteraction() }} onBlurCapture={endInteraction}>
              <TextPanel text={comp.text} onChange={(patch) => editor.setText(patch)} />
            </div>
          ) : null}

          {toolTab === 'stickers' ? <StickerTray /> : null}

          {toolTab === 'adjust' && selectedSlot !== null && selectedSlotEdit ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <strong className="tiny">Photo slot {selectedSlot + 1}</strong>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button size="sm" variant="secondary" icon="gallery" onClick={() => { setPickerSlot(selectedSlot); setShowPicker(true) }}>
                  Replace
                </Button>
                <Button size="sm" variant="ghost" icon="switch" onClick={() => editor.toggleFlip(selectedSlot)}>
                  Flip
                </Button>
                {selectedSlotEdit.photoId ? (
                  <Button size="sm" variant="danger" icon="trash" onClick={() => editor.setSlotPhoto(selectedSlot, null)}>
                    Clear
                  </Button>
                ) : null}
              </div>
              {selectedSlotEdit.photoId ? (
                <>
                  <Slider
                    label="Zoom"
                    value={selectedSlotEdit.crop.zoom}
                    min={1}
                    max={3}
                    step={0.05}
                    onChange={(v) => {
                      if (!useEditor.getState().interacting) editor.beginInteraction()
                      editor.setSlotCrop(selectedSlot, { ...selectedSlotEdit.crop, zoom: v })
                    }}
                    onCommit={endInteraction}
                    format={(v) => `${v.toFixed(2)}×`}
                  />
                  <Slider
                    label="Pan ↕"
                    value={selectedSlotEdit.crop.y}
                    min={-0.5}
                    max={0.5}
                    step={0.02}
                    onChange={(v) => {
                      if (!useEditor.getState().interacting) editor.beginInteraction()
                      editor.setSlotCrop(selectedSlot, { ...selectedSlotEdit.crop, y: v })
                    }}
                    onCommit={endInteraction}
                    format={(v) => v.toFixed(2)}
                  />
                  <Slider
                    label="Pan ↔"
                    value={selectedSlotEdit.crop.x}
                    min={-0.5}
                    max={0.5}
                    step={0.02}
                    onChange={(v) => {
                      if (!useEditor.getState().interacting) editor.beginInteraction()
                      editor.setSlotCrop(selectedSlot, { ...selectedSlotEdit.crop, x: v })
                    }}
                    onCommit={endInteraction}
                    format={(v) => v.toFixed(2)}
                  />
                </>
              ) : (
                <p className="tiny muted">This slot is empty — pick a photo to adjust it.</p>
              )}
              <hr className="divider" />
              <span className="tiny muted">Order</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="sm" variant="secondary" icon="arrowLeft" onClick={() => editor.moveSlot(selectedSlot, Math.max(0, selectedSlot - 1))}>
                  Move up
                </Button>
                <Button size="sm" variant="secondary" icon="arrowRight" onClick={() => editor.moveSlot(selectedSlot, Math.min(comp.slots.length - 1, selectedSlot + 1))}>
                  Move down
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* photo picker */}
      <Sheet open={showPicker} title={pickerSlot !== null ? `Photo for slot ${pickerSlot + 1}` : 'Pick photos'} onClose={() => setShowPicker(false)}>
        <PhotoPicker
          onPick={(id) => {
            if (pickerSlot !== null) editor.setSlotPhoto(pickerSlot, id)
            setShowPicker(false)
          }}
        />
      </Sheet>

      {/* export */}
      <Sheet open={showExport} title="Export your keepsake" onClose={() => setShowExport(false)}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, height: 320 }}>
          <StripCanvas comp={comp} images={images} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <span className="tiny muted">Quality</span>
          <Segmented
            label="Export quality"
            value={String(settings.exportScale)}
            onChange={(v) => update({ exportScale: Number(v) as 2 | 3 })}
            options={[
              { value: '2', label: `${template.canvas.w * 2}w` },
              { value: '3', label: `${template.canvas.w * 3}w` },
            ]}
          />
          <span className="tiny muted">PNG</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {canShareFiles() ? (
            <Button icon="share" disabled={exporting} onClick={() => void runExport('share')}>
              Share…
            </Button>
          ) : null}
          <Button variant={canShareFiles() ? 'secondary' : 'primary'} icon="download" disabled={exporting} onClick={() => void runExport('download')}>
            {exporting ? 'Working…' : 'Download PNG'}
          </Button>
          <Button variant="ghost" icon="gallery" disabled={exporting} onClick={() => void runExport('gallery')}>
            Save strip to Gallery
          </Button>
        </div>
        <p className="tiny muted" style={{ marginTop: 12 }}>
          {platformSaveHint(navigator.userAgent)}
        </p>
      </Sheet>

      <ConfirmDialog
        open={confirmReset}
        title="Reset all edits?"
        message="Filters, crops, text, and stickers will be removed. Your original photos stay untouched in the Gallery."
        confirmLabel="Reset"
        onConfirm={() => editor.reset()}
        onCancel={() => setConfirmReset(false)}
      />
    </section>
  )
}

/* ---------- photo picker (Gallery thumbs) ---------- */

function PhotoPicker({ onPick }: { onPick: (photoId: string) => void }) {
  const entries = useGallery((s) => s.entries)
  const refresh = useGallery((s) => s.refresh)
  useEffect(() => {
    if (entries.length === 0) void refresh()
  }, [entries.length, refresh])
  const captures = entries.filter((e) => e.kind === 'capture' && !e.corrupt)
  if (captures.length === 0) {
    return <p className="muted tiny">No photos in your Gallery yet — take some in the Booth first.</p>
  }
  return (
    <div className="gallery-grid">
      {captures.map((e) => (
        <button key={e.id} className="gallery-tile" aria-label={`Use photo from ${new Date(e.createdAt).toLocaleString()}`} onClick={() => onPick(e.id)}>
          {e.thumbUrl ? <img src={e.thumbUrl} alt="" /> : null}
        </button>
      ))}
    </div>
  )
}
