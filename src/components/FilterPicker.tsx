/** Filter picker: category chips + live thumbnails rendered from the user's photo. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { FILTERS, FILTER_CATEGORIES, getFilter } from '../data/filters'
import { buildFilterString, ctxFilterSupported, applyOverlays } from '../render/filterRender'
import { coverCrop } from '../lib/images'
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
      <div className="chip-row" role="tablist" aria-label="Filter categories">
        {cats.map((c) => (
          <button key={c} role="tab" aria-selected={category === c} className="chip" aria-pressed={category === c} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>
      <div role="radiogroup" aria-label="Filter preset" style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, ${THUMB + 26}px)`, gap: 10, justifyContent: 'center', padding: '8px 0 16px' }}>
        <button
          role="radio"
          aria-checked={selectedId === null}
          onClick={() => onSelect(null)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            alignItems: 'center',
            padding: 6,
            borderRadius: 12,
            border: selectedId === null ? '2px solid var(--rose)' : '1px solid var(--line)',
            background: selectedId === null ? 'var(--blush)' : 'var(--surface)',
            cursor: 'pointer',
          }}
        >
          <div style={{ width: THUMB, height: THUMB, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--surface-2)', color: 'var(--ink-soft)', fontSize: 11, fontWeight: 600 }}>
            Original
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 600 }}>None</span>
        </button>
        {list.map((f) => {
          const selected = f.id === selectedId
          return (
            <button
              key={f.id}
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(f.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                alignItems: 'center',
                padding: 6,
                borderRadius: 12,
                border: selected ? '2px solid var(--rose)' : '1px solid var(--line)',
                background: selected ? 'var(--blush)' : 'var(--surface)',
                cursor: 'pointer',
              }}
            >
              <FilterThumb preset={f} image={sampleImage} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: selected ? 'var(--rose-deep)' : 'var(--ink)' }}>{f.name}</span>
            </button>
          )
        })}
      </div>
      {preset ? (
        <label className="slider" aria-label="Filter intensity">
          <span>
            <span>Intensity</span>
            <span>{Math.round(intensity * 100)}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={intensity}
            aria-label="Filter intensity"
            onChange={(e) => onIntensity(Number(e.target.value))}
            onPointerUp={onIntensityCommit}
            onKeyUp={onIntensityCommit}
          />
        </label>
      ) : null}
    </div>
  )
}
