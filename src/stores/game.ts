import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as u from 'safe-units'
import {
  s,
  ops,
  type Job,
  type Part,
  type ServerNode,
  isPartCompatibleWithSlot,
  type Currency,
  ETC,
  W,
  type Power,
} from '../types'
import { getPartTemplate, allParts } from '../data'
import { generateProceduralJob } from '../generators'
import { tickJob, canServerRunJob, calculateServerPowerDraw } from '../simulation'
import {
  findValidDropLocation,
  type RoomRect,
  TRANSFER_ZONE_START_X,
  TRANSFER_ZONE_WIDTH,
  ROOM_WIDTH,
} from '../utils/physics'
import { autoAssembleRewards } from '../utils/assembly'

export const useGameStore = defineStore('game', () => {
  function createStarterServer(): ServerNode {
    const c = getPartTemplate('case_techmaker_atx')
    const mb = getPartTemplate('mb_techmaker_am2')
    const cpu = getPartTemplate('cpu_acc_titan_legacy_4200')
    const ram = getPartTemplate('ram_techmaker_512mb')
    const hdd = getPartTemplate('hdd_techmaker_250gb')
    const psu = getPartTemplate('psu_techmaker_300w')

    // Wire up slots
    c.slots![0]!.installedPartId = mb.id
    mb.slots!.find((s) => s.id === 'cpu_0')!.installedPartId = cpu.id
    mb.slots!.find((s) => s.id === 'ram_0')!.installedPartId = ram.id
    mb.slots!.find((s) => s.id === 'sata_0')!.installedPartId = hdd.id
    mb.slots!.find((s) => s.id === 'psu_0')!.installedPartId = psu.id

    return {
      id: 'server_01',
      name: 'Scrap Node 1',
      installedParts: [c, mb, cpu, ram, hdd, psu],
      x: 10,
      y: 250 - c.height, // Placed directly on the floor
    }
  }

  const isDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'true'

  const starterServer = createStarterServer()
  const servers = ref<ServerNode[]>([starterServer])

  const initialInventory: Part[] = []
  if (isDebug) {
    const roomItems: RoomRect[] = []
    const casePart = starterServer.installedParts.find(p => p.kind === 'CASE')
    if (casePart) {
      roomItems.push({
        id: starterServer.id,
        x: starterServer.x ?? 0,
        y: starterServer.y ?? 0,
        width: casePart.width,
        height: casePart.height
      })
    }
    
    allParts.forEach((part) => {
      const p = getPartTemplate(part.id)
      const loc = findValidDropLocation(p.width, p.height, roomItems, p.id, 0, ROOM_WIDTH)
      p.x = loc.x
      p.y = loc.y
      roomItems.push({ id: p.id, x: p.x, y: p.y, width: p.width, height: p.height })
      initialInventory.push(p)
    })
  }

  const inventory = ref<Part[]>(initialInventory)

  const availableJobs = ref<Job[]>([
    generateProceduralJob(),
    generateProceduralJob(),
    generateProceduralJob(),
  ])

  const activeJobs = ref<Job[]>([])
  const selectedJobId = ref<string | null>(null)
  const selectedItemId = ref<string | null>(servers.value[0]?.id ?? null)

  const etc = ref<Currency>(u.Measure.of(0.025, ETC))
  const currentPowerDraw = ref<Power>(u.Measure.of(0, W))
  const outOfPower = ref<boolean>(false)

  // Game clock: starts at 0, unit is game-seconds
  const gameTimeSeconds = ref<number>(0)
  const gameSpeed = ref<number>(1) // 0 (paused), 1 (1x), 4 (4x), 16 (16x), 64 (64x)

  function setGameSpeed(speed: number) {
    gameSpeed.value = speed
  }

  function getRoomItems(): RoomRect[] {
    const items: RoomRect[] = []
    for (const s of servers.value) {
      const casePart = s.installedParts.find((p) => p.kind === 'CASE')
      if (casePart) {
        items.push({
          id: s.id,
          x: s.x ?? 0,
          y: s.y ?? 0,
          width: casePart.width,
          height: casePart.height,
        })
      }
    }
    for (const p of inventory.value) {
      items.push({ id: p.id, x: p.x ?? 0, y: p.y ?? 0, width: p.width, height: p.height })
    }
    return items
  }

  function getPartFromInventory(partId: string): Part | undefined {
    return inventory.value.find((p) => p.id === partId) as Part | undefined
  }

  function installRootPart(serverId: string, inventoryPartId: string) {
    const server = servers.value.find((s) => s.id === serverId)
    if (!server) return

    const partIndex = inventory.value.findIndex((p) => p.id === inventoryPartId)
    if (partIndex === -1) return

    const part = inventory.value[partIndex]
    if (!part) return
    inventory.value.splice(partIndex, 1)
    server.installedParts.push(part as Part)
  }

  function installPart(serverId: string, slotId: string, partId: string) {
    const server = servers.value.find((s) => s.id === serverId)
    if (!server) return

    // Find the slot in any part
    for (const p of server.installedParts) {
      if (p.slots) {
        const slot = p.slots.find((s) => s.id === slotId)
        if (slot) {
          const invPartIndex = inventory.value.findIndex((ip) => ip.id === partId)
          if (invPartIndex === -1) return
          const invPart = inventory.value[invPartIndex]
          if (!invPart) return

          if (!isPartCompatibleWithSlot(invPart as Part, slot)) return

          // If there's already a part, remove it first
          if (slot.installedPartId) {
            removePart(serverId, slotId)
          }

          slot.installedPartId = invPart.id
          server.installedParts.push(invPart)
          inventory.value.splice(invPartIndex, 1)
          return
        }
      }
    }
  }

  function removePart(serverId: string, slotId: string) {
    const server = servers.value.find((s) => s.id === serverId)
    if (!server) return

    for (const p of server.installedParts) {
      if (p.slots) {
        const slot = p.slots.find((s) => s.id === slotId)
        if (slot && slot.installedPartId) {
          const installedPartId = slot.installedPartId
          const partIndex = server.installedParts.findIndex((ip) => ip.id === installedPartId)
          if (partIndex !== -1) {
            const partToRemove = server.installedParts[partIndex]
            if (partToRemove) {
              server.installedParts.splice(partIndex, 1)
              // Drop in room at a valid location
              const loc = findValidDropLocation(
                partToRemove.width,
                partToRemove.height,
                getRoomItems(),
                partToRemove.id,
              )
              partToRemove.x = loc.x
              partToRemove.y = loc.y
              inventory.value.push(partToRemove)
            }
          }
          slot.installedPartId = null
          return
        }
      }
    }
  }

  function moveItem(id: string, x: number, y: number) {
    const part = inventory.value.find((p) => p.id === id)
    if (part) {
      part.x = x
      part.y = y
      return
    }
    const server = servers.value.find((s) => s.id === id)
    if (server) {
      server.x = x
      server.y = y
    }
  }

  function selectJob(jobId: string) {
    selectedJobId.value = jobId
  }

  function startJob(serverId: string, jobId: string) {
    // Prevent running multiple jobs on the same server
    const isServerBusy = activeJobs.value.some((j) => j.serverNodeIds?.includes(serverId))
    if (isServerBusy) return

    const server = servers.value.find((s) => s.id === serverId)
    const jobTpl = availableJobs.value.find((j) => j.id === jobId)

    if (!server || !jobTpl) return
    if (!canServerRunJob(server as ServerNode, jobTpl as Job)) return

    // Clone job for execution
    const newJob = { ...jobTpl }
    newJob.serverNodeIds = [serverId]
    newJob.workCompleted = u.Measure.of(0, ops)
    activeJobs.value.push(newJob)
  }

  function abortJob(jobId?: string) {
    if (jobId) {
      const index = activeJobs.value.findIndex((j) => j.id === jobId)
      if (index !== -1) {
        activeJobs.value.splice(index, 1)
      }
    }
  }

  const pendingRewardPartIds = ref<string[]>([])
  const currentDay = ref<number>(0)
  const showTransferPanel = ref<boolean>(false)

  function sellTransferPanel() {
    let totalValue = 0

    // Remove servers in transfer zone
    for (let i = servers.value.length - 1; i >= 0; i--) {
      const server = servers.value[i]
      if (server && server.x !== undefined && server.x >= TRANSFER_ZONE_START_X) {
        for (const part of server.installedParts) {
          totalValue += part.value.value
        }
        servers.value.splice(i, 1)
      }
    }

    // Remove inventory parts in transfer zone
    for (let i = inventory.value.length - 1; i >= 0; i--) {
      const part = inventory.value[i]
      if (part && part.x !== undefined && part.x >= TRANSFER_ZONE_START_X) {
        totalValue += part.value.value
        inventory.value.splice(i, 1)
      }
    }

    const earned = totalValue * 0.25
    etc.value = u.Measure.of(etc.value.value + earned, ETC)
    showTransferPanel.value = false
    setGameSpeed(1)
  }

  function tick(dtSeconds: number = 6) {
    gameTimeSeconds.value += dtSeconds

    const day = Math.floor(gameTimeSeconds.value / 86400)
    if (day > currentDay.value && gameTimeSeconds.value > 0) {
      currentDay.value = day
      setGameSpeed(0)
      showTransferPanel.value = true

      const { newServers, leftoverParts } = autoAssembleRewards(
        pendingRewardPartIds.value,
        servers.value.length,
        getRoomItems,
        findValidDropLocation,
        TRANSFER_ZONE_START_X,
        TRANSFER_ZONE_START_X + TRANSFER_ZONE_WIDTH,
      )

      servers.value.push(...newServers)
      inventory.value.push(...leftoverParts)
      pendingRewardPartIds.value = []
    }

    // Power calculation
    let totalWatts = 0
    for (const server of servers.value) {
      const isRunningJob = activeJobs.value.some((j) => j.serverNodeIds?.includes(server.id))
      totalWatts += calculateServerPowerDraw(server as ServerNode, isRunningJob)
    }

    currentPowerDraw.value = u.Measure.of(totalWatts, W)

    const kwh = (totalWatts / 1000) * (dtSeconds / 3600)
    const cost = kwh * 0.0001

    if (etc.value.value >= cost) {
      etc.value = u.Measure.of(etc.value.value - cost, ETC)
      outOfPower.value = false
    } else {
      etc.value = u.Measure.of(0, ETC)
      outOfPower.value = true
    }

    if (!outOfPower.value) {
      for (let i = activeJobs.value.length - 1; i >= 0; i--) {
        const job = activeJobs.value[i]
        if (job && job.serverNodeIds && job.serverNodeIds.length > 0) {
          const serverId = job.serverNodeIds[0]
          const server = servers.value.find((s) => s.id === serverId)
          if (server) {
            const dt = u.Measure.of(dtSeconds, s)
            const result = tickJob(job as Job, server as ServerNode, dt)

            if (result.isCompleted) {
              // Payout - queue up rewards
              pendingRewardPartIds.value.push(...job.rewardPartIds)

              // Remove old job and replace with new one
              const oldJobIndex = availableJobs.value.findIndex((j) => j.id === job.id)
              if (oldJobIndex !== -1) {
                availableJobs.value.splice(oldJobIndex, 1, generateProceduralJob())
              }

              activeJobs.value.splice(i, 1)
            }
          }
        }
      }
    }
  }

  return {
    inventory,
    servers,
    availableJobs,
    activeJobs,
    selectedJobId,
    selectedItemId,
    etc,
    currentPowerDraw,
    outOfPower,
    gameTimeSeconds,
    gameSpeed,
    showTransferPanel,
    getPartFromInventory,
    installRootPart,
    installPart,
    removePart,
    moveItem,
    selectJob,
    startJob,
    abortJob,
    tick,
    setGameSpeed,
    sellTransferPanel,
  }
})
