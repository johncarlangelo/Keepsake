/**
 * Core UI kit on Tailwind + cva (shadcn pattern, D-028/D-029). Radix owns
 * behavior (focus trap, arrow keys, scroll lock); utilities own the look.
 */
import { type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import * as Dialog from '@radix-ui/react-dialog'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { cva, type VariantProps } from 'class-variance-authority'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '../lib/cn'
import type { IconName } from './icons'
import { Icon } from './icons'
import { useToasts } from '../state/toast'

/* ---------- button ---------- */

const buttonVariants = cva(
  [
    'inline-flex select-none items-center justify-center gap-2 rounded-[999px]',
    'font-semibold leading-none transition-[background-color,border-color,color,transform] duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
    'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100',
    '[-webkit-tap-highlight-color:transparent]',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-rose-deep text-white shadow-1 hover:bg-rose-ink',
        secondary: 'border-2 border-ink bg-surface text-ink hover:bg-surface-2',
        outline: 'border border-line bg-transparent text-ink hover:border-ink/30 hover:bg-surface-2',
        ghost: 'bg-transparent text-ink-soft hover:bg-surface-2 hover:text-ink',
        danger: 'border-2 border-danger/70 bg-transparent text-danger hover:bg-danger/10',
      },
      size: {
        default: 'min-h-11 px-6 text-base',
        sm: 'min-h-9 px-4 text-sm',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  }
)

export function Button({
  variant,
  size,
  icon,
  children,
  className,
  ...rest
}: {
  variant?: VariantProps<typeof buttonVariants>['variant']
  size?: VariantProps<typeof buttonVariants>['size']
  icon?: IconName
  children?: ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...rest}>
      {icon ? <Icon name={icon} size={size === 'sm' ? 18 : 20} /> : null}
      {children}
    </button>
  )
}

const iconButtonVariants = cva(
  [
    'inline-flex size-11 select-none items-center justify-center rounded-[999px] border border-line',
    'bg-surface/85 text-ink-soft backdrop-blur-lg',
    'transition-[background-color,color,transform] duration-150',
    'hover:bg-surface hover:text-ink active:scale-[0.94] disabled:pointer-events-none disabled:opacity-50',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
    '[&>svg]:size-[22px]',
  ].join(' '),
  { variants: { tone: { plain: 'border-transparent bg-transparent backdrop-blur-none' } }, defaultVariants: {} }
)

export function IconButton({
  icon,
  label,
  tone,
  className,
  ...rest
}: {
  icon: IconName
  label: string
  tone?: VariantProps<typeof iconButtonVariants>['tone']
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(iconButtonVariants({ tone }), className)} aria-label={label} title={label} {...rest}>
      <Icon name={icon} />
    </button>
  )
}

/** Toolbar icon-button with a text label that appears on roomier screens. */
export function LabeledIconButton({
  icon,
  label,
  className,
  children,
  ...rest
}: { icon: IconName; label: string; children?: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), className)}
      aria-label={label}
      {...rest}
    >
      <Icon name={icon} size={18} />
      {children ? <span className="hidden text-ink-soft min-[600px]:inline">{children}</span> : null}
    </button>
  )
}

/* ---------- chips ---------- */

const chipVariants = cva(
  [
    'inline-flex min-h-9 select-none items-center gap-2 rounded-[999px] border border-line bg-surface px-3 text-sm font-medium',
    'whitespace-nowrap text-ink-soft transition-[background-color,border-color,color,transform,box-shadow] duration-150',
    'hover:text-ink active:scale-[0.96] [-webkit-tap-highlight-color:transparent]',
    'aria-pressed:border-rose aria-pressed:bg-blush aria-pressed:text-rose-ink aria-pressed:shadow-1 aria-pressed:-translate-y-px',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
  { variants: {}, defaultVariants: {} }
)

export function Chip({
  active,
  className,
  children,
  ...rest
}: { active?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(chipVariants(), className)} aria-pressed={active} {...rest}>
      {children}
    </button>
  )
}

export function ChipRow({
  children,
  label,
  className,
  ...rest
}: { children: ReactNode; label: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'flex gap-2 overflow-x-auto py-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden wide:flex-wrap wide:overflow-visible',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

/* ---------- picker card (templates, frames, filters, stickers) ---------- */

export function PickerCard({
  selected,
  className,
  children,
  ...rest
}: { selected?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        [
          'flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-line bg-surface p-2',
          'transition-[transform,box-shadow,border-color,background-color] duration-150 ease-[cubic-bezier(0.215,0.61,0.355,1)]',
          'active:scale-[0.97] aria-checked:border-rose aria-checked:bg-blush',
          'hover:-translate-y-0.5 hover:shadow-2 [@media(hover:none)]:hover:translate-y-0',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        ].join(' '),
        className
      )}
      aria-checked={rest['aria-checked'] ?? selected}
      {...rest}
    >
      {children}
    </button>
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
    <div className="flex flex-col gap-1">
      <label className="flex justify-between text-sm text-ink-soft">
        <span>{label}</span>
        <span className="font-medium text-ink">{format ? format(value) : Math.round(value * 100) + '%'}</span>
      </label>
      <SliderPrimitive.Root
        className="relative flex h-7 touch-none select-none items-center"
        value={[value]}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        onValueChange={(v) => onChange(v[0] ?? min)}
        onValueCommit={() => onCommit?.()}
      >
        <SliderPrimitive.Track className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
          <SliderPrimitive.Range className="absolute h-full rounded-full bg-rose-deep" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className={[
            'relative z-[1] block size-[22px] cursor-grab rounded-full border-2 border-rose-deep bg-surface shadow-1',
            'transition-transform duration-150 ease-[cubic-bezier(0.215,0.61,0.355,1)]',
            'hover:scale-[1.12] active:cursor-grabbing active:scale-[1.05]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          ].join(' ')}
        />
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
    <div role="group" aria-label={label} className="inline-flex gap-0.5 rounded-[999px] bg-surface-2 p-[3px]">
      {options.map((o) => (
        <button
          key={o.value}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={[
            'min-h-[34px] rounded-[999px] px-4 text-sm font-semibold text-ink-soft',
            'transition-[background-color,color,box-shadow] duration-150',
            'aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-1',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
          ].join(' ')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------- tabs (Radix) ---------- */

export const Tabs = TabsPrimitive.Root

export function TabsList({ className, ...rest }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn('flex flex-wrap gap-2 focus-visible:outline-none', className)}
      {...rest}
    />
  )
}

export function TabsTrigger({ className, ...rest }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        [
          'inline-flex min-h-10 select-none items-center gap-1.5 rounded-[999px] border border-line bg-surface px-4',
          'text-sm font-semibold whitespace-nowrap text-ink-soft',
          'transition-[background-color,border-color,color] duration-150',
          'data-[state=active]:border-ink data-[state=active]:bg-ink data-[state=active]:text-bg',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        ].join(' '),
        className
      )}
      {...rest}
    />
  )
}

export function TabsContent({ className, ...rest }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('focus-visible:outline-none', className)} {...rest} />
}

/* ---------- sheet (Radix Dialog, docked) ---------- */

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
        <Dialog.Overlay
          className={[
            'fixed inset-0 z-[var(--z-sheet)] bg-[rgba(34,26,18,0.45)] backdrop-blur-[2px]',
            'data-[state=open]:animate-fade data-[state=closed]:animate-fade-out',
          ].join(' ')}
        />
        <Dialog.Content
          aria-describedby={undefined}
          className={[
            'fixed inset-x-0 bottom-0 z-[calc(var(--z-sheet)+1)] flex max-h-[min(78dvh,720px)] flex-col',
            'rounded-t-lg bg-surface shadow-3 [transform-origin:50%_100%]',
            'pb-[env(safe-area-inset-bottom,0px)]',
            'data-[state=open]:animate-sheet-in data-[state=closed]:animate-sheet-out',
            'wide:right-6 wide:bottom-6 wide:left-auto wide:w-[400px] wide:max-h-[min(80dvh,760px)] wide:rounded-md',
          ].join(' ')}
        >
          <div aria-hidden="true" className="mx-auto mt-2 h-1 w-11 shrink-0 rounded-full bg-line wide:hidden" />
          <div className="flex shrink-0 items-center gap-3 px-6 pb-3 pt-2">
            <Dialog.Title asChild>
              <h2 className="flex-1 text-xl">{title}</h2>
            </Dialog.Title>
            <Dialog.Close asChild>
              <IconButton icon="close" label={closeLabel} />
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto px-6 pb-6 [-webkit-overflow-scrolling:touch]">{children}</div>
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
        <Dialog.Overlay
          className={[
            'fixed inset-0 z-[var(--z-sheet)] bg-[rgba(34,26,18,0.45)] backdrop-blur-[2px]',
            'data-[state=open]:animate-fade data-[state=closed]:animate-fade-out',
          ].join(' ')}
        />
        <Dialog.Content
          aria-describedby={undefined}
          /* native `translate` centering composes with transform-only keyframes */
          className={[
            'fixed left-1/2 top-1/2 z-[calc(var(--z-sheet)+1)] max-h-[86dvh] w-[min(440px,calc(100vw-32px))]',
            '-translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md bg-surface p-6 shadow-3',
            'data-[state=open]:animate-scale-in data-[state=closed]:animate-scale-out',
          ].join(' ')}
        >
          <div className="mb-3 flex items-center gap-3">
            <Dialog.Title asChild>
              <h2 className="m-0 flex-1 text-xl">{title}</h2>
            </Dialog.Title>
            {onClose ? (
              <Dialog.Close asChild>
                <IconButton icon="close" label="Close" />
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
      <div className="mt-4 flex justify-end gap-3">
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
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 bottom-[calc(var(--tabbar-h)+12px)] z-[var(--z-toast)] flex w-[min(480px,calc(100vw-32px))] -translate-x-1/2 flex-col gap-2 wide:bottom-6"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className={cn(
              'flex items-start gap-2 rounded-md px-4 py-3 text-[0.9375rem] shadow-3',
              t.kind === 'error' ? 'bg-danger text-white' : 'bg-ink text-bg'
            )}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.215, 0.61, 0.355, 1] }}
          >
            <span>{t.message}</span>
            {t.action ? (
              <button
                className="ml-auto shrink-0 text-sm font-semibold underline"
                onClick={() => {
                  t.action?.run()
                  dismiss(t.id)
                }}
              >
                {t.action.label}
              </button>
            ) : null}
            {t.sticky ? (
              <button className="shrink-0 text-sm font-semibold underline" onClick={() => dismiss(t.id)}>
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

/* ---------- cards, inputs, misc ---------- */

export function Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-md border border-line bg-surface p-4 shadow-1', className)} {...rest} />
}

export function EmptyState({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 px-4 py-12 text-center text-ink-soft [&>h2]:text-ink [&>svg]:size-[72px] [&>svg]:text-ink-faint',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

export function Input({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'min-h-11 w-full rounded-sm border border-line bg-surface-2 px-3 text-ink',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1',
        className
      )}
      {...rest}
    />
  )
}
