import { describe, expect, it } from 'vitest'
import { buildPages } from '../src/components/AlbumBook'
import type { GalleryEntry } from '../src/types'

function makeEntry(i: number): GalleryEntry {
  const blob = new Blob([new Uint8Array([1])], { type: 'image/jpeg' })
  return {
    id: `s${i}`,
    kind: 'strip',
    createdAt: 1000 - i,
    width: 600,
    height: 1840,
    bytes: 10,
    blob,
    thumb: blob,
    corrupt: false,
  }
}

describe('3d flip album (Phase 22, react-pageflip)', () => {
  it('builds pages: hard cover first, one strip per page, closing page last', () => {
    const pages = buildPages([makeEntry(0), makeEntry(1), makeEntry(2)])
    expect(pages).toHaveLength(5)
    expect(pages[0]!.kind).toBe('cover')
    expect(pages[1]!.kind).toBe('strip')
    expect(pages[1]!.entry?.id).toBe('s0')
    expect(pages[3]!.entry?.id).toBe('s2')
    expect(pages[4]!.kind).toBe('end')
  })

  it('returns just a cover and end page for an empty gallery', () => {
    const pages = buildPages([])
    expect(pages).toHaveLength(2)
    expect(pages[0]!.kind).toBe('cover')
    expect(pages[1]!.kind).toBe('end')
  })
})
