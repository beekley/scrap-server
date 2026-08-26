<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue';
import { useGameStore } from './stores/game';
import BountyBoard from './components/BountyBoard.vue';
import RackAssembly from './components/RackAssembly.vue';

const gameStore = useGameStore();
let ticker: ReturnType<typeof setInterval>;

const formattedClock = computed(() => {
  const totalMinutes = Math.floor(gameStore.gameTimeSeconds / 60);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const mins = totalMinutes % 60;
  return `Day ${days + 1}, ${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
});

onMounted(() => {
  // Game loop ticks every 100ms real-life time = 6 game-seconds * speed multiplier
  ticker = setInterval(() => {
    if (gameStore.gameSpeed > 0) {
      gameStore.tick(6 * gameStore.gameSpeed);
    }
  }, 100);
});

onUnmounted(() => {
  clearInterval(ticker);
});
</script>

<template>
  <div class="app-container">
    <div class="header">
      <h1 class="title">Scavenged Server Sim</h1>
      <div class="status-bar">
        <h2 class="cash">Cash: ${{ gameStore.cash }}</h2>
        
        <div class="speed-controls">
          <button :class="{ active: gameStore.gameSpeed === 0 }" @click="gameStore.setGameSpeed(0)">⏸️</button>
          <button :class="{ active: gameStore.gameSpeed === 1 }" @click="gameStore.setGameSpeed(1)">1x</button>
          <button :class="{ active: gameStore.gameSpeed === 4 }" @click="gameStore.setGameSpeed(4)">4x</button>
          <button :class="{ active: gameStore.gameSpeed === 16 }" @click="gameStore.setGameSpeed(16)">16x</button>
        </div>
        
        <h2 class="clock">{{ formattedClock }}</h2>
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <div class="rack-column">
        <RackAssembly />
      </div>
    </div>

    <!-- Bottom Row: Bounty Board -->
    <BountyBoard />
  </div>
</template>

<style scoped>
.app-container {
  font-family: sans-serif;
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 2px solid #ccc;
  margin-bottom: 20px;
  padding-bottom: 10px;
}
.title {
  margin: 0;
}
.status-bar {
  display: flex;
  gap: 20px;
  align-items: center;
}
.cash {
  margin: 0;
  color: green;
}
.speed-controls {
  display: flex;
  gap: 5px;
  align-items: center;
  margin-left: 20px;
  background: #eee;
  padding: 4px 8px;
  border-radius: 6px;
}
.speed-controls button {
  cursor: pointer;
}
.speed-controls button.active {
  font-weight: bold;
}
.clock {
  margin: 0;
  color: blue;
  min-width: 150px;
  text-align: right;
}
.main-content {
  display: flex;
  gap: 20px;
}
.rack-column {
  flex: 1;
}
</style>
