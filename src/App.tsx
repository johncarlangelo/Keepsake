/** App shell: header, view routing (Motion transitions), tab bar, toasts. */
import { useEffect } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useHashRoute, navigate } from './route'
import { BoothScreen } from './screens/BoothScreen'
import { StudioScreen } from './screens/StudioScreen'
import { GalleryScreen } from './screens/GalleryScreen'
import { Icon, Logo } from './components/icons'
import { ToastRegion } from './components/ui'
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
      <header className="app-header">
        <a
          className="wordmark"
          href="#/booth"
          onClick={(e) => {
            e.preventDefault()
            navigate('booth')
          }}
        >
          <Logo />
          Keepsake
        </a>
        <div className="spacer" />
        <nav className="top-nav" aria-label="Primary">
          {TABS.map((t) => (
            <a key={t.view} href={`#/${t.view}`} aria-current={view === t.view ? 'page' : undefined}>
              {t.label}
            </a>
          ))}
        </nav>
      </header>

      <main className="app-main" id="main">
        {/* enter-only transition: no AnimatePresence exit — a stalled/occluded rAF
            must never block the next view from mounting */}
        <motion.div
          key={view}
          className="view-root"
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {view === 'booth' ? <BoothScreen /> : view === 'studio' ? <StudioScreen /> : <GalleryScreen />}
        </motion.div>
      </main>

      <nav className="tabbar" aria-label="Primary">
        {TABS.map((t) => (
          <a key={t.view} href={`#/${t.view}`} aria-current={view === t.view ? 'page' : undefined}>
            <Icon name={t.icon} />
            {t.label}
          </a>
        ))}
      </nav>

      <ToastRegion />
    </>
  )
}
