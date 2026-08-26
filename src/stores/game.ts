import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as u from 'safe-units';
import { s, ops, type Job, type Part, type ServerNode, isPartCompatibleWithSlot } from '../types';
import { getPartTemplate } from '../data';
import { generateProceduralJob } from '../generators';
import { tickJob, canServerRunJob } from '../simulation';
import { findValidDropLocation, type RoomRect } from '../utils/physics';

export const useGameStore = defineStore('game', () => {
  function createStarterServer(): ServerNode {
    const c = getPartTemplate('case_techmaker_atx');
    const mb = getPartTemplate('mb_haodyn_h61');
    const cpu = getPartTemplate('cpu_acc_vectra_1155');
    const ram = getPartTemplate('ram_techmaker_4gb_ddr3');
    const hdd = getPartTemplate('hdd_techmaker_500gb');
    const psu = getPartTemplate('psu_techmaker_300w');

    // Wire up slots
    c.slots![0]!.installedPartId = mb.id;
    mb.slots!.find(s => s.id === 'cpu_0')!.installedPartId = cpu.id;
    mb.slots!.find(s => s.id === 'ram_0')!.installedPartId = ram.id;
    mb.slots!.find(s => s.id === 'sata_0')!.installedPartId = hdd.id;
    mb.slots!.find(s => s.id === 'psu_0')!.installedPartId = psu.id;

    return {
      id: 'server_01',
      name: 'Scrap Node 1',
      installedParts: [c, mb, cpu, ram, hdd, psu],
      x: 10,
      y: 250 - c.height // Placed directly on the floor
    };
  }

  const inventory = ref<Part[]>([]);
  const servers = ref<ServerNode[]>([createStarterServer()]);
  
  const availableJobs = ref<Job[]>([
    generateProceduralJob(),
    generateProceduralJob(),
    generateProceduralJob(),
  ]);

  const activeJob = ref<Job | null>(null);
  const selectedJobId = ref<string | null>(null);
  const selectedItemId = ref<string | null>(servers.value[0]?.id ?? null);
  const cash = ref<number>(0);
  
  // Game clock: starts at 0, unit is game-seconds
  const gameTimeSeconds = ref<number>(0);
  const gameSpeed = ref<number>(1); // 0 (paused), 1 (1x), 4 (4x), 16 (16x)

  function setGameSpeed(speed: number) {
    gameSpeed.value = speed;
  }

  function getRoomItems(): RoomRect[] {
    const items: RoomRect[] = [];
    for (const s of servers.value) {
      const casePart = s.installedParts.find(p => p.kind === 'CASE');
      if (casePart) {
        items.push({ id: s.id, x: s.x ?? 0, y: s.y ?? 0, width: casePart.width, height: casePart.height });
      }
    }
    for (const p of inventory.value) {
      items.push({ id: p.id, x: p.x ?? 0, y: p.y ?? 0, width: p.width, height: p.height });
    }
    return items;
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
              // Drop in room at a valid location
              const loc = findValidDropLocation(partToRemove.width, partToRemove.height, getRoomItems(), partToRemove.id);
              partToRemove.x = loc.x;
              partToRemove.y = loc.y;
              inventory.value.push(partToRemove);
            }
          }
          slot.installedPartId = null;
          return;
        }
      }
    }
  }

  function moveItem(id: string, x: number, y: number) {
    const part = inventory.value.find(p => p.id === id);
    if (part) {
      part.x = x;
      part.y = y;
      return;
    }
    const server = servers.value.find(s => s.id === id);
    if (server) {
      server.x = x;
      server.y = y;
    }
  }

  function selectJob(jobId: string) {
    selectedJobId.value = jobId;
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
        const part = getPartTemplate(partId);
        const loc = findValidDropLocation(part.width, part.height, getRoomItems(), part.id);
        part.x = loc.x;
        part.y = loc.y;
        
        if (part.kind === 'CASE') {
          servers.value.push({
            id: `server_${servers.value.length + 1}_${Math.random().toString(36).substring(2,8)}`,
            name: `Scrap Node ${servers.value.length + 1}`,
            installedParts: [part],
            x: part.x,
            y: part.y
          });
        } else {
          inventory.value.push(part);
        }
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
    selectedItemId,
    cash,
    gameTimeSeconds,
    gameSpeed,
    getPartFromInventory,
    installRootPart,
    installPart,
    removePart,
    moveItem,
    selectJob,
    startJob,
    abortJob,
    tick,
    setGameSpeed
  };
});
