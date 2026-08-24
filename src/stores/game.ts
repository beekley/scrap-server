import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as u from 'safe-units';
import { s, ops, type Job, type Part, type ServerNode, isPartCompatibleWithSlot } from '../types';
import { createInitialServer, getPartTemplate } from '../data';
import { generateProceduralJob } from '../generators';
import { tickJob, canServerRunJob } from '../simulation';

export const useGameStore = defineStore('game', () => {
  const inventory = ref<Part[]>([
    getPartTemplate('case_techmaker_atx'),
    getPartTemplate('mb_haodyn_h61'),
    getPartTemplate('cpu_acc_vectra_1155'),
    getPartTemplate('ram_techmaker_4gb_ddr3'),
    getPartTemplate('hdd_techmaker_500gb'),
    getPartTemplate('psu_techmaker_300w'),
  ]);
  const servers = ref<ServerNode[]>([createInitialServer()]);
  
  const availableJobs = ref<Job[]>([
    generateProceduralJob(),
    generateProceduralJob(),
    generateProceduralJob(),
  ]);

  const activeJob = ref<Job | null>(null);
  const selectedJobId = ref<string | null>(null);
  const selectedServerId = ref<string | null>(servers.value[0]?.id ?? null);
  const cash = ref<number>(0);
  
  // Game clock: starts at 0, unit is game-seconds
  const gameTimeSeconds = ref<number>(0);
  const gameSpeed = ref<number>(1); // 0 (paused), 1 (1x), 4 (4x), 16 (16x)

  function setGameSpeed(speed: number) {
    gameSpeed.value = speed;
  }

  function getPartFromInventory(partId: string): Part | undefined {
    return inventory.value.find(p => p.id === partId) as Part | undefined;
  }

  function installRootPart(serverId: string, inventoryPartId: string) {
    const server = servers.value.find(s => s.id === serverId);
    if (!server) return;

    const partIndex = inventory.value.findIndex(p => p.id === inventoryPartId);
    if (partIndex === -1) return;

    const part = inventory.value[partIndex];
    if (!part) return;
    inventory.value.splice(partIndex, 1);
    server.installedParts.push(part as unknown as Part);
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
    selectedJobId.value = jobId;
  }


  function addServerNode() {
    const id = `server_${servers.value.length + 1}`;
    servers.value.push({
      id,
      name: `Scrap Node ${servers.value.length + 1}`,
      installedParts: []
    });
    selectedServerId.value = id;
  }

  function startJob(serverId: string, jobId: string) {
    // Only one active job at a time for MVP
    if (activeJob.value) return;

    const server = servers.value.find(s => s.id === serverId);
    const jobTpl = availableJobs.value.find(j => j.id === jobId);
    
    if (!server || !jobTpl) return;
    if (!canServerRunJob(server as unknown as ServerNode, jobTpl as unknown as Job)) return;

    // Clone job for execution
    const newJob = { ...jobTpl };
    newJob.serverNodeIds = [serverId];
    newJob.workCompleted = u.Measure.of(0, ops);
    activeJob.value = newJob;
  }

  function abortJob() {
    activeJob.value = null;
  }

  function tick(dtSeconds: number = 6) {
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
      // Payout
      cash.value += activeJob.value.rewardCash;
      for (const partId of activeJob.value.rewardPartIds) {
        inventory.value.push(getPartTemplate(partId));
      }
      
      // Remove old job and replace with new one
      const oldJobIndex = availableJobs.value.findIndex(j => j.id === activeJob.value?.id);
      if (oldJobIndex !== -1) {
        availableJobs.value.splice(oldJobIndex, 1, generateProceduralJob());
      }
      
      activeJob.value = null;
    }
  }

  return {
    inventory,
    servers,
    availableJobs,
    activeJob,
    selectedJobId,
    selectedServerId,
    cash,
    gameTimeSeconds,
    gameSpeed,
    getPartFromInventory,
    installRootPart,
    installPart,
    removePart,
    selectJob,
    addServerNode,
    startJob,
    abortJob,
    tick,
    setGameSpeed
  };
});
