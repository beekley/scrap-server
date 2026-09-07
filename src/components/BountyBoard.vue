<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '../stores/game'
import { formatOps, formatGB, formatMB } from '../utils/formatting'

const gameStore = useGameStore()
const isExpanded = ref(true)

const togglePanel = () => {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <div class="bounty-panel" :class="{ 'is-collapsed': !isExpanded }">
    <div class="panel-content">
      <div class="panel-header">
        <h2 style="margin: 0; color: white;">Bounty Board</h2>
      </div>

      <div v-if="gameStore.availableJobs.length === 0" style="padding: 15px; color: #aaa;">
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
          <div style="display: flex; justify-content: space-between; align-items: start">
            <h3 style="margin-top: 0; color: #fff; font-size: 1.1em;">{{ job.title }}</h3>
            <span class="rarity-badge" :class="job.rarity.toLowerCase()">
              {{ job.rarity }}
            </span>
          </div>
          <p style="font-style: italic; color: #bbb; margin-bottom: 10px; font-size: 0.9em;">
            {{ job.description }}
          </p>
          <div class="job-stats">
            <p><strong>Operations:</strong> {{ formatOps(job.operationsRequired.value) }} op</p>
            <p><strong>Working Set:</strong> {{ formatGB(job.workingSetSize.value) }} GB</p>
            <p><strong>Total Size:</strong> {{ formatGB(job.totalSize.value) }} GB</p>
            <p><strong>Mem Access:</strong> {{ formatMB(job.memoryAccessPerOp.value) }} MB/op</p>
            <p>
              <strong>Data Transferred:</strong>
              {{ formatGB(job.downloadSize.value) }} GB in &rarr;
              {{ formatGB(job.uploadSize.value) }} GB out
            </p>
          </div>
          <div class="job-reward">
            <p style="margin: 0; color: #4ade80; font-weight: bold;">Reward:</p>
            <p style="margin: 4px 0 0 0;">{{ job.rewardDescription }}</p>
          </div>
        </div>
      </div>
    </div>
    
    <button class="toggle-btn" @click="togglePanel">
      {{ isExpanded ? '◀' : '▶' }}
    </button>
  </div>
</template>

<style scoped>
.bounty-panel {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 320px;
  background: rgba(20, 20, 30, 0.9);
  border-right: 2px solid #333;
  display: flex;
  transition: transform 0.3s ease;
  z-index: 500;
  color: #eee;
  box-shadow: 2px 0 8px rgba(0,0,0,0.5);
}
.bounty-panel.is-collapsed {
  transform: translateX(-100%);
}
.panel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.panel-header {
  padding: 15px;
  border-bottom: 1px solid #333;
  background: rgba(0,0,0,0.3);
}
.jobs-list {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}
/* Scrollbar styling */
.jobs-list::-webkit-scrollbar {
  width: 6px;
}
.jobs-list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}
.jobs-list::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 3px;
}
.job-card {
  border: 1px solid #444;
  background: rgba(30, 30, 45, 0.8);
  padding: 15px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.job-card:hover {
  border-color: #666;
  background: rgba(40, 40, 60, 0.9);
}
.job-card.is-selected {
  border-color: #3b82f6;
  background: rgba(20, 40, 80, 0.9);
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.3);
}
.job-stats {
  font-size: 0.85em;
  color: #ccc;
}
.job-stats p {
  margin: 3px 0;
}
.job-reward {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px dashed #555;
  font-size: 0.9em;
}
.rarity-badge {
  font-weight: bold;
  font-size: 0.75em;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: #333;
  color: #ccc;
  text-transform: uppercase;
}
.rarity-badge.mythic { color: #d946ef; background: rgba(217, 70, 239, 0.2); }
.rarity-badge.rare { color: #3b82f6; background: rgba(59, 130, 246, 0.2); }
.rarity-badge.uncommon { color: #22c55e; background: rgba(34, 197, 94, 0.2); }

.toggle-btn {
  position: absolute;
  top: 50%;
  right: -24px;
  width: 24px;
  height: 48px;
  transform: translateY(-50%);
  background: rgba(20, 20, 30, 0.9);
  border: 2px solid #333;
  border-left: none;
  border-radius: 0 6px 6px 0;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 0.8em;
  box-shadow: 2px 0 4px rgba(0,0,0,0.3);
}
.toggle-btn:hover {
  background: rgba(40, 40, 60, 0.9);
}
</style>
