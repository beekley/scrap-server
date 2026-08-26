<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '../stores/game';
import type { Part, ServerNode } from '../types';

const gameStore = useGameStore();

const SCALE = 3; // 1 unit = 3px
const ROOM_WIDTH = 100; // 100 units = 300px
const ROOM_HEIGHT = 250; // 250 units = 750px

interface RoomItem {
  id: string;
  name: string;
  kind: string;
  width: number;
  height: number;
  x: number;
  y: number;
  isServer: boolean;
  ref: ServerNode | Part;
}

const roomItems = computed<RoomItem[]>(() => {
  const items: RoomItem[] = [];

  for (const s of gameStore.servers) {
    const casePart = s.installedParts.find(p => p.kind === 'CASE');
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
        ref: s
      });
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
      ref: p
    });
  }

  return items;
});

const draggedItemId = ref<string | null>(null);
const dragOffsetX = ref(0);
const dragOffsetY = ref(0);
const dragX = ref(0);
const dragY = ref(0);

function isSupportingAnotherObject(itemId: string) {
  const item = roomItems.value.find(i => i.id === itemId);
  if (!item) return false;
  
  for (const other of roomItems.value) {
    if (other.id === item.id) continue;
    if (other.y + other.height === item.y) {
      const overlapX = other.x < item.x + item.width && other.x + other.width > item.x;
      if (overlapX) {
        return true;
      }
    }
  }
  return false;
}

function handleMouseDown(e: MouseEvent, itemId: string) {
  if (isSupportingAnotherObject(itemId)) {
    // If it's supporting something else, select it but don't drag it
    gameStore.selectedItemId = itemId;
    return;
  }
  if (e.button !== 0) return;
  draggedItemId.value = itemId;
  gameStore.selectedItemId = itemId;
  
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  dragOffsetX.value = e.clientX - rect.left;
  dragOffsetY.value = e.clientY - rect.top;
  
  const item = roomItems.value.find(i => i.id === itemId);
  if (item) {
    dragX.value = item.x;
    dragY.value = item.y;
  }
  
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
}

function handleMouseMove(e: MouseEvent) {
  if (!draggedItemId.value) return;
  const container = document.getElementById('server-room-container');
  if (!container) return;
  
  const rect = container.getBoundingClientRect();
  const rawX = e.clientX - rect.left - dragOffsetX.value;
  const rawY = e.clientY - rect.top - dragOffsetY.value;
  
  // Convert px to units and snap
  dragX.value = Math.round(rawX / SCALE);
  dragY.value = Math.round(rawY / SCALE);
}

function isEmptySpace(x: number, y: number, width: number, height: number, ignoreId: string) {
  if (x < 0 || x + width > ROOM_WIDTH) return false;
  if (y < 0 || y + height > ROOM_HEIGHT) return false;
  
  for (const other of roomItems.value) {
    if (other.id === ignoreId) continue;
    const overlapX = x < other.x + other.width && x + width > other.x;
    const overlapY = y < other.y + other.height && y + height > other.y;
    if (overlapX && overlapY) return false;
  }
  return true;
}

function isSupported(x: number, y: number, width: number, height: number, ignoreId: string) {
  if (y + height >= ROOM_HEIGHT) return true;
  const centerX = x + width / 2;
  for (const other of roomItems.value) {
    if (other.id === ignoreId) continue;
    if (y + height === other.y && centerX >= other.x && centerX <= other.x + other.width) {
      return true;
    }
  }
  return false;
}

function isValidPlacement(x: number, y: number, width: number, height: number, ignoreId: string) {
  return isEmptySpace(x, y, width, height, ignoreId) && isSupported(x, y, width, height, ignoreId);
}

const isDragValid = computed(() => {
  if (!draggedItemId.value) return true;
  const item = roomItems.value.find(i => i.id === draggedItemId.value);
  if (!item) return true;
  
  let finalX = Math.max(0, Math.min(ROOM_WIDTH - item.width, dragX.value));
  let finalY = Math.max(0, Math.min(ROOM_HEIGHT - item.height, dragY.value));
  
  if (!isEmptySpace(finalX, finalY, item.width, item.height, item.id)) return false;
  
  let fallY = finalY;
  while (fallY <= ROOM_HEIGHT - item.height && isEmptySpace(finalX, fallY, item.width, item.height, item.id)) {
    fallY++;
  }
  fallY--;
  
  if (!isValidPlacement(finalX, fallY, item.width, item.height, item.id)) {
    let foundValid = false;
    for (let y = ROOM_HEIGHT - item.height; y >= 0; y--) {
      if (isValidPlacement(finalX, y, item.width, item.height, item.id)) {
        foundValid = true;
        break;
      }
    }
    if (!foundValid) return false;
  }
  return true;
});

function handleMouseUp(e: MouseEvent) {
  if (!draggedItemId.value) return;
  
  const item = roomItems.value.find(i => i.id === draggedItemId.value);
  if (!item) {
    cleanupDrag();
    return;
  }
  
  let finalX = Math.max(0, Math.min(ROOM_WIDTH - item.width, dragX.value));
  let finalY = Math.max(0, Math.min(ROOM_HEIGHT - item.height, dragY.value));

  let fallY = finalY;
  while (fallY <= ROOM_HEIGHT - item.height && isEmptySpace(finalX, fallY, item.width, item.height, item.id)) {
    fallY++;
  }
  fallY--;

  if (!isValidPlacement(finalX, fallY, item.width, item.height, item.id)) {
    let foundValid = false;
    for (let y = ROOM_HEIGHT - item.height; y >= 0; y--) {
      if (isValidPlacement(finalX, y, item.width, item.height, item.id)) {
        finalY = y;
        foundValid = true;
        break;
      }
    }
    
    if (!foundValid) {
      cleanupDrag();
      return;
    }
  } else {
    finalY = fallY;
  }

  gameStore.moveItem(item.id, finalX, finalY);
  cleanupDrag();
}

function cleanupDrag() {
  draggedItemId.value = null;
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);
}
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
          'is-invalid': draggedItemId === item.id && !isDragValid
        }"
        :style="{
          width: item.width * SCALE + 'px',
          height: item.height * SCALE + 'px',
          transform: `translate(${(draggedItemId === item.id ? dragX : item.x) * SCALE}px, ${(draggedItemId === item.id ? dragY : item.y) * SCALE}px)`
        }"
        @mousedown="handleMouseDown($event, item.id)"
      >
      </div>
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
