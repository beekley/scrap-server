import * as u from 'safe-units'
import {
  B,
  bytesPerSecond,
  opsPerSecond,
  type Job,
  type OperationsPerSecond,
  type Part,
  type ServerNode,
  type Storage,
  type Throughput,
  type Time,
  isServerValid,
} from './types'
import { getServerOperatingLimits } from './thermal'

/**
 * Result details from advancing a job simulation tick.
 */
export interface JobTickResult {
  progress: number // 0.0 to 1.0 overall progress across all phases
  isCompleted: boolean
  currentPhase: Job['status']
  rate: number // Ops/s or Bytes/s depending on phase
}

/**
 * Detailed telemetry on node compute rate and bottlenecks.
 */
export interface WorkingSetAllocation {
  part: Part
  allocatedStorage: Storage
  fraction: number // 0.0 to 1.0
  bandwidth: Throughput
}

export interface NodeComputeDetails {
  totalCpuCompute: OperationsPerSecond
  workingSetThroughput: Throughput
  ioLimitCompute: OperationsPerSecond
  effectiveComputeRate: OperationsPerSecond
  isIoBottlenecked: boolean
  workingSetAllocation: WorkingSetAllocation[] | null
}

export interface StoragePartCandidate {
  part: Part
  capacity: Storage
  bandwidth: Throughput
}

export function normalizeServers(serverOrServers: ServerNode | ServerNode[]): ServerNode[] {
  return Array.isArray(serverOrServers) ? serverOrServers : [serverOrServers]
}

export function getAllParts(serverOrServers: ServerNode | ServerNode[]): Part[] {
  const servers = normalizeServers(serverOrServers)
  return servers.flatMap((server) => server.installedParts || [])
}

export function calculateTotalStorage(serverOrServers: ServerNode | ServerNode[]): Storage {
  const parts = getAllParts(serverOrServers)
  let total: Storage = u.Measure.of(0, B)

  for (const part of parts) {
    if (part.kind === 'RAM') {
      total = total.plus(part.memoryCapacity)
    } else if (part.kind === 'STORAGE' || part.kind === 'STORAGE_DEVICE') {
      total = total.plus(part.storageCapacity)
    }
  }

  return total
}

export function calculateTotalStorageBandwidth(
  serverOrServers: ServerNode | ServerNode[],
): Throughput {
  const parts = getAllParts(serverOrServers)
  let totalBW: Throughput = u.Measure.of(0, bytesPerSecond)

  for (const part of parts) {
    if (part.kind === 'STORAGE' || part.kind === 'STORAGE_DEVICE') {
      totalBW = totalBW.plus(part.ioBandwidth ?? u.Measure.of(0, bytesPerSecond))
    }
  }

  return totalBW
}

export function getStorageCapableParts(
  serverOrServers: ServerNode | ServerNode[],
): StoragePartCandidate[] {
  const parts = getAllParts(serverOrServers)
  const candidates: StoragePartCandidate[] = []

  for (const part of parts) {
    if (part.kind === 'RAM') {
      candidates.push({
        part,
        capacity: part.memoryCapacity,
        bandwidth: part.ioBandwidth,
      })
    } else if (part.kind === 'STORAGE') {
      candidates.push({
        part,
        capacity: part.storageCapacity,
        bandwidth: part.ioBandwidth,
      })
    } else if (part.kind === 'STORAGE_DEVICE') {
      candidates.push({
        part,
        capacity: part.storageCapacity,
        bandwidth: part.ioBandwidth ?? u.Measure.of(0, bytesPerSecond),
      })
    }
  }

  return candidates
}

export function calculateWorkingSetAllocation(
  serverOrServers: ServerNode | ServerNode[],
  workingSetSize: Storage,
): WorkingSetAllocation[] | null {
  const candidates = getStorageCapableParts(serverOrServers)

  // Sort descending by bandwidth
  candidates.sort((a, b) => b.bandwidth.value - a.bandwidth.value)

  const allocations: WorkingSetAllocation[] = []
  let remaining = workingSetSize.value

  for (const candidate of candidates) {
    if (remaining <= 0) break

    const allocate = Math.min(candidate.capacity.value, remaining)
    if (allocate > 0) {
      allocations.push({
        part: candidate.part,
        allocatedStorage: u.Measure.of(allocate, B),
        fraction: allocate / workingSetSize.value,
        bandwidth: candidate.bandwidth,
      })
      remaining -= allocate
    }
  }

  // If we couldn't satisfy the whole working set, return null
  if (remaining > 1e-9) return null // Small epsilon for float math

  return allocations
}

export function canServerRunJob(serverOrServers: ServerNode | ServerNode[], job: Job): boolean {
  const servers = normalizeServers(serverOrServers)

  // All nodes must be valid
  if (!servers.every((s) => isServerValid(s))) {
    return false
  }

  const totalStorage = calculateTotalStorage(servers)
  const hasSufficientTotalStorage = totalStorage.gte(job.totalSize)

  const allocation = calculateWorkingSetAllocation(servers, job.workingSetSize)
  const hasSufficientWorkingSet = allocation !== null

  return hasSufficientTotalStorage && hasSufficientWorkingSet
}

export function calculateComputeDetails(
  serverOrServers: ServerNode | ServerNode[],
  job: Job,
  serverTemps?: Record<string, number>,
): NodeComputeDetails {
  const parts = getAllParts(serverOrServers)
  let totalCpuCompute: OperationsPerSecond = u.Measure.of(0, opsPerSecond)

  for (const part of parts) {
    if (part.kind === 'CPU') {
      totalCpuCompute = totalCpuCompute.plus(part.computeRate)
    }
  }

  const allocation = calculateWorkingSetAllocation(serverOrServers, job.workingSetSize)

  if (!canServerRunJob(serverOrServers, job) || !allocation || totalCpuCompute.value === 0) {
    return {
      totalCpuCompute,
      workingSetThroughput: u.Measure.of(0, bytesPerSecond),
      ioLimitCompute: u.Measure.of(0, opsPerSecond),
      effectiveComputeRate: u.Measure.of(0, opsPerSecond),
      isIoBottlenecked: false,
      workingSetAllocation: allocation,
    }
  }

  let effectiveBandwidthVal = 0
  if (job.memoryAccessPerOp.value === 0) {
    // Arbitrarily high if IO doesn't matter
    effectiveBandwidthVal = Infinity
  } else {
    // Harmonic mean for effective bandwidth: 1 / Sum(Fraction_i / Bandwidth_i)
    let sumInverse = 0
    for (const alloc of allocation) {
      if (alloc.bandwidth.value > 0) {
        sumInverse += alloc.fraction / alloc.bandwidth.value
      } else {
        // If any part of the working set is on a 0-bandwidth device, throughput is 0
        sumInverse = Infinity
        break
      }
    }
    effectiveBandwidthVal = sumInverse > 0 ? 1 / sumInverse : 0
  }

  const workingSetThroughput = u.Measure.of(effectiveBandwidthVal, bytesPerSecond)

  let ioLimitCompute: OperationsPerSecond
  if (job.memoryAccessPerOp.value === 0) {
    ioLimitCompute = u.Measure.of(Infinity, opsPerSecond)
  } else {
    ioLimitCompute = workingSetThroughput.over(job.memoryAccessPerOp)
  }

  const isIoBottlenecked = ioLimitCompute.lt(totalCpuCompute)
  let effectiveComputeRate = isIoBottlenecked ? ioLimitCompute : totalCpuCompute

  if (serverTemps) {
    const servers = normalizeServers(serverOrServers)
    let minThrottleMultiplier = 1.0
    for (const server of servers) {
      const temp = serverTemps[server.id] || 25
      const { maxOperatingTemp, criticalTemp } = getServerOperatingLimits(server)
      
      if (temp >= criticalTemp) {
        minThrottleMultiplier = 0
      } else if (temp > maxOperatingTemp) {
        const range = criticalTemp - maxOperatingTemp
        const excess = temp - maxOperatingTemp
        const throttle = Math.max(0.1, 1.0 - (excess / range) * 0.9)
        if (throttle < minThrottleMultiplier) {
          minThrottleMultiplier = throttle
        }
      }
    }
    
    if (minThrottleMultiplier < 1.0) {
      effectiveComputeRate = u.Measure.of(effectiveComputeRate.value * minThrottleMultiplier, opsPerSecond)
    }
  }

  return {
    totalCpuCompute,
    workingSetThroughput,
    ioLimitCompute,
    effectiveComputeRate,
    isIoBottlenecked,
    workingSetAllocation: allocation,
  }
}

/**
 * Calculates the effective operations per second rate for a job running on server node(s).
 */
export function calculateEffectiveComputeRate(
  serverOrServers: ServerNode | ServerNode[],
  job: Job,
  serverTemps?: Record<string, number>,
): OperationsPerSecond {
  return calculateComputeDetails(serverOrServers, job, serverTemps).effectiveComputeRate
}

/**
 * Returns current job progress fraction between 0.0 and 1.0.
 */
export function getJobProgress(job: Job): number {
  let totalParts = 0
  let completedParts = 0

  if (job.downloadSize.value > 0) {
    totalParts += 1
    completedParts += Math.min(1.0, job.downloadedBytes.value / job.downloadSize.value)
  }
  if (job.operationsRequired.value > 0) {
    totalParts += 1
    completedParts += Math.min(1.0, job.workCompleted.value / job.operationsRequired.value)
  }
  if (job.uploadSize.value > 0) {
    totalParts += 1
    completedParts += Math.min(1.0, job.uploadedBytes.value / job.uploadSize.value)
  }

  if (totalParts === 0) return 1.0
  return completedParts / totalParts
}

/**
 * Advances a running job by a time increment dt.
 * Mutates job state and returns tick results.
 */
export function tickJob(
  job: Job,
  serverOrServers: ServerNode | ServerNode[],
  dt: Time,
  serverTemps?: Record<string, number>,
): JobTickResult {
  if (job.status === 'NOT_STARTED') {
    job.status = 'LOADING'
  }

  if (job.status === 'COMPLETED') {
    return {
      progress: 1.0,
      isCompleted: true,
      currentPhase: 'COMPLETED',
      rate: 0,
    }
  }

  if (!canServerRunJob(serverOrServers, job)) {
    return {
      progress: getJobProgress(job),
      isCompleted: false,
      currentPhase: job.status,
      rate: 0,
    }
  }

  let rate = 0

  // Phase 1: LOADING
  if (job.status === 'LOADING') {
    if (job.downloadSize.value <= 0 || job.downloadedBytes.gte(job.downloadSize)) {
      job.downloadedBytes = job.downloadSize
      job.status = 'COMPUTING'
    } else {
      const storageBw = calculateTotalStorageBandwidth(serverOrServers)
      rate = storageBw.value
      const bytesThisTick = storageBw.times(dt)
      job.downloadedBytes = job.downloadedBytes.plus(bytesThisTick)
      if (job.downloadedBytes.gte(job.downloadSize)) {
        job.downloadedBytes = job.downloadSize
        job.status = 'COMPUTING'
      }
    }
  }

  // Phase 2: COMPUTING
  if (job.status === 'COMPUTING') {
    if (job.operationsRequired.value <= 0 || job.workCompleted.gte(job.operationsRequired)) {
      job.workCompleted = job.operationsRequired
      job.status = 'SAVING'
    } else {
      const effectiveRate = calculateEffectiveComputeRate(serverOrServers, job, serverTemps)
      rate = effectiveRate.value
      const opsThisTick = effectiveRate.times(dt)
      job.workCompleted = job.workCompleted.plus(opsThisTick)
      if (job.workCompleted.gte(job.operationsRequired)) {
        job.workCompleted = job.operationsRequired
        job.status = 'SAVING'
      }
    }
  }

  // Phase 3: SAVING
  if (job.status === 'SAVING') {
    if (job.uploadSize.value <= 0 || job.uploadedBytes.gte(job.uploadSize)) {
      job.uploadedBytes = job.uploadSize
      job.status = 'COMPLETED'
    } else {
      const storageBw = calculateTotalStorageBandwidth(serverOrServers)
      rate = storageBw.value
      const bytesThisTick = storageBw.times(dt)
      job.uploadedBytes = job.uploadedBytes.plus(bytesThisTick)
      if (job.uploadedBytes.gte(job.uploadSize)) {
        job.uploadedBytes = job.uploadSize
        job.status = 'COMPLETED'
      }
    }
  }

  return {
    progress: getJobProgress(job),
    isCompleted: job.status === 'COMPLETED',
    currentPhase: job.status,
    rate,
  }
}

/**
 * Calculates the current power draw of a server node in Watts, taking into account idle state.
 */
export function calculateServerPowerDraw(server: ServerNode, isRunningJob: boolean): number {
  let serverWatts = 0
  for (const part of server.installedParts) {
    if (part.kind !== 'PSU') {
      if (isRunningJob) {
        serverWatts += part.powerDraw.value
      } else {
        serverWatts += part.idlePowerDraw ? part.idlePowerDraw.value : part.powerDraw.value * 0.01
      }
    }
  }
  return serverWatts
}
