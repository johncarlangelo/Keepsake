/** Template & Frame pickers — mini renders straight from the shared engine. */
import { useEffect, useMemo, useRef } from 'react'
import type { Composition } from '../types'
import { FRAMES } from '../data/frames'
import { TEMPLATES } from '../data/templates'
import { emptyComposition, renderComposition, type RenderImage, type RenderOptions } from '../render/compose'
import { PickerCard } from './ui'

const MINI_OPTS: RenderOptions = { placeholder: 'sample', text: false }

function MiniCanvas({
  comp,
  images,
  width,
  height,
  opts = MINI_OPTS,
}: {
  comp: Composition
  images: Record<string, RenderImage | undefined>
  width: number
  height: number
  opts?: RenderOptions
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (ref.current) renderComposition(ref.current, comp, images, width, opts)
  }, [comp, images, width, opts])
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
    <div role="radiogroup" aria-label="Strip layout" className="stagger-cards grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(88px,1fr))]">
      {TEMPLATES.map((t) => {
        const selected = t.id === selectedId
        const w = Math.min(84, Math.round((84 * t.canvas.w) / t.canvas.h))
        const h = Math.round((w * t.canvas.h) / t.canvas.w)
        return (
          <PickerCard key={t.id} role="radio" aria-checked={selected} onClick={() => onSelect(t.id)} className="gap-1.5">
            <MiniCanvas comp={comps[t.id]!} images={images} width={w} height={h} />
            <span className="text-xs font-semibold" style={{ color: selected ? 'var(--color-rose-deep)' : 'var(--color-ink)' }}>
              {t.name}
            </span>
            <span className="muted text-[0.8125rem]">
              {t.shots} {t.shots === 1 ? 'shot' : 'shots'}
            </span>
          </PickerCard>
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
    <div role="radiogroup" aria-label="Frame theme" className="stagger-cards grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(76px,1fr))]">
      {FRAMES.map((f) => {
        const selected = f.id === selectedId
        return (
          <PickerCard key={f.id} role="radio" aria-checked={selected} onClick={() => onSelect(f.id)}>
            <MiniCanvas comp={frameComps[f.id]!} images={images} width={56} height={Math.round((56 * 1840) / 600)} />
            <span className="text-[11.5px] font-semibold" style={{ color: selected ? 'var(--color-rose-deep)' : 'var(--color-ink)' }}>
              {f.name}
            </span>
          </PickerCard>
        )
      })}
    </div>
  )
}
