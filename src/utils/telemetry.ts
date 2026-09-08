import { type Job, type ServerNode, type RamPart, type StoragePart } from '../types'
import { calculateComputeDetails } from '../simulation'

export interface TelemetryData {
  cpuPercent: number
  ramPercent: number
  swapGb: number
  ramThroughputPercent: number
  storageThroughputPercent: number
}

export function generateTelemetryData(
  server: ServerNode,
  runningJob: Job | undefined,
  serverTemps: Record<string, number>,
  criticalTemp: number
): TelemetryData {
  let cpuPercent = 0
  let ramPercent = 0
  let swapGb = 0
  let ramThroughputPercent = 0
  let storageThroughputPercent = 0

  if (runningJob && (serverTemps[server.id] ?? 25) < criticalTemp) {
    const details = calculateComputeDetails(server, runningJob, serverTemps)

    let totalRam = 0
    let ramTotalThroughput = 0
    let storageTotalThroughput = 0

    for (const part of server.installedParts) {
      if (part.kind === 'RAM') {
        const ramPart = part as RamPart
        totalRam += ramPart.memoryCapacity?.value || 0
        ramTotalThroughput += ramPart.ioBandwidth?.value || 0
      } else if (part.kind === 'STORAGE' || part.kind === 'STORAGE_DEVICE') {
        const storagePart = part as StoragePart
        storageTotalThroughput += storagePart.ioBandwidth?.value || 0
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
        const actualThroughputBytes =
          details.effectiveComputeRate.value * runningJob.memoryAccessPerOp.value

        for (const alloc of details.workingSetAllocation) {
          const usedBw = actualThroughputBytes * alloc.fraction
          if (alloc.part.kind === 'RAM') {
            ramUsedThroughput += usedBw
          } else {
            storageUsedThroughput += usedBw
          }
        }
      }

      if (ramTotalThroughput > 0)
        ramThroughputPercent = (ramUsedThroughput / ramTotalThroughput) * 100
      if (storageTotalThroughput > 0)
        storageThroughputPercent = (storageUsedThroughput / storageTotalThroughput) * 100
    }
  }

  return {
    cpuPercent,
    ramPercent,
    swapGb,
    ramThroughputPercent,
    storageThroughputPercent,
  }
}
