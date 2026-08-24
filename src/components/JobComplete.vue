<script setup lang="ts">
import { useGameStore } from '../stores/game';

const gameStore = useGameStore();
</script>

<template>
  <div v-if="gameStore.activeJob">
    <h2>Job Complete!</h2>
    <p>You successfully completed: {{ gameStore.activeJob.title }}</p>
    
    <div style="border: 1px solid green; padding: 10px; margin: 20px 0;">
      <h3>Rewards Earned</h3>
      <p><strong>Cash:</strong> ${{ gameStore.activeJob.rewardCash }}</p>
      <p><strong>Parts:</strong></p>
      <ul>
        <li v-for="partId in gameStore.activeJob.rewardPartIds" :key="partId">
          {{ partId }}
        </li>
      </ul>
      <p v-if="gameStore.activeJob.rewardPartIds.length === 0">No parts dropped.</p>
    </div>

    <button @click="gameStore.claimReward()">Return to Rack</button>
  </div>
</template>
