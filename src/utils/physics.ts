export * from '../constants/room'
import { ROOM_WIDTH, ROOM_HEIGHT, STORAGE_UNIT_START_X, STORAGE_UNIT_END_X } from '../constants/room'

export function isItemOutside(x: number, width: number): boolean {
  return x + width <= STORAGE_UNIT_START_X || x >= STORAGE_UNIT_END_X
}

export interface RoomRect {
  id: string
  x: number
  y: number
  width: number
  height: number
  kind?: string
}

export function isEmptySpace(
  x: number,
  y: number,
  width: number,
  height: number,
  ignoreId: string,
  items: RoomRect[],
  maxWidth: number = ROOM_WIDTH,
  isViewingOutside: boolean = false,
): boolean {
  if (x < 0 || x + width > maxWidth) return false
  if (y < 0 || y + height > ROOM_HEIGHT) return false

  const draggedItem = items.find((i) => i.id === ignoreId)
  const isDecoration =
    draggedItem && (draggedItem.kind === 'NOTE' || draggedItem.kind === 'STICKER')

  if (isViewingOutside && !isDecoration) {
    const overlapDoor = x < STORAGE_UNIT_END_X && x + width > STORAGE_UNIT_START_X
    if (overlapDoor) return false
  }

  for (const other of items) {
    if (other.id === ignoreId) continue
    const overlapX = x < other.x + other.width && x + width > other.x
    const overlapY = y < other.y + other.height && y + height > other.y
    if (overlapX && overlapY) return false
  }
  return true
}

export function isSupported(
  x: number,
  y: number,
  width: number,
  height: number,
  ignoreId: string,
  items: RoomRect[],
  isViewingOutside: boolean = false,
): boolean {
  if (y <= 0) return true // y=0 is the floor

  const draggedItem = items.find((i) => i.id === ignoreId)
  const isDecoration =
    draggedItem && (draggedItem.kind === 'NOTE' || draggedItem.kind === 'STICKER')

  if (isDecoration && isViewingOutside) {
    if (x >= STORAGE_UNIT_START_X && x + width <= STORAGE_UNIT_END_X) {
      return true
    }
  }

  const centerX = x + width / 2
  for (const other of items) {
    if (other.id === ignoreId) continue
    if (y === other.y + other.height && centerX >= other.x && centerX <= other.x + other.width) {
      return true
    }
  }
  return false
}

export function isValidPlacement(
  x: number,
  y: number,
  width: number,
  height: number,
  ignoreId: string,
  items: RoomRect[],
  maxWidth: number = ROOM_WIDTH,
  isViewingOutside: boolean = false,
): boolean {
  return (
    isEmptySpace(x, y, width, height, ignoreId, items, maxWidth, isViewingOutside) &&
    isSupported(x, y, width, height, ignoreId, items, isViewingOutside)
  )
}

export function isSupportingAnotherObject(itemId: string, items: RoomRect[]): boolean {
  const item = items.find((i) => i.id === itemId)
  if (!item) return false

  for (const other of items) {
    if (other.id === item.id) continue
    if (other.y === item.y + item.height) {
      const overlapX = other.x < item.x + item.width && other.x + other.width > item.x
      if (overlapX) {
        return true
      }
    }
  }
  return false
}

export function findValidDropLocation(
  width: number,
  height: number,
  items: RoomRect[],
  ignoreId: string = '',
  minX: number = 0,
  maxX: number = ROOM_WIDTH,
): { x: number; y: number } {
  let bestX = minX
  let bestY = Infinity

  for (let x = minX; x <= maxX - width; x += 5) {
    let y = 0
    while (y <= ROOM_HEIGHT - height && !isValidPlacement(x, y, width, height, ignoreId, items, maxX)) {
      y++
    }
    if (y < bestY) {
      bestY = y
      bestX = x
      if (bestY === 0) break
    }
  }

  if (bestY !== Infinity) return { x: bestX, y: bestY }
  return { x: minX, y: 0 }
}
