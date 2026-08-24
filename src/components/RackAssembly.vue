<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '../stores/game';
import { getJobProgress, canServerRunJob } from '../simulation';
import { isPartCompatibleWithSlot, type Part, type SlotDefinition, type Job, type ServerNode } from '../types';

const gameStore = useGameStore();

const activeJob = computed(() => gameStore.activeJob);
const selectedJob = computed(() => gameStore.availableJobs.find(j => j.id === gameStore.selectedJobId));

const selectedServer = computed(() => {
  return gameStore.servers.find(s => s.id === gameStore.selectedServerId) || null;
});

const isSelectedServerRunningJob = computed(() => {
  return activeJob.value && activeJob.value.serverNodeIds?.includes(selectedServer.value?.id || '');
});

function getServerProgressPercent(serverId: string) {
  if (activeJob.value && activeJob.value.serverNodeIds?.includes(serverId)) {
    return (getJobProgress(activeJob.value as unknown as Job) * 100).toFixed(1);
  }
  return null;
}

function checkServerValidity(server: ServerNode | unknown) {
  if (!selectedJob.value) return null;
  return canServerRunJob(server as unknown as ServerNode, selectedJob.value as unknown as Job);
}

function getCompatibleInventoryParts(slot: SlotDefinition): Part[] {
  return (gameStore.inventory as unknown as Part[]).filter(p => isPartCompatibleWithSlot(p, slot));
}

function handleSlotChange(slotId: string, event: Event) {
  if (!selectedServer.value || isSelectedServerRunningJob.value) return;
  const select = event.target as HTMLSelectElement;
  const selectedPartId = select.value;
  
  if (selectedPartId === "") {
    gameStore.removePart(selectedServer.value.id, slotId);
  } else {
    gameStore.installPart(selectedServer.value.id, slotId, selectedPartId);
  }
}
function handleRootCaseChange(event: Event) {
  if (!selectedServer.value || isSelectedServerRunningJob.value) return;
  const select = event.target as HTMLSelectElement;
  const selectedPartId = select.value;
  if (selectedPartId !== "") {
    // The installPart function takes a slotId, but for root cases, we can just push it 
    // or we can add a special case in the store. 
    // Let's add a `installRootPart` or just push it.
    // Wait, installPart expects a slotId.
    // Let's just update store to handle 'root' as slotId, or add an action.
    gameStore.installRootPart(selectedServer.value.id, selectedPartId);
  }
}
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: baseline;">
      <h2>Rack Assembly</h2>
      <button @click="gameStore.addServerNode()" style="height: 30px;">+ Add Server Node</button>
    </div>

    <div style="display: flex; gap: 20px;">
      
      <!-- Servers List (The Rack) -->
      <div style="flex: 1; border: 1px solid black; padding: 10px; display: flex; flex-direction: column; gap: 10px;">
        <h3>Servers ({{ gameStore.servers.length }})</h3>
        
        <div 
          v-for="server in gameStore.servers" 
          :key="server.id"
          style="border: 2px solid; padding: 10px; cursor: pointer; border-radius: 4px;"
          :style="{ borderColor: gameStore.selectedServerId === server.id ? 'blue' : '#ccc', backgroundColor: gameStore.selectedServerId === server.id ? '#f0f8ff' : 'white' }"
          @click="gameStore.selectedServerId = server.id"
        >
          <div style="display: flex; justify-content: space-between;">
            <strong>{{ server.name }}</strong>
            <span v-if="selectedJob">
              <span v-if="checkServerValidity(server)" style="color: green;">✓ Valid</span>
              <span v-else style="color: red;">✗ Invalid</span>
            </span>
          </div>

          <div v-if="getServerProgressPercent(server.id) !== null" style="margin-top: 10px; font-size: 0.9em;">
            <div style="color: green; font-weight: bold;">Running: {{ activeJob?.title }}</div>
            <div>Progress: {{ getServerProgressPercent(server.id) }}%</div>
            <div style="width: 100%; background: #ccc; height: 8px; margin-top: 4px; border-radius: 4px; overflow: hidden;">
              <div :style="{ width: getServerProgressPercent(server.id) + '%', background: 'green', height: '100%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Server Slots Details (Visible for selected server) -->
      <div v-if="selectedServer" style="flex: 1; border: 1px solid black; padding: 10px;">
        <h3>Node Configuration: {{ selectedServer.name }}</h3>
        
        <div v-if="selectedServer.installedParts.length === 0">
          <p style="color: #666; font-style: italic;">This node is completely empty. Install a Case to begin.</p>
          <div style="margin-top: 10px;">
            <label><strong>Chassis / Case:</strong> </label>
            <select @change="handleRootCaseChange($event)">
              <option value="">Select a Case...</option>
              <option v-for="part in gameStore.inventory.filter(p => p.kind === 'CASE')" :key="part.id" :value="part.id">
                {{ part.name }}
              </option>
            </select>
          </div>
        </div>

        <div v-for="part in selectedServer.installedParts" :key="part.id">
          <div v-if="part.slots && part.slots.length > 0">
            <h4>{{ part.name }} Slots</h4>
            <ul style="padding-left: 20px;">
              <li v-for="slot in part.slots" :key="slot.id" style="margin-bottom: 5px;">
                <span style="display: inline-block; width: 180px;">{{ slot.label }} ({{ slot.acceptsKind }})</span>
                <select @change="handleSlotChange(slot.id, $event)" :disabled="!!isSelectedServerRunningJob">
                  <option value="" :selected="!slot.installedPartId">Empty</option>
                  
                  <!-- If a part is already installed, show it as an option -->
                  <option 
                    v-if="slot.installedPartId" 
                    :value="slot.installedPartId" 
                    selected>
                    {{ selectedServer.installedParts.find(p => p.id === slot.installedPartId)?.name || slot.installedPartId }}
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
      </div>

      <!-- Inventory -->
      <div style="flex: 1; border: 1px solid black; padding: 10px;">
        <h3>Inventory</h3>
        <ul style="padding-left: 20px;">
          <li v-for="part in gameStore.inventory" :key="part.id">
            {{ part.name }} <span style="color: #666; font-size: 0.9em;">({{ part.kind }})</span>
          </li>
        </ul>
        <p v-if="gameStore.inventory.length === 0">Inventory is empty.</p>
      </div>

    </div>
  </div>
</template>
