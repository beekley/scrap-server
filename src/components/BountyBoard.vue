<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { formatOps, formatGB, formatMB } from '../utils/formatting'
import { useWindowDrag } from '../composables/useWindowDrag'

const gameStore = useGameStore()
const { x, y, handleMouseDown } = useWindowDrag(10, 10) // default left side
</script>

<template>
  <div class="window window-drag-container bounty-panel" :style="{ left: x + 'px', top: y + 'px' }">
    <div class="title-bar" @mousedown="handleMouseDown" style="cursor: move;">
      <div class="title-bar-text">Bounty Board</div>
    </div>
    
    <div class="window-body panel-content">
      <div v-if="gameStore.availableJobs.length === 0" class="sunken-panel" style="padding: 15px; text-align: center;">
        <p>No jobs available.</p>
      </div>
      <div v-else class="jobs-list">
        <div
          v-for="job in gameStore.availableJobs"
          :key="job.id"
          class="job-card"
          :class="{ 'is-selected': gameStore.selectedJobId === job.id }"
          @click="gameStore.selectJob(job.id)"
        >
          <div style="display: flex; justify-content: space-between; align-items: start; gap: 8px;">
            <span style="margin: 0; word-break: break-word;"><strong>{{ job.title }}</strong></span>
            <span style="flex-shrink: 0;" :style="{ color: job.rarity === 'MYTHIC' ? '#800080' : job.rarity === 'RARE' ? '#000080' : job.rarity === 'UNCOMMON' ? '#008000' : 'inherit' }">
              [{{ job.rarity }}]
            </span>
          </div>
          <p style="font-style: italic; margin: 4px 0 8px 0; word-break: break-word;">
            {{ job.description }}
          </p>
          <div class="job-stats">
            <p><strong>Operations:</strong> {{ formatOps(job.operationsRequired.value) }} op</p>
            <p><strong>Working Set:</strong> {{ formatGB(job.workingSetSize.value) }} GB</p>
            <p><strong>Total Size:</strong> {{ formatGB(job.totalSize.value) }} GB</p>
            <p><strong>Mem Access:</strong> {{ formatMB(job.memoryAccessPerOp.value) }} MB/op</p>
            <p style="word-break: break-word;">
              <strong>Data Transferred:</strong><br/>
              {{ formatGB(job.downloadSize.value) }} GB in / {{ formatGB(job.uploadSize.value) }} GB out
            </p>
          </div>
          <div class="job-reward" style="margin-top: 8px; border-top: 1px solid #888; padding-top: 4px; word-break: break-word;">
            <p style="margin: 0;"><strong>Reward:</strong></p>
            <p style="margin: 0;">{{ job.rewardDescription }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bounty-panel {
  position: absolute;
  width: 320px;
  max-width: 95vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  z-index: 500;
  box-shadow: 2px 2px 8px rgba(0,0,0,0.5);
}
.panel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 0;
  padding: 8px;
}
.jobs-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px;
}
/* Scrollbar styling */
.jobs-list::-webkit-scrollbar {
  width: 16px;
}
.jobs-list::-webkit-scrollbar-track {
  background: #dfdfdf;
  border-left: 1px solid #fff;
}
.jobs-list::-webkit-scrollbar-thumb {
  background: #c0c0c0;
  border: 1px outset #fff;
}
.job-card {
  border: 2px outset #fff;
  background: #c0c0c0;
  padding: 8px;
  cursor: pointer;
  color: black;
}
.job-card:active {
  border-style: inset;
}
.job-card.is-selected {
  background: #000080;
  color: white;
  border-style: inset;
}
.job-stats {
}
.job-stats p {
  margin: 2px 0;
}
</style>
