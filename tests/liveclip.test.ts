import { describe, expect, it, vi } from 'vitest'
import {
  liveClipDurationMs,
  liveClipExt,
  pickLiveMime,
  supportsLiveCapture,
} from '../src/lib/liveclip'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../src/lib/prefs'
import { getPhoto, newId, putPhoto } from '../src/lib/db'
import type { PhotoRecord } from '../src/types'

describe('live clips (Phase 20, D-034)', () => {
  it('prefers mp4 for iOS and falls back to webm', () => {
    const mp4Only = vi.fn((m: string) => m.startsWith('video/mp4'))
    expect(pickLiveMime(mp4Only)).toBe('video/mp4;codecs=avc1.42E01E')
    const webmOnly = vi.fn((m: string) => m.includes('webm'))
    expect(pickLiveMime(webmOnly)).toBe('video/webm;codecs=vp9')
    expect(pickLiveMime(() => false)).toBeNull()
  })

  it('spans the countdown plus a beat, or 3s when untimed', () => {
    expect(liveClipDurationMs(0)).toBe(3000)
    expect(liveClipDurationMs(3)).toBe(4200)
    expect(liveClipDurationMs(5)).toBe(6200)
    expect(liveClipDurationMs(0)).toBeLessThan(3500)
  })

  it('maps mime to a file extension', () => {
    expect(liveClipExt('video/mp4;codecs=avc1')).toBe('mp4')
    expect(liveClipExt('video/webm;codecs=vp8')).toBe('webm')
  })

  it('reports unsupported when MediaRecorder is missing', () => {
    const original = globalThis.MediaRecorder
    // @ts-expect-error — simulate an engine without MediaRecorder
    delete globalThis.MediaRecorder
    expect(supportsLiveCapture()).toBe(false)
    expect(pickLiveMime(() => false)).toBeNull()
    globalThis.MediaRecorder = original
  })

  it('round-trips the livePhoto preference', () => {
    saveSettings({ ...DEFAULT_SETTINGS, livePhoto: true })
    expect(loadSettings()).toMatchObject({ livePhoto: true })
    saveSettings({ ...DEFAULT_SETTINGS, livePhoto: false })
    expect(loadSettings()).toMatchObject({ livePhoto: false })
  })

  it('stores live clips additively beside the still', async () => {
    const still = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' })
    const thumb = new Blob([new Uint8Array([9])], { type: 'image/jpeg' })
    const live = new Blob([new Uint8Array([4, 5, 6, 7])], { type: 'video/mp4' })
    const record: PhotoRecord = {
      id: newId(),
      kind: 'capture',
      createdAt: Date.now(),
      width: 100,
      height: 100,
      bytes: still.size,
      blob: still,
      thumb,
    }
    const first = await putPhoto(record)
    expect(first.ok).toBe(true)

    // recorder settles after the still is stored — attach additively
    const stored = await getPhoto(record.id)
    expect(stored?.live).toBeUndefined()
    const update = await putPhoto({ ...stored!, live: { blob: live, mime: 'video/mp4', bytes: live.size } })
    expect(update.ok).toBe(true)

    const reread = await getPhoto(record.id)
    expect(reread?.live?.mime).toBe('video/mp4')
    expect(reread?.live?.bytes).toBe(live.size)
    expect(reread?.bytes).toBe(still.size) // still untouched
  })

  it('round-trips a live-strip record', async () => {
    const preview = new Blob([new Uint8Array([1, 2, 3, 4, 5])], { type: 'image/jpeg' })
    const record: PhotoRecord = {
      id: newId(),
      kind: 'live-strip',
      createdAt: Date.now(),
      width: 600,
      height: 1840,
      bytes: preview.size,
      blob: preview,
      thumb: preview,
      label: 'Classic Three · Classic White · live',
      liveStrip: {
        templateId: 'classic-3',
        frameId: 'classic-white',
        frameColor: null,
        text: { caption: 'hello', showDate: true, font: 'script', color: 'auto', align: 'center', size: 0.05 },
        slots: ['p1', 'p2', 'p3'],
      },
    }
    const put = await putPhoto(record)
    expect(put.ok).toBe(true)
    const reread = await getPhoto(record.id)
    expect(reread?.kind).toBe('live-strip')
    expect(reread?.liveStrip?.slots).toEqual(['p1', 'p2', 'p3'])
    expect(reread?.liveStrip?.text.caption).toBe('hello')
  })
})
