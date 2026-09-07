<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  item: {
    id: string
    name: string
    kind: string
    width: number
    height: number
    x: number
    y: number
    baseImage?: string
  }
  isSelected: boolean
  isDragging: boolean
  isInvalid: boolean
  dragX?: number
  dragY?: number
  scale: number
  baseUrl: string
}>()

const emit = defineEmits<{
  (e: 'mousedown', event: MouseEvent, id: string): void
  (e: 'mouseenter', item: any): void
  (e: 'mouseleave', item: any): void
}>()
</script>

<template>
  <div
    class="room-item"
    :class="{
      'is-selected': isSelected,
      'is-dragging': isDragging,
      'is-invalid': isInvalid,
      'is-wall': item.kind === 'WALL',
    }"
    :style="{
      width: item.width * scale + 'px',
      height: item.height * scale + 'px',
      transform: `translate(${(isDragging ? (dragX ?? 0) : item.x) * scale}px, ${(isDragging ? (dragY ?? 0) : item.y) * scale}px)`,
    }"
    @mousedown.stop="item.kind !== 'WALL' ? emit('mousedown', $event, item.id) : null"
    @mouseenter="item.kind !== 'WALL' ? emit('mouseenter', item) : null"
    @mouseleave="emit('mouseleave', item)"
  >
    <img v-if="item.baseImage" :src="`${baseUrl}${item.baseImage}`" class="item-image" draggable="false" />
  </div>
</template>

<style scoped>
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
</style>
