/** Small preferences in localStorage — never image data (see DECISIONS D-003). */
import type { AppSettings } from '../types'

const KEY = 'keepsake.settings'

export const DEFAULT_SETTINGS: AppSettings = {
  countdown: 3,
  sound: true,
  mirrorSave: true,
  continuous: false,
  lastTemplateId: 'classic-4',
  exportScale: 2,
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return { ...DEFAULT_SETTINGS, ...sanitized(parsed) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(s: AppSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* storage full/blocked: preferences are best-effort */
  }
}

function sanitized(p: Partial<AppSettings>): Partial<AppSettings> {
  const out: Partial<AppSettings> = {}
  if (p.countdown === 0 || p.countdown === 3 || p.countdown === 5) out.countdown = p.countdown
  if (typeof p.sound === 'boolean') out.sound = p.sound
  if (typeof p.mirrorSave === 'boolean') out.mirrorSave = p.mirrorSave
  if (typeof p.continuous === 'boolean') out.continuous = p.continuous
  if (typeof p.lastTemplateId === 'string') out.lastTemplateId = p.lastTemplateId
  if (p.exportScale === 2 || p.exportScale === 3) out.exportScale = p.exportScale
  return out
}
