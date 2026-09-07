<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { useWindowDrag } from '../composables/useWindowDrag'

const gameStore = useGameStore()
const { x, y, handleMouseDown } = useWindowDrag(window.innerWidth / 2 - 225, 10)

const formattedClock = computed(() => {
  const totalMinutes = Math.floor(gameStore.gameTimeSeconds / 60)
  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const mins = totalMinutes % 60
  return `Day ${days + 1}, ${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
})
</script>

<template>
  <div class="window window-drag-container top-panel" :style="{ left: x + 'px', top: y + 'px' }">
    <div class="title-bar" @mousedown="handleMouseDown" style="cursor: move;">
      <div class="title-bar-text">Session Status</div>
    </div>
    <div class="window-body" style="margin: 4px;">
      <div class="status-bar" style="margin: 0; flex-wrap: wrap;">
        <p class="status-bar-field cash">ETC: {{ gameStore.etc.value.toFixed(4) }}</p>
        <p class="status-bar-field power">Power: {{ gameStore.currentPowerDraw.value.toFixed(0) }} W</p>
        
        <div class="speed-controls" style="display: flex; gap: 4px; align-items: center; padding: 0 4px;">
          <button :style="gameStore.gameSpeed === 0 ? 'color: var(--accent-4); box-shadow: inset -1px -1px var(--surf-highlight), inset 1px 1px var(--surf-dark), inset -2px -2px var(--surf-light), inset 2px 2px var(--surf-shadow);' : ''" @click="gameStore.setGameSpeed(0)">⏸️</button>
          <button :style="gameStore.gameSpeed === 1 ? 'color: var(--accent-4); box-shadow: inset -1px -1px var(--surf-highlight), inset 1px 1px var(--surf-dark), inset -2px -2px var(--surf-light), inset 2px 2px var(--surf-shadow);' : ''" @click="gameStore.setGameSpeed(1)">1x</button>
          <button :style="gameStore.gameSpeed === 4 ? 'color: var(--accent-4); box-shadow: inset -1px -1px var(--surf-highlight), inset 1px 1px var(--surf-dark), inset -2px -2px var(--surf-light), inset 2px 2px var(--surf-shadow);' : ''" @click="gameStore.setGameSpeed(4)">4x</button>
          <button :style="gameStore.gameSpeed === 16 ? 'color: var(--accent-4); box-shadow: inset -1px -1px var(--surf-highlight), inset 1px 1px var(--surf-dark), inset -2px -2px var(--surf-light), inset 2px 2px var(--surf-shadow);' : ''" @click="gameStore.setGameSpeed(16)">16x</button>
          <button :style="gameStore.gameSpeed === 64 ? 'color: var(--accent-4); box-shadow: inset -1px -1px var(--surf-highlight), inset 1px 1px var(--surf-dark), inset -2px -2px var(--surf-light), inset 2px 2px var(--surf-shadow);' : ''" @click="gameStore.setGameSpeed(64)">64x</button>
        </div>

        <p class="status-bar-field clock">{{ formattedClock }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.top-panel {
  position: absolute;
  z-index: 1000;
  box-shadow: 2px 2px 8px rgba(0,0,0,0.5);
  pointer-events: auto;
  min-width: 450px;
  max-width: 95vw;
}
.cash {
  color: #81c784;
}
.power {
  color: #ffb74d;
}
.clock {
  color: #64b5f6;
  text-align: right;
  min-width: 100px;
}
</style>
