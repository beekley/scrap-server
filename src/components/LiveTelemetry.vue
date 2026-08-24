<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '../stores/game';
import { calculateComputeDetails, getJobProgress } from '../simulation';

const gameStore = useGameStore();

const activeJob = computed(() => gameStore.activeJob);
const server = computed(() => {
  if (activeJob.value && activeJob.value.serverNodeIds) {
    return gameStore.servers.find(s => s.id === activeJob.value!.serverNodeIds![0]);
  }
  return null;
});

const progressPercent = computed(() => {
  if (!activeJob.value) return 0;
  return (getJobProgress(activeJob.value) * 100).toFixed(1);
});

const telemetry = computed(() => {
  if (!server.value || !activeJob.value) return null;
  return calculateComputeDetails(server.value, activeJob.value);
});
</script>

<template>
  <div v-if="activeJob && telemetry">
    <h2>Live Telemetry</h2>
    <h3>Job: {{ activeJob.title }}</h3>
    
    <div style="margin: 20px 0; border: 1px solid black; padding: 10px;">
      <p><strong>Progress:</strong> {{ progressPercent }}%</p>
      <div style="width: 100%; background: #ccc; height: 20px;">
        <div :style="{ width: progressPercent + '%', background: 'green', height: '100%' }"></div>
      </div>
    </div>

    <div>
      <p><strong>Real-Time Compute Rate:</strong> {{ telemetry.effectiveComputeRate.value }} op/s</p>
      <p v-if="telemetry.isIoBottlenecked" style="color: orange;">
        <strong>Bottleneck:</strong> Storage I/O ({{ telemetry.activeStoragePart?.name }} - {{ telemetry.workingSetThroughput.value / 1e6 }} MB/s)
      </p>
      <p v-else style="color: blue;">
        <strong>Bottleneck:</strong> CPU Limit
      </p>
    </div>

    <div style="margin-top: 20px;">
      <button @click="gameStore.abortJob()">Abort Job</button>
    </div>
  </div>
  <div v-else>
    <p>No active job running.</p>
  </div>
</template>
