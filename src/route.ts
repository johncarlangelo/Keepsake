/** Tiny hash router: #/booth | #/studio | #/gallery (D-008). */
import { useEffect, useState } from 'react'
import type { View } from './types'

const VIEWS: View[] = ['booth', 'studio', 'gallery']

function parse(): View {
  const h = window.location.hash.replace(/^#\/?/, '')
  return (VIEWS as string[]).includes(h) ? (h as View) : 'booth'
}

export function navigate(view: View): void {
  window.location.hash = `#/${view}`
}

export function useHashRoute(): View {
  const [view, setView] = useState<View>(parse)
  useEffect(() => {
    const fn = () => setView(parse())
    window.addEventListener('hashchange', fn)
    return () => window.removeEventListener('hashchange', fn)
  }, [])
  return view
}
