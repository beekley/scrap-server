<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '../stores/game';
import { getJobProgress, canServerRunJob, calculateComputeDetails, calculateTotalStorage } from '../simulation';
import { isPartCompatibleWithSlot, type Part, type SlotDefinition, type Job, type ServerNode } from '../types';

const gameStore = useGameStore();

const selectedServer = computed(() => {
  return gameStore.servers.find(s => s.id === gameStore.selectedItemId) || null;
});

const selectedPart = computed(() => {
  return gameStore.inventory.find(p => p.id === gameStore.selectedItemId) || null;
});

const activeJob = computed(() => gameStore.activeJob);
const selectedJob = computed(() => gameStore.availableJobs.find(j => j.id === gameStore.selectedJobId));

const isRunningJob = computed(() => {
  return activeJob.value && activeJob.value.serverNodeIds?.includes(selectedServer.value?.id || '');
});

// Telemetry logic
const telemetry = computed(() => {
  if (!selectedServer.value) return null;
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

// Assembly logic
function getCompatibleInventoryParts(slot: SlotDefinition): Part[] {
  return (gameStore.inventory as unknown as Part[]).filter(p => isPartCompatibleWithSlot(p, slot));
}

function handleSlotChange(slotId: string, event: Event) {
  if (!selectedServer.value || isRunningJob.value) return;
  const select = event.target as HTMLSelectElement;
  const selectedPartId = select.value;
  
  if (selectedPartId === "") {
    gameStore.removePart(selectedServer.value.id, slotId);
  } else {
    gameStore.installPart(selectedServer.value.id, slotId, selectedPartId);
  }
}
</script>

<template>
  <div style="flex: 1; min-width: 350px; display: flex; flex-direction: column; gap: 20px;">
    
    <div v-if="selectedServer" style="border: 1px solid black; padding: 15px; background: white; border-radius: 8px;">
      <h3 style="margin-top: 0;">Server: {{ selectedServer.name }}</h3>

      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span v-if="selectedJob">
          <span v-if="isServerValid" style="color: green;">✓ Valid for Job</span>
          <span v-else style="color: red;">✗ Invalid for Job</span>
        </span>
      </div>

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

      <!-- Node Configuration -->
      <div v-for="part in selectedServer.installedParts" :key="part.id">
        <div v-if="part.slots && part.slots.length > 0">
          <h4>{{ part.name }} Slots</h4>
          <ul style="padding-left: 20px;">
            <li v-for="slot in part.slots" :key="slot.id" style="margin-bottom: 5px;">
              <span style="display: inline-block; width: 140px; font-size: 0.9em;">{{ slot.label }}</span>
              <select @change="handleSlotChange(slot.id, $event)" :disabled="!!isRunningJob">
                <option value="" :selected="!slot.installedPartId">Empty</option>
                <option v-if="slot.installedPartId" :value="slot.installedPartId" selected>
                  {{ selectedServer.installedParts.find(p => p.id === slot.installedPartId)?.name || slot.installedPartId }}
                </option>
                <option v-for="invPart in getCompatibleInventoryParts(slot)" :key="invPart.id" :value="invPart.id">
                  {{ invPart.name }}
                </option>
              </select>
            </li>
          </ul>
        </div>
      </div>

      <!-- Utilization Metrics -->
      <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">
        <h4 style="margin-top: 0;">Utilization</h4>
        <p style="margin: 2px 0;"><strong>CPU:</strong> {{ usedCpu }} op/s / {{ totalCpu }} op/s</p>
        <p style="margin: 2px 0;"><strong>RAM:</strong> {{ (usedRam / 1e9).toFixed(1) }} GB / {{ (totalRam / 1e9).toFixed(1) }} GB</p>
        <p style="margin: 2px 0;"><strong>Storage:</strong> {{ (usedStorage / 1e9).toFixed(1) }} GB / {{ (totalStorage / 1e9).toFixed(1) }} GB</p>
      </div>

      <!-- Compute Rates -->
      <div style="margin-top: 10px;" v-if="telemetry && (isRunningJob || isServerValid)">
        <p style="margin: 2px 0;"><strong>Working Set I/O:</strong> {{ (telemetry.workingSetThroughput.value / 1e6).toFixed(1) }} MB/s</p>
        <p :style="{ color: telemetry.isIoBottlenecked ? 'orange' : 'blue', margin: '2px 0' }">
          <strong>Bottleneck:</strong> {{ telemetry.isIoBottlenecked ? 'Storage I/O' : 'CPU Limit' }}
        </p>
      </div>

    </div>

    <div v-else-if="selectedPart" style="border: 1px solid black; padding: 15px; background: white; border-radius: 8px;">
      <h3 style="margin-top: 0;">Part: {{ selectedPart.name }}</h3>
      <p><strong>Kind:</strong> {{ selectedPart.kind }}</p>
      <p><strong>Socket:</strong> {{ selectedPart.socketTag }}</p>
      <p><strong>Power Draw:</strong> {{ (selectedPart as any).powerDraw?.value || 0 }} W</p>
      <p><strong>Value:</strong> ${{ selectedPart.value }}</p>

      <div v-if="selectedPart.kind === 'CPU'" style="margin-top: 10px;">
        <p><strong>Compute Rate:</strong> {{ (selectedPart as any).computeRate?.value }} op/s</p>
      </div>
      <div v-if="selectedPart.kind === 'RAM'" style="margin-top: 10px;">
        <p><strong>Capacity:</strong> {{ (selectedPart as any).memoryCapacity?.value / 1e9 }} GB</p>
        <p><strong>Bandwidth:</strong> {{ (selectedPart as any).ioBandwidth?.value / 1e6 }} MB/s</p>
      </div>
      <div v-if="selectedPart.kind === 'STORAGE' || selectedPart.kind === 'STORAGE_DEVICE'" style="margin-top: 10px;">
        <p><strong>Capacity:</strong> {{ (selectedPart as any).storageCapacity?.value / 1e9 }} GB</p>
        <p><strong>Bandwidth:</strong> {{ (selectedPart as any).ioBandwidth?.value / 1e6 }} MB/s</p>
      </div>
      <div v-if="selectedPart.kind === 'PSU'" style="margin-top: 10px;">
        <p><strong>Power Capacity:</strong> {{ (selectedPart as any).powerCapacity?.value }} W</p>
      </div>
    </div>
    
    <div v-else style="padding: 15px; color: #666;">
      <p>Select a server or part to view details.</p>
    </div>
  </div>
</template>
