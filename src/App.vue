<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue';
import { useGameStore } from './stores/game';
import BountyBoard from './components/BountyBoard.vue';
import RackAssembly from './components/RackAssembly.vue';
import TelemetryCard from './components/TelemetryCard.vue';

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
  <div style="font-family: sans-serif; padding: 20px; max-width: 1400px; margin: 0 auto;">
    <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #ccc; margin-bottom: 20px; padding-bottom: 10px;">
      <h1 style="margin: 0;">Scavenged Server Sim</h1>
      <div style="display: flex; gap: 20px; align-items: center;">
        <h2 style="margin: 0; color: green;">Cash: ${{ gameStore.cash }}</h2>
        
        <div style="display: flex; gap: 5px; align-items: center; margin-left: 20px; background: #eee; padding: 4px 8px; border-radius: 6px;">
          <button :style="{ fontWeight: gameStore.gameSpeed === 0 ? 'bold' : 'normal' }" @click="gameStore.setGameSpeed(0)">⏸️</button>
          <button :style="{ fontWeight: gameStore.gameSpeed === 1 ? 'bold' : 'normal' }" @click="gameStore.setGameSpeed(1)">1x</button>
          <button :style="{ fontWeight: gameStore.gameSpeed === 4 ? 'bold' : 'normal' }" @click="gameStore.setGameSpeed(4)">4x</button>
          <button :style="{ fontWeight: gameStore.gameSpeed === 16 ? 'bold' : 'normal' }" @click="gameStore.setGameSpeed(16)">16x</button>
        </div>
        
        <h2 style="margin: 0; color: blue; min-width: 150px; text-align: right;">{{ formattedClock }}</h2>
      </div>
    </div>

    <!-- Main Content -->
    <div style="display: flex; gap: 20px;">
      <!-- Left Column: Rack Assembly -->
      <div style="flex: 2;">
        <RackAssembly />
      </div>

      <!-- Right Column: Telemetry -->
      <div style="flex: 1; min-width: 300px;">
        <TelemetryCard />
      </div>
    </div>

    <!-- Bottom Row: Bounty Board -->
    <BountyBoard />
  </div>
</template>
