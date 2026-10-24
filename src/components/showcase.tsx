/**
 * Showpiece components (D-030): NextUI/Tailwind-UI-style expressive pieces,
 * hand-built on the existing stack (motion + Tailwind + tokens). No new deps.
 * Ambient animations are transform/opacity-only and respect reduced motion
 * (global kill-switch in theme.css).
 */
import { type ReactNode, useCallback } from 'react'
import { cn } from '../lib/cn'
import type { IconName } from './icons'
import { Icon } from './icons'

/* ---------- aurora backdrop ---------- */

/** Slow-drifting blurred gradient blobs. Decorative only (aria-hidden). */
export function AuroraBackdrop({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]', className)}>
      <div
        className="absolute -left-[12%] -top-[30%] h-[65%] w-[55%] animate-aurora rounded-full bg-rose-soft/45 blur-[90px]"
        style={{ animationDelay: '0s' }}
      />
      <div
        className="absolute -right-[15%] top-[5%] h-[60%] w-[45%] animate-aurora rounded-full bg-gold-soft/40 blur-[100px]"
        style={{ animationDelay: '-5s' }}
      />
      <div
        className="absolute bottom-[-25%] left-[22%] h-[60%] w-[50%] animate-aurora rounded-full bg-sage-soft/40 blur-[110px]"
        style={{ animationDelay: '-10s' }}
      />
    </div>
  )
}

/* ---------- spotlight bento card ---------- */

/** Card with a pointer-tracked radial glow (`.spotlight` layer in theme.css). */
export function SpotlightCard({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  const onMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }, [])
  return (
    <div
      onPointerMove={onMove}
      className={cn(
        'spotlight overflow-hidden rounded-lg border border-line bg-surface shadow-1',
        'transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-2',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

/** Feature entry inside a bento card. */
export function BentoFeature({ icon, title, body, tone = 'rose' }: { icon: IconName; title: string; body: string; tone?: 'rose' | 'gold' | 'sage' }) {
  const tones = {
    rose: 'bg-blush text-rose-ink',
    gold: 'bg-[color-mix(in_srgb,var(--color-gold)_14%,white)] text-gold',
    sage: 'bg-[color-mix(in_srgb,var(--color-sage)_16%,white)] text-sage',
  } as const
  return (
    <div className="flex flex-col gap-2.5">
      <span className={cn('inline-flex size-10 items-center justify-center rounded-full [&>svg]:size-5', tones[tone])}>
        <Icon name={icon} />
      </span>
      <strong className="font-display text-base">{title}</strong>
      <p className="muted text-sm leading-relaxed">{body}</p>
    </div>
  )
}

/* ---------- marquee band ---------- */

/** Infinite film-strip marquee. Content is duplicated for a seamless loop. */
export function Marquee({ items }: { items: string[] }) {
  const row = items.map((s, i) => (
    <span key={i} className="inline-flex items-center gap-3 text-sm font-semibold tracking-[0.14em] text-ink-faint uppercase">
      {s}
      <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-rose/70" />
    </span>
  ))
  return (
    <div aria-hidden="true" className="relative overflow-hidden py-1 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
      <div className="flex w-max animate-marquee gap-8">
        <div className="flex gap-8">{row}</div>
        <div className="flex gap-8">{items.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-3 text-sm font-semibold tracking-[0.14em] text-ink-faint uppercase">
            {s}
            <span className="inline-block size-1.5 rounded-full bg-rose/70" />
          </span>
        ))}</div>
      </div>
    </div>
  )
}

/* ---------- fanned photo strips (hero art) ---------- */

/** Two tilted, floating photo strips with develop-in photos. Decorative. */
export function FanStrips({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('relative flex items-center justify-center [perspective:1000px]', className)}>
      {/* back strip */}
      <div className="absolute w-[min(150px,30vw)] rotate-[-7deg] animate-bob rounded-md border border-line bg-surface p-2.5 shadow-2 [transform-origin:50%_120%]" style={{ animationDelay: '-2.5s' }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-develop aspect-[16/10] mb-2 rounded-[4px] last:mb-0"
            style={{
              background: 'linear-gradient(150deg, #b9c6d8 0%, #8a9b8a 55%, #4e4238 100%)',
              animationDelay: `${0.9 + i * 0.55}s`,
            }}
          />
        ))}
      </div>
      {/* front strip */}
      <div className="relative w-[min(180px,36vw)] rotate-[4deg] animate-float rounded-md border border-line bg-surface p-3 shadow-3 [transform-origin:50%_120%]">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-develop mb-2 aspect-[16/10] rounded-[5px] last:mb-0"
            style={{
              background: 'linear-gradient(135deg, #d9b8a6 0%, #c98a8a 42%, #8a9b8a 78%, #6e5f4e 100%)',
              animationDelay: `${i * 0.7}s`,
            }}
          />
        ))}
        <span className="block text-center font-script text-xl text-ink-soft">keepsake ✦</span>
      </div>
    </div>
  )
}

/* ---------- steps ---------- */

export function StepCard({ n, title, body, icon }: { n: number; title: string; body: string; icon: IconName }) {
  return (
    <SpotlightCard className="flex flex-col gap-3 p-6">
      <div className="flex items-center justify-between">
        <span className="font-script text-4xl leading-none text-rose">{n}</span>
        <span className="inline-flex size-10 items-center justify-center rounded-full bg-ink text-bg [&>svg]:size-5">
          <Icon name={icon} />
        </span>
      </div>
      <strong className="font-display text-lg">{title}</strong>
      <p className="muted text-sm leading-relaxed">{body}</p>
    </SpotlightCard>
  )
}

/* ---------- section header ---------- */

export function SectionHeading({ icon, children, count }: { icon?: IconName; children: ReactNode; count?: string | number }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      {icon ? (
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-ink text-bg [&>svg]:size-4">
          <Icon name={icon} />
        </span>
      ) : null}
      <h2 className="m-0 font-display text-xl font-semibold">{children}</h2>
      {count !== undefined ? (
        <span className="rounded-[999px] bg-blush px-2.5 py-0.5 text-xs font-semibold text-rose-ink">{count}</span>
      ) : null}
      <span aria-hidden="true" className="ml-2 hidden h-px flex-1 bg-line wide:block" />
    </div>
  )
}
