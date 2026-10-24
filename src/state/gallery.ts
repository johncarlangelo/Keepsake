/** Gallery store: entries, selection, storage stats (ARCHITECHTURE §5). */
import { create } from 'zustand'
import type { GalleryEntry } from '../types'
import {
  clearAllPhotos,
  deletePhotos,
  getAllPhotos,
  looksCorrupt,
  requestPersistence,
  storageEstimate,
} from '../lib/db'
import { dropBitmap, pooledUrl, revokeUrl } from '../lib/images'

interface GalleryState {
  entries: GalleryEntry[]
  loading: boolean
  loadError: string | null
  storageUnavailable: boolean
  estimate: { usage: number; quota: number } | null
  persisted: boolean | null
  selectMode: boolean
  selected: string[]
  refresh: () => Promise<void>
  refreshEstimate: () => Promise<void>
  remove: (ids: string[]) => Promise<void>
  clearAll: () => Promise<void>
  setSelectMode: (on: boolean) => void
  toggleSelect: (id: string) => void
  clearSelection: () => void
}

let persistenceRequested = false

export const useGallery = create<GalleryState>((set, get) => ({
  entries: [],
  loading: false,
  loadError: null,
  storageUnavailable: false,
  estimate: null,
  persisted: null,
  selectMode: false,
  selected: [],

  refresh: async () => {
    set({ loading: true, loadError: null })
    try {
      const records = await getAllPhotos()
      // revoke previous thumb urls to avoid leaks
      for (const e of get().entries) if (e.thumbUrl) revokeUrl(e.thumbUrl)
      const entries: GalleryEntry[] = records.map((r) => ({
        ...r,
        corrupt: looksCorrupt(r),
        thumbUrl: looksCorrupt(r) ? undefined : pooledUrl(r.thumb),
      }))
      set({ entries, loading: false, storageUnavailable: false })
      if (!persistenceRequested && entries.length > 0) {
        persistenceRequested = true
        requestPersistence().then((p) => set({ persisted: p }))
      }
      void get().refreshEstimate()
    } catch (err) {
      set({
        loading: false,
        storageUnavailable: true,
        loadError: err instanceof Error ? err.message : 'Gallery storage is unavailable in this browser.',
        entries: [],
      })
    }
  },

  refreshEstimate: async () => {
    const est = await storageEstimate()
    set({ estimate: est })
  },

  remove: async (ids) => {
    await deletePhotos(ids)
    for (const id of ids) dropBitmap(id)
    set((s) => ({
      entries: s.entries.filter((e) => {
        if (!ids.includes(e.id)) return true
        if (e.thumbUrl) revokeUrl(e.thumbUrl)
        return false
      }),
      selected: s.selected.filter((id) => !ids.includes(id)),
    }))
    void get().refreshEstimate()
  },

  clearAll: async () => {
    await clearAllPhotos()
    for (const e of get().entries) if (e.thumbUrl) revokeUrl(e.thumbUrl)
    set({ entries: [], selected: [], selectMode: false })
    void get().refreshEstimate()
  },

  setSelectMode: (on) => set({ selectMode: on, selected: on ? get().selected : [] }),
  toggleSelect: (id) =>
    set((s) => ({
      selected: s.selected.includes(id) ? s.selected.filter((x) => x !== id) : [...s.selected, id],
    })),
  clearSelection: () => set({ selected: [] }),
}))

export function galleryEntry(ids: string[]): GalleryEntry[] {
  return useGallery.getState().entries.filter((e) => ids.includes(e.id))
}
