<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue';
import { useGameStore } from './stores/game';
import BountyBoard from './components/BountyBoard.vue';
import RackAssembly from './components/RackAssembly.vue';
import LiveTelemetry from './components/LiveTelemetry.vue';
import JobComplete from './components/JobComplete.vue';

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
  <div style="font-family: sans-serif; padding: 20px;">
    <div style="display: flex; justify-content: space-between; align-items: baseline;">
      <h1>Scavenged Server Sim</h1>
      <h2 style="color: blue;">{{ formattedClock }}</h2>
    </div>
    
    <div style="margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px;">
      <strong>Debug Nav:</strong>
      <button @click="gameStore.currentScreen = 'BOUNTY_BOARD'">Bounty Board</button>
      <button @click="gameStore.currentScreen = 'RACK_ASSEMBLY'">Rack Assembly</button>
      <span style="margin-left: 20px; font-weight: bold; color: green;">Cash: ${{ gameStore.cash }}</span>
    </div>

    <!-- Active Screen -->
    <BountyBoard v-if="gameStore.currentScreen === 'BOUNTY_BOARD'" />
    <RackAssembly v-else-if="gameStore.currentScreen === 'RACK_ASSEMBLY'" />
    <LiveTelemetry v-else-if="gameStore.currentScreen === 'LIVE_TELEMETRY'" />
    <JobComplete v-else-if="gameStore.currentScreen === 'JOB_COMPLETE'" />
  </div>
</template>
