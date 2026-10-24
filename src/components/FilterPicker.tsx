/** Filter picker: category chips + live thumbnails rendered from the user's photo. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { FILTERS, FILTER_CATEGORIES, getFilter } from '../data/filters'
import { buildFilterString, ctxFilterSupported, applyOverlays } from '../render/filterRender'
import { coverCrop } from '../lib/images'
import { Chip, ChipRow, PickerCard, Slider } from './ui'
import type { RenderImage } from '../render/compose'
import type { FilterPreset } from '../types'

const THUMB = 64

function FilterThumb({ preset, image }: { preset: FilterPreset; image: RenderImage | undefined }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = THUMB
    canvas.height = THUMB
    ctx.clearRect(0, 0, THUMB, THUMB)
    if (!image) {
      // sample gradient when no photo yet
      const g = ctx.createLinearGradient(0, 0, THUMB, THUMB)
      g.addColorStop(0, '#D9B8A6')
      g.addColorStop(0.55, '#8A9B8A')
      g.addColorStop(1, '#4E4238')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, THUMB, THUMB)
    } else {
      const crop = coverCrop(image.width, image.height, 1, 1, 0, 0)
      if (ctxFilterSupported()) {
        ctx.filter = buildFilterString(preset.params, 1, THUMB / 600)
        ctx.drawImage(image.source, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, THUMB, THUMB)
        ctx.filter = 'none'
      } else {
        ctx.drawImage(image.source, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, THUMB, THUMB)
      }
    }
    applyOverlays(ctx, { x: 0, y: 0, w: THUMB, h: THUMB }, preset.overlays, 1, `thumb:${preset.id}`)
  }, [preset, image])
  return <canvas ref={ref} style={{ width: THUMB, height: THUMB, borderRadius: 8, display: 'block' }} aria-hidden="true" />
}

export function FilterPicker({
  selectedId,
  intensity,
  onSelect,
  onIntensity,
  onIntensityCommit,
  sampleImage,
}: {
  selectedId: string | null
  intensity: number
  onSelect: (id: string | null) => void
  onIntensity: (v: number) => void
  onIntensityCommit?: () => void
  sampleImage: RenderImage | undefined
}) {
  const [category, setCategory] = useState<string>('All')
  const cats = useMemo(() => ['All', ...FILTER_CATEGORIES], [])
  const list = useMemo(
    () => (category === 'All' ? FILTERS : FILTERS.filter((f) => f.category === category)),
    [category]
  )
  const preset = getFilter(selectedId)

  return (
    <div>
      <ChipRow label="Filter categories" role="tablist" className="py-1">
        {cats.map((c) => (
          <Chip key={c} role="tab" aria-selected={category === c} active={category === c} onClick={() => setCategory(c)}>
            {c}
          </Chip>
        ))}
      </ChipRow>
      <div
        role="radiogroup"
        aria-label="Filter preset"
        className="grid justify-center gap-2.5 py-2 pb-4"
        style={{ gridTemplateColumns: `repeat(auto-fill, ${THUMB + 26}px)` }}
      >
        <PickerCard role="radio" aria-checked={selectedId === null} onClick={() => onSelect(null)} className="gap-1 p-1.5">
          <div className="grid size-16 place-items-center rounded-lg bg-surface-2 text-[11px] font-semibold text-ink-soft">Original</div>
          <span className="text-[11.5px] font-semibold">None</span>
        </PickerCard>
        {list.map((f) => {
          const selected = f.id === selectedId
          return (
            <PickerCard key={f.id} role="radio" aria-checked={selected} onClick={() => onSelect(f.id)} className="gap-1 p-1.5">
              <FilterThumb preset={f} image={sampleImage} />
              <span className="text-[11.5px] font-semibold" style={{ color: selected ? 'var(--color-rose-deep)' : 'var(--color-ink)' }}>
                {f.name}
              </span>
            </PickerCard>
          )
        })}
      </div>
      {preset ? (
        <Slider
          label="Intensity"
          value={intensity}
          min={0}
          max={1}
          step={0.05}
          onChange={onIntensity}
          onCommit={onIntensityCommit}
        />
      ) : null}
    </div>
  )
}
