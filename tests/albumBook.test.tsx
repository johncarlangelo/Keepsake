import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AlbumBook, buildSheets, inWindow, zFor } from '../src/components/AlbumBook'
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

describe('3d flip album (Phase 22)', () => {
  it('builds sheets: cover first, strips paired front/back, end sheet last', () => {
    const sheets = buildSheets([makeEntry(0), makeEntry(1), makeEntry(2)])
    expect(sheets[0]!.front).toEqual({ kind: 'cover' })
    expect(sheets[0]!.back).toEqual({ kind: 'strip', entry: expect.objectContaining({ id: 's0' }) })
    expect(sheets[1]!.front).toEqual({ kind: 'strip', entry: expect.objectContaining({ id: 's1' }) })
    expect(sheets[1]!.back).toEqual({ kind: 'strip', entry: expect.objectContaining({ id: 's2' }) })
    expect(sheets[2]!.front).toEqual({ kind: 'end' })
  })

  it('stacks z-order: next-to-flip on top of the right, latest flip on top of the left', () => {
    // 3 sheets, 1 flipped: sheet 0 sits on the left pile (z 1), sheet 1 on top of the right
    expect(zFor(0, 1, 3)).toBe(1)
    expect(zFor(1, 1, 3)).toBe(3 - 1 + 10)
    expect(zFor(2, 1, 3)).toBe(3 - 2 + 10)
    expect(zFor(1, 1, 3)).toBeGreaterThan(zFor(2, 1, 3))
  })

  it('renders a content window around the open spread', () => {
    expect(inWindow(1, 1)).toBe(true)
    expect(inWindow(0, 1)).toBe(true)
    expect(inWindow(3, 1)).toBe(true)
    expect(inWindow(4, 1)).toBe(false)
    expect(inWindow(5, 1)).toBe(false)
  })

  it('flips pages via the next/prev controls', () => {
    render(<AlbumBook entries={[makeEntry(0), makeEntry(1), makeEntry(2)]} />)
    expect(screen.getByText('Keepsake')).toBeTruthy() // cover front
    fireEvent.click(screen.getAllByRole('button', { name: 'Next page' })[0]!)
    expect(screen.getAllByText('the end ✦').length).toBeGreaterThan(0)
    fireEvent.click(screen.getAllByRole('button', { name: 'Previous page' })[0]!)
    expect(screen.getByText('Keepsake')).toBeTruthy()
  })
})
