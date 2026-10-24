import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearAllPhotos,
  deletePhotos,
  getAllPhotos,
  getPhoto,
  isQuotaError,
  looksCorrupt,
  newId,
  putPhoto,
  countPhotos,
} from '../src/lib/db'
import type { PhotoRecord } from '../src/types'

function makeRecord(overrides: Partial<PhotoRecord> = {}): PhotoRecord {
  const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/jpeg' })
  const thumb = new Blob([new Uint8Array([9])], { type: 'image/jpeg' })
  return {
    id: newId(),
    kind: 'capture',
    createdAt: Date.now(),
    width: 640,
    height: 480,
    bytes: blob.size,
    blob,
    thumb,
    ...overrides,
  }
}

describe('IndexedDB wrapper (VERIFY A7)', () => {
  beforeEach(async () => {
    await clearAllPhotos()
  })

  it('puts and gets a record', async () => {
    const rec = makeRecord()
    const res = await putPhoto(rec)
    expect(res.ok).toBe(true)
    const got = await getPhoto(rec.id)
    expect(got?.id).toBe(rec.id)
    expect(got?.width).toBe(640)
  })

  it('getAllPhotos returns newest first', async () => {
    const older = makeRecord({ createdAt: 1000 })
    const newer = makeRecord({ createdAt: 2000 })
    await putPhoto(older)
    await putPhoto(newer)
    const all = await getAllPhotos()
    expect(all[0]!.createdAt).toBeGreaterThanOrEqual(all[all.length - 1]!.createdAt)
    expect(all).toHaveLength(2)
  })

  it('deletes selected records only', async () => {
    const a = makeRecord()
    const b = makeRecord()
    await putPhoto(a)
    await putPhoto(b)
    await deletePhotos([a.id])
    expect(await getPhoto(a.id)).toBeNull()
    expect(await getPhoto(b.id)).not.toBeNull()
    expect(await countPhotos()).toBe(1)
  })

  it('reports corruption flags without throwing', () => {
    const bad = makeRecord({ blob: new Blob([]) as Blob })
    expect(looksCorrupt(bad)).toBe(true)
    expect(looksCorrupt(makeRecord())).toBe(false)
  })

  it('maps quota errors by name', () => {
    expect(isQuotaError(new DOMException('nope', 'QuotaExceededError'))).toBe(true)
    expect(isQuotaError(new DOMException('nope', 'NotFoundError'))).toBe(false)
    expect(isQuotaError(new Error('exceeded quota somehow'))).toBe(true)
  })

  it('putPhoto reports failure for broken storage as non-ok', async () => {
    vi.resetModules()
    const { putPhoto: freshPut } = (await import('../src/lib/db')) as typeof import('../src/lib/db')
    const original = indexedDB
    Object.defineProperty(globalThis, 'indexedDB', { value: undefined, configurable: true })
    const res = await freshPut(makeRecord())
    Object.defineProperty(globalThis, 'indexedDB', { value: original, configurable: true })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(['unavailable', 'unknown']).toContain(res.reason)
    vi.resetModules()
  })
})
