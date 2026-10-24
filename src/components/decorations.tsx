/** Sticker tray + text/caption panel for the Studio tool sheet. */
import { STICKERS, STICKER_PALETTE } from '../data/stickers'
import { endInteraction, useEditor } from '../state/editor'
import type { TextConfig } from '../types'
import { Button, Card, Chip, ChipRow, Input, PickerCard, Segmented, Slider } from './ui'
import { Icon } from './icons'

export function StickerTray(): React.ReactNode {
  const { comp, selectedSticker, addSticker, updateSticker, removeSticker, bumpSticker, beginInteraction } = useEditor()
  const placed = comp?.stickers.find((s) => s.uid === selectedSticker)

  return (
    <div>
      <p className="muted mb-3 text-sm">Tap a sticker to place it, then drag it on the strip.</p>
      <div role="radiogroup" aria-label="Stickers" className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(64px,1fr))]">
        {STICKERS.map((s) => (
          <PickerCard
            key={s.id}
            onClick={() => addSticker(s.id)}
            title={`Add ${s.name}`}
            aria-label={`Add ${s.name} sticker`}
            className="grid place-items-center p-2.5"
          >
            <svg width="40" height="40" viewBox="0 0 100 100" aria-hidden="true">
              <path d={s.path} fill={s.defaultColor} />
            </svg>
          </PickerCard>
        ))}
      </div>

      {placed ? (
        <Card className="mt-4 flex flex-col gap-3">
          <strong className="text-sm">Selected sticker</strong>
          <ChipRow label="Sticker color" className="pb-1">
            {STICKER_PALETTE.map((c) => (
              <Chip
                key={c}
                aria-label={`Color ${c}`}
                active={placed.color === c}
                onClick={() => updateSticker(placed.uid, { color: c })}
                className="min-w-11 justify-center"
              >
                <span className="inline-block size-5 rounded-full border border-black/15" style={{ background: c }} />
              </Chip>
            ))}
          </ChipRow>
          <Slider
            label="Size"
            value={placed.scale}
            min={0.05}
            max={0.6}
            step={0.01}
            onChange={(v) => {
              if (!useEditor.getState().interacting) beginInteraction()
              updateSticker(placed.uid, { scale: v })
            }}
            onCommit={endInteraction}
            format={(v) => Math.round(v * 100) + ''}
          />
          <Slider
            label="Rotation"
            value={placed.rotation}
            min={-180}
            max={180}
            step={1}
            onChange={(v) => {
              if (!useEditor.getState().interacting) beginInteraction()
              updateSticker(placed.uid, { rotation: v })
            }}
            onCommit={endInteraction}
            format={(v) => `${Math.round(v)}°`}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" icon="arrowLeft" onClick={() => bumpSticker(placed.uid, -1)}>
              Back
            </Button>
            <Button size="sm" variant="ghost" icon="arrowRight" onClick={() => bumpSticker(placed.uid, 1)}>
              Front
            </Button>
            <Button size="sm" variant="danger" icon="trash" onClick={() => removeSticker(placed.uid)}>
              Remove
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  )
}

const TEXT_COLORS: Array<{ value: string; label: string }> = [
  { value: 'auto', label: 'Auto (frame)' },
  { value: '#2B2118', label: 'Ink' },
  { value: '#A3565E', label: 'Rose' },
  { value: '#B98A2F', label: 'Gold' },
  { value: '#7D8B6A', label: 'Sage' },
  { value: '#FFFFFF', label: 'Ivory' },
]

export function TextPanel({ text, onChange }: { text: TextConfig; onChange: (patch: Partial<TextConfig>) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor="caption" className="muted mb-1.5 block text-sm">
          Caption
        </label>
        <Input
          id="caption"
          type="text"
          maxLength={60}
          value={text.caption}
          placeholder="say something sweet…"
          onChange={(e) => onChange({ caption: e.target.value })}
        />
      </div>
      <div className="flex items-center gap-3 py-0.5">
        <input id="show-date" type="checkbox" className="size-5 accent-[var(--color-rose)]" checked={text.showDate} onChange={(e) => onChange({ showDate: e.target.checked })} />
        <label htmlFor="show-date" className="flex-1">Date stamp</label>
      </div>
      <div>
        <span className="muted text-sm">Font</span>
        <div className="mt-1.5">
          <Segmented
            label="Caption font"
            value={text.font}
            onChange={(v) => onChange({ font: v as TextConfig['font'] })}
            options={[
              { value: 'script', label: 'Script' },
              { value: 'serif', label: 'Serif' },
              { value: 'mono', label: 'Mono' },
              { value: 'sans', label: 'Sans' },
            ]}
          />
        </div>
      </div>
      <div>
        <span className="muted text-sm">Alignment</span>
        <div className="mt-1.5">
          <Segmented
            label="Caption alignment"
            value={text.align}
            onChange={(v) => onChange({ align: v as TextConfig['align'] })}
            options={[
              { value: 'left', label: 'Left' },
              { value: 'center', label: 'Center' },
              { value: 'right', label: 'Right' },
            ]}
          />
        </div>
      </div>
      <ChipRow label="Text color" className="pb-1">
        {TEXT_COLORS.map((c) => (
          <Chip key={c.value} active={text.color === c.value} onClick={() => onChange({ color: c.value })}>
            {c.value !== 'auto' ? (
              <span className="inline-block size-4 rounded-full border border-black/15" style={{ background: c.value }} />
            ) : (
              <Icon name="wand" size={16} />
            )}
            {c.label}
          </Chip>
        ))}
      </ChipRow>
      <Slider
        label="Text size"
        value={text.size}
        min={0.03}
        max={0.12}
        step={0.005}
        onChange={(v) => onChange({ size: v })}
        format={(v) => String(Math.round(v * 1000))}
      />
    </div>
  )
}
