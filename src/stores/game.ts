import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as u from 'safe-units';
import { s, ops, type Job, type Part, type ServerNode, isPartCompatibleWithSlot } from '../types';
import { createInitialServer, getJobTemplate, getPartTemplate, sampleJobs } from '../seed';
import { tickJob, canServerRunJob } from '../simulation';

type ScreenType = 'BOUNTY_BOARD' | 'RACK_ASSEMBLY' | 'LIVE_TELEMETRY' | 'JOB_COMPLETE';

export const useGameStore = defineStore('game', () => {
  const inventory = ref<Part[]>([
    getPartTemplate('cpu_old') as unknown as Part,
    getPartTemplate('ram_1gb') as unknown as Part,
    getPartTemplate('hdd_slow') as unknown as Part,
    getPartTemplate('psu_200') as unknown as Part,
  ]);

  const servers = ref<ServerNode[]>([createInitialServer()]);
  const availableJobs = ref<Job[]>(sampleJobs.map(j => getJobTemplate(j.id)));
  const activeJob = ref<Job | null>(null);
  const cash = ref<number>(0);
  const currentScreen = ref<ScreenType>('BOUNTY_BOARD');
  
  // Game clock: starts at 0, unit is game-seconds
  const gameTimeSeconds = ref<number>(0);

  function getPartFromInventory(partId: string): Part | undefined {
    return inventory.value.find(p => p.id === partId);
  }

  function installPart(serverId: string, slotId: string, partId: string) {
    const server = servers.value.find(s => s.id === serverId);
    if (!server) return;

    // Find the slot in any part
    for (const p of server.installedParts) {
      if (p.slots) {
        const slot = p.slots.find(s => s.id === slotId);
        if (slot) {
          const invPartIndex = inventory.value.findIndex(ip => ip.id === partId);
          if (invPartIndex === -1) return;
          const invPart = inventory.value[invPartIndex];
          if (!invPart) return;

          if (!isPartCompatibleWithSlot(invPart as unknown as Part, slot)) return;

          // If there's already a part, remove it first
          if (slot.installedPartId) {
            removePart(serverId, slotId);
          }

          slot.installedPartId = invPart.id;
          server.installedParts.push(invPart);
          inventory.value.splice(invPartIndex, 1);
          return;
        }
      }
    }
  }

  function removePart(serverId: string, slotId: string) {
    const server = servers.value.find(s => s.id === serverId);
    if (!server) return;

    for (const p of server.installedParts) {
      if (p.slots) {
        const slot = p.slots.find(s => s.id === slotId);
        if (slot && slot.installedPartId) {
          const installedPartId = slot.installedPartId;
          const partIndex = server.installedParts.findIndex(ip => ip.id === installedPartId);
          if (partIndex !== -1) {
            const partToRemove = server.installedParts[partIndex];
            if (partToRemove) {
              server.installedParts.splice(partIndex, 1);
              inventory.value.push(partToRemove);
            }
          }
          slot.installedPartId = null;
          return;
        }
      }
    }
  }

  function selectJob(jobId: string) {
    const job = availableJobs.value.find(j => j.id === jobId);
    if (job) {
      activeJob.value = job;
      currentScreen.value = 'RACK_ASSEMBLY';
    }
  }

  function startJob(serverId: string) {
    if (!activeJob.value) return;
    const server = servers.value.find(s => s.id === serverId);
    if (!server) return;

    if (!canServerRunJob(server as unknown as ServerNode, activeJob.value as unknown as Job)) return;

    activeJob.value.serverNodeIds = [serverId];
    currentScreen.value = 'LIVE_TELEMETRY';
  }

  function abortJob() {
    if (activeJob.value) {
      activeJob.value.workCompleted = u.Measure.of(0, ops);
      activeJob.value.serverNodeIds = [];
      currentScreen.value = 'RACK_ASSEMBLY';
    }
  }

  function claimReward() {
    if (!activeJob.value) return;
    
    // Grant cash
    cash.value += activeJob.value.rewardCash;

    // Grant parts
    activeJob.value.rewardPartIds.forEach(templateId => {
      inventory.value.push(getPartTemplate(templateId));
    });

    // Remove job from available list and reset active job
    availableJobs.value = availableJobs.value.filter(j => j.id !== activeJob.value?.id);
    activeJob.value = null;

    currentScreen.value = 'BOUNTY_BOARD';
  }

  function tick(dtSeconds: number = 60) {
    gameTimeSeconds.value += dtSeconds;

    if (!activeJob.value || !activeJob.value.serverNodeIds || activeJob.value.serverNodeIds.length === 0) {
      return;
    }

    const serverId = activeJob.value.serverNodeIds[0];
    const server = servers.value.find(s => s.id === serverId);
    if (!server) return;

    const dt = u.Measure.of(dtSeconds, s);
    const result = tickJob(activeJob.value as unknown as Job, server as unknown as ServerNode, dt);

    if (result.isCompleted) {
      // Only switch screen to JOB_COMPLETE if we are in telemetry or rack
      if (currentScreen.value === 'LIVE_TELEMETRY' || currentScreen.value === 'RACK_ASSEMBLY') {
        currentScreen.value = 'JOB_COMPLETE';
      }
    }
  }

  return {
    inventory,
    servers,
    availableJobs,
    activeJob,
    cash,
    currentScreen,
    gameTimeSeconds,
    getPartFromInventory,
    installPart,
    removePart,
    selectJob,
    startJob,
    abortJob,
    claimReward,
    tick,
  };
});
