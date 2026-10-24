/** IndexedDB wrapper for the in-app Gallery (photos store). See ARCHITECHTURE §5.1. */
import type { PhotoRecord, SaveResult } from '../types'

const DB_NAME = 'keepsake'
const DB_VERSION = 1
const STORE = 'photos'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new StorageUnavailableError('IndexedDB is not available in this browser context'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      // Migrations must be additive; never delete user photos (AGENTS.md).
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('Failed to open Keepsake storage'))
    req.onblocked = () => reject(new Error('Keepsake storage is blocked by another tab'))
  })
  dbPromise.catch(() => {
    dbPromise = null
  })
  return dbPromise
}

export class StorageUnavailableError extends Error {}
export class QuotaError extends Error {}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const req = fn(t.objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
  )
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export async function putPhoto(record: PhotoRecord): Promise<SaveResult> {
  try {
    await tx('readwrite', (s) => s.put(record))
    return { ok: true, record }
  } catch (err) {
    if (err instanceof StorageUnavailableError) return { ok: false, reason: 'unavailable', error: err }
    if (isQuotaError(err)) return { ok: false, reason: 'quota', error: err }
    return { ok: false, reason: 'unknown', error: err }
  }
}

export async function getPhoto(id: string): Promise<PhotoRecord | null> {
  try {
    const rec = await tx<PhotoRecord | undefined>('readonly', (s) => s.get(id))
    return rec ?? null
  } catch {
    return null
  }
}

export async function getAllPhotos(): Promise<PhotoRecord[]> {
  const recs = await tx<PhotoRecord[]>('readonly', (s) => s.getAll())
  // newest first; corrupt-looking records are flagged by the caller, not dropped here
  return recs.sort((a, b) => b.createdAt - a.createdAt)
}

export async function deletePhotos(ids: string[]): Promise<void> {
  await tx('readwrite', (s) => {
    for (const id of ids) s.delete(id)
    return s.getAll() // request to anchor transaction completion
  })
}

export async function clearAllPhotos(): Promise<void> {
  await tx('readwrite', (s) => s.clear())
}

export async function countPhotos(): Promise<number> {
  return tx<number>('readonly', (s) => s.count())
}

/** Best-effort storage stats; null where unsupported. */
export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    if (navigator.storage?.estimate) {
      const e = await navigator.storage.estimate()
      return { usage: e.usage ?? 0, quota: e.quota ?? 0 }
    }
  } catch {
    /* ignore */
  }
  return null
}

export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist()
  } catch {
    /* ignore */
  }
  return false
}

export function isQuotaError(err: unknown): boolean {
  if (err instanceof DOMException) {
    return err.name === 'QuotaExceededError' || (err.code === 22)
  }
  if (err instanceof Error) return /quota/i.test(err.message)
  return false
}

/** A record is usable only if its blobs look present. Used to flag (never auto-delete). */
export function looksCorrupt(rec: PhotoRecord): boolean {
  return !rec.blob || rec.blob.size === 0 || !rec.thumb || rec.thumb.size === 0
}
