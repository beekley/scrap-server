<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/game'
import type { Part, ServerNode, Decoration } from '../types'
import { useDraggable } from '../composables/useDraggable'
import { usePanZoom } from '../composables/usePanZoom'
import {
  ROOM_WIDTH,
  ROOM_HEIGHT,
  type RoomRect,
  OUTSIDE_LEFT_WIDTH,
  OUTSIDE_RIGHT_WIDTH,
  STORAGE_UNIT_START_X,
  STORAGE_UNIT_WIDTH,
  STORAGE_UNIT_END_X,
} from '../utils/physics'
import { GRID_CELL_SIZE } from '../thermal'

import { isItemOutside } from '../utils/physics'
import RoomItemView from './RoomItemView.vue'

const gameStore = useGameStore()
const baseUrl = import.meta.env.BASE_URL

const SCALE = 3 // 1 unit = 3px

const maxWidth = ref(ROOM_WIDTH)

const {
  zoom,
  panX,
  panY,
  effectiveScale,
  isPanning,
  handleBackgroundMouseDown,
  handleWheel
} = usePanZoom({
  scale: SCALE,
  onInitPan: (z) => ({
    x: (window.innerWidth - maxWidth.value * SCALE * z) / 2,
    y: (window.innerHeight - ROOM_HEIGHT * SCALE * z) / 2
  })
})

// Tooltip state
const hoveredItem = ref<RoomItem | null>(null)
const mouseX = ref(0)
const mouseY = ref(0)

const mouseMoveHandler = (e: MouseEvent) => {
  mouseX.value = e.clientX
  mouseY.value = e.clientY
}

onMounted(() => {
  window.addEventListener('mousemove', mouseMoveHandler)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', mouseMoveHandler)
})

interface RoomItem extends RoomRect {
  name: string
  kind: string
  isServer: boolean
  ref: ServerNode | Part | null
  baseImage?: string
}

const roomItems = computed<RoomItem[]>(() => {
  const items: RoomItem[] = []

  for (const s of gameStore.servers) {
    const casePart = s.installedParts.find((p) => p.kind === 'CASE')
    if (casePart) {
      const isOutside = isItemOutside(s.x ?? 0, casePart.width)
      if (gameStore.isViewingOutside && !isOutside) continue

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
    const isOutside = isItemOutside(p.x ?? 0, p.width)
    if (gameStore.isViewingOutside && !isOutside) continue

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

  for (const d of gameStore.decorations) {
    const isOutside = isItemOutside(d.x, d.width)
    
    if (gameStore.isViewingOutside) {
      // When viewing outside (door closed), hide items that are inside, UNLESS they are attached to the door
      if (!isOutside && !d.attachedToDoor) continue
    } else {
      // When viewing inside (door open), hide items attached to the door (they roll up with it)
      if (d.attachedToDoor) continue
    }

    items.push({
      id: d.id,
      name: d.name,
      kind: d.type,
      width: d.width,
      height: d.height,
      x: d.x,
      y: d.y,
      isServer: false,
      ref: null,
    })
  }

  return items
})

const { draggedItemId, dragX, dragY, isDragValid, handleMouseDown } = useDraggable(roomItems, {
  scale: effectiveScale,
  maxWidth,
  onMoveItem: (id, x, y) => gameStore.moveItem(id, x, y),
  onSelect: (id) => {
    gameStore.selectItem(id)
  },
  checkOverlapDrop: (id, x, y) => gameStore.canSlotItem(id, x, y),
  isViewingOutside: computed(() => gameStore.isViewingOutside),
})

function onMouseHover(item: any) {
  hoveredItem.value = item
}
function onMouseLeave() {
  hoveredItem.value = null
}

const hoveredCellTemp = ref<number | null>(null)
function onHeatCellHover(temp: number | null) {
  hoveredCellTemp.value = temp
}

function getCellColor(temp: number): string {
  if (temp <= 60) {
    const ratio = Math.max(0, Math.min(1, (temp - 25) / 35))
    const rg = Math.floor(255 * ratio)
    return `rgba(${rg}, ${rg}, 255, 0.4)`
  } else {
    const ratio = Math.min(1, (temp - 60) / 40)
    const gb = Math.floor(255 * (1 - ratio))
    return `rgba(255, ${gb}, ${gb}, 0.4)`
  }
}


const hoveredNote = ref<Decoration | null>(null)
function onNoteHover(note: Decoration) {
  hoveredNote.value = note
}
function onNoteLeave() {
  hoveredNote.value = null
}
</script>

<template>
  <div class="server-room-wrapper">

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
                <!-- Left Outside Zone -->
        <div
          class="outside-zone-bg"
          :style="{
            left: 0 + 'px',
            width: OUTSIDE_LEFT_WIDTH * SCALE + 'px',
          }"
        ></div>
        <!-- Right Outside Zone -->
        <div
          class="outside-zone-bg"
          :style="{
            left: STORAGE_UNIT_END_X * SCALE + 'px',
            width: OUTSIDE_RIGHT_WIDTH * SCALE + 'px',
          }"
        ></div>

        <!-- Garage Door (Closed state) -->
        <div
          v-if="gameStore.isViewingOutside"
          class="garage-door"
          :style="{
            left: STORAGE_UNIT_START_X * SCALE + 'px',
            width: STORAGE_UNIT_WIDTH * SCALE + 'px',
          }"
        ></div>

        <RoomItemView
          v-for="item in roomItems"
          :key="item.id"
          :item="item"
          :isSelected="gameStore.selectedItemId === item.id && item.kind !== 'WALL'"
          :isDragging="draggedItemId === item.id"
          :isInvalid="draggedItemId === item.id && !isDragValid"
          :dragX="dragX"
          :dragY="dragY"
          :scale="SCALE"
          :baseUrl="baseUrl"
          @mousedown="handleMouseDown"
          @mouseenter="onMouseHover"
          @mouseleave="onMouseLeave"
        />

        <div v-if="gameStore.showHeatMap" class="heatmap-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 50;">
          <template v-for="(row, r) in gameStore.roomGrid" :key="'r' + r">
            <template v-for="(temp, c) in row" :key="'c' + c">
              <div
                v-if="c * GRID_CELL_SIZE < ROOM_WIDTH"
                style="position: absolute; pointer-events: auto;"
                :style="{
                  left: (c * GRID_CELL_SIZE * SCALE) + 'px',
                  top: (r * GRID_CELL_SIZE * SCALE) + 'px',
                  width: (GRID_CELL_SIZE * SCALE) + 'px',
                  height: (GRID_CELL_SIZE * SCALE) + 'px',
                  backgroundColor: getCellColor(temp)
                }"
                @mouseenter="onHeatCellHover(temp)"
                @mouseleave="onHeatCellHover(null)"
                @mousemove="onHeatCellHover(temp)"
              ></div>
            </template>
          </template>
        </div>
      </div>
    </div>

    <!-- Hover Tooltip -->
    <div
      v-if="hoveredItem && !isPanning && !draggedItemId && !gameStore.showHeatMap"
      class="hover-tooltip"
      :style="{ left: mouseX + 15 + 'px', top: mouseY + 15 + 'px' }"
    >
      <div style="font-weight: bold; margin-bottom: 2px;">{{ hoveredItem.name }}</div>
      <div style="color: #555;">{{ hoveredItem.kind }}</div>
      <div v-if="hoveredItem.kind === 'NOTE'" style="margin-top: 5px; padding-top: 5px; border-top: 1px solid rgba(0,0,0,0.1); font-size: 11px; white-space: pre-wrap; word-break: break-word; color: #111;">
        {{ gameStore.decorations.find(d => d.id === hoveredItem!.id)?.content }}
      </div>
    </div>


    <div
      v-if="gameStore.showHeatMap && hoveredCellTemp !== null && !isPanning"
      class="hover-tooltip"
      :style="{ left: mouseX + 15 + 'px', top: mouseY + 15 + 'px' }"
    >
      <div>Air Temp</div>
      <div style="color: #ff8c00;">{{ hoveredCellTemp.toFixed(1) }} °C</div>
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
  background-color: var(--bg-desktop);
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
  background-color: var(--bg-sunken);
  will-change: transform;
}
.hover-tooltip {
  position: fixed;
  z-index: 9999;
  background: var(--surf-highlight);
  color: var(--text-inverted);
  border: 1px solid var(--surf-dark);
  padding: 2px 4px;
  pointer-events: none;
  box-shadow: 1px 1px 0px var(--surf-shadow);
  white-space: nowrap;
}

.outside-zone-bg {
  position: absolute;
  top: 0;
  height: 100%;
  background: repeating-linear-gradient(45deg, var(--surf-base), var(--surf-base) 10px, var(--bg-sunken) 10px, var(--bg-sunken) 20px);
  z-index: 0;
  border-right: 2px dashed var(--accent-3);
}
.outside-zone-bg:nth-of-type(2) {
  border-left: 2px dashed var(--accent-3);
  border-right: none;
}
.garage-door {
  position: absolute;
  top: 0;
  height: 100%;
  background: repeating-linear-gradient(to bottom, #444, #444 8px, #333 8px, #333 10px);
  border-left: 4px solid #222;
  border-right: 4px solid #222;
  z-index: 10;
  pointer-events: auto;
}



</style>
