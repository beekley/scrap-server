<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import type { Part, ServerNode } from '../types'
import { useDraggable } from '../composables/useDraggable'
import { ROOM_WIDTH, ROOM_HEIGHT, type RoomRect } from '../utils/physics'

const gameStore = useGameStore()

const SCALE = 3 // 1 unit = 3px

interface RoomItem extends RoomRect {
  name: string
  kind: string
  isServer: boolean
  ref: ServerNode | Part
}

const roomItems = computed<RoomItem[]>(() => {
  const items: RoomItem[] = []

  for (const s of gameStore.servers) {
    const casePart = s.installedParts.find((p) => p.kind === 'CASE')
    if (casePart) {
      items.push({
        id: s.id, // Using server ID for selecting
        name: s.name,
        kind: 'SERVER',
        width: casePart.width,
        height: casePart.height,
        x: s.x ?? 0,
        y: s.y ?? 0,
        isServer: true,
        ref: s as unknown as ServerNode,
      })
    }
  }

  for (const p of gameStore.inventory) {
    items.push({
      id: p.id,
      name: p.name,
      kind: p.kind,
      width: p.width,
      height: p.height,
      x: p.x ?? 0,
      y: p.y ?? 0,
      isServer: false,
      ref: p as unknown as Part,
    })
  }

  return items
})

const { draggedItemId, dragX, dragY, isDragValid, handleMouseDown } = useDraggable(roomItems, {
  scale: SCALE,
  onMoveItem: (id, x, y) => gameStore.moveItem(id, x, y),
  onSelect: (id) => {
    gameStore.selectedItemId = id
  },
})
</script>

<template>
  <div class="server-room-wrapper">
    <h3>Server Room</h3>
    <div
      id="server-room-container"
      class="room-container"
      :style="{ width: ROOM_WIDTH * SCALE + 'px', height: ROOM_HEIGHT * SCALE + 'px' }"
    >
      <div
        v-for="item in roomItems"
        :key="item.id"
        class="room-item"
        :class="{
          'is-selected': gameStore.selectedItemId === item.id,
          'is-dragging': draggedItemId === item.id,
          'is-invalid': draggedItemId === item.id && !isDragValid,
        }"
        :style="{
          width: item.width * SCALE + 'px',
          height: item.height * SCALE + 'px',
          transform: `translate(${(draggedItemId === item.id ? dragX : item.x) * SCALE}px, ${(draggedItemId === item.id ? dragY : item.y) * SCALE}px)`,
        }"
        @mousedown="handleMouseDown($event, item.id)"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.server-room-wrapper {
  margin-bottom: 20px;
}
.room-container {
  position: relative;
  border: 2px solid #333;
  background-color: #f0f0f0;
  overflow: hidden;
  user-select: none;
}
.room-item {
  position: absolute;
  top: 0;
  left: 0;
  background: #fff;
  border: 2px solid #666;
  border-radius: 0;
  box-shadow: none;
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 6px;
  padding: 1px;
  box-sizing: border-box;
}
.room-item.is-selected {
  background: #e3f2fd;
  border-color: #1976d2;
}
.room-item.is-invalid {
  background: #ffcccc !important;
  border-color: #d32f2f !important;
}
.room-item.is-dragging {
  cursor: grabbing;
  z-index: 100;
  opacity: 0.9;
}
.item-label {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  word-break: break-word;
  pointer-events: none;
}
</style>
