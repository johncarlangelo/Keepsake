/** Inline SVG icon set — 24px, 1.5px stroke, round caps. No emoji as icons (DESIGN §10). */
import type { JSX } from 'react'

export type IconName =
  | 'aperture'
  | 'gallery'
  | 'wand'
  | 'undo'
  | 'redo'
  | 'reset'
  | 'download'
  | 'share'
  | 'trash'
  | 'close'
  | 'switch'
  | 'info'
  | 'check'
  | 'plus'
  | 'camera'
  | 'shutter'
  | 'text'
  | 'sticker'
  | 'frame'
  | 'layout'
  | 'sliders'
  | 'arrowLeft'
  | 'arrowRight'

const paths: Record<IconName, JSX.Element> = {
  aperture: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v6.5M20 8.5l-5.6 3.2M20 15.5l-6.1-.4M12 21v-6.5M4 15.5l5.6-3.2M4 8.5l6.1.4" />
    </>
  ),
  gallery: (
    <>
      <rect x="3" y="5" width="18" height="15" rx="2.5" />
      <circle cx="8.5" cy="10" r="1.6" />
      <path d="M3.5 17.5l4.8-4.2c.7-.6 1.7-.6 2.4 0l3.1 2.7M13 14l1.7-1.5c.7-.6 1.7-.6 2.4 0l3.4 3" />
    </>
  ),
  wand: (
    <>
      <path d="M5 19L16.5 7.5" />
      <path d="M14.5 5.5l4 4" />
      <path d="M19 3.5v2M19 9.5v2M16 7.25h2M20 7.25h2M6.5 12v1.5M5.75 12.75h1.5" />
    </>
  ),
  undo: (
    <>
      <path d="M8 7L4 11l4 4" />
      <path d="M4 11h10a5 5 0 0 1 0 10h-3" />
    </>
  ),
  redo: (
    <>
      <path d="M16 7l4 4-4 4" />
      <path d="M20 11H10a5 5 0 0 0 0 10h3" />
    </>
  ),
  reset: (
    <>
      <path d="M4.5 8A9 9 0 1 1 3 13" />
      <path d="M4 3.5V8h4.5" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11M8 11.5l4 4 4-4" />
      <path d="M5 19.5h14" />
    </>
  ),
  share: (
    <>
      <path d="M12 4v11M8.5 7.5L12 4l3.5 3.5" />
      <path d="M6 12H4.5v7.5h15V12H18" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 6.5h15M9.5 6V4.5h5V6" />
      <path d="M6.5 6.5l1 13h9l1-13" />
      <path d="M10 10v6M14 10v6" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12M18 6L6 18" />
    </>
  ),
  switch: (
    <>
      <path d="M20 7.5A9 9 0 0 0 5.6 9.6M4 16.5A9 9 0 0 0 18.4 14.4" />
      <path d="M17.5 4v4h-4M6.5 20v-4h4" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10.5V17" />
      <circle cx="12" cy="7.6" r="0.4" fill="currentColor" stroke="currentColor" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  camera: (
    <>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2L9 5h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5z" />
      <circle cx="12" cy="12.5" r="3.4" />
    </>
  ),
  shutter: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5L15 9M21 15l-6.5-1M9.5 21l-3-6M3 9l6.5 1M14.5 3l3 6M21 9l-6 3.5M14.5 21l-3-6M3 15l6-3.5M9.5 3l-3 6" />
    </>
  ),
  text: (
    <>
      <path d="M5 6.5V4.5h14v2" />
      <path d="M12 4.5V19.5M9 19.5h6" />
    </>
  ),
  sticker: (
    <>
      <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5c-4.7 0-8.5-3.8-8.5-8.5z" />
      <path d="M13.2 3.6A8.5 8.5 0 0 1 20.4 10.8" />
    </>
  ),
  frame: (
    <>
      <rect x="4.5" y="4.5" width="15" height="15" rx="1.5" />
      <rect x="8" y="8" width="8" height="8" rx="0.8" />
    </>
  ),
  layout: (
    <>
      <rect x="4.5" y="4.5" width="15" height="15" rx="1.5" />
      <path d="M4.5 9.5h15M4.5 14.5h15" />
    </>
  ),
  sliders: (
    <>
      <path d="M5 7h9M17.5 7H19M5 12h3M11.5 12H19M5 17h11M5 5v4M15 5v4M9 10v4M13 15v4" />
    </>
  ),
  arrowLeft: <path d="M14.5 6L8.5 12l6 6" />,
  arrowRight: <path d="M9.5 6l6 6-6 6" />,
}

export function Icon({ name, size = 24, className }: { name: IconName; size?: number; className?: string }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {paths[name]}
    </svg>
  )
}

/** Keepsake wordmark glyph: aperture heart */
export function Logo({ size = 26 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 16.4c-2.6-2.1-4.4-3.6-4.4-5.4 0-1.2.9-2 1.9-2 .8 0 1.5.4 2.5 1.6 1-1.2 1.7-1.6 2.5-1.6 1 0 1.9.8 1.9 2 0 1.8-1.8 3.3-4.4 5.4z"
        fill="currentColor"
      />
    </svg>
  )
}
