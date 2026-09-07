<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/game'
import type { Part, ServerNode } from '../types'
import { useDraggable } from '../composables/useDraggable'
import {
  ROOM_WIDTH,
  ROOM_HEIGHT,
  type RoomRect,
  TRANSFER_ZONE_START_X,
  TRANSFER_ZONE_WIDTH,
} from '../utils/physics'

const gameStore = useGameStore()
const baseUrl = import.meta.env.BASE_URL

const SCALE = 3 // 1 unit = 3px
const zoom = ref(1.0)
const panX = ref(0)
const panY = ref(0)
const effectiveScale = computed(() => SCALE * zoom.value)

// Tooltip state
const hoveredItem = ref<RoomItem | null>(null)
const mouseX = ref(0)
const mouseY = ref(0)

// Panning state
const isPanning = ref(false)
const lastPanMouseX = ref(0)
const lastPanMouseY = ref(0)

function handleBackgroundMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  isPanning.value = true
  lastPanMouseX.value = e.clientX
  lastPanMouseY.value = e.clientY
}

function handleGlobalMouseMove(e: MouseEvent) {
  mouseX.value = e.clientX
  mouseY.value = e.clientY

  if (isPanning.value) {
    panX.value += e.clientX - lastPanMouseX.value
    panY.value += e.clientY - lastPanMouseY.value
    lastPanMouseX.value = e.clientX
    lastPanMouseY.value = e.clientY
  }
}

function handleGlobalMouseUp() {
  isPanning.value = false
}

function handleWheel(e: WheelEvent) {
  e.preventDefault()
  const zoomSpeed = 0.1
  const direction = e.deltaY < 0 ? 1 : -1
  const newZoom = zoom.value + direction * zoomSpeed
  zoom.value = Math.max(0.5, Math.min(newZoom, 3.0)) // Constrain zoom between 0.5x and 3x
}

onMounted(() => {
  window.addEventListener('mousemove', handleGlobalMouseMove)
  window.addEventListener('mouseup', handleGlobalMouseUp)

  // Center the room initially
  panX.value = (window.innerWidth - maxWidth.value * SCALE * zoom.value) / 2
  panY.value = (window.innerHeight - ROOM_HEIGHT * SCALE * zoom.value) / 2
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleGlobalMouseMove)
  window.removeEventListener('mouseup', handleGlobalMouseUp)
})

interface RoomItem extends RoomRect {
  name: string
  kind: string
  isServer: boolean
  ref: ServerNode | Part | null
  baseImage?: string
}

const maxWidth = computed(() =>
  gameStore.showTransferPanel ? TRANSFER_ZONE_START_X + TRANSFER_ZONE_WIDTH : ROOM_WIDTH,
)

const roomItems = computed<RoomItem[]>(() => {
  const items: RoomItem[] = []

  if (gameStore.showTransferPanel) {
    items.push({
      id: 'divider_wall',
      name: 'Wall',
      kind: 'WALL',
      isServer: false,
      ref: null,
      x: ROOM_WIDTH,
      y: 0,
      width: TRANSFER_ZONE_START_X - ROOM_WIDTH,
      height: ROOM_HEIGHT,
    })
  }

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
        ref: s as ServerNode,
        baseImage: casePart.baseImage,
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
      ref: p as Part,
      baseImage: p.baseImage,
    })
  }

  return items
})

const { draggedItemId, dragX, dragY, isDragValid, handleMouseDown } = useDraggable(roomItems, {
  scale: effectiveScale,
  maxWidth,
  onMoveItem: (id, x, y) => gameStore.moveItem(id, x, y),
  onSelect: (id) => {
    gameStore.selectedItemId = id
  },
  checkOverlapDrop: (id, x, y) => gameStore.canSlotItem(id, x, y),
})

const totalSellValue = computed(() => {
  let total = 0
  for (const s of gameStore.servers) {
    if (s.x !== undefined && s.x >= TRANSFER_ZONE_START_X) {
      for (const p of s.installedParts) total += p.value.value
    }
  }
  for (const p of gameStore.inventory) {
    if (p.x !== undefined && p.x >= TRANSFER_ZONE_START_X) {
      total += p.value.value
    }
  }
  return total * 0.25
})
</script>

<template>
  <div class="server-room-wrapper">
    <div
      v-if="gameStore.showTransferPanel"
      class="transfer-controls"
      style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 1000;"
    >
      <span class="transfer-title">Transfer Panel</span>
      <button @click="gameStore.sellTransferPanel()" class="sell-btn">
        Sell Items ({{ totalSellValue.toFixed(4) }} $ETC) & Close
      </button>
    </div>

    <div
      class="room-container"
      @mousedown="handleBackgroundMouseDown"
      @wheel="handleWheel"
    >
      <div
        id="server-room-canvas"
        class="room-canvas"
        :style="{
          width: maxWidth * SCALE + 'px',
          height: ROOM_HEIGHT * SCALE + 'px',
          '--scale-px': SCALE + 'px',
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: '0 0'
        }"
      >
        <div
          v-if="gameStore.showTransferPanel"
          class="transfer-zone-bg"
          :style="{
            left: TRANSFER_ZONE_START_X * SCALE + 'px',
            width: TRANSFER_ZONE_WIDTH * SCALE + 'px',
          }"
        ></div>

        <div
          v-for="item in roomItems"
          :key="item.id"
          class="room-item"
          :class="{
            'is-selected': gameStore.selectedItemId === item.id && item.kind !== 'WALL',
            'is-dragging': draggedItemId === item.id,
            'is-invalid': draggedItemId === item.id && !isDragValid,
            'is-wall': item.kind === 'WALL',
          }"
          :style="{
            width: item.width * SCALE + 'px',
            height: item.height * SCALE + 'px',
            transform: `translate(${(draggedItemId === item.id ? dragX : item.x) * SCALE}px, ${(draggedItemId === item.id ? dragY : item.y) * SCALE}px)`,
          }"
          @mousedown.stop="item.kind !== 'WALL' ? handleMouseDown($event, item.id) : null"
          @mouseenter="item.kind !== 'WALL' ? (hoveredItem = item) : null"
          @mouseleave="hoveredItem === item ? (hoveredItem = null) : null"
        >
          <img v-if="item.baseImage" :src="`${baseUrl}${item.baseImage}`" class="item-image" draggable="false" />
        </div>
      </div>
    </div>

    <!-- Hover Tooltip -->
    <div
      v-if="hoveredItem && !isPanning && !draggedItemId"
      class="hover-tooltip"
      :style="{ left: mouseX + 15 + 'px', top: mouseY + 15 + 'px' }"
    >
      <div class="tooltip-name">{{ hoveredItem.name }}</div>
      <div class="tooltip-kind">{{ hoveredItem.kind }}</div>
    </div>
  </div>
</template>

<style scoped>
.server-room-wrapper {
  width: 100vw;
  height: 100vh;
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  background-color: #222;
}
.room-container {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  cursor: grab;
}
.room-container:active {
  cursor: grabbing;
}
.room-canvas {
  position: absolute;
  top: 0;
  left: 0;
  background-color: #333;
  will-change: transform;
}
.hover-tooltip {
  position: fixed;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #555;
  pointer-events: none;
  font-family: monospace;
  box-shadow: 2px 2px 8px rgba(0,0,0,0.5);
  white-space: nowrap;
}
.tooltip-name {
  font-weight: bold;
  font-size: 1.1em;
}
.tooltip-kind {
  color: #aaa;
  font-size: 0.9em;
  margin-top: 2px;
}
.transfer-controls {
  display: flex;
  align-items: center;
  gap: 15px;
  background: rgba(255, 243, 205, 0.9);
  padding: 5px 15px;
  border-radius: 4px;
  border: 1px solid #ffeeba;
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
}
.transfer-title {
  font-weight: bold;
  color: #856404;
}
.sell-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
.sell-btn:hover {
  background: #218838;
}
.transfer-zone-bg {
  position: absolute;
  top: 0;
  height: 100%;
  background: repeating-linear-gradient(45deg, #e9ecef, #e9ecef 10px, #dee2e6 10px, #dee2e6 20px);
  border-left: 2px dashed #999;
  z-index: 0;
}
.room-item {
  position: absolute;
  top: 0;
  left: 0;
  background: #fff;
  border: none;
  border-radius: 0;
  box-shadow: none;
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 6px;
  padding: 0;
  box-sizing: border-box;
  z-index: 10;
}
.room-item::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  box-shadow: inset 0 0 0 var(--scale-px) rgba(12, 13, 23, 0.1);
  pointer-events: none;
}
.room-item.is-wall {
  background: #444;
  border: none;
  cursor: not-allowed;
  z-index: 5;
}
.room-item.is-selected {
  background: #e3f2fd;
  outline: 2px solid #1976d2;
  outline-offset: -2px;
}
.room-item.is-invalid {
  background: #ffcccc !important;
  outline: 2px solid #d32f2f !important;
  outline-offset: -2px;
}
.room-item.is-dragging {
  cursor: grabbing;
  z-index: 100;
  opacity: 0.9;
}
.item-image {
  width: 100%;
  height: 100%;
  object-fit: fill;
  image-rendering: pixelated;
  pointer-events: none;
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
