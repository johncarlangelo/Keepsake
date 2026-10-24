/** Editor store: composition + bounded undo/redo history (ARCHITECHTURE §6.3). */
import { create } from 'zustand'
import type { Composition, PlacedSticker, SlotEdit, TextConfig } from '../types'
import { emptyComposition, emptySlot } from '../render/compose'
import { getTemplate } from '../data/templates'
import { STICKER_PALETTE } from '../data/stickers'
import { getSticker } from '../data/stickers'

const HISTORY_CAP = 40

export type ToolTab = 'layout' | 'filter' | 'frame' | 'text' | 'stickers' | 'adjust'

interface EditorState {
  comp: Composition | null
  past: Composition[]
  future: Composition[]
  selectedSlot: number | null
  selectedSticker: string | null
  toolTab: ToolTab
  applyToAll: boolean
  /** interaction bracket: snapshot once, then mutate without recording */
  interacting: boolean
  load: (comp: Composition) => void
  reset: () => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  setToolTab: (tab: ToolTab) => void
  setApplyToAll: (v: boolean) => void
  selectSlot: (index: number | null) => void
  selectSticker: (uid: string | null) => void
  beginInteraction: () => void
  setTemplate: (templateId: string) => void
  setFrame: (frameId: string) => void
  setCustomColor: (color: string | undefined) => void
  setSlotPhoto: (index: number, photoId: string | null) => void
  setSlotFilter: (index: number, filterId: string | null) => void
  setSlotIntensity: (index: number, intensity: number) => void
  setSlotCrop: (index: number, crop: SlotEdit['crop']) => void
  toggleFlip: (index: number) => void
  applyFilterToAll: (filterId: string | null) => void
  swapSlots: (a: number, b: number) => void
  moveSlot: (from: number, to: number) => void
  addSticker: (stickerId: string) => void
  updateSticker: (uid: string, patch: Partial<PlacedSticker>) => void
  removeSticker: (uid: string) => void
  bumpSticker: (uid: string, dir: 1 | -1) => void
  setText: (patch: Partial<TextConfig>) => void
}

function clone<T>(v: T): T {
  if (typeof structuredClone === 'function') return structuredClone(v)
  return JSON.parse(JSON.stringify(v)) as T
}

function uid(): string {
  return `st-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export const useEditor = create<EditorState>((set, get) => {
  /** record history (unless inside an interaction bracket) then apply mutator */
  function commit(mutate: (c: Composition) => void): void {
    const { comp, past, interacting } = get()
    if (!comp) return
    const snapshot = clone(comp)
    const next = clone(comp)
    mutate(next)
    if (interacting) {
      set({ comp: next })
    } else {
      set({ comp: next, past: [...past, snapshot].slice(-HISTORY_CAP), future: [] })
    }
  }

  return {
    comp: null,
    past: [],
    future: [],
    selectedSlot: null,
    selectedSticker: null,
    toolTab: 'layout',
    applyToAll: false,
    interacting: false,

    load: (comp) => set({ comp, past: [], future: [], selectedSlot: null, selectedSticker: null, toolTab: 'filter' }),
    reset: () => {
      const { comp } = get()
      if (!comp) return
      commit((c) => {
        const fresh = emptyComposition(c.templateId, c.slots.map((s) => s.photoId))
        c.frameId = fresh.frameId
        c.slots = fresh.slots
        c.text = fresh.text
        c.stickers = []
        c.frameColor = undefined
      })
    },
    undo: () => {
      const { comp, past, future } = get()
      if (!comp || past.length === 0) return
      const prev = past[past.length - 1]!
      set({ comp: prev, past: past.slice(0, -1), future: [clone(comp), ...future].slice(0, HISTORY_CAP) })
    },
    redo: () => {
      const { comp, past, future } = get()
      if (!comp || future.length === 0) return
      const next = future[0]!
      set({ comp: next, past: [...past, clone(comp)].slice(-HISTORY_CAP), future: future.slice(1) })
    },
    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,

    setToolTab: (toolTab) => set({ toolTab }),
    setApplyToAll: (applyToAll) => set({ applyToAll }),
    selectSlot: (selectedSlot) => set({ selectedSlot, selectedSticker: null }),
    selectSticker: (selectedSticker) => set({ selectedSticker, selectedSlot: null }),

    beginInteraction: () => {
      const { comp, past, interacting } = get()
      if (!comp || interacting) return
      set({ interacting: true, past: [...past, clone(comp)].slice(-HISTORY_CAP), future: [] })
    },
    // exitInteraction: any plain commit() after beginInteraction keeps mutating without
    // new history entries; the next non-bracketed commit records normally again. To close
    // a bracket we simply clear the flag:
    // (exposed implicitly: next commit outside bracket; see endInteraction in screens)

    setTemplate: (templateId) =>
      commit((c) => {
        const t = getTemplate(templateId)
        const oldSlots = c.slots
        c.templateId = templateId
        c.slots = t.slots.map((_, i) => {
          const old = oldSlots[i]
          return old ? clone(old) : emptySlot(null)
        })
      }),
    setFrame: (frameId) => commit((c) => void (c.frameId = frameId)),
    setCustomColor: (color) => commit((c) => void (c.frameColor = color)),

    setSlotPhoto: (index, photoId) =>
      commit((c) => {
        const s = c.slots[index]
        if (s) {
          s.photoId = photoId
          s.crop = { zoom: 1, x: 0, y: 0 }
        } else {
          c.slots[index] = emptySlot(photoId)
        }
      }),
    setSlotFilter: (index, filterId) =>
      commit((c) => {
        const { applyToAll } = get()
        const targets = applyToAll ? c.slots : [c.slots[index]]
        for (const s of targets) {
          if (s) {
            s.filterId = filterId
            if (filterId && s.intensity === undefined) s.intensity = 1
          }
        }
      }),
    setSlotIntensity: (index, intensity) =>
      commit((c) => {
        const { applyToAll } = get()
        const targets = applyToAll ? c.slots : [c.slots[index]]
        for (const s of targets) {
          if (s) s.intensity = Math.min(1, Math.max(0, intensity))
        }
      }),
    setSlotCrop: (index, crop) =>
      commit((c) => {
        const s = c.slots[index]
        if (s) s.crop = crop
      }),
    toggleFlip: (index) =>
      commit((c) => {
        const s = c.slots[index]
        if (s) s.flip = !s.flip
      }),

    applyFilterToAll: (filterId) =>
      commit((c) => {
        for (const s of c.slots) {
          if (s && s.photoId) s.filterId = filterId
        }
      }),

    swapSlots: (a, b) =>
      commit((c) => {
        const sa = c.slots[a]
        const sb = c.slots[b]
        if (sa && sb) {
          c.slots[a] = sb
          c.slots[b] = sa
        }
      }),
    moveSlot: (from, to) =>
      commit((c) => {
        if (from === to || from < 0 || to < 0 || from >= c.slots.length || to >= c.slots.length) return
        const item = c.slots.splice(from, 1)[0]
        if (item) c.slots.splice(to, 0, item)
      }),

    addSticker: (stickerId) =>
      commit((c) => {
        const def = getSticker(stickerId)
        if (!def) return
        const placed: PlacedSticker = {
          uid: uid(),
          stickerId,
          x: 0.5,
          y: 0.5,
          scale: 0.14,
          rotation: 0,
          color: def.defaultColor || STICKER_PALETTE[0]!,
        }
        c.stickers.push(placed)
      }),
    updateSticker: (u, patch) =>
      commit((c) => {
        const s = c.stickers.find((x) => x.uid === u)
        if (s) Object.assign(s, patch)
      }),
    removeSticker: (u) =>
      commit((c) => {
        c.stickers = c.stickers.filter((x) => x.uid !== u)
      }),
    bumpSticker: (u, dir) =>
      commit((c) => {
        const i = c.stickers.findIndex((x) => x.uid === u)
        const j = i + dir
        if (i < 0 || j < 0 || j >= c.stickers.length) return
        const item = c.stickers[i]!
        c.stickers[i] = c.stickers[j]!
        c.stickers[j] = item
      }),
    setText: (patch) =>
      commit((c) => {
        c.text = { ...c.text, ...patch }
      }),
  }
})

/** Exit an interaction bracket (call on pointerup / change end). */
export function endInteraction(): void {
  useEditor.setState({ interacting: false })
}
