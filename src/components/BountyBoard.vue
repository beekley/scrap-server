<script setup lang="ts">
import { useGameStore } from '../stores/game';

const gameStore = useGameStore();
</script>

<template>
  <div>
    <h2>Bounty Board</h2>
    <div v-if="gameStore.availableJobs.length === 0">
      <p>No jobs available.</p>
    </div>
    <ul v-else>
      <li v-for="job in gameStore.availableJobs" :key="job.id" style="border: 1px solid black; margin-bottom: 10px; padding: 10px;">
        <h3>{{ job.title }}</h3>
        <p>{{ job.description }}</p>
        <p><strong>Operations:</strong> {{ job.operationsRequired.value.toLocaleString() }} op</p>
        <p><strong>Working Set:</strong> {{ job.workingSetSize.value / 1e9 }} GB</p>
        <p><strong>Total Size:</strong> {{ job.totalSize.value / 1e9 }} GB</p>
        <p><strong>IO Ratio:</strong> {{ (job.ioRatio.value / 1e6).toFixed(3) }} MB/op</p>
        <p><strong>Reward Cash:</strong> ${{ job.rewardCash }}</p>
        <p><strong>Reward Parts:</strong> {{ job.rewardPartIds.join(', ') }}</p>
        <button @click="gameStore.selectJob(job.id)">Select Job</button>
      </li>
    </ul>
  </div>
</template>
