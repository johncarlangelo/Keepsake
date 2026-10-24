/** Core UI kit: Button, IconButton, Chip, Slider, Sheet, Modal, Confirm, Toasts, Segmented. */
import { useEffect, useRef, type ReactNode, type ChangeEvent } from 'react'
import type { IconName } from './icons'
import { Icon } from './icons'
import { useToasts } from '../state/toast'

/* ---------- buttons ---------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export function Button({
  variant = 'primary',
  size,
  icon,
  children,
  className = '',
  ...rest
}: {
  variant?: ButtonVariant
  size?: 'sm'
  icon?: IconName
  children?: ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`btn btn-${variant} ${size === 'sm' ? 'btn-sm' : ''} ${className}`} {...rest}>
      {icon ? <Icon name={icon} size={size === 'sm' ? 18 : 20} /> : null}
      {children}
    </button>
  )
}

export function IconButton({
  icon,
  label,
  className = '',
  ...rest
}: { icon: IconName; label: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`icon-btn ${className}`} aria-label={label} title={label} {...rest}>
      <Icon name={icon} />
    </button>
  )
}

/* ---------- chips ---------- */

export function Chip({
  active,
  children,
  ...rest
}: { active?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="chip" aria-pressed={active} {...rest}>
      {children}
    </button>
  )
}

export function ChipRow({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="chip-row" role="group" aria-label={label}>
      {children}
    </div>
  )
}

/* ---------- slider ---------- */

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  onCommit,
  format,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  onCommit?: () => void
  format?: (v: number) => string
}) {
  return (
    <div className="slider">
      <label>
        <span>{label}</span>
        <span>{format ? format(value) : Math.round(value * 100) + '%'}</span>
      </label>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
      />
    </div>
  )
}

/* ---------- segmented ---------- */

export function Segmented({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{ value: string; label: string }>
  value: string
  onChange: (v: string) => void
  label: string
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------- sheet ---------- */

export function Sheet({
  open,
  title,
  onClose,
  children,
  closeLabel = 'Close',
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  closeLabel?: string
}) {
  useEsc(open, onClose)
  if (!open) return null
  return (
    <>
      <div className="sheet-scrim" onClick={onClose} aria-hidden="true" />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grabber" aria-hidden="true" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <IconButton icon="close" label={closeLabel} onClick={onClose} />
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>
  )
}

/* ---------- modal (focus-trapped) ---------- */

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose?: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEsc(open, onClose)
  useEffect(() => {
    if (!open) return
    const node = ref.current
    if (!node) return
    const prevFocus = document.activeElement as HTMLElement | null
    const focusables = () =>
      Array.from(node.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(
        (el) => !el.hasAttribute('disabled')
      )
    focusables()[0]?.focus()
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) return
      const first = items[0]!
      const last = items[items.length - 1]!
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    node.addEventListener('keydown', trap)
    return () => {
      node.removeEventListener('keydown', trap)
      prevFocus?.focus()
    }
  }, [open])
  if (!open) return null
  return (
    <div className="modal-center">
      <div className="sheet-scrim" onClick={onClose} aria-hidden="true" />
      <div className="modal-card" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <p>{message}</p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            onConfirm()
            onCancel()
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

/* ---------- toasts ---------- */

export function ToastRegion(): ReactNode {
  const { toasts, dismiss } = useToasts()
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind === 'error' ? 'error' : ''}`}>
          <span>{t.message}</span>
          {t.action ? (
            <button
              className="btn-link"
              onClick={() => {
                t.action?.run()
                dismiss(t.id)
              }}
            >
              {t.action.label}
            </button>
          ) : null}
          {t.sticky ? (
            <button className="btn-link" onClick={() => dismiss(t.id)}>
              Dismiss
            </button>
          ) : null}
        </div>
      ))}
    </div>
  )
}

/* ---------- helpers ---------- */

function useEsc(active: boolean, handler?: () => void): void {
  useEffect(() => {
    if (!active || !handler) return
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handler()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [active, handler])
}
