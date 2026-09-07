<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'

const gameStore = useGameStore()

const formattedClock = computed(() => {
  const totalMinutes = Math.floor(gameStore.gameTimeSeconds / 60)
  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const mins = totalMinutes % 60
  return `Day ${days + 1}, ${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
})
</script>

<template>
  <div class="top-panel">
    <div class="hud-content">
      <div class="stat cash">EarthCoin: {{ gameStore.etc.value.toFixed(4) }} $ETC</div>
      <div class="stat power">Power: {{ gameStore.currentPowerDraw.value.toFixed(0) }} W</div>

      <div class="speed-controls">
        <button :class="{ active: gameStore.gameSpeed === 0 }" @click="gameStore.setGameSpeed(0)">
          ⏸️
        </button>
        <button :class="{ active: gameStore.gameSpeed === 1 }" @click="gameStore.setGameSpeed(1)">
          1x
        </button>
        <button :class="{ active: gameStore.gameSpeed === 4 }" @click="gameStore.setGameSpeed(4)">
          4x
        </button>
        <button :class="{ active: gameStore.gameSpeed === 16 }" @click="gameStore.setGameSpeed(16)">
          16x
        </button>
        <button :class="{ active: gameStore.gameSpeed === 64 }" @click="gameStore.setGameSpeed(64)">
          64x
        </button>
      </div>

      <div class="stat clock">{{ formattedClock }}</div>
    </div>
  </div>
</template>

<style scoped>
.top-panel {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  z-index: 1000;
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
  font-family: monospace;
  font-size: 1.1em;
  pointer-events: auto;
}
.hud-content {
  display: flex;
  gap: 20px;
  align-items: center;
}
.stat {
  font-weight: bold;
}
.cash {
  color: #4ade80;
}
.power {
  color: #fb923c;
}
.clock {
  color: #60a5fa;
  min-width: 130px;
  text-align: right;
}
.speed-controls {
  display: flex;
  gap: 5px;
  background: rgba(255, 255, 255, 0.1);
  padding: 4px;
  border-radius: 4px;
}
.speed-controls button {
  background: transparent;
  color: white;
  border: 1px solid transparent;
  cursor: pointer;
  border-radius: 4px;
  padding: 2px 6px;
}
.speed-controls button:hover {
  background: rgba(255,255,255,0.2);
}
.speed-controls button.active {
  background: rgba(255,255,255,0.3);
  border-color: rgba(255,255,255,0.5);
  font-weight: bold;
}
</style>
