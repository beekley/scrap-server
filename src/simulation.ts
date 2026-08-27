import * as u from "safe-units";
import {
  B,
  bytesPerSecond,
  ops,
  opsPerSecond,
  type Job,
  type Operations,
  type OperationsPerSecond,
  type Part,
  type ServerNode,
  type Storage,
  type Throughput,
  type Time,
} from "./types";

/**
 * Result details from advancing a job simulation tick.
 */
export interface JobTickResult {
  opsCompletedThisTick: Operations;
  effectiveRate: OperationsPerSecond;
  progress: number; // 0.0 to 1.0
  isCompleted: boolean;
}

/**
 * Detailed telemetry on node compute rate and bottlenecks.
 */
export interface WorkingSetAllocation {
  part: Part;
  allocatedStorage: Storage;
  fraction: number; // 0.0 to 1.0
  bandwidth: Throughput;
}

export interface NodeComputeDetails {
  totalCpuCompute: OperationsPerSecond;
  workingSetThroughput: Throughput;
  ioLimitCompute: OperationsPerSecond;
  effectiveComputeRate: OperationsPerSecond;
  isIoBottlenecked: boolean;
  workingSetAllocation: WorkingSetAllocation[] | null;
}

export interface StoragePartCandidate {
  part: Part;
  capacity: Storage;
  bandwidth: Throughput;
}

export function normalizeServers(serverOrServers: ServerNode | ServerNode[]): ServerNode[] {
  return Array.isArray(serverOrServers) ? serverOrServers : [serverOrServers];
}

export function getAllParts(serverOrServers: ServerNode | ServerNode[]): Part[] {
  const servers = normalizeServers(serverOrServers);
  return servers.flatMap((server) => server.installedParts || []);
}

export function calculateTotalStorage(serverOrServers: ServerNode | ServerNode[]): Storage {
  const parts = getAllParts(serverOrServers);
  let total: Storage = u.Measure.of(0, B);

  for (const part of parts) {
    if (part.kind === "RAM") {
      total = total.plus(part.memoryCapacity);
    } else if (part.kind === "STORAGE" || part.kind === "STORAGE_DEVICE") {
      total = total.plus(part.storageCapacity);
    }
  }

  return total;
}

export function getStorageCapableParts(
  serverOrServers: ServerNode | ServerNode[]
): StoragePartCandidate[] {
  const parts = getAllParts(serverOrServers);
  const candidates: StoragePartCandidate[] = [];

  for (const part of parts) {
    if (part.kind === "RAM") {
      candidates.push({
        part,
        capacity: part.memoryCapacity,
        bandwidth: part.ioBandwidth,
      });
    } else if (part.kind === "STORAGE") {
      candidates.push({
        part,
        capacity: part.storageCapacity,
        bandwidth: part.ioBandwidth,
      });
    } else if (part.kind === "STORAGE_DEVICE") {
      candidates.push({
        part,
        capacity: part.storageCapacity,
        bandwidth: part.ioBandwidth ?? u.Measure.of(0, bytesPerSecond),
      });
    }
  }

  return candidates;
}

export function calculateWorkingSetAllocation(
  serverOrServers: ServerNode | ServerNode[],
  workingSetSize: Storage
): WorkingSetAllocation[] | null {
  const candidates = getStorageCapableParts(serverOrServers);
  
  // Sort descending by bandwidth
  candidates.sort((a, b) => b.bandwidth.value - a.bandwidth.value);

  const allocations: WorkingSetAllocation[] = [];
  let remaining = workingSetSize.value;

  for (const candidate of candidates) {
    if (remaining <= 0) break;
    
    const allocate = Math.min(candidate.capacity.value, remaining);
    if (allocate > 0) {
      allocations.push({
        part: candidate.part,
        allocatedStorage: u.Measure.of(allocate, B),
        fraction: allocate / workingSetSize.value,
        bandwidth: candidate.bandwidth
      });
      remaining -= allocate;
    }
  }

  // If we couldn't satisfy the whole working set, return null
  if (remaining > 1e-9) return null; // Small epsilon for float math

  return allocations;
}

export function canServerRunJob(
  serverOrServers: ServerNode | ServerNode[],
  job: Job
): boolean {
  const totalStorage = calculateTotalStorage(serverOrServers);
  const hasSufficientTotalStorage = totalStorage.gte(job.totalSize);
  
  const allocation = calculateWorkingSetAllocation(serverOrServers, job.workingSetSize);
  const hasSufficientWorkingSet = allocation !== null;

  return hasSufficientTotalStorage && hasSufficientWorkingSet;
}

export function calculateComputeDetails(
  serverOrServers: ServerNode | ServerNode[],
  job: Job
): NodeComputeDetails {
  const parts = getAllParts(serverOrServers);
  let totalCpuCompute: OperationsPerSecond = u.Measure.of(0, opsPerSecond);

  for (const part of parts) {
    if (part.kind === "CPU") {
      totalCpuCompute = totalCpuCompute.plus(part.computeRate);
    }
  }

  const allocation = calculateWorkingSetAllocation(serverOrServers, job.workingSetSize);

  if (!canServerRunJob(serverOrServers, job) || !allocation || totalCpuCompute.value === 0) {
    return {
      totalCpuCompute,
      workingSetThroughput: u.Measure.of(0, bytesPerSecond),
      ioLimitCompute: u.Measure.of(0, opsPerSecond),
      effectiveComputeRate: u.Measure.of(0, opsPerSecond),
      isIoBottlenecked: false,
      workingSetAllocation: allocation,
    };
  }

  let effectiveBandwidthVal = 0;
  if (job.ioRatio.value === 0) {
    // Arbitrarily high if IO doesn't matter
    effectiveBandwidthVal = Infinity;
  } else {
    // Harmonic mean for effective bandwidth: 1 / Sum(Fraction_i / Bandwidth_i)
    let sumInverse = 0;
    for (const alloc of allocation) {
      if (alloc.bandwidth.value > 0) {
        sumInverse += alloc.fraction / alloc.bandwidth.value;
      } else {
        // If any part of the working set is on a 0-bandwidth device, throughput is 0
        sumInverse = Infinity;
        break;
      }
    }
    effectiveBandwidthVal = sumInverse > 0 ? 1 / sumInverse : 0;
  }

  const workingSetThroughput = u.Measure.of(effectiveBandwidthVal, bytesPerSecond);
  
  let ioLimitCompute: OperationsPerSecond;
  if (job.ioRatio.value === 0) {
    ioLimitCompute = u.Measure.of(Infinity, opsPerSecond);
  } else {
    ioLimitCompute = workingSetThroughput.over(job.ioRatio);
  }

  const isIoBottlenecked = ioLimitCompute.lt(totalCpuCompute);
  const effectiveComputeRate = isIoBottlenecked ? ioLimitCompute : totalCpuCompute;

  return {
    totalCpuCompute,
    workingSetThroughput,
    ioLimitCompute,
    effectiveComputeRate,
    isIoBottlenecked,
    workingSetAllocation: allocation,
  };
}

/**
 * Calculates the effective operations per second rate for a job running on server node(s).
 */
export function calculateEffectiveComputeRate(
  serverOrServers: ServerNode | ServerNode[],
  job: Job
): OperationsPerSecond {
  return calculateComputeDetails(serverOrServers, job).effectiveComputeRate;
}

/**
 * Returns current job progress fraction between 0.0 and 1.0.
 */
export function getJobProgress(job: Job): number {
  if (job.operationsRequired.value <= 0) {
    return 1.0;
  }
  const ratio = job.workCompleted.value / job.operationsRequired.value;
  return Math.min(1.0, Math.max(0.0, ratio));
}

/**
 * Advances a running job by a time increment dt.
 * Mutates job.workCompleted, clamping at job.operationsRequired, and returns tick results.
 */
export function tickJob(
  job: Job,
  serverOrServers: ServerNode | ServerNode[],
  dt: Time
): JobTickResult {
  if (job.workCompleted.gte(job.operationsRequired)) {
    return {
      opsCompletedThisTick: u.Measure.of(0, ops),
      effectiveRate: u.Measure.of(0, opsPerSecond),
      progress: 1.0,
      isCompleted: true,
    };
  }

  if (!canServerRunJob(serverOrServers, job)) {
    return {
      opsCompletedThisTick: u.Measure.of(0, ops),
      effectiveRate: u.Measure.of(0, opsPerSecond),
      progress: getJobProgress(job),
      isCompleted: false,
    };
  }

  const effectiveRate = calculateEffectiveComputeRate(serverOrServers, job);
  const opsCompletedThisTick: Operations = effectiveRate.times(dt);

  const remainingOps = job.operationsRequired.minus(job.workCompleted);
  const actualOpsApplied = opsCompletedThisTick.gt(remainingOps)
    ? remainingOps
    : opsCompletedThisTick;

  job.workCompleted = job.workCompleted.plus(actualOpsApplied);
  const progress = getJobProgress(job);
  const isCompleted = job.workCompleted.gte(job.operationsRequired);

  return {
    opsCompletedThisTick: actualOpsApplied,
    effectiveRate,
    progress,
    isCompleted,
  };
}

/**
 * Calculates the current power draw of a server node in Watts, taking into account idle state.
 */
export function calculateServerPowerDraw(server: ServerNode, isRunningJob: boolean): number {
  let serverWatts = 0;
  for (const part of server.installedParts) {
    if (part.kind !== 'PSU') {
      serverWatts += part.powerDraw.value;
    }
  }
  return isRunningJob ? serverWatts : serverWatts * 0.01;
}
