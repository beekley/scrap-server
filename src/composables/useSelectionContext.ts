import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { calculateComputeDetails, calculateTotalStorage, calculateServerPowerDraw, getJobProgress, canServerRunJob } from '../simulation'
import type { Job, ServerNode, Part } from '../types'
import { isServerValid } from '../types'
import { getServerOperatingLimits } from '../thermal'

export function useSelectionContext() {
  const gameStore = useGameStore()

  const selectedServer = computed(() => {
    return gameStore.servers.find((s) => s.id === gameStore.selectedItemId) || null
  })

  const selectedPart = computed(() => {
    const invPart = gameStore.inventory.find((p) => p.id === gameStore.selectedItemId)
    if (invPart) return invPart

    for (const s of gameStore.servers) {
      const installedPart = s.installedParts.find((p) => p.id === gameStore.selectedItemId)
      if (installedPart) return installedPart
    }
    return null
  })

  const displayedPart = computed(() => {
    if (selectedServer.value) {
      return selectedServer.value.installedParts.find((p) => p.kind === 'CASE') || null
    }
    return selectedPart.value
  })

  const parentServer = computed(() => {
    if (selectedServer.value) return selectedServer.value
    if (selectedPart.value) {
      return (
        gameStore.servers.find((s) =>
          s.installedParts.some((p) => p.id === selectedPart.value!.id),
        ) || null
      )
    }
    return null
  })

  const parentPart = computed(() => {
    if (!displayedPart.value) return null
    const pServer = parentServer.value
    if (!pServer) return null

    for (const part of pServer.installedParts) {
      if (part.slots) {
        for (const slot of part.slots) {
          if (slot.installedPartId === displayedPart.value!.id) {
            return part
          }
        }
      }
    }
    return null
  })

  const activeJobs = computed(() => gameStore.activeJobs)
  const activeJob = computed(() => {
    if (!parentServer.value) return null
    return activeJobs.value.find((j) => j.serverNodeIds?.includes(parentServer.value!.id)) || null
  })
  
  const selectedJob = computed(() =>
    gameStore.availableJobs.find((j) => j.id === gameStore.selectedJobId) || null
  )

  const isRunningJob = computed(() => !!activeJob.value)

  const telemetry = computed(() => {
    if (!selectedServer.value) return null
    const jobContext = isRunningJob.value ? activeJob.value : selectedJob.value
    if (!jobContext) return null
    try {
      // @ts-ignore
      return calculateComputeDetails(selectedServer.value as ServerNode, jobContext as Job, gameStore.serverTemps)
    } catch {
      return null
    }
  })

  const serverTemp = computed(() => {
    if (!selectedServer.value) return 25
    // @ts-ignore
    return gameStore.serverTemps[selectedServer.value.id] || 25
  })

  const operatingLimits = computed(() => {
    if (!selectedServer.value) return { maxOperatingTemp: 85, criticalTemp: 105 }
    // @ts-ignore
    return getServerOperatingLimits(selectedServer.value as ServerNode)
  })

  const serverTelemetry = computed(() => {
    if (!selectedServer.value) return null
    return gameStore.telemetryHistory[selectedServer.value.id] || null
  })

  const totalStorage = computed(() => {
    if (!selectedServer.value) return 0
    return calculateTotalStorage(selectedServer.value as ServerNode).value
  })

  const totalRam = computed(() => {
    if (!selectedServer.value) return 0
    return selectedServer.value.installedParts.reduce(
      (acc, p) => (p.kind === 'RAM' ? acc + p.memoryCapacity.value : acc),
      0,
    )
  })

  const usedStorage = computed(() => {
    if (isRunningJob.value && activeJob.value) return activeJob.value.totalSize.value
    return 0
  })

  const usedRam = computed(() => {
    if (
      isRunningJob.value &&
      activeJob.value &&
      telemetry.value &&
      telemetry.value.workingSetAllocation
    ) {
      let ramAllocated = 0
      for (const alloc of telemetry.value.workingSetAllocation) {
        if (alloc.part.kind === 'RAM') {
          ramAllocated += alloc.allocatedStorage.value
        }
      }
      return ramAllocated
    }
    return 0
  })

  const usedCpu = computed(() => {
    if (isRunningJob.value && telemetry.value) {
      return telemetry.value.effectiveComputeRate.value
    }
    return 0
  })

  const totalCpu = computed(() => {
    if (telemetry.value) {
      return telemetry.value.totalCpuCompute.value
    }
    return 0
  })

  const progressPercent = computed(() => {
    if (!isRunningJob.value || !activeJob.value) return 0
    return (getJobProgress(activeJob.value as Job) * 100).toFixed(1)
  })

  const serverPowerDraw = computed(() => {
    if (!selectedServer.value) return 0
    return calculateServerPowerDraw(selectedServer.value as ServerNode, isRunningJob.value)
  })

  const cpuPercent = computed(() =>
    totalCpu.value > 0 ? ((usedCpu.value / totalCpu.value) * 100).toFixed(1) : '0.0',
  )
  const ramPercent = computed(() =>
    totalRam.value > 0 ? ((usedRam.value / totalRam.value) * 100).toFixed(1) : '0.0',
  )
  const storagePercent = computed(() =>
    totalStorage.value > 0 ? ((usedStorage.value / totalStorage.value) * 100).toFixed(1) : '0.0',
  )

  const isServerComplete = computed(() => {
    if (!selectedServer.value) return false
    return isServerValid(selectedServer.value as ServerNode)
  })

  const canRunJob = computed(() => {
    if (!selectedServer.value || !selectedJob.value) return false
    return canServerRunJob(selectedServer.value as ServerNode, selectedJob.value as Job)
  })

  return {
    selectedServer,
    selectedPart,
    displayedPart,
    parentServer,
    parentPart,
    activeJob,
    selectedJob,
    isRunningJob,
    telemetry,
    serverTelemetry,
    totalStorage,
    totalRam,
    usedStorage,
    usedRam,
    usedCpu,
    totalCpu,
    progressPercent,
    serverPowerDraw,
    cpuPercent,
    ramPercent,
    storagePercent,
    isServerComplete,
    canRunJob,
    serverTemp,
    operatingLimits
  }
}
