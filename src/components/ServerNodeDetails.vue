<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { formatGB, formatMB, formatOps } from '../utils/formatting'
import TelemetryDashboard from './TelemetryDashboard.vue'
import type { ServerNode, Job } from '../types'
import { useSelectionContext } from '../composables/useSelectionContext'

const gameStore = useGameStore()

// We can either pass these as props or just use the composable directly in the child.
// For Vue best practices, presentation components should ideally receive props.
// Let's receive props to keep it functional, except for global game actions.
const props = defineProps<{
  selectedServer: ServerNode
  selectedJob: Job | null
  activeJob: Job | null
  canRunJob: boolean
  isServerComplete: boolean
  isRunningJob: boolean
  progressPercent: string | number
  serverPowerDraw: number
  usedCpu: number
  totalCpu: number
  cpuPercent: string | number
  usedRam: number
  totalRam: number
  ramPercent: string | number
  usedStorage: number
  totalStorage: number
  storagePercent: string | number
  serverTelemetry: any
  telemetry: any
  serverTemp: number
  operatingLimits: { maxOperatingTemp: number; criticalTemp: number }
}>()

</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 10px;">
    <div style="display: flex; justify-content: space-between;">
      <span v-if="selectedJob">
        <span v-if="canRunJob" style="color: #66bb6a;">✓ Valid for Job</span>
        <span v-else style="color: #ef5350;">✗ Invalid for Job</span>
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
      <p v-if="!isServerComplete" style="color: #ef5350; margin-top: 5px">
        Server is missing essential parts.
      </p>
      <p v-else-if="!canRunJob" style="color: #ef5350; margin-top: 5px">
        Server lacks requirements.
      </p>
    </div>

    <!-- Utilization Metrics -->
    <fieldset>
      <legend>Utilization & Thermals</legend>
      <p style="margin: 2px 0"><strong>Power:</strong> {{ serverPowerDraw.toFixed(1) }} W</p>
      <p style="margin: 2px 0">
        <strong>Temp:</strong> 
        <span :style="{ color: serverTemp >= operatingLimits.criticalTemp ? 'red' : serverTemp >= operatingLimits.maxOperatingTemp ? 'orange' : 'inherit' }">
          {{ serverTemp.toFixed(1) }} °C
        </span>
        <span v-if="serverTemp >= operatingLimits.criticalTemp" style="color: red; font-weight: bold; margin-left: 5px;">(CRITICAL)</span>
        <span v-else-if="serverTemp >= operatingLimits.maxOperatingTemp" style="color: orange; font-weight: bold; margin-left: 5px;">(THROTTLING)</span>
      </p>
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

      <TelemetryDashboard :serverTelemetry="serverTelemetry" />
    </fieldset>

    <!-- Compute Rates -->
    <fieldset v-if="telemetry && (isRunningJob || canRunJob)">
      <legend>Compute Rates</legend>
      <p style="margin: 2px 0">
        <strong>Working Set I/O:</strong>
        {{ formatMB(telemetry.workingSetThroughput.value) }} MB/s
      </p>
      <p :style="{ color: telemetry.isIoBottlenecked ? '#ffb74d' : '#64b5f6', margin: '2px 0' }">
        <strong>Bottleneck:</strong>
        {{ telemetry.isIoBottlenecked ? 'Memory I/O' : 'CPU Limit' }}
      </p>
    </fieldset>
  </div>
</template>
