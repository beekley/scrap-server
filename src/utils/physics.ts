export const OUTSIDE_LEFT_WIDTH = 100
export const STORAGE_UNIT_WIDTH = 120
export const OUTSIDE_RIGHT_WIDTH = 100
export const ROOM_WIDTH = OUTSIDE_LEFT_WIDTH + STORAGE_UNIT_WIDTH + OUTSIDE_RIGHT_WIDTH
export const ROOM_HEIGHT = 180

export const STORAGE_UNIT_START_X = OUTSIDE_LEFT_WIDTH
export const STORAGE_UNIT_END_X = OUTSIDE_LEFT_WIDTH + STORAGE_UNIT_WIDTH

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
  if (y + height >= ROOM_HEIGHT) return true

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
    if (y + height === other.y && centerX >= other.x && centerX <= other.x + other.width) {
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
    if (other.y + other.height === item.y) {
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
  let bestY = -1

  for (let x = minX; x <= maxX - width; x += 5) {
    let y = ROOM_HEIGHT - height
    while (y >= 0 && !isValidPlacement(x, y, width, height, ignoreId, items, maxX)) {
      y--
    }
    if (y > bestY) {
      bestY = y
      bestX = x
      if (bestY === ROOM_HEIGHT - height) break
    }
  }

  if (bestY >= 0) return { x: bestX, y: bestY }
  return { x: minX, y: 0 }
}
