import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
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
  type Decoration,
} from '../types'
import { getPartTemplate, allParts } from '../data'
import { generateProceduralJob } from '../generators'
import { tickJob, canServerRunJob, calculateServerPowerDraw, calculateComputeDetails } from '../simulation'
import { tickThermal, createInitialGrid, getServerOperatingLimits } from '../thermal'
import {
  findValidDropLocation,
  type RoomRect,
  ROOM_WIDTH,
  OUTSIDE_LEFT_WIDTH,
  isItemOutside,
  STORAGE_UNIT_START_X,
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
    const fan = getPartTemplate('fan_basic_120mm')

    // Wire up slots
    c.slots![0]!.installedPartId = mb.id
    c.slots![1]!.installedPartId = fan.id
    mb.slots!.find((s) => s.id === 'cpu_0')!.installedPartId = cpu.id
    mb.slots!.find((s) => s.id === 'ram_0')!.installedPartId = ram.id
    mb.slots!.find((s) => s.id === 'sata_0')!.installedPartId = hdd.id
    mb.slots!.find((s) => s.id === 'psu_0')!.installedPartId = psu.id

    return {
      id: 'server_01',
      name: 'Scrap Node 1',
      installedParts: [c, mb, cpu, ram, hdd, psu, fan],
      x: STORAGE_UNIT_START_X + 20,
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
  const completedJobs = ref<Job[]>([])
  const pastJobs = ref<Job[]>([])
  const selectedJobId = ref<string | null>(null)
  const selectedItemId = ref<string | null>(null)

  const etc = ref<Currency>(u.Measure.of(0.025, ETC))
  const currentPowerDraw = ref<Power>(u.Measure.of(0, W))
  const outOfPower = ref<boolean>(false)

  // Game clock: starts at 8 AM, unit is game-seconds
  const gameTimeSeconds = ref<number>(8 * 3600)
  const gameSpeed = ref<number>(1) // 0 (paused), 1 (1x), 4 (4x), 16 (16x), 64 (64x)

  const isViewingOutside = ref<boolean>(true)
  const decorations = ref<Decoration[]>([
    {
      id: 'tut_note_1',
      type: 'NOTE',
      content: "Hey kid, heard you're looking to run some compute. Here's a junker case and some old DDR3 to get you started. Hook it up and check the local intranet for jobs. - Uncle Dave\n\nP.S. I leave items outside the unit to be sold by the scrapper at 6 AM. Deliveries arrive at 8 AM.",
      parentObjectId: 'exterior_door', // special ID for the garage door
      relativeX: 40,
      relativeY: 40,
    }
  ])

  interface TimeseriesData {
    time: number[]
    power: number[]
    cpu: number[]
    ram: number[]
    swap: number[]
    ramThroughput: number[]
    storageThroughput: number[]
    temp: number[] // Added temperature to history
  }
  const telemetryHistory = ref<Record<string, TimeseriesData>>({})

  const serverTemps = ref<Record<string, number>>({})
  const roomGrid = ref<number[][]>(createInitialGrid())
  const showHeatMap = ref<boolean>(false)

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

  function canSlotItem(id: string, x: number, y: number): boolean {
    const part = inventory.value.find((p) => p.id === id)
    if (!part) return false

    for (const server of servers.value) {
      const casePart = server.installedParts.find(p => p.kind === 'CASE')
      if (casePart) {
        const sx = server.x ?? 0
        const sy = server.y ?? 0
        const sw = casePart.width
        const sh = casePart.height
        const pw = part.width
        const ph = part.height

        if (x < sx + sw && x + pw > sx && y < sy + sh && y + ph > sy) {
          for (const sp of server.installedParts) {
            if (sp.slots) {
              for (const slot of sp.slots) {
                if (!slot.installedPartId && isPartCompatibleWithSlot(part as Part, slot)) {
                  return true
                }
              }
            }
          }
        }
      }
    }
    return false
  }

  function moveItem(id: string, x: number, y: number) {
    const part = inventory.value.find((p) => p.id === id)
    if (part) {
      // Check for overlap with any server to auto-slot the part
      for (const server of servers.value) {
        const casePart = server.installedParts.find(p => p.kind === 'CASE')
        if (casePart) {
          const sx = server.x ?? 0
          const sy = server.y ?? 0
          const sw = casePart.width
          const sh = casePart.height
          const pw = part.width
          const ph = part.height

          // Check intersection
          if (x < sx + sw && x + pw > sx && y < sy + sh && y + ph > sy) {
            // Find a valid open slot
            let installed = false
            for (const sp of server.installedParts) {
              if (sp.slots) {
                for (const slot of sp.slots) {
                  if (!slot.installedPartId && isPartCompatibleWithSlot(part as Part, slot)) {
                    installPart(server.id, slot.id, part.id)
                    installed = true
                    break
                  }
                }
              }
              if (installed) break
            }
            if (installed) return
          }
        }
      }

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
    if (selectedJobId.value === jobId) {
      selectedJobId.value = null
    } else {
      selectedJobId.value = jobId
    }
  }

  function selectItem(itemId: string) {
    if (selectedItemId.value === itemId) {
      selectedItemId.value = null
    } else {
      selectedItemId.value = itemId
    }
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

  const pendingSaleValue = computed(() => {
    let totalValue = 0
    for (const server of servers.value) {
      const casePart = server.installedParts.find(p => p.kind === 'CASE')
      if (server.x !== undefined && casePart && isItemOutside(server.x, casePart.width)) {
        for (const part of server.installedParts) {
          totalValue += part.value.value
        }
      }
    }
    for (const part of inventory.value) {
      if (part.x !== undefined && isItemOutside(part.x, part.width)) {
        totalValue += part.value.value
      }
    }
    return totalValue * 0.25 // 25% of base value
  })

  function processAutoSell() {
    let totalValue = 0

    // Remove servers in outside zone
    for (let i = servers.value.length - 1; i >= 0; i--) {
      const server = servers.value[i]
      if (!server) continue
      const casePart = server.installedParts.find(p => p.kind === 'CASE')
      if (server.x !== undefined && casePart && isItemOutside(server.x, casePart.width)) {
        for (const part of server.installedParts) {
          totalValue += part.value.value
        }
        servers.value.splice(i, 1)
      }
    }

    // Remove inventory parts in outside zone
    for (let i = inventory.value.length - 1; i >= 0; i--) {
      const part = inventory.value[i]
      if (part && part.x !== undefined && isItemOutside(part.x, part.width)) {
        totalValue += part.value.value
        inventory.value.splice(i, 1)
      }
    }

    const earned = totalValue * 0.25
    if (earned > 0) {
      etc.value = u.Measure.of(etc.value.value + earned, ETC)
    }
  }

  function toggleOutsideView() {
    isViewingOutside.value = !isViewingOutside.value
  }

  function tick(dtSeconds: number = 6) {
    const oldTime = gameTimeSeconds.value
    gameTimeSeconds.value += dtSeconds
    const newTime = gameTimeSeconds.value

    const dayLength = 86400
    const newDay = Math.floor(newTime / dayLength)

    const sixAmTime = newDay * dayLength + 6 * 3600
    if (oldTime < sixAmTime && newTime >= sixAmTime) {
      processAutoSell()
    }

    const eightAmTime = newDay * dayLength + 8 * 3600
    if (oldTime < eightAmTime && newTime >= eightAmTime) {
      if (pendingRewardPartIds.value.length > 0) {
        const { newServers, leftoverParts } = autoAssembleRewards(
          pendingRewardPartIds.value,
          servers.value.length,
          getRoomItems,
          findValidDropLocation,
          0,
          OUTSIDE_LEFT_WIDTH, // Drop rewards in the left outside zone
        )

        servers.value.push(...newServers)
        inventory.value.push(...leftoverParts)
        pendingRewardPartIds.value = []
      }

      pastJobs.value.push(...completedJobs.value)
      completedJobs.value = []
    }

    // Power and Telemetry calculation
    let totalWatts = 0
    const serverWattsMap: Record<string, number> = {}

    for (const server of servers.value) {
      const runningJob = activeJobs.value.find((j) => j.serverNodeIds?.includes(server.id))
      const serverPower = calculateServerPowerDraw(server as ServerNode, !!runningJob)
      totalWatts += serverPower
      serverWattsMap[server.id] = serverPower
    }

    tickThermal(serverTemps.value, roomGrid.value, servers.value as ServerNode[], serverWattsMap, dtSeconds)

    for (const server of servers.value) {
      const runningJob = activeJobs.value.find((j) => j.serverNodeIds?.includes(server.id))
      const serverPower = serverWattsMap[server.id]

      let cpuPercent = 0
      let ramPercent = 0
      let swapGb = 0
      let ramThroughputPercent = 0
      let storageThroughputPercent = 0

      // Check for crashes
      const { criticalTemp } = getServerOperatingLimits(server as ServerNode)
      if ((serverTemps.value[server.id] ?? 25) >= criticalTemp) {
        if (runningJob) {
          abortJob(runningJob.id)
        }
      }

      if (runningJob && (serverTemps.value[server.id] ?? 25) < criticalTemp) {
        const details = calculateComputeDetails(server as ServerNode, runningJob as Job, serverTemps.value)
        
        let totalRam = 0
        let ramTotalThroughput = 0
        let storageTotalThroughput = 0
        
        for (const part of server.installedParts) {
          if (part.kind === 'RAM') {
            totalRam += (part as any).memoryCapacity?.value || 0
            ramTotalThroughput += (part as any).ioBandwidth?.value || 0
          } else if (part.kind === 'STORAGE' || part.kind === 'STORAGE_DEVICE') {
            storageTotalThroughput += (part as any).ioBandwidth?.value || 0
          }
        }

        let usedRam = 0

        if (details.workingSetAllocation) {
          for (const alloc of details.workingSetAllocation) {
            if (alloc.part.kind === 'RAM') {
              usedRam += alloc.allocatedStorage.value
            } else {
              swapGb += alloc.allocatedStorage.value / 1e9
            }
          }
        }
        
        if (totalRam > 0) ramPercent = (usedRam / totalRam) * 100

        if (runningJob.status === 'LOADING' || runningJob.status === 'SAVING') {
          storageThroughputPercent = 100
        } else if (runningJob.status === 'COMPUTING') {
          const totalCpu = details.totalCpuCompute.value
          const usedCpu = details.effectiveComputeRate.value
          if (totalCpu > 0) cpuPercent = (usedCpu / totalCpu) * 100
          
          let ramUsedThroughput = 0
          let storageUsedThroughput = 0

          if (details.workingSetAllocation) {
            const actualThroughputBytes = details.effectiveComputeRate.value * runningJob.memoryAccessPerOp.value
            
            for (const alloc of details.workingSetAllocation) {
              const usedBw = actualThroughputBytes * alloc.fraction
              if (alloc.part.kind === 'RAM') {
                ramUsedThroughput += usedBw
              } else {
                storageUsedThroughput += usedBw
              }
            }
          }

          if (ramTotalThroughput > 0) ramThroughputPercent = (ramUsedThroughput / ramTotalThroughput) * 100
          if (storageTotalThroughput > 0) storageThroughputPercent = (storageUsedThroughput / storageTotalThroughput) * 100
        }
      }

      if (!telemetryHistory.value[server.id]) {
        telemetryHistory.value[server.id] = { time: [], power: [], cpu: [], ram: [], swap: [], ramThroughput: [], storageThroughput: [], temp: [] }
      }
      const history = telemetryHistory.value[server.id]!
      history.time.push(gameTimeSeconds.value)
      history.power.push(serverPower ?? 0)
      history.cpu.push(cpuPercent)
      history.ram.push(ramPercent)
      history.swap.push(swapGb)
      history.ramThroughput.push(ramThroughputPercent)
      history.storageThroughput.push(storageThroughputPercent)
      history.temp.push((serverTemps.value[server.id] ?? 25))
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
            const result = tickJob(job as Job, server as ServerNode, dt, serverTemps.value)

            if (result.isCompleted) {
              // Payout - queue up rewards
              pendingRewardPartIds.value.push(...job.rewardPartIds)

              // Remove old job and replace with new one
              const oldJobIndex = availableJobs.value.findIndex((j) => j.id === job.id)
              if (oldJobIndex !== -1) {
                availableJobs.value.splice(oldJobIndex, 1, generateProceduralJob())
              }

              completedJobs.value.push(job)
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
    completedJobs,
    pastJobs,
    selectedJobId,
    selectedItemId,
    etc,
    currentPowerDraw,
    outOfPower,
    gameTimeSeconds,
    gameSpeed,
    isViewingOutside,
    decorations,
    pendingSaleValue,
    showHeatMap,
    telemetryHistory,
    serverTemps,
    roomGrid,
    getPartFromInventory,
    installRootPart,
    installPart,
    removePart,
    moveItem,
    canSlotItem,
    selectJob,
    selectItem,
    startJob,
    abortJob,
    tick,
    setGameSpeed,
    toggleOutsideView,
  }
})
