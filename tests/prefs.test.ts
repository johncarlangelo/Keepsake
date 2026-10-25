import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../src/lib/prefs'
import { canShareFiles, exportFilename, platformSaveHint } from '../src/lib/share'

describe('preferences (VERIFY A8)', () => {
  it('round-trips settings', () => {
    saveSettings({ ...DEFAULT_SETTINGS, countdown: 5, sound: false })
    expect(loadSettings()).toMatchObject({ countdown: 5, sound: false })
  })

  it('falls back to defaults on corrupt JSON', () => {
    localStorage.setItem('keepsake.settings', '{oops')
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('sanitizes invalid values', () => {
    localStorage.setItem('keepsake.settings', JSON.stringify({ countdown: 7, exportScale: 99, sound: 'yes' }))
    const s = loadSettings()
    expect(s.countdown).toBe(DEFAULT_SETTINGS.countdown)
    expect(s.exportScale).toBe(DEFAULT_SETTINGS.exportScale)
    expect(s.sound).toBe(DEFAULT_SETTINGS.sound)
  })
})

describe('export helpers (VERIFY A9)', () => {
  it('builds a dated filename', () => {
    const name = exportFilename('keepsake', new Date(2026, 9, 24, 14, 5))
    expect(name).toBe('keepsake-20261024-1405.png')
  })

  it('detects share-file support conservatively', () => {
    // jsdom has no navigator.share → false
    expect(canShareFiles()).toBe(false)
  })

  it('gives platform-appropriate save hints', () => {
    expect(platformSaveHint('Mozilla/5.0 (iPhone)')).toMatch(/Save Image/i)
    expect(platformSaveHint('Mozilla/5.0 (Android)')).toMatch(/Share/i)
    expect(platformSaveHint('Mozilla/5.0 (Windows NT)')).toMatch(/Downloads folder/i)
  })
})
