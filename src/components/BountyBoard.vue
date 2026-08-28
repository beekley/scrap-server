<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { formatOps, formatGB, formatMB } from '../utils/formatting'

const gameStore = useGameStore()
</script>

<template>
  <div style="border-top: 2px solid #ccc; padding-top: 20px; margin-top: 20px">
    <h2>Bounty Board</h2>
    <div v-if="gameStore.availableJobs.length === 0">
      <p>No jobs available.</p>
    </div>
    <div v-else style="display: flex; gap: 15px; overflow-x: auto; padding-bottom: 10px">
      <div
        v-for="job in gameStore.availableJobs"
        :key="job.id"
        class="job-card"
        style="
          border: 2px solid;
          min-width: 300px;
          padding: 15px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        "
        :style="{
          borderColor: gameStore.selectedJobId === job.id ? 'blue' : '#ccc',
          backgroundColor: gameStore.selectedJobId === job.id ? '#f0f8ff' : 'white',
        }"
        @click="gameStore.selectJob(job.id)"
      >
        <div style="display: flex; justify-content: space-between; align-items: start">
          <h3 style="margin-top: 0; color: #333">{{ job.title }}</h3>
          <span
            :style="{
              fontWeight: 'bold',
              fontSize: '0.8em',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: '#eee',
              color:
                job.rarity === 'MYTHIC'
                  ? 'purple'
                  : job.rarity === 'RARE'
                    ? 'blue'
                    : job.rarity === 'UNCOMMON'
                      ? 'green'
                      : 'gray',
            }"
          >
            {{ job.rarity }}
          </span>
        </div>
        <p style="font-style: italic; color: #666; margin-bottom: 15px">{{ job.description }}</p>
        <div style="font-size: 0.9em">
          <p style="margin: 4px 0">
            <strong>Operations:</strong> {{ formatOps(job.operationsRequired.value) }} op
          </p>
          <p style="margin: 4px 0">
            <strong>Working Set:</strong> {{ formatGB(job.workingSetSize.value) }} GB
          </p>
          <p style="margin: 4px 0">
            <strong>Total Size:</strong> {{ formatGB(job.totalSize.value) }} GB
          </p>
          <p style="margin: 4px 0">
            <strong>IO Ratio:</strong> {{ formatMB(job.ioRatio.value) }} MB/op
          </p>
        </div>
        <div style="margin-top: 15px; padding-top: 10px; border-top: 1px dashed #ccc">
          <p style="margin: 4px 0; color: green; font-weight: bold">Reward:</p>
          <p style="margin: 4px 0">{{ job.rewardDescription }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
