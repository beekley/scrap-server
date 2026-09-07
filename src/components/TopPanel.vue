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

const avgRoomTemp = computed(() => {
  let total = 0
  let count = 0
  for (const row of gameStore.roomGrid) {
    for (const temp of row) {
      total += temp
      count++
    }
  }
  return count > 0 ? total / count : 25
})
const timeUntilSell = computed(() => {
  const totalMinutes = Math.floor(gameStore.gameTimeSeconds / 60)
  const currentHour = Math.floor((totalMinutes % (24 * 60)) / 60)
  const currentMin = totalMinutes % 60
  
  let hoursUntil = 6 - currentHour
  let minsUntil = 0 - currentMin
  if (minsUntil < 0) {
    minsUntil += 60
    hoursUntil -= 1
  }
  if (hoursUntil < 0) {
    hoursUntil += 24
  }
  return `${hoursUntil}h ${minsUntil}m`
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
        <p v-if="gameStore.pendingSaleValue > 0" class="status-bar-field pending-sale" style="color: #4dd0e1;">
          +{{ gameStore.pendingSaleValue.toFixed(4) }} ETC in {{ timeUntilSell }}
        </p>
        <p class="status-bar-field power">Power: {{ gameStore.currentPowerDraw.value.toFixed(0) }} W</p>
        
        <button
          @click="gameStore.toggleOutsideView()"
          class="status-bar-field"
          style="cursor: pointer;"
        >
          {{ gameStore.isViewingOutside ? 'Open Storage Unit' : 'Close Storage Unit' }}
        </button>

        <button 
          class="status-bar-field temp" 
          @click="gameStore.showHeatMap = !gameStore.showHeatMap"
          :style="{ 
            color: '#ff8c00', 
            cursor: 'pointer', 
            background: gameStore.showHeatMap ? 'var(--surf-highlight)' : 'inherit',
            border: 'none',
            padding: '2px 4px',
            boxShadow: gameStore.showHeatMap ? 'inset -1px -1px var(--surf-highlight), inset 1px 1px var(--surf-dark), inset -2px -2px var(--surf-light), inset 2px 2px var(--surf-shadow)' : 'inset -1px -1px var(--surf-highlight), inset 1px 1px var(--surf-shadow), inset -2px -2px var(--surf-light), inset 2px 2px var(--surf-dark)'
          }"
          style="margin: 0;"
        >
          Temp: {{ avgRoomTemp.toFixed(1) }} °C
        </button>
        
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
  min-width: 650px;
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
