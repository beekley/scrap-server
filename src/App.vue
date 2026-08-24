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
  // Game loop ticks every 1 real-second = 1 game-minute (60 game-seconds)
  ticker = setInterval(() => {
    gameStore.tick(60);
  }, 1000);
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
        <h2 style="margin: 0; color: blue;">{{ formattedClock }}</h2>
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
