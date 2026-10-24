/** Core UI kit: Button, IconButton, Chip, Radix-backed Slider/Sheet/Modal, Confirm, Toasts (Motion), Segmented. */
import { type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import * as Dialog from '@radix-ui/react-dialog'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { AnimatePresence, motion } from 'motion/react'
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

/* ---------- slider (Radix) ---------- */

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
      <SliderPrimitive.Root
        className="slider-root"
        value={[value]}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        onValueChange={(v) => onChange(v[0] ?? min)}
        onValueCommit={() => onCommit?.()}
      >
        <SliderPrimitive.Track className="slider-track">
          <SliderPrimitive.Range className="slider-range" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="slider-thumb" />
      </SliderPrimitive.Root>
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

/* ---------- sheet (Radix Dialog, docked style) ---------- */

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
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-scrim" />
        <Dialog.Content className="sheet" aria-describedby={undefined}>
          <div className="sheet-grabber" aria-hidden="true" />
          <div className="sheet-head">
            <Dialog.Title asChild>
              <h2>{title}</h2>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="icon-btn" aria-label={closeLabel}>
                <Icon name="close" />
              </button>
            </Dialog.Close>
          </div>
          <div className="sheet-body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/* ---------- modal (Radix Dialog, centered) ---------- */

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
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose?.()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-scrim" />
        <Dialog.Content className="modal-card" aria-describedby={undefined}>
          <div className="modal-head">
            <Dialog.Title asChild>
              <h2>{title}</h2>
            </Dialog.Title>
            {onClose ? (
              <Dialog.Close asChild>
                <button className="icon-btn" aria-label="Close">
                  <Icon name="close" />
                </button>
              </Dialog.Close>
            ) : null}
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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

/* ---------- toasts (Motion enter/exit) ---------- */

export function ToastRegion(): ReactNode {
  const { toasts, dismiss } = useToasts()
  return createPortal(
    <div className="toast-region" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className={`toast ${t.kind === 'error' ? 'error' : ''}`}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.215, 0.61, 0.355, 1] }}
          >
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
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  )
}
