/** Sticker tray + text/caption panel for the Studio tool sheet. */
import { STICKERS, STICKER_PALETTE } from '../data/stickers'
import { endInteraction, useEditor } from '../state/editor'
import type { TextConfig } from '../types'
import { Button, Segmented, Slider } from './ui'
import { Icon } from './icons'

export function StickerTray(): React.ReactNode {
  const { comp, selectedSticker, addSticker, updateSticker, removeSticker, bumpSticker, beginInteraction } = useEditor()
  const placed = comp?.stickers.find((s) => s.uid === selectedSticker)

  return (
    <div>
      <p className="muted tiny" style={{ marginBottom: 12 }}>
        Tap a sticker to place it, then drag it on the strip.
      </p>
      <div role="radiogroup" aria-label="Stickers" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 10 }}>
        {STICKERS.map((s) => (
          <button
            key={s.id}
            onClick={() => addSticker(s.id)}
            title={`Add ${s.name}`}
            aria-label={`Add ${s.name} sticker`}
            style={{
              padding: 10,
              borderRadius: 12,
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <svg width="40" height="40" viewBox="0 0 100 100" aria-hidden="true">
              <path d={s.path} fill={s.defaultColor} />
            </svg>
          </button>
        ))}
      </div>

      {placed ? (
        <div className="card" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <strong className="tiny">Selected sticker</strong>
          <div className="chip-row" role="group" aria-label="Sticker color">
            {STICKER_PALETTE.map((c) => (
              <button
                key={c}
                aria-label={`Color ${c}`}
                aria-pressed={placed.color === c}
                className="chip"
                onClick={() => updateSticker(placed.uid, { color: c })}
                style={{ background: placed.color === c ? 'var(--blush)' : undefined, minWidth: 44, justifyContent: 'center' }}
              >
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: c, border: '1px solid rgba(0,0,0,0.15)', display: 'inline-block' }} />
              </button>
            ))}
          </div>
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
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
        </div>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label htmlFor="caption" className="tiny muted" style={{ display: 'block', marginBottom: 6 }}>
          Caption
        </label>
        <input
          id="caption"
          className="text-input"
          type="text"
          maxLength={60}
          value={text.caption}
          placeholder="say something sweet…"
          onChange={(e) => onChange({ caption: e.target.value })}
        />
      </div>
      <div className="check-row">
        <input id="show-date" type="checkbox" checked={text.showDate} onChange={(e) => onChange({ showDate: e.target.checked })} />
        <label htmlFor="show-date">Date stamp</label>
      </div>
      <div>
        <span className="tiny muted">Font</span>
        <div style={{ marginTop: 6 }}>
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
        <span className="tiny muted">Alignment</span>
        <div style={{ marginTop: 6 }}>
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
      <div className="chip-row" role="group" aria-label="Text color">
        {TEXT_COLORS.map((c) => (
          <button key={c.value} className="chip" aria-pressed={text.color === c.value} onClick={() => onChange({ color: c.value })}>
            {c.value !== 'auto' ? (
              <span style={{ width: 16, height: 16, borderRadius: '50%', background: c.value, border: '1px solid rgba(0,0,0,0.15)', display: 'inline-block' }} />
            ) : (
              <Icon name="wand" size={16} />
            )}
            {c.label}
          </button>
        ))}
      </div>
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
