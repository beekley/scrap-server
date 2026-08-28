<script setup lang="ts">
import { computed } from 'vue'
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

const gameStore = useGameStore()

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
</script>

<template>
  <div style="flex: 1; min-width: 350px; display: flex; flex-direction: column; gap: 20px">
    <!-- SERVER NODE PANEL -->
    <div
      v-if="selectedServer"
      style="border: 2px solid black; padding: 15px; background: white; border-radius: 0"
    >
      <h3 style="margin-top: 0">Server Node: {{ selectedServer.name }}</h3>

      <div style="display: flex; justify-content: space-between; margin-bottom: 10px">
        <span v-if="selectedJob">
          <span v-if="canRunJob" style="color: green">✓ Valid for Job</span>
          <span v-else style="color: red">✗ Invalid for Job</span>
        </span>
      </div>

      <!-- Active Job Progress -->
      <div
        v-if="isRunningJob && activeJob"
        style="margin: 20px 0; border: 2px solid green; padding: 10px; background: #e0ffe0"
      >
        <h3>Running: {{ activeJob.title }}</h3>
        <p><strong>Phase:</strong> {{ activeJob.status }}</p>
        <p><strong>Progress:</strong> {{ progressPercent }}%</p>
        <div style="width: 100%; background: #ccc; height: 20px">
          <div :style="{ width: progressPercent + '%', background: 'green', height: '100%' }"></div>
        </div>
        <div style="margin-top: 10px">
          <button @click="gameStore.abortJob(activeJob.id)">Abort Job</button>
        </div>
      </div>

      <div
        v-else-if="selectedJob"
        style="margin: 20px 0; padding: 10px; border: 2px solid #ccc; background: #fafafa"
      >
        <h3 style="margin-top: 0">Preview: {{ selectedJob.title }}</h3>
        <button
          :disabled="!canRunJob"
          @click="gameStore.startJob(selectedServer.id, selectedJob.id)"
        >
          Start Job
        </button>
        <p v-if="!isServerComplete" style="color: red; margin-top: 5px">
          Server is missing essential parts (CPU, RAM, Storage, etc).
        </p>
        <p v-else-if="!canRunJob" style="color: red; margin-top: 5px">
          Server lacks requirements to run this job.
        </p>
      </div>

      <!-- Utilization Metrics -->
      <div style="margin-top: 20px; border-top: 2px solid #eee; padding-top: 10px">
        <h4 style="margin-top: 0">Utilization</h4>
        <p style="margin: 2px 0"><strong>Power:</strong> {{ serverPowerDraw.toFixed(1) }} W</p>
        <p style="margin: 2px 0">
          <strong>CPU:</strong> {{ formatOps(usedCpu) }} op/s / {{ formatOps(totalCpu) }} op/s ({{
            cpuPercent
          }}%)
        </p>
        <p style="margin: 2px 0">
          <strong>RAM:</strong> {{ formatGB(usedRam) }} GB / {{ formatGB(totalRam) }} GB ({{
            ramPercent
          }}%)
        </p>
        <p style="margin: 2px 0">
          <strong>Storage:</strong> {{ formatGB(usedStorage) }} GB / {{ formatGB(totalStorage) }} GB
          ({{ storagePercent }}%)
        </p>
      </div>

      <!-- Compute Rates -->
      <div style="margin-top: 10px" v-if="telemetry && (isRunningJob || canRunJob)">
        <p style="margin: 2px 0">
          <strong>Working Set I/O:</strong>
          {{ formatMB(telemetry.workingSetThroughput.value) }} MB/s
        </p>
        <p :style="{ color: telemetry.isIoBottlenecked ? 'orange' : 'blue', margin: '2px 0' }">
          <strong>Bottleneck:</strong>
          {{ telemetry.isIoBottlenecked ? 'Memory I/O' : 'CPU Limit' }}
        </p>
      </div>
    </div>

    <!-- PART INFO PANEL -->
    <div
      v-if="displayedPart"
      style="border: 2px solid black; padding: 15px; background: white; border-radius: 0"
    >
      <h3
        style="
          margin-top: 0;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        "
      >
        <span>Part: {{ displayedPart.name }}</span>
        <button
          v-if="parentPart"
          @click="gameStore.selectedItemId = parentPart.id"
          style="padding: 4px 8px; font-size: 0.8em; cursor: pointer"
        >
          ↑ Up to {{ parentPart.name }}
        </button>
      </h3>
      <p><strong>Kind:</strong> {{ displayedPart.kind }}</p>
      <p><strong>Socket:</strong> {{ displayedPart.socketTag }}</p>
      <p><strong>Power Draw:</strong> {{ displayedPart.powerDraw?.value || 0 }} W</p>
      <p><strong>Value:</strong> {{ displayedPart.value.value.toFixed(2) }} $ETC</p>

      <div v-if="asCpu" style="margin-top: 10px">
        <p><strong>Compute Rate:</strong> {{ formatOps(asCpu.computeRate?.value || 0) }} op/s</p>
      </div>
      <div v-if="asRam" style="margin-top: 10px">
        <p><strong>Capacity:</strong> {{ formatGB(asRam.memoryCapacity?.value || 0) }} GB</p>
        <p><strong>Bandwidth:</strong> {{ formatMB(asRam.ioBandwidth?.value || 0) }} MB/s</p>
      </div>
      <div v-if="asStorage" style="margin-top: 10px">
        <p><strong>Capacity:</strong> {{ formatGB(asStorage.storageCapacity?.value || 0) }} GB</p>
        <p v-if="'ioBandwidth' in asStorage && asStorage.ioBandwidth">
          <strong>Bandwidth:</strong> {{ formatMB(asStorage.ioBandwidth.value) }} MB/s
        </p>
      </div>
      <div v-if="asPsu" style="margin-top: 10px">
        <p><strong>Power Capacity:</strong> {{ asPsu.powerCapacity?.value || 0 }} W</p>
      </div>

      <!-- SLOTS -->
      <div
        v-if="displayedPart.slots && displayedPart.slots.length > 0 && parentServer"
        style="margin-top: 15px; border-top: 2px solid #ccc; padding-top: 10px"
      >
        <h4>Attached Components (Slots)</h4>
        <PartSlots
          :slots="displayedPart.slots"
          :serverNode="parentServer as ServerNode"
          :isRunningJob="!!isRunningJob"
        />
      </div>
    </div>

    <div v-if="!selectedServer && !displayedPart" style="padding: 15px; color: #666">
      <p>Select a server or part to view details.</p>
    </div>
  </div>
</template>
