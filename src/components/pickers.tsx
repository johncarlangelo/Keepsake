/** Template & Frame pickers — mini renders straight from the shared engine. */
import { useEffect, useMemo, useRef } from 'react'
import type { Composition } from '../types'
import { FRAMES } from '../data/frames'
import { TEMPLATES } from '../data/templates'
import { emptyComposition, renderComposition, type RenderImage } from '../render/compose'

function MiniCanvas({ comp, images, width, height }: { comp: Composition; images: Record<string, RenderImage | undefined>; width: number; height: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (ref.current) renderComposition(ref.current, comp, images, width)
  }, [comp, images, width])
  return <canvas ref={ref} style={{ width, height, display: 'block', borderRadius: 6 }} aria-hidden="true" />
}

export function TemplatePicker({
  selectedId,
  onSelect,
  images,
}: {
  selectedId: string
  onSelect: (id: string) => void
  images: Record<string, RenderImage | undefined>
}) {
  const comps = useMemo(() => {
    const map: Record<string, Composition> = {}
    for (const t of TEMPLATES) map[t.id] = emptyComposition(t.id)
    return map
  }, [])
  return (
    <div role="radiogroup" aria-label="Strip layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 12 }}>
      {TEMPLATES.map((t) => {
        const selected = t.id === selectedId
        const w = Math.min(84, Math.round((84 * t.canvas.w) / t.canvas.h))
        const h = Math.round((w * t.canvas.h) / t.canvas.w)
        return (
          <button
            key={t.id}
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(t.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              padding: 8,
              borderRadius: 12,
              border: selected ? '2px solid var(--rose)' : '1px solid var(--line)',
              background: selected ? 'var(--blush)' : 'var(--surface)',
              cursor: 'pointer',
            }}
          >
            <MiniCanvas comp={comps[t.id]!} images={images} width={w} height={h} />
            <span style={{ fontSize: 12, fontWeight: 600, color: selected ? 'var(--rose-deep)' : 'var(--ink)' }}>{t.name}</span>
            <span className="tiny muted">
              {t.shots} {t.shots === 1 ? 'shot' : 'shots'}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function FramePicker({
  selectedId,
  onSelect,
  templateId,
  images,
}: {
  selectedId: string
  onSelect: (id: string) => void
  templateId: string
  images: Record<string, RenderImage | undefined>
}) {
  const base = useMemo(() => emptyComposition(templateId), [templateId])
  const frameComps = useMemo(() => {
    const map: Record<string, Composition> = {}
    for (const f of FRAMES) map[f.id] = { ...base, frameId: f.id }
    return map
  }, [base])
  return (
    <div role="radiogroup" aria-label="Frame theme" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', gap: 12 }}>
      {FRAMES.map((f) => {
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
              alignItems: 'center',
              gap: 6,
              padding: 8,
              borderRadius: 12,
              border: selected ? '2px solid var(--rose)' : '1px solid var(--line)',
              background: 'var(--surface)',
              cursor: 'pointer',
            }}
          >
            <MiniCanvas comp={frameComps[f.id]!} images={images} width={56} height={Math.round((56 * 1840) / 600)} />
            <span style={{ fontSize: 11.5, fontWeight: 600, color: selected ? 'var(--rose-deep)' : 'var(--ink)' }}>{f.name}</span>
          </button>
        )
      })}
    </div>
  )
}
