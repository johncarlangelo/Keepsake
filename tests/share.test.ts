import { afterEach, describe, expect, it, vi } from 'vitest'
import { dataUrlToBlob, isIos, savePngFromBlob } from '../src/lib/share'

const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const WINDOWS_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

// 1×1 transparent PNG
const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

function stubNavigator(props: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(props)) {
    Object.defineProperty(navigator, key, { value, configurable: true })
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('iOS export (D-033)', () => {
  it('detects iPhone and iPadOS (desktop-mode Macintosh with touch)', () => {
    expect(isIos(IPHONE_UA, 5)).toBe(true)
    expect(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', 5)).toBe(true)
    expect(isIos(WINDOWS_UA, 0)).toBe(false)
    expect(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false)
  })

  it('decodes a data URL into a PNG blob synchronously', () => {
    const blob = dataUrlToBlob(TINY_PNG)
    expect(blob.type).toBe('image/png')
    expect(blob.size).toBeGreaterThan(0)
  })

  it('routes iOS saves through the share sheet', () => {
    const share = vi.fn().mockResolvedValue(undefined)
    stubNavigator({ maxTouchPoints: 5, canShare: vi.fn(() => true), share })
    const blob = dataUrlToBlob(TINY_PNG)
    const result = savePngFromBlob(blob, 'keepsake.png', IPHONE_UA, 5)
    expect(result).toBe('shared')
    expect(share).toHaveBeenCalledTimes(1)
    const arg = share.mock.calls[0]?.[0] as { files: File[] }
    expect(arg.files[0]?.name).toBe('keepsake.png')
  })

  it('falls back to anchor download off-iOS and when file share is unsupported', () => {
    const share = vi.fn().mockResolvedValue(undefined)
    stubNavigator({ maxTouchPoints: 0, canShare: vi.fn(() => true), share })
    const blob = dataUrlToBlob(TINY_PNG)
    expect(savePngFromBlob(blob, 'a.png', WINDOWS_UA, 0)).toBe('downloaded')
    expect(share).not.toHaveBeenCalled()
    // iOS device, but the browser cannot share files → download path
    stubNavigator({ maxTouchPoints: 5, canShare: vi.fn(() => false), share })
    expect(savePngFromBlob(blob, 'b.png', IPHONE_UA, 5)).toBe('downloaded')
    expect(share).not.toHaveBeenCalled()
  })
})
