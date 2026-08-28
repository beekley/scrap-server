import { ref, computed, type Ref } from 'vue'
import {
  ROOM_WIDTH,
  ROOM_HEIGHT,
  isEmptySpace,
  isValidPlacement,
  isSupportingAnotherObject,
  type RoomRect,
} from '../utils/physics'

export interface DragConfig {
  scale: number
  maxWidth?: Ref<number>
  onMoveItem: (id: string, x: number, y: number) => void
  onSelect: (id: string) => void
}

export function useDraggable(roomItems: Ref<RoomRect[]>, config: DragConfig) {
  const draggedItemId = ref<string | null>(null)
  const dragOffsetX = ref(0)
  const dragOffsetY = ref(0)
  const dragX = ref(0)
  const dragY = ref(0)

  function handleMouseDown(e: MouseEvent, itemId: string) {
    if (isSupportingAnotherObject(itemId, roomItems.value)) {
      config.onSelect(itemId)
      return
    }
    if (e.button !== 0) return

    draggedItemId.value = itemId
    config.onSelect(itemId)

    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    dragOffsetX.value = e.clientX - rect.left
    dragOffsetY.value = e.clientY - rect.top

    const item = roomItems.value.find((i) => i.id === itemId)
    if (item) {
      dragX.value = item.x
      dragY.value = item.y
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  function handleMouseMove(e: MouseEvent) {
    if (!draggedItemId.value) return
    const container = document.getElementById('server-room-container')
    if (!container) return

    const rect = container.getBoundingClientRect()
    const rawX = e.clientX - rect.left - dragOffsetX.value
    const rawY = e.clientY - rect.top - dragOffsetY.value

    dragX.value = Math.round(rawX / config.scale)
    dragY.value = Math.round(rawY / config.scale)
  }

  const isDragValid = computed(() => {
    if (!draggedItemId.value) return true
    const item = roomItems.value.find((i) => i.id === draggedItemId.value)
    if (!item) return true

    const maxWidth = config.maxWidth?.value ?? ROOM_WIDTH
    const finalX = Math.max(0, Math.min(maxWidth - item.width, dragX.value))
    const finalY = Math.max(0, Math.min(ROOM_HEIGHT - item.height, dragY.value))

    if (!isEmptySpace(finalX, finalY, item.width, item.height, item.id, roomItems.value, maxWidth))
      return false

    let fallY = finalY
    while (
      fallY <= ROOM_HEIGHT - item.height &&
      isEmptySpace(finalX, fallY, item.width, item.height, item.id, roomItems.value, maxWidth)
    ) {
      fallY++
    }
    fallY--

    if (
      !isValidPlacement(finalX, fallY, item.width, item.height, item.id, roomItems.value, maxWidth)
    ) {
      let foundValid = false
      for (let y = ROOM_HEIGHT - item.height; y >= 0; y--) {
        if (
          isValidPlacement(finalX, y, item.width, item.height, item.id, roomItems.value, maxWidth)
        ) {
          foundValid = true
          break
        }
      }
      if (!foundValid) return false
    }
    return true
  })

  function handleMouseUp() {
    if (!draggedItemId.value) return

    const item = roomItems.value.find((i) => i.id === draggedItemId.value)
    if (!item) {
      cleanupDrag()
      return
    }

    const maxWidth = config.maxWidth?.value ?? ROOM_WIDTH
    const finalX = Math.max(0, Math.min(maxWidth - item.width, dragX.value))
    let finalY = Math.max(0, Math.min(ROOM_HEIGHT - item.height, dragY.value))

    let fallY = finalY
    while (
      fallY <= ROOM_HEIGHT - item.height &&
      isEmptySpace(finalX, fallY, item.width, item.height, item.id, roomItems.value, maxWidth)
    ) {
      fallY++
    }
    fallY--

    if (
      !isValidPlacement(finalX, fallY, item.width, item.height, item.id, roomItems.value, maxWidth)
    ) {
      let foundValid = false
      for (let y = ROOM_HEIGHT - item.height; y >= 0; y--) {
        if (
          isValidPlacement(finalX, y, item.width, item.height, item.id, roomItems.value, maxWidth)
        ) {
          finalY = y
          foundValid = true
          break
        }
      }

      if (!foundValid) {
        cleanupDrag()
        return
      }
    } else {
      finalY = fallY
    }

    config.onMoveItem(item.id, finalX, finalY)
    cleanupDrag()
  }

  function cleanupDrag() {
    draggedItemId.value = null
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }

  return {
    draggedItemId,
    dragX,
    dragY,
    isDragValid,
    handleMouseDown,
  }
}
