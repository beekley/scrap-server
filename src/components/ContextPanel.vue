<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { useWindowDrag } from '../composables/useWindowDrag'
import { useSelectionContext } from '../composables/useSelectionContext'

import ServerNodeDetails from './ServerNodeDetails.vue'
import PartDetails from './PartDetails.vue'

const gameStore = useGameStore()
const { x, y, handleMouseDown } = useWindowDrag(window.innerWidth - 360, 10)

const ctx = useSelectionContext()
</script>

<template>
  <div class="window window-drag-container context-panel" :style="{ left: x + 'px', top: y + 'px' }">
    <div class="title-bar" @mousedown="handleMouseDown" style="cursor: move;">
      <div class="title-bar-text">Context Inspector - {{ ctx.selectedServer.value?.name || ctx.selectedPart.value?.name }}</div>
    </div>
    <div class="window-body panel-content">
      <!-- SERVER NODE PANEL -->
      <div v-if="ctx.selectedServer.value" style="display: flex; flex-direction: column; gap: 10px;">
        <ServerNodeDetails
          :selectedServer="ctx.selectedServer.value as import('../types').ServerNode"
          :selectedJob="ctx.selectedJob.value as import('../types').Job | null"
          :activeJob="ctx.activeJob.value as import('../types').Job | null"
          :canRunJob="ctx.canRunJob?.value ?? false"
          :isServerComplete="ctx.isServerComplete.value"
          :isRunningJob="ctx.isRunningJob.value"
          :progressPercent="ctx.progressPercent.value"
          :serverPowerDraw="ctx.serverPowerDraw.value"
          :usedCpu="ctx.usedCpu.value"
          :totalCpu="ctx.totalCpu.value"
          :cpuPercent="ctx.cpuPercent.value"
          :usedRam="ctx.usedRam.value"
          :totalRam="ctx.totalRam.value"
          :ramPercent="ctx.ramPercent.value"
          :usedStorage="ctx.usedStorage.value"
          :totalStorage="ctx.totalStorage.value"
          :storagePercent="ctx.storagePercent.value"
          :serverTelemetry="ctx.serverTelemetry.value"
          :telemetry="ctx.telemetry.value"
        />
      </div>

      <!-- PART INFO PANEL -->
      <div v-if="ctx.displayedPart.value" style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px groove #dfdfdf; padding-bottom: 4px;">
          <button
            v-if="ctx.parentPart.value"
            @click="gameStore.selectedItemId = ctx.parentPart.value.id"
          >
            ↑ Up
          </button>
        </div>
        
        <PartDetails
          :displayedPart="ctx.displayedPart.value as import('../types').Part"
          :parentServer="ctx.parentServer.value as import('../types').ServerNode | null"
          :isRunningJob="ctx.isRunningJob.value"
        />
      </div>

      <div v-if="!ctx.selectedServer.value && !ctx.displayedPart.value" class="sunken-panel" style="padding: 15px;">
        <p>Select a server or part to view details.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.context-panel {
  position: absolute;
  width: 420px;
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
  gap: 15px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px;
}
/* Scrollbar styling */
.panel-content::-webkit-scrollbar {
  width: 16px;
}
.panel-content::-webkit-scrollbar-track {
  background: #dfdfdf;
  border-left: 1px solid #fff;
}
.panel-content::-webkit-scrollbar-thumb {
  background: #c0c0c0;
  border: 1px outset #fff;
}
</style>
