/** Capture session store: template → live shots → review → Studio (ARCHITECHTURE §4). */
import { create } from 'zustand'
import { revokeUrl } from '../lib/images'

export type CapturePhase = 'idle' | 'live' | 'review'

export interface ShotRecord {
  photoId: string
  thumbUrl: string
  width: number
  height: number
}

interface CaptureState {
  phase: CapturePhase
  templateId: string
  shots: ShotRecord[]
  /** when set, the next captured shot replaces shots[retakeIndex] instead of appending */
  retakeIndex: number | null
  startSession: (templateId: string) => void
  enterLive: () => void
  beginRetake: (index: number) => void
  /** shot captured + auto-saved to Gallery; returns false if session is complete */
  pushShot: (shot: ShotRecord) => boolean
  replaceShot: (shot: ShotRecord) => void
  setPhase: (phase: CapturePhase) => void
  endSession: () => void
}

export const useCapture = create<CaptureState>((set, get) => ({
  phase: 'idle',
  templateId: 'classic-4',
  shots: [],
  retakeIndex: null,

  startSession: (templateId) => set({ phase: 'live', templateId, shots: [], retakeIndex: null }),
  enterLive: () => set({ phase: 'live' }),
  beginRetake: (index) => set({ phase: 'live', retakeIndex: index }),
  pushShot: (shot) => {
    const { shots } = get()
    set({ shots: [...shots, shot] })
    return true
  },
  replaceShot: (shot) => {
    const { shots, retakeIndex } = get()
    if (retakeIndex === null || retakeIndex >= shots.length) return
    const old = shots[retakeIndex]
    if (old) revokeUrl(old.thumbUrl)
    const next = [...shots]
    next[retakeIndex] = shot
    set({ shots: next, retakeIndex: null })
  },
  setPhase: (phase) => set({ phase }),
  endSession: () => {
    const { shots } = get()
    for (const s of shots) revokeUrl(s.thumbUrl)
    set({ phase: 'idle', shots: [], retakeIndex: null })
  },
}))
