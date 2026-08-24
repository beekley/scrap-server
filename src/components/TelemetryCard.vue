<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '../stores/game';
import { calculateComputeDetails, getJobProgress, calculateTotalStorage, canServerRunJob } from '../simulation';
import type { Job, ServerNode } from '../types';

const gameStore = useGameStore();

const selectedServer = computed(() => {
  return gameStore.servers.find(s => s.id === gameStore.selectedServerId) || null;
});

const activeJob = computed(() => gameStore.activeJob);
const isRunningJob = computed(() => {
  return activeJob.value && activeJob.value.serverNodeIds?.includes(selectedServer.value?.id || '');
});

const selectedJob = computed(() => gameStore.availableJobs.find(j => j.id === gameStore.selectedJobId));

const telemetry = computed(() => {
  if (!selectedServer.value) return null;
  // If running a job, use active job for telemetry. Otherwise, use selected job to preview telemetry.
  const jobContext = isRunningJob.value ? activeJob.value : selectedJob.value;
  if (!jobContext) return null;
  try {
    return calculateComputeDetails(selectedServer.value as unknown as ServerNode, jobContext as unknown as Job);
  } catch(e) {
    return null;
  }
});

const totalStorage = computed(() => {
  if (!selectedServer.value) return 0;
  return calculateTotalStorage(selectedServer.value as unknown as ServerNode).value;
});

const totalRam = computed(() => {
  if (!selectedServer.value) return 0;
  return selectedServer.value.installedParts
    .filter(p => p.kind === 'RAM')
    .reduce((acc, p) => acc + (p as any).memoryCapacity.value, 0);
});

const usedStorage = computed(() => {
  if (isRunningJob.value && activeJob.value) return activeJob.value.totalSize.value;
  return 0;
});

const usedRam = computed(() => {
  if (isRunningJob.value && activeJob.value && telemetry.value && telemetry.value.workingSetAllocation) {
    let ramAllocated = 0;
    for (const alloc of telemetry.value.workingSetAllocation) {
      if (alloc.part.kind === 'RAM') {
        ramAllocated += alloc.allocatedStorage.value;
      }
    }
    return ramAllocated;
  }
  return 0;
});

const usedCpu = computed(() => {
  if (isRunningJob.value && telemetry.value) {
    return telemetry.value.effectiveComputeRate.value;
  }
  return 0;
});

const totalCpu = computed(() => {
  if (telemetry.value) {
    return telemetry.value.totalCpuCompute.value;
  }
  return 0;
});

const progressPercent = computed(() => {
  if (!isRunningJob.value || !activeJob.value) return 0;
  return (getJobProgress(activeJob.value as unknown as Job) * 100).toFixed(1);
});

const isServerValid = computed(() => {
  if (!selectedServer.value || !selectedJob.value) return false;
  return canServerRunJob(selectedServer.value as unknown as ServerNode, selectedJob.value as unknown as Job);
});

</script>

<template>
  <div v-if="selectedServer" style="border: 1px solid black; padding: 20px; border-radius: 8px;">
    <h2 style="margin-top: 0;">Telemetry: {{ selectedServer.name }}</h2>

    <!-- Active Job Progress -->
    <div v-if="isRunningJob && activeJob" style="margin: 20px 0; border: 1px solid green; padding: 10px; background: #e0ffe0;">
      <h3>Running: {{ activeJob.title }}</h3>
      <p><strong>Progress:</strong> {{ progressPercent }}%</p>
      <div style="width: 100%; background: #ccc; height: 20px;">
        <div :style="{ width: progressPercent + '%', background: 'green', height: '100%' }"></div>
      </div>
      <div style="margin-top: 10px;">
        <button @click="gameStore.abortJob()">Abort Job</button>
      </div>
    </div>
    
    <div v-else-if="selectedJob" style="margin: 20px 0; padding: 10px; border: 1px solid #ccc; background: #fafafa;">
      <h3 style="margin-top: 0;">Preview: {{ selectedJob.title }}</h3>
      <button :disabled="!isServerValid || !!gameStore.activeJob" @click="gameStore.startJob(selectedServer.id, selectedJob.id)">
        Start Job
      </button>
      <p v-if="gameStore.activeJob" style="color: orange; margin-top: 5px;">Another job is currently running.</p>
      <p v-else-if="!isServerValid" style="color: red; margin-top: 5px;">Server lacks requirements to run this job.</p>
    </div>

    <!-- Utilization Metrics -->
    <div style="margin-top: 20px;">
      <h3>Utilization</h3>
      <p><strong>CPU:</strong> {{ usedCpu }} op/s / {{ totalCpu }} op/s 
        ({{ totalCpu > 0 ? ((usedCpu / totalCpu) * 100).toFixed(0) : 0 }}%)</p>

      <p><strong>RAM:</strong> {{ (usedRam / 1e9).toFixed(1) }} GB / {{ (totalRam / 1e9).toFixed(1) }} GB 
        ({{ totalRam > 0 ? ((usedRam / totalRam) * 100).toFixed(0) : 0 }}%)</p>
      
      <p><strong>Storage:</strong> {{ (usedStorage / 1e9).toFixed(1) }} GB / {{ (totalStorage / 1e9).toFixed(1) }} GB 
        ({{ totalStorage > 0 ? ((usedStorage / totalStorage) * 100).toFixed(0) : 0 }}%)</p>
    </div>

    <!-- Compute Rates -->
    <div style="margin-top: 20px;" v-if="telemetry && (isRunningJob || isServerValid)">
      <h3>Compute Performance</h3>
      <p><strong>Total Compute:</strong> {{ telemetry.totalCpuCompute.value }} op/s</p>
      <p><strong>Working Set I/O:</strong> {{ telemetry.workingSetThroughput.value / 1e6 }} MB/s</p>
      <p><strong>Effective Rate:</strong> {{ telemetry.effectiveComputeRate.value }} op/s</p>
      <p :style="{ color: telemetry.isIoBottlenecked ? 'orange' : 'blue' }">
        <strong>Bottleneck:</strong> {{ telemetry.isIoBottlenecked ? `Storage I/O (${telemetry.workingSetAllocation?.map(a => a.part.name + ' ' + (a.fraction * 100).toFixed(0) + '%').join(', ')})` : 'CPU Limit' }}
      </p>
    </div>
    <div v-else style="margin-top: 20px; color: #666; font-style: italic;">
      Select a valid job to preview performance, or start a job to see live metrics.
    </div>

  </div>
  <div v-else>
    <p>No server node selected.</p>
  </div>
</template>
