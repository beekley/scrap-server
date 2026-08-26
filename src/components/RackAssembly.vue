<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '../stores/game';
import { getJobProgress, canServerRunJob } from '../simulation';
import { isPartCompatibleWithSlot, type Part, type SlotDefinition, type Job, type ServerNode } from '../types';
import ServerRoom from './ServerRoom.vue';
import ContextPanel from './ContextPanel.vue';

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
      <h2>Server Room (Assembly)</h2>
    </div>

    <div style="display: flex; gap: 20px;">
      
      <!-- 2D Server Room -->
      <div style="flex: 2; min-width: 600px;">
        <ServerRoom />
      </div>

      <!-- Side Panel -->
      <ContextPanel />

    </div>
  </div>
</template>
