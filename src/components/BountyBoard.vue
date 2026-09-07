<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { formatOps, formatGB, formatMB } from '../utils/formatting'
import { useWindowDrag } from '../composables/useWindowDrag'

const gameStore = useGameStore()
const { x, y, handleMouseDown } = useWindowDrag(10, 10) // default left side

const newJobs = computed(() => {
  return gameStore.availableJobs.filter(
    (j) => !gameStore.activeJobs.some((aj) => aj.id === j.id)
  )
})
</script>

<template>
  <div class="window window-drag-container bounty-panel" :style="{ left: x + 'px', top: y + 'px' }">
    <div class="title-bar" @mousedown="handleMouseDown" style="cursor: move;">
      <div class="title-bar-text">Bounty Board</div>
    </div>
    
    <div class="window-body panel-content">
      <div v-if="gameStore.availableJobs.length === 0 && gameStore.activeJobs.length === 0 && gameStore.completedJobs.length === 0 && gameStore.pastJobs.length === 0" class="sunken-panel" style="padding: 15px; text-align: center;">
        <p>No jobs available.</p>
      </div>
      <div v-else class="jobs-list">
        
        <!-- New Jobs -->
        <h4 v-if="newJobs.length > 0" class="section-title">New Jobs</h4>
        <div
          v-for="job in newJobs"
          :key="job.id"
          class="job-card"
          :class="{ 'is-selected': gameStore.selectedJobId === job.id }"
          @click="gameStore.selectJob(job.id)"
        >
          <div style="display: flex; justify-content: space-between; align-items: start; gap: 8px;">
            <span style="margin: 0; word-break: break-word;"><strong>{{ job.title }}</strong></span>
            <span style="flex-shrink: 0;" :style="{ color: job.rarity === 'MYTHIC' ? 'var(--accent-4)' : job.rarity === 'RARE' ? '#64b5f6' : job.rarity === 'UNCOMMON' ? '#81c784' : 'inherit' }">
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
          <div class="job-reward" style="margin-top: 8px; border-top: 1px solid var(--surf-highlight); padding-top: 4px; word-break: break-word;">
            <p style="margin: 0;"><strong>Reward:</strong></p>
            <p style="margin: 0;">{{ job.rewardDescription }}</p>
          </div>
        </div>

        <!-- Running Jobs -->
        <h4 v-if="gameStore.activeJobs.length > 0" class="section-title">Running Jobs</h4>
        <div
          v-for="job in gameStore.activeJobs"
          :key="job.id"
          class="job-card compact"
          :class="{ 'is-selected': gameStore.selectedJobId === job.id }"
          @click="gameStore.selectJob(job.id)"
        >
          <div style="display: flex; justify-content: space-between; align-items: start; gap: 8px;">
            <span style="margin: 0; word-break: break-word;"><strong>{{ job.title }}</strong></span>
            <span style="flex-shrink: 0;" :style="{ color: job.rarity === 'MYTHIC' ? 'var(--accent-4)' : job.rarity === 'RARE' ? '#64b5f6' : job.rarity === 'UNCOMMON' ? '#81c784' : 'inherit' }">
              [{{ job.rarity }}]
            </span>
          </div>
          <p style="font-style: italic; margin: 4px 0 4px 0; word-break: break-word;">
            {{ job.description }}
          </p>
          <div class="job-reward compact-reward" style="word-break: break-word;">
            <p style="margin: 0;"><strong>Reward:</strong> {{ job.rewardDescription }}</p>
          </div>
        </div>

        <!-- Completed Jobs -->
        <h4 v-if="gameStore.completedJobs.length > 0" class="section-title">Completed Jobs</h4>
        <div
          v-for="job in gameStore.completedJobs"
          :key="job.id"
          class="job-card compact"
          :class="{ 'is-selected': gameStore.selectedJobId === job.id }"
          @click="gameStore.selectJob(job.id)"
        >
          <div style="display: flex; justify-content: space-between; align-items: start; gap: 8px;">
            <span style="margin: 0; word-break: break-word;"><strong>{{ job.title }}</strong></span>
            <span style="flex-shrink: 0;" :style="{ color: job.rarity === 'MYTHIC' ? 'var(--accent-4)' : job.rarity === 'RARE' ? '#64b5f6' : job.rarity === 'UNCOMMON' ? '#81c784' : 'inherit' }">
              [{{ job.rarity }}]
            </span>
          </div>
          <p style="font-style: italic; margin: 4px 0 4px 0; word-break: break-word;">
            {{ job.description }}
          </p>
          <div class="job-reward compact-reward" style="word-break: break-word;">
            <p style="margin: 0;"><strong>Reward:</strong> {{ job.rewardDescription }}</p>
          </div>
        </div>

        <!-- Past Jobs -->
        <h4 v-if="gameStore.pastJobs.length > 0" class="section-title">Past Jobs</h4>
        <div
          v-for="job in gameStore.pastJobs"
          :key="job.id"
          class="job-card compact"
          :class="{ 'is-selected': gameStore.selectedJobId === job.id }"
          @click="gameStore.selectJob(job.id)"
        >
          <div style="display: flex; justify-content: space-between; align-items: start; gap: 8px;">
            <span style="margin: 0; word-break: break-word;"><strong>{{ job.title }}</strong></span>
            <span style="flex-shrink: 0;" :style="{ color: job.rarity === 'MYTHIC' ? 'var(--accent-4)' : job.rarity === 'RARE' ? '#64b5f6' : job.rarity === 'UNCOMMON' ? '#81c784' : 'inherit' }">
              [{{ job.rarity }}]
            </span>
          </div>
          <p style="font-style: italic; margin: 4px 0 4px 0; word-break: break-word;">
            {{ job.description }}
          </p>
          <div class="job-reward compact-reward" style="word-break: break-word;">
            <p style="margin: 0;"><strong>Reward:</strong> {{ job.rewardDescription }}</p>
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
.job-card {
  box-shadow: inset -1px -1px var(--surf-dark), inset 1px 1px var(--surf-highlight), inset -2px -2px var(--surf-shadow), inset 2px 2px var(--surf-light);
  background: var(--surf-base);
  padding: 8px;
  cursor: pointer;
  color: var(--text-main);
}
.job-card:active {
  box-shadow: inset -1px -1px var(--surf-highlight), inset 1px 1px var(--surf-dark), inset -2px -2px var(--surf-light), inset 2px 2px var(--surf-shadow);
}
.job-card.is-selected {
  background: var(--accent-1);
  color: var(--text-inverted);
  box-shadow: inset -1px -1px var(--surf-highlight), inset 1px 1px var(--surf-dark), inset -2px -2px var(--surf-light), inset 2px 2px var(--surf-shadow);
}
.job-stats {
}
.job-stats p {
  margin: 2px 0;
}
.section-title {
  margin: 4px 0 0 0;
  padding-bottom: 2px;
  border-bottom: 1px solid var(--surf-highlight);
  font-size: 1.1em;
}
.compact-reward {
  font-size: 0.9em;
}
</style>
