<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '../stores/game';
import { calculateComputeDetails, calculateTotalStorage, canServerRunJob, getJobProgress } from '../simulation';
import { isPartCompatibleWithSlot, type Part, type SlotDefinition, type Job, type ServerNode } from '../types';

const gameStore = useGameStore();

const activeJob = computed(() => gameStore.activeJob);
const server = computed(() => gameStore.servers[0]); // Only one server for MVP

const runningJob = computed(() => {
  if (activeJob.value && activeJob.value.serverNodeIds?.includes(server.value?.id || '')) {
    return activeJob.value;
  }
  return null;
});

const progressPercent = computed(() => {
  if (!runningJob.value) return 0;
  return (getJobProgress(runningJob.value as unknown as Job) * 100).toFixed(1);
});

const telemetry = computed(() => {
  if (!server.value || !activeJob.value) return null;
  return calculateComputeDetails(server.value as unknown as ServerNode, activeJob.value as unknown as Job);
});

const totalStorage = computed(() => {
  if (!server.value) return 0;
  return calculateTotalStorage(server.value as unknown as ServerNode).value;
});

const isServerValid = computed(() => {
  if (!server.value || !activeJob.value) return false;
  return canServerRunJob(server.value as unknown as ServerNode, activeJob.value as unknown as Job);
});

function getCompatibleInventoryParts(slot: SlotDefinition): Part[] {
  return gameStore.inventory.filter(p => isPartCompatibleWithSlot(p as unknown as Part, slot));
}

function handleSlotChange(slotId: string, event: Event) {
  if (!server.value || runningJob.value) return;
  const select = event.target as HTMLSelectElement;
  const selectedPartId = select.value;
  
  if (selectedPartId === "") {
    gameStore.removePart(server.value.id, slotId);
  } else {
    gameStore.installPart(server.value.id, slotId, selectedPartId);
  }
}
</script>

<template>
  <div>
    <h2>Rack Assembly</h2>
    <div style="display: flex; justify-content: space-between;">
      
      <!-- Inventory -->
      <div style="flex: 1; border: 1px solid black; padding: 10px; margin-right: 10px;">
        <h3>Inventory</h3>
        <ul>
          <li v-for="part in gameStore.inventory" :key="part.id">
            {{ part.name }} ({{ part.kind }})
          </li>
        </ul>
        <p v-if="gameStore.inventory.length === 0">Inventory is empty.</p>
      </div>

      <!-- Server Slots -->
      <div style="flex: 1; border: 1px solid black; padding: 10px; margin-right: 10px;">
        <h3>Server Node</h3>
        
        <div v-if="runningJob" style="margin-bottom: 15px; padding: 10px; background: #e0ffe0; border: 1px solid green;">
          <strong>Running: {{ runningJob.title }}</strong>
          <div style="margin-top: 5px;">Progress: {{ progressPercent }}%</div>
          <div style="width: 100%; background: #ccc; height: 10px; margin-top: 5px;">
            <div :style="{ width: progressPercent + '%', background: 'green', height: '100%' }"></div>
          </div>
        </div>

        <template v-if="server">
          <div v-for="part in server.installedParts" :key="part.id">
            <div v-if="part.slots && part.slots.length > 0">
              <h4>{{ part.name }} Slots</h4>
              <ul>
                <li v-for="slot in part.slots" :key="slot.id" style="margin-bottom: 5px;">
                  {{ slot.label }} ({{ slot.acceptsKind }})
                  <select @change="handleSlotChange(slot.id, $event)" :disabled="!!runningJob">
                    <option value="" :selected="!slot.installedPartId">Empty</option>
                    
                    <!-- If a part is already installed, show it as an option -->
                    <option 
                      v-if="slot.installedPartId" 
                      :value="slot.installedPartId" 
                      selected>
                      {{ server.installedParts.find(p => p.id === slot.installedPartId)?.name || slot.installedPartId }}
                    </option>

                    <!-- Show compatible parts from inventory -->
                    <option 
                      v-for="invPart in getCompatibleInventoryParts(slot)" 
                      :key="invPart.id" 
                      :value="invPart.id">
                      {{ invPart.name }}
                    </option>
                  </select>
                </li>
              </ul>
            </div>
          </div>
        </template>
      </div>

      <!-- Telemetry -->
      <div style="flex: 1; border: 1px solid black; padding: 10px;">
        <h3>Telemetry Preview</h3>
        <div v-if="telemetry">
          <p><strong>Total Compute:</strong> {{ telemetry.totalCpuCompute.value }} op/s</p>
          <p><strong>Total Storage:</strong> {{ totalStorage / 1e9 }} GB</p>
          <p><strong>Working Set I/O:</strong> {{ telemetry.workingSetThroughput.value / 1e6 }} MB/s</p>
          <p><strong>Expected Bottleneck:</strong> {{ telemetry.isIoBottlenecked ? 'I/O' : 'CPU' }}</p>
          <p><strong>Effective Rate:</strong> {{ telemetry.effectiveComputeRate.value }} op/s</p>
        </div>
      </div>
      
    </div>

    <div style="margin-top: 20px;">
      <button :disabled="!isServerValid" @click="server && gameStore.startJob(server.id)">
        Start Job
      </button>
      <button @click="gameStore.currentScreen = 'BOUNTY_BOARD'">Back to Bounty Board</button>
      <p v-if="!isServerValid" style="color: red;">Server is lacking requirements to run this job.</p>
    </div>
  </div>
</template>
