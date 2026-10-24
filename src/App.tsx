/** App shell: header, view routing (Motion transitions), tab bar, toasts. */
import { useEffect } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useHashRoute, navigate } from './route'
import { BoothScreen } from './screens/BoothScreen'
import { StudioScreen } from './screens/StudioScreen'
import { GalleryScreen } from './screens/GalleryScreen'
import { Icon, Logo } from './components/icons'
import { ToastRegion } from './components/ui'
import { cn } from './lib/cn'
import { useGallery } from './state/gallery'
import type { View } from './types'

const TABS: Array<{ view: View; label: string; icon: 'aperture' | 'wand' | 'gallery' }> = [
  { view: 'booth', label: 'Booth', icon: 'aperture' },
  { view: 'studio', label: 'Studio', icon: 'wand' },
  { view: 'gallery', label: 'Gallery', icon: 'gallery' },
]

export function App() {
  const view = useHashRoute()
  const refresh = useGallery((s) => s.refresh)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view])

  return (
    <>
      <header
        className={[
          'sticky top-0 z-[var(--z-chrome)] flex items-center gap-3',
          'h-[calc(var(--header-h)+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)]',
          /* opaque at rest for scrolled-content legibility (D-025); the blur
             layer only softens the hairline transition */
          'border-b border-line bg-bg supports-[backdrop-filter]:bg-bg/90 supports-[backdrop-filter]:backdrop-blur-md',
          'px-4',
        ].join(' ')}
      >
        <a
          className="inline-flex items-center gap-2 font-display text-xl font-bold tracking-[0.01em] text-ink no-underline [&>svg]:text-rose"
          href="#/booth"
          onClick={(e) => {
            e.preventDefault()
            navigate('booth')
          }}
        >
          <Logo />
          Keepsake
        </a>
        <div className="flex-1" />
        <nav aria-label="Primary" className="hidden items-center gap-1 wide:flex">
          {TABS.map((t) => {
            const active = view === t.view
            return (
              <a
                key={t.view}
                href={`#/${t.view}`}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative rounded-[999px] px-4 py-2 text-sm font-medium no-underline transition-colors duration-150',
                  active ? 'text-rose-ink' : 'text-ink-soft hover:bg-surface-2 hover:text-ink'
                )}
              >
                {active && !reduceMotion ? (
                  <motion.span
                    layoutId="topnav-active-pill"
                    className="absolute inset-0 rounded-[999px] bg-blush"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    aria-hidden="true"
                  />
                ) : active ? (
                  <span className="absolute inset-0 rounded-[999px] bg-blush" aria-hidden="true" />
                ) : null}
                <span className="relative">{t.label}</span>
              </a>
            )
          })}
        </nav>
      </header>
      {/* gradient hairline — the brand spectrum under the chrome */}
      <div
        aria-hidden="true"
        className="h-0.5 bg-gradient-to-r from-rose via-gold-soft to-sage opacity-60"
      />

      <main
        id="main"
        className={[
          'mx-auto w-full flex-1 max-w-[var(--content-max)]',
          'px-4 pt-6 pb-[calc(32px+var(--tabbar-h))] wide:pb-16',
        ].join(' ')}
      >
        {/* enter-only transition: no AnimatePresence exit — a stalled/occluded rAF
            must never block the next view from mounting */}
        <motion.div
          key={view}
          className="min-h-full"
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {view === 'booth' ? <BoothScreen /> : view === 'studio' ? <StudioScreen /> : <GalleryScreen />}
        </motion.div>
      </main>

      <footer className="hidden wide:block">
        <div className="mx-auto flex max-w-[var(--content-max)] items-center gap-3 px-4 pb-8 pt-2">
          <span aria-hidden="true" className="h-px flex-1 bg-line" />
          <p className="m-0 font-script text-lg text-ink-faint">made with care — nothing ever leaves this device ✦</p>
          <span aria-hidden="true" className="h-px flex-1 bg-line" />
        </div>
      </footer>

      <nav
        aria-label="Primary"
        className={[
          'fixed inset-x-0 bottom-0 z-[var(--z-chrome)] flex items-stretch justify-around',
          'h-[var(--tabbar-h)] pb-[env(safe-area-inset-bottom,0px)]',
          'border-t border-line bg-surface/95 supports-[backdrop-filter]:backdrop-blur-md',
          'wide:hidden',
        ].join(' ')}
      >
        {TABS.map((t) => {
          const active = view === t.view
          return (
            <a
              key={t.view}
              href={`#/${t.view}`}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-w-16 flex-1 flex-col items-center justify-center gap-0.5 pb-[env(safe-area-inset-bottom,0px)]',
                'text-xs font-semibold no-underline transition-colors duration-150 [&>svg]:size-6',
                active ? 'text-rose-deep' : 'text-ink-soft'
              )}
            >
              <span className="relative">
                <Icon name={t.icon} />
                {active && !reduceMotion ? (
                  <motion.span
                    layoutId="tabbar-active-dot"
                    className="absolute -inset-x-3 -bottom-1 h-0.5 rounded-full bg-rose-deep"
                    transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                    aria-hidden="true"
                  />
                ) : active ? (
                  <span className="absolute -inset-x-3 -bottom-1 h-0.5 rounded-full bg-rose-deep" aria-hidden="true" />
                ) : null}
              </span>
              {t.label}
            </a>
          )
        })}
      </nav>

      <ToastRegion />
    </>
  )
}
