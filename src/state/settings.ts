/** Persisted settings store (localStorage-backed, D-003). */
import { create } from 'zustand'
import type { AppSettings } from '../types'
import { loadSettings, saveSettings } from '../lib/prefs'
import { setSoundEnabled } from '../lib/sound'

interface SettingsState {
  settings: AppSettings
  update: (patch: Partial<AppSettings>) => void
}

const initial = loadSettings()
setSoundEnabled(initial.sound)

export const useSettings = create<SettingsState>((set) => ({
  settings: initial,
  update: (patch) =>
    set((s) => {
      const next = { ...s.settings, ...patch }
      saveSettings(next)
      if (patch.sound !== undefined) setSoundEnabled(patch.sound)
      return { settings: next }
    }),
}))
