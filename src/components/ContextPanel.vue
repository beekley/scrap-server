<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/game'
import {
  getJobProgress,
  canServerRunJob,
  calculateComputeDetails,
  calculateTotalStorage,
  calculateServerPowerDraw,
} from '../simulation'
import { type Job, type ServerNode } from '../types'
import { formatGB, formatMB, formatOps } from '../utils/formatting'

import PartSlots from './PartSlots.vue'
import SimpleChart from './SimpleChart.vue'
import { useWindowDrag } from '../composables/useWindowDrag'

const gameStore = useGameStore()
const { x, y, handleMouseDown } = useWindowDrag(window.innerWidth - 360, 10)

const serverTelemetry = computed(() => {
  if (!selectedServer.value) return null
  return gameStore.telemetryHistory[selectedServer.value.id] || null
})

const selectedServer = computed(() => {
  return gameStore.servers.find((s) => s.id === gameStore.selectedItemId) || null
})

const selectedPart = computed(() => {
  const invPart = gameStore.inventory.find((p) => p.id === gameStore.selectedItemId)
  if (invPart) return invPart

  for (const s of gameStore.servers) {
    const installedPart = s.installedParts.find((p) => p.id === gameStore.selectedItemId)
    if (installedPart) return installedPart
  }
  return null
})

const displayedPart = computed(() => {
  if (selectedServer.value) {
    return selectedServer.value.installedParts.find((p) => p.kind === 'CASE') || null
  }
  return selectedPart.value
})

const parentServer = computed(() => {
  if (selectedServer.value) return selectedServer.value
  if (selectedPart.value) {
    return (
      gameStore.servers.find((s) =>
        s.installedParts.some((p) => p.id === selectedPart.value!.id),
      ) || null
    )
  }
  return null
})

const parentPart = computed(() => {
  if (!displayedPart.value) return null
  const pServer = parentServer.value
  if (!pServer) return null

  for (const part of pServer.installedParts) {
    if (part.slots) {
      for (const slot of part.slots) {
        if (slot.installedPartId === displayedPart.value!.id) {
          return part
        }
      }
    }
  }
  return null
})

const activeJobs = computed(() => gameStore.activeJobs)
const activeJob = computed(() => {
  if (!parentServer.value) return null
  return activeJobs.value.find((j) => j.serverNodeIds?.includes(parentServer.value!.id)) || null
})
const selectedJob = computed(() =>
  gameStore.availableJobs.find((j) => j.id === gameStore.selectedJobId),
)

const isRunningJob = computed(() => !!activeJob.value)

// Telemetry logic (only relevant when viewing Server Node)
const telemetry = computed(() => {
  if (!selectedServer.value) return null
  const jobContext = isRunningJob.value ? activeJob.value : selectedJob.value
  if (!jobContext) return null
  try {
    return calculateComputeDetails(selectedServer.value as ServerNode, jobContext as Job)
  } catch {
    return null
  }
})

const totalStorage = computed(() => {
  if (!selectedServer.value) return 0
  return calculateTotalStorage(selectedServer.value as ServerNode).value
})

const totalRam = computed(() => {
  if (!selectedServer.value) return 0
  return selectedServer.value.installedParts.reduce(
    (acc, p) => (p.kind === 'RAM' ? acc + p.memoryCapacity.value : acc),
    0,
  )
})

const usedStorage = computed(() => {
  if (isRunningJob.value && activeJob.value) return activeJob.value.totalSize.value
  return 0
})

const usedRam = computed(() => {
  if (
    isRunningJob.value &&
    activeJob.value &&
    telemetry.value &&
    telemetry.value.workingSetAllocation
  ) {
    let ramAllocated = 0
    for (const alloc of telemetry.value.workingSetAllocation) {
      if (alloc.part.kind === 'RAM') {
        ramAllocated += alloc.allocatedStorage.value
      }
    }
    return ramAllocated
  }
  return 0
})

const usedCpu = computed(() => {
  if (isRunningJob.value && telemetry.value) {
    return telemetry.value.effectiveComputeRate.value
  }
  return 0
})

const totalCpu = computed(() => {
  if (telemetry.value) {
    return telemetry.value.totalCpuCompute.value
  }
  return 0
})

const progressPercent = computed(() => {
  if (!isRunningJob.value || !activeJob.value) return 0
  return (getJobProgress(activeJob.value as Job) * 100).toFixed(1)
})

const serverPowerDraw = computed(() => {
  if (!selectedServer.value) return 0
  return calculateServerPowerDraw(selectedServer.value as ServerNode, isRunningJob.value)
})

const cpuPercent = computed(() =>
  totalCpu.value > 0 ? ((usedCpu.value / totalCpu.value) * 100).toFixed(1) : '0.0',
)
const ramPercent = computed(() =>
  totalRam.value > 0 ? ((usedRam.value / totalRam.value) * 100).toFixed(1) : '0.0',
)
const storagePercent = computed(() =>
  totalStorage.value > 0 ? ((usedStorage.value / totalStorage.value) * 100).toFixed(1) : '0.0',
)

import { isServerValid } from '../types'

const canRunJob = computed(() => {
  if (!selectedServer.value || !selectedJob.value) return false
  return canServerRunJob(selectedServer.value as ServerNode, selectedJob.value as Job)
})

const isServerComplete = computed(() => {
  if (!selectedServer.value) return false
  return isServerValid(selectedServer.value as ServerNode)
})

// Typed getters to avoid template 'any' and narrowing issues
const asCpu = computed(() => (displayedPart.value?.kind === 'CPU' ? displayedPart.value : null))
const asRam = computed(() => (displayedPart.value?.kind === 'RAM' ? displayedPart.value : null))
const asStorage = computed(() =>
  displayedPart.value?.kind === 'STORAGE' || displayedPart.value?.kind === 'STORAGE_DEVICE'
    ? displayedPart.value
    : null,
)
const asPsu = computed(() => (displayedPart.value?.kind === 'PSU' ? displayedPart.value : null))

const chartScale = ref(3600) // Default 1h (3600s)
</script>

<template>
  <div class="window window-drag-container context-panel" :style="{ left: x + 'px', top: y + 'px' }">
    <div class="title-bar" @mousedown="handleMouseDown" style="cursor: move;">
      <div class="title-bar-text">Context Inspector - {{ selectedServer?.name || selectedPart?.name }}</div>
    </div>
    <div class="window-body panel-content">
      <!-- SERVER NODE PANEL -->
      <div v-if="selectedServer" style="display: flex; flex-direction: column; gap: 10px;">

        <div style="display: flex; justify-content: space-between;">
          <span v-if="selectedJob">
            <span v-if="canRunJob" style="color: darkgreen;">✓ Valid for Job</span>
            <span v-else style="color: darkred;">✗ Invalid for Job</span>
          </span>
        </div>

        <!-- Active Job Progress -->
        <div v-if="isRunningJob && activeJob" class="sunken-panel" style="padding: 10px;">
          <h4 style="margin-top: 0">Running: {{ activeJob.title }}</h4>
          <p><strong>Phase:</strong> {{ activeJob.status }}</p>
          <p><strong>Progress:</strong> {{ progressPercent }}%</p>
          
          <div class="progress-indicator segmented">
            <div class="progress-indicator-bar" :style="{ width: progressPercent + '%' }"></div>
          </div>
          
          <div style="margin-top: 10px">
            <button @click="gameStore.abortJob(activeJob.id)">Abort Job</button>
          </div>
        </div>

        <div v-else-if="selectedJob" class="sunken-panel" style="padding: 10px;">
          <h4 style="margin-top: 0">Preview: {{ selectedJob.title }}</h4>
          <button
            :disabled="!canRunJob"
            @click="gameStore.startJob(selectedServer.id, selectedJob.id)"
          >
            Start Job
          </button>
          <p v-if="!isServerComplete" style="color: darkred; margin-top: 5px">
            Server is missing essential parts.
          </p>
          <p v-else-if="!canRunJob" style="color: darkred; margin-top: 5px">
            Server lacks requirements.
          </p>
        </div>

        <!-- Utilization Metrics -->
        <fieldset>
          <legend>Telemetry</legend>
          <p style="margin: 2px 0"><strong>Power:</strong> {{ serverPowerDraw.toFixed(1) }} W</p>
          <p style="margin: 2px 0; word-break: break-word;">
            <strong>CPU:</strong> {{ formatOps(usedCpu) }} op/s / {{ formatOps(totalCpu) }} op/s ({{
              cpuPercent
            }}%)
          </p>
          <p style="margin: 2px 0; word-break: break-word;">
            <strong>RAM:</strong> {{ formatGB(usedRam) }} GB / {{ formatGB(totalRam) }} GB ({{
              ramPercent
            }}%)
          </p>
          <p style="margin: 2px 0; word-break: break-word;">
            <strong>Storage:</strong> {{ formatGB(usedStorage) }} GB / {{ formatGB(totalStorage) }} GB
            ({{ storagePercent }}%)
          </p>

          <!-- Charts -->
          <div v-if="serverTelemetry" style="margin-top: 15px">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px">
              <div style="display: flex; gap: 2px;">
                <button style="min-width: 0; padding: 2px 4px;" :style="chartScale === 3600 ? 'outline: 1px dotted black inset;' : ''" @click="chartScale = 3600">1h</button>
                <button style="min-width: 0; padding: 2px 4px;" :style="chartScale === 86400 ? 'outline: 1px dotted black inset;' : ''" @click="chartScale = 86400">24h</button>
                <button style="min-width: 0; padding: 2px 4px;" :style="chartScale === 604800 ? 'outline: 1px dotted black inset;' : ''" @click="chartScale = 604800">7d</button>
              </div>
            </div>
            <div style="padding: 2px;">
              <SimpleChart
                :times="serverTelemetry.time"
                :values="serverTelemetry.power"
                :current-time="gameStore.gameTimeSeconds"
                :scale="chartScale"
                label="Power Draw"
                unit="W"
                color="#800000"
              />
              <SimpleChart
                :times="serverTelemetry.time"
                :values="serverTelemetry.cpu"
                :current-time="gameStore.gameTimeSeconds"
                :scale="chartScale"
                label="CPU Utilization"
                unit="%"
                color="#000080"
              />
              <SimpleChart
                :times="serverTelemetry.time"
                :values="serverTelemetry.ram"
                :current-time="gameStore.gameTimeSeconds"
                :scale="chartScale"
                label="RAM Utilization"
                unit="%"
                color="#800080"
              />
              <SimpleChart
                :times="serverTelemetry.time"
                :values="serverTelemetry.swap"
                :current-time="gameStore.gameTimeSeconds"
                :scale="chartScale"
                label="Swap Size"
                unit=" GB"
                color="#ff0000"
              />
              <SimpleChart
                :times="serverTelemetry.time"
                :values="serverTelemetry.ramThroughput"
                :current-time="gameStore.gameTimeSeconds"
                :scale="chartScale"
                label="RAM Throughput Util"
                unit="%"
                color="#008080"
              />
              <SimpleChart
                :times="serverTelemetry.time"
                :values="serverTelemetry.storageThroughput"
                :current-time="gameStore.gameTimeSeconds"
                :scale="chartScale"
                label="Storage Throughput Util"
                unit="%"
                color="#808000"
              />
            </div>
          </div>
        </fieldset>

        <!-- Compute Rates -->
        <fieldset v-if="telemetry && (isRunningJob || canRunJob)">
          <legend>Compute Rates</legend>
          <p style="margin: 2px 0">
            <strong>Working Set I/O:</strong>
            {{ formatMB(telemetry.workingSetThroughput.value) }} MB/s
          </p>
          <p :style="{ color: telemetry.isIoBottlenecked ? 'orange' : 'blue', margin: '2px 0' }">
            <strong>Bottleneck:</strong>
            {{ telemetry.isIoBottlenecked ? 'Memory I/O' : 'CPU Limit' }}
          </p>
        </fieldset>
      </div>

      <!-- PART INFO PANEL -->
      <fieldset v-if="displayedPart" style="display: flex; flex-direction: column; gap: 10px;">
          <legend>Part - {{ displayedPart.name }}</legend>
        
        <ul style="list-style-type: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 2px;">
          <li><strong>Kind:</strong> {{ displayedPart.kind }}</li>
          <li><strong>Socket:</strong> {{ displayedPart.socketTag }}</li>
          <li><strong>Power Draw:</strong> {{ displayedPart.powerDraw?.value || 0 }} W</li>
          <li><strong>Value:</strong> {{ displayedPart.value.value.toFixed(2) }} $ETC</li>
        </ul>

        <ul v-if="asCpu" style="list-style-type: none; padding: 0; margin: 0;">
          <li style="word-break: break-word;"><strong>Compute Rate:</strong> {{ formatOps(asCpu.computeRate?.value || 0) }} op/s</li>
        </ul>
        <ul v-if="asRam" style="list-style-type: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 2px;">
          <li><strong>Capacity:</strong> {{ formatGB(asRam.memoryCapacity?.value || 0) }} GB</li>
          <li><strong>Bandwidth:</strong> {{ formatMB(asRam.ioBandwidth?.value || 0) }} MB/s</li>
        </ul>
        <ul v-if="asStorage" style="list-style-type: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 2px;">
          <li><strong>Capacity:</strong> {{ formatGB(asStorage.storageCapacity?.value || 0) }} GB</li>
          <li v-if="'ioBandwidth' in asStorage && asStorage.ioBandwidth">
            <strong>Bandwidth:</strong> {{ formatMB(asStorage.ioBandwidth.value) }} MB/s
          </li>
        </ul>
        <ul v-if="asPsu" style="list-style-type: none; padding: 0; margin: 0;">
          <li><strong>Power Capacity:</strong> {{ asPsu.powerCapacity?.value || 0 }} W</li>
        </ul>

        <!-- SLOTS -->
        <fieldset v-if="displayedPart.slots && displayedPart.slots.length > 0">
          <legend>Attached Components</legend>
          <PartSlots
            :slots="displayedPart.slots"
            :serverNode="parentServer as ServerNode | undefined"
            :isRunningJob="!!isRunningJob"
          />
        </fieldset>
      </fieldset>

      <div v-if="!selectedServer && !displayedPart" class="sunken-panel" style="padding: 15px;">
        <p>Select a server or part to view details.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.context-panel {
  position: absolute;
  width: 460px;
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
