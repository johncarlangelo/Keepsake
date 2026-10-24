import { beforeEach, describe, expect, it } from 'vitest'
import { useEditor } from '../src/state/editor'
import { emptyComposition } from '../src/render/compose'

function fresh(): void {
  useEditor.getState().load(emptyComposition('classic-4', ['a', 'b', 'c', 'd']))
  useEditor.setState({ interacting: false, selectedSlot: null, selectedSticker: null, toolTab: 'layout', applyToAll: false })
}

describe('editor store history (VERIFY A6)', () => {
  beforeEach(fresh)

  it('commits and undoes', () => {
    const ed = useEditor.getState()
    ed.setFrame('blush-romance')
    expect(useEditor.getState().comp!.frameId).toBe('blush-romance')
    ed.undo()
    expect(useEditor.getState().comp!.frameId).toBe('classic-white')
    ed.redo()
    expect(useEditor.getState().comp!.frameId).toBe('blush-romance')
  })

  it('new commit clears redo stack', () => {
    const ed = useEditor.getState()
    ed.setFrame('film-sprocket')
    ed.undo()
    ed.setFrame('korean-clean')
    expect(useEditor.getState().future).toHaveLength(0)
  })

  it('caps history at 40 entries', () => {
    for (let i = 0; i < 50; i++) {
      useEditor.getState().setText({ caption: `v${i}` })
    }
    expect(useEditor.getState().past.length).toBeLessThanOrEqual(40)
  })

  it('interaction bracket records a single history entry', () => {
    const ed = useEditor.getState()
    ed.beginInteraction()
    ed.setSlotIntensity(0, 0.2)
    ed.setSlotIntensity(0, 0.4)
    ed.setSlotIntensity(0, 0.6)
    // one snapshot from beginInteraction, none from bracketed commits
    expect(useEditor.getState().past.length).toBe(1)
    expect(useEditor.getState().comp!.slots[0]!.intensity).toBeCloseTo(0.6)
  })

  it('per-slot filter and applyToAll', () => {
    const ed = useEditor.getState()
    ed.setSlotFilter(1, 'golden-hour')
    expect(useEditor.getState().comp!.slots[1]!.filterId).toBe('golden-hour')
    expect(useEditor.getState().comp!.slots[0]!.filterId).toBeNull()
    ed.setApplyToAll(true)
    ed.setSlotFilter(0, 'noir-deep')
    for (const s of useEditor.getState().comp!.slots) {
      expect(s!.filterId).toBe('noir-deep')
    }
  })

  it('setTemplate preserves photos in reading order and resets extras', () => {
    const ed = useEditor.getState()
    ed.setSlotCrop(0, { zoom: 2, x: 0.1, y: 0 })
    ed.setTemplate('fourcut-kr')
    const comp = useEditor.getState().comp!
    expect(comp.templateId).toBe('fourcut-kr')
    expect(comp.slots.map((s) => s.photoId)).toEqual(['a', 'b', 'c', 'd'])
    // switching to fewer slots drops extras
    ed.setTemplate('duo-stack')
    expect(useEditor.getState().comp!.slots.map((s) => s.photoId)).toEqual(['a', 'b'])
  })

  it('reorder via moveSlot', () => {
    const ed = useEditor.getState()
    ed.moveSlot(0, 2)
    expect(useEditor.getState().comp!.slots.map((s) => s.photoId)).toEqual(['b', 'c', 'a', 'd'])
  })

  it('sticker add/update/remove/bump', () => {
    const ed = useEditor.getState()
    ed.addSticker('heart')
    ed.addSticker('star')
    let comp = useEditor.getState().comp!
    expect(comp.stickers).toHaveLength(2)
    const heartUid = comp.stickers[0]!.uid
    ed.updateSticker(heartUid, { x: 0.8, rotation: 45 })
    comp = useEditor.getState().comp!
    expect(comp.stickers[0]!.x).toBeCloseTo(0.8)
    ed.bumpSticker(heartUid, 1)
    expect(useEditor.getState().comp!.stickers[1]!.uid).toBe(heartUid)
    ed.removeSticker(heartUid)
    expect(useEditor.getState().comp!.stickers).toHaveLength(1)
  })

  it('reset restores defaults but keeps photos', () => {
    const ed = useEditor.getState()
    ed.setFrame('y2k-chrome')
    ed.setText({ caption: 'hi' })
    ed.addSticker('bow')
    ed.reset()
    const comp = useEditor.getState().comp!
    expect(comp.frameId).toBe('classic-white')
    expect(comp.text.caption).toBe('')
    expect(comp.stickers).toHaveLength(0)
    expect(comp.slots.map((s) => s.photoId)).toEqual(['a', 'b', 'c', 'd'])
  })
})
