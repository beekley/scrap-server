<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useGameStore } from './stores/game'
import RackAssembly from './components/RackAssembly.vue'
import TopPanel from './components/TopPanel.vue'

const gameStore = useGameStore()
let ticker: ReturnType<typeof setInterval>

onMounted(() => {
  // Game loop ticks every 100ms real-life time = 6 game-seconds * speed multiplier
  ticker = setInterval(() => {
    if (gameStore.gameSpeed > 0) {
      gameStore.tick(6 * gameStore.gameSpeed)
    }
  }, 100)
})

onUnmounted(() => {
  clearInterval(ticker)
})
</script>

<template>
  <div class="app-container">
    <div
      v-if="gameStore.outOfPower"
      style="
        position: absolute;
        top: 60px;
        left: 50%;
        transform: translateX(-50%);
        background: red;
        color: white;
        padding: 10px;
        text-align: center;
        font-weight: bold;
        border-radius: 4px;
        z-index: 1001;
      "
    >
      ⚠️ INSUFFICIENT FUNDS FOR POWER - SERVERS HALTED ⚠️
    </div>

    <TopPanel />

    <!-- Main Content (Full Screen) -->
    <div class="main-content">
      <RackAssembly />
    </div>
  </div>
</template>

<style scoped>
.app-container {
  font-family: sans-serif;
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
  position: relative;
  background: #1a1a2e; /* Darker background for game feel */
}
.main-content {
  width: 100%;
  height: 100%;
}
</style>
