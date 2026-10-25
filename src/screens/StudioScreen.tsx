/** Studio: strip editor — layout, filters, frames, text, stickers, adjust, export. */
import { useEffect, useMemo, useState } from 'react'
import { useEditor, endInteraction } from '../state/editor'
import { useGallery } from '../state/gallery'
import { useSettings } from '../state/settings'
import { useLiveClips, useRenderImages, StripCanvas } from '../components/StripCanvas'
import { LiveStripPlayer } from '../components/LiveStrip'
import { TemplatePicker, FramePicker } from '../components/pickers'
import { FilterPicker } from '../components/FilterPicker'
import { StickerTray, TextPanel } from '../components/decorations'
import { Button, Chip, ConfirmDialog, LabeledIconButton, Segmented, Sheet, Slider, Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui'
import { Icon } from '../components/icons'
import { getTemplate } from '../data/templates'
import { getFrame } from '../data/frames'
import { renderExportCanvas } from '../render/compose'
import { canvasToPngSync, isIos, savePngFromBlob } from '../lib/share'
import { canShareFiles, exportFilename, platformSaveHint, sharePng } from '../lib/share'
import { makeThumb } from '../lib/images'
import { newId, putPhoto } from '../lib/db'
import { navigate } from '../route'
import { toast } from '../state/toast'
import type { ToolTab } from '../state/editor'

const TABS: Array<{ id: ToolTab; label: string; icon: Parameters<typeof Icon>[0]['name'] }> = [
  { id: 'layout', label: 'Layout', icon: 'layout' },
  { id: 'filter', label: 'Filter', icon: 'sliders' },
  { id: 'frame', label: 'Frame', icon: 'frame' },
  { id: 'text', label: 'Text', icon: 'text' },
  { id: 'stickers', label: 'Stickers', icon: 'sticker' },
]

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
  const liveClips = useLiveClips(photoIds, true)
  const hasLive = useMemo(
    () => (comp ? comp.slots.some((s) => s.photoId && liveClips[s.photoId!]) : false),
    [comp, liveClips]
  )
  const liveStripData = useMemo(
    () =>
      comp
        ? {
            templateId: comp.templateId,
            frameId: comp.frameId,
            frameColor: comp.frameColor ?? null,
            text: { ...comp.text },
            slots: comp.slots.map((s) => s.photoId ?? ''),
          }
        : null,
    [comp]
  )

  /* save the live strip as its own Gallery keepsake (still strip untouched) */
  const saveLiveStrip = async (): Promise<void> => {
    if (!comp || !liveStripData) return
    setExporting(true)
    try {
      const canvas = renderExportCanvas(comp, images, 2)
      const thumb = await makeThumb(canvas, 360)
      const res = await putPhoto({
        id: newId(),
        kind: 'live-strip',
        createdAt: Date.now(),
        width: template.canvas.w,
        height: template.canvas.h,
        bytes: thumb.size,
        blob: thumb,
        thumb,
        label: `${template.name} · ${frame.name} · live`,
        liveStrip: liveStripData,
      })
      if (res.ok) {
        toast('Live strip saved to your Gallery.')
        void useGallery.getState().refresh()
      } else {
        toast('Could not save the live strip to storage.', { kind: 'error' })
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save the live strip.', { kind: 'error' })
    } finally {
      setExporting(false)
    }
  }

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
      <section className="flex flex-col items-center gap-3 px-4 py-12 text-center text-ink-soft animate-enter" aria-label="Studio is empty">
        <Icon name="wand" size={72} />
        <h2 className="text-ink">Nothing in the Studio yet</h2>
        <p className="muted">Take photos in the Booth or pick some from your Gallery to start a strip.</p>
        <div className="flex flex-wrap justify-center gap-3">
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
  const tabs = selectedSlot !== null ? [...TABS, { id: 'adjust' as ToolTab, label: 'Adjust', icon: 'sliders' as const }] : TABS

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
      /* Everything from here to the share/download call must stay SYNCHRONOUS:
         iOS Safari expires the tap's user activation across awaits, which is
         why exports silently failed on iPhone (D-033). */
      const canvas = renderExportCanvas(comp, images, settings.exportScale)
      const blob = canvasToPngSync(canvas)
      if (mode === 'download') {
        const result = savePngFromBlob(blob, exportFilename())
        toast(result === 'shared' ? 'Sharing open — choose "Save Image" to keep it in Photos.' : 'Saved to your downloads.')
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
    /* D-027 three-band structure — the containment contract must hold:
       sticky top band (toolbar+tabs), body grid canvas|panel, per-pane containment. */
    <Tabs
      value={toolTab}
      onValueChange={(v) => editor.setToolTab(v as Parameters<typeof editor.setToolTab>[0])}
      className="flex min-w-0 flex-col gap-4"
    >
      <div className="sticky top-[calc(var(--header-h)+env(safe-area-inset-top,0px))] z-5 flex flex-col gap-3 bg-bg py-2">
        <div className="flex min-h-11 flex-wrap items-center gap-2">
          <LabeledIconButton icon="undo" label="Undo (Ctrl+Z)" onClick={() => editor.undo()} disabled={editor.past.length === 0}>
            Undo
          </LabeledIconButton>
          <LabeledIconButton icon="redo" label="Redo (Ctrl+Shift+Z)" onClick={() => editor.redo()} disabled={editor.future.length === 0}>
            Redo
          </LabeledIconButton>
          <LabeledIconButton icon="reset" label="Reset edits" onClick={() => setConfirmReset(true)}>
            Reset
          </LabeledIconButton>
          <span className="muted ml-1 text-sm">
            {template.name} · {frame.name}
          </span>
          <span className="flex-1" />
          <Button icon="download" onClick={() => setShowExport(true)}>
            Export
          </Button>
        </div>

        <TabsList aria-label="Edit tools">
          {tabs.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              <Icon name={t.icon} size={16} /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <div className="grid min-w-0 items-start gap-4 [grid-template-columns:minmax(0,1fr)] wide:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-2.5">
          {hasLive ? (
            /* both outputs side by side (stacked on mobile): still + live (D-034) */
            <div className="grid min-w-0 gap-4 wide:grid-cols-2">
              <figure className="m-0 flex min-w-0 flex-col gap-1.5">
                <div
                  key={`${comp.templateId}:${comp.frameId}`}
                  className="relative flex h-[clamp(280px,44dvh,620px)] min-w-0 justify-center overflow-hidden rounded-lg border border-line bg-surface p-3 shadow-1 wide:h-[clamp(380px,calc(100dvh-390px),700px)]"
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-3 left-2.5 w-2 rounded-[2px] opacity-70 [background-image:repeating-linear-gradient(180deg,var(--color-surface-2)_0_7px,transparent_7px_15px)]"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-3 right-2.5 w-2 rounded-[2px] opacity-70 [background-image:repeating-linear-gradient(180deg,var(--color-surface-2)_0_7px,transparent_7px_15px)]"
                  />
                  <StripCanvas comp={comp} images={images} interactive onSlotTap={onSlotTap} />
                </div>
                <figcaption className="muted text-center text-xs font-semibold uppercase tracking-widest">Still strip</figcaption>
              </figure>
              <figure className="m-0 flex min-w-0 flex-col gap-1.5">
                <div className="relative flex h-[clamp(280px,44dvh,620px)] items-center justify-center overflow-hidden rounded-lg border border-line bg-surface p-3 shadow-1 wide:h-[clamp(380px,calc(100dvh-390px),700px)]">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-3 left-2.5 w-2 rounded-[2px] opacity-70 [background-image:repeating-linear-gradient(180deg,var(--color-surface-2)_0_7px,transparent_7px_15px)]"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-3 right-2.5 w-2 rounded-[2px] opacity-70 [background-image:repeating-linear-gradient(180deg,var(--color-surface-2)_0_7px,transparent_7px_15px)]"
                  />
                  {liveStripData ? <LiveStripPlayer liveStrip={liveStripData} className="max-h-full" /> : null}
                </div>
                <figcaption className="muted text-center text-xs font-semibold uppercase tracking-widest">
                  Live strip <span className="text-rose">✦</span>
                </figcaption>
              </figure>
            </div>
          ) : (
            /* StripCanvas measures its box: the pane carries its own definite height
                and clips overflow — nothing can ever paint over a sibling (D-027). */
            <div
              key={`${comp.templateId}:${comp.frameId}`}
              className="relative flex h-[clamp(300px,52dvh,560px)] min-w-0 justify-center overflow-hidden rounded-lg border border-line bg-surface p-3 shadow-1 wide:h-[clamp(420px,calc(100dvh-330px),760px)]"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-3 left-2.5 w-2 rounded-[2px] opacity-70 [background-image:repeating-linear-gradient(180deg,var(--color-surface-2)_0_7px,transparent_7px_15px)]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-3 right-2.5 w-2 rounded-[2px] opacity-70 [background-image:repeating-linear-gradient(180deg,var(--color-surface-2)_0_7px,transparent_7px_15px)]"
              />
              <StripCanvas comp={comp} images={images} interactive onSlotTap={onSlotTap} />
            </div>
          )}

          {/* gallery saves live OUTSIDE the export sheet (owner request); above the
              strips on mobile so they are reachable without scrolling */}
          <div className="order-first flex flex-wrap gap-2 wide:order-last">
            <Button size="sm" variant="secondary" icon="gallery" disabled={exporting} onClick={() => void runExport('gallery')}>
              {exporting ? 'Working…' : 'Save still strip'}
            </Button>
            {hasLive ? (
              <Button size="sm" variant="secondary" icon="aperture" disabled={exporting} onClick={() => void saveLiveStrip()}>
                {exporting ? 'Working…' : 'Save live strip'}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 rounded-md border border-line bg-surface p-4 shadow-1 wide:max-h-[calc(100dvh-220px)] wide:overflow-y-auto">
          <TabsContent value="layout">
            <p className="muted mb-2.5 text-sm">Switching layouts keeps your photos in reading order.</p>
            <TemplatePicker selectedId={comp.templateId} onSelect={editor.setTemplate} images={images} />
          </TabsContent>

          <TabsContent value="filter">
            <div className="mb-2.5 flex flex-wrap items-center gap-2">
              <span className="muted text-sm">
                {editor.applyToAll || selectedSlot === null ? 'Whole strip' : `Slot ${selectedSlot + 1}`}
              </span>
              <span className="flex-1" />
              <Chip active={editor.applyToAll} onClick={() => editor.setApplyToAll(!editor.applyToAll)}>
                Apply to all photos
              </Chip>
            </div>
            {selectedSlot === null && !editor.applyToAll ? (
              <p className="muted mb-2 text-sm">Tip: tap a photo on the strip to filter just that one.</p>
            ) : null}
            <FilterPicker
              selectedId={editor.applyToAll || selectedSlot === null ? comp.slots.find((s) => s.filterId)?.filterId ?? null : selectedSlotEdit?.filterId ?? null}
              intensity={
                editor.applyToAll || selectedSlot === null
                  ? comp.slots.find((s) => s.filterId)?.intensity ?? 1
                  : selectedSlotEdit?.intensity ?? 1
              }
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
          </TabsContent>

          <TabsContent value="frame">
            <FramePicker selectedId={comp.frameId} onSelect={editor.setFrame} templateId={comp.templateId} images={images} />
            {frame.customColor ? (
              <div className="mt-3.5">
                <span className="muted text-sm">Frame color</span>
                <div role="group" aria-label="Frame color" className="flex flex-wrap gap-2 py-1">
                  {['#F4E3DC', '#F7F1E5', '#FFFFFF', '#2B2118', '#EAF4F4', '#FBEFF2', '#E8E8F2', '#F3EFE6'].map((c) => (
                    <Chip key={c} active={comp.frameColor === c} onClick={() => editor.setCustomColor(c)} aria-label={`Frame color ${c}`}>
                      <span className="inline-block size-[22px] rounded-full border border-black/15" style={{ background: c }} />
                    </Chip>
                  ))}
                  {comp.frameColor ? <Chip onClick={() => editor.setCustomColor(undefined)}>Reset</Chip> : null}
                </div>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="text" onFocusCapture={() => { if (!useEditor.getState().interacting) editor.beginInteraction() }} onBlurCapture={endInteraction}>
            <TextPanel text={comp.text} onChange={(patch) => editor.setText(patch)} />
          </TabsContent>

          <TabsContent value="stickers">
            <StickerTray />
          </TabsContent>

          <TabsContent value="adjust">
            {selectedSlot !== null && selectedSlotEdit ? (
              <div className="flex flex-col gap-3.5">
                <strong className="text-sm">Photo slot {selectedSlot + 1}</strong>
                <div className="flex flex-wrap gap-2">
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
                  <p className="muted text-sm">This slot is empty — pick a photo to adjust it.</p>
                )}
                <hr className="my-2 border-0 border-t border-line" />
                <span className="muted text-sm">Order</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" icon="arrowLeft" onClick={() => editor.moveSlot(selectedSlot, Math.max(0, selectedSlot - 1))}>
                    Move up
                  </Button>
                  <Button size="sm" variant="secondary" icon="arrowRight" onClick={() => editor.moveSlot(selectedSlot, Math.min(comp.slots.length - 1, selectedSlot + 1))}>
                    Move down
                  </Button>
                </div>
              </div>
            ) : null}
          </TabsContent>
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
        <div className="mb-3 flex h-80 justify-center">
          <StripCanvas comp={comp} images={images} />
        </div>
        <div className="mb-3.5 flex flex-wrap items-center gap-3">
          <span className="muted text-sm">Quality</span>
          <Segmented
            label="Export quality"
            value={String(settings.exportScale)}
            onChange={(v) => update({ exportScale: Number(v) as 2 | 3 })}
            options={[
              { value: '2', label: `${template.canvas.w * 2}w` },
              { value: '3', label: `${template.canvas.w * 3}w` },
            ]}
          />
          <span className="muted text-sm">PNG</span>
        </div>
        <div className="flex flex-col gap-2">
          {canShareFiles() ? (
            <Button icon="share" disabled={exporting} onClick={() => void runExport('share')}>
              Share…
            </Button>
          ) : null}
          <Button variant={canShareFiles() ? 'secondary' : 'primary'} icon="download" disabled={exporting} onClick={() => void runExport('download')}>
            {exporting ? 'Working…' : isIos() ? 'Save / Share PNG…' : 'Download PNG'}
          </Button>
        </div>
        <p className="muted mt-3 text-sm">{platformSaveHint(navigator.userAgent)}</p>
      </Sheet>

      <ConfirmDialog
        open={confirmReset}
        title="Reset all edits?"
        message="Filters, crops, text, and stickers will be removed. Your original photos stay untouched in the Gallery."
        confirmLabel="Reset"
        onConfirm={() => editor.reset()}
        onCancel={() => setConfirmReset(false)}
      />
    </Tabs>
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
    return <p className="muted text-sm">No photos in your Gallery yet — take some in the Booth first.</p>
  }
  return (
    <div className="grid gap-3 min-w-0 [grid-template-columns:repeat(auto-fill,minmax(104px,1fr))]">
      {captures.map((e) => (
        <button
          key={e.id}
          aria-label={`Use photo from ${new Date(e.createdAt).toLocaleString()}`}
          onClick={() => onPick(e.id)}
          className="overflow-hidden rounded-md border border-line bg-surface-2 shadow-1 transition-transform duration-150 hover:-translate-y-0.5"
        >
          {e.thumbUrl ? <img src={e.thumbUrl} alt="" className="aspect-square w-full object-cover" /> : null}
        </button>
      ))}
    </div>
  )
}
