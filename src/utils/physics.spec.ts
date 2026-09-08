import { describe, it, expect } from 'vitest'
import {
  isSupported,
  isEmptySpace,
  findValidDropLocation
} from './physics'
import type { RoomItem } from './physics'

describe('Physics: Room constraints with y=0 floor', () => {
  it('reports isSupported correctly', () => {
    const items: RoomItem[] = [
      { id: 'box1', x: 10, y: 0, width: 20, height: 10, kind: 'CASE', name: 'Box 1' }
    ]

    // Item resting on the floor (y=0)
    expect(isSupported(0, 0, 10, 10, 'new', items)).toBe(true)
    // Item in the air
    expect(isSupported(0, 10, 10, 10, 'new', items)).toBe(false)
    // Item resting on box1
    expect(isSupported(15, 10, 10, 10, 'new', items)).toBe(true)
    // Item slightly off box1
    expect(isSupported(35, 10, 10, 10, 'new', items)).toBe(false)
  })

  it('finds valid drop location (gravity down to y=0)', () => {
    const items: RoomItem[] = [
      { id: 'box1', x: 10, y: 0, width: 20, height: 10, kind: 'CASE', name: 'Box 1' }
    ]

    // Try dropping directly above box1 (minX = 10, maxX = 30)
    const loc1 = findValidDropLocation(10, 10, items, 'new', 10, 30)
    expect(loc1?.y).toBe(10)
    expect(loc1?.x).toBe(10)

    // Try dropping in empty space
    const loc2 = findValidDropLocation(10, 10, items, 'new', 50, 100)
    expect(loc2?.y).toBe(0)
    expect(loc2?.x).toBe(50)
  })
})
