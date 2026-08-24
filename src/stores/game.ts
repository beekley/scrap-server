import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as u from 'safe-units';
import { s, ops, type Job, type Part, type ServerNode, isPartCompatibleWithSlot } from '../types';
import { createInitialServer, getJobTemplate, getPartTemplate } from '../data';
import { tickJob, canServerRunJob } from '../simulation';

export const useGameStore = defineStore('game', () => {
  const inventory = ref<Part[]>([
    getPartTemplate('case_chassis'),
    getPartTemplate('mb_trash'),
    getPartTemplate('cpu_old'),
    getPartTemplate('ram_1gb'),
    getPartTemplate('hdd_slow'),
    getPartTemplate('psu_200'),
  ]);
  const servers = ref<ServerNode[]>([createInitialServer()]);
  
  const availableJobs = ref<Job[]>([
    getJobTemplate('job_01'),
    getJobTemplate('job_02'),
    getJobTemplate('job_03'),
  ]);

  const activeJob = ref<Job | null>(null);
  const selectedJobId = ref<string | null>(null);
  const selectedServerId = ref<string | null>(servers.value[0].id);
  const cash = ref<number>(0);
  
  // Game clock: starts at 0, unit is game-seconds
  const gameTimeSeconds = ref<number>(0);

  function getPartFromInventory(partId: string): Part | undefined {
    return inventory.value.find(p => p.id === partId);
  }

  function installRootPart(serverId: string, inventoryPartId: string) {
    const server = servers.value.find(s => s.id === serverId);
    if (!server) return;

    const partIndex = inventory.value.findIndex(p => p.id === inventoryPartId);
    if (partIndex === -1) return;

    const part = inventory.value[partIndex];
    inventory.value.splice(partIndex, 1);
    server.installedParts.push(part);
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
      // Payout
      cash.value += activeJob.value.rewardCash;
      for (const partId of activeJob.value.rewardPartIds) {
        inventory.value.push(getPartTemplate(partId));
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
    getPartFromInventory,
    installRootPart,
    installPart,
    removePart,
    selectJob,
    addServerNode,
    startJob,
    abortJob,
    tick
  };
});
