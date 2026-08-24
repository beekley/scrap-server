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
export interface NodeComputeDetails {
  totalCpuCompute: OperationsPerSecond;
  workingSetThroughput: Throughput;
  ioLimitCompute: OperationsPerSecond;
  effectiveComputeRate: OperationsPerSecond;
  isIoBottlenecked: boolean;
  activeStoragePart: Part | null;
}

/**
 * Storage part info normalized for capacity and bandwidth comparisons.
 */
export interface StoragePartCandidate {
  part: Part;
  capacity: Storage;
  bandwidth: Throughput;
}

/**
 * Helper to normalize a single server or an array of servers into an array.
 */
export function normalizeServers(serverOrServers: ServerNode | ServerNode[]): ServerNode[] {
  return Array.isArray(serverOrServers) ? serverOrServers : [serverOrServers];
}

/**
 * Extracts all installed parts across the given server node(s).
 */
export function getAllParts(serverOrServers: ServerNode | ServerNode[]): Part[] {
  const servers = normalizeServers(serverOrServers);
  return servers.flatMap((server) => server.installedParts || []);
}

/**
 * Calculates the total aggregate storage capacity (RAM + Drives) across server node(s).
 */
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

/**
 * Collects all storage-capable parts (RAM, STORAGE, STORAGE_DEVICE) across the server node(s).
 */
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

/**
 * Finds the single fastest storage part capable of holding the required working set size.
 * Returns null if no single part has enough capacity.
 */
export function findFastestWorkingSetPart(
  serverOrServers: ServerNode | ServerNode[],
  workingSetSize: Storage
): StoragePartCandidate | null {
  const candidates = getStorageCapableParts(serverOrServers);
  const fittingCandidates = candidates.filter((candidate) =>
    candidate.capacity.gte(workingSetSize)
  );

  if (fittingCandidates.length === 0) {
    return null;
  }

  // Find candidate with maximum bandwidth
  return fittingCandidates.reduce((fastest, current) =>
    current.bandwidth.gt(fastest.bandwidth) ? current : fastest
  );
}

/**
 * Determines the I/O throughput (in B/s, MB/s) available for a job's working set on the server(s).
 * If no storage part can fit the working set, returns 0 B/s.
 */
export function getWorkingSetThroughput(
  serverOrServers: ServerNode | ServerNode[],
  jobOrWorkingSetSize: Job | Storage
): Throughput {
  const workingSetSize =
    "workingSetSize" in jobOrWorkingSetSize
      ? jobOrWorkingSetSize.workingSetSize
      : jobOrWorkingSetSize;

  const candidate = findFastestWorkingSetPart(serverOrServers, workingSetSize);
  return candidate ? candidate.bandwidth : u.Measure.of(0, bytesPerSecond);
}

/**
 * Checks if the given server node(s) have sufficient total storage and working set capacity for a job.
 */
export function canServerRunJob(
  serverOrServers: ServerNode | ServerNode[],
  job: Job
): boolean {
  const totalStorage = calculateTotalStorage(serverOrServers);
  const hasSufficientTotalStorage = totalStorage.gte(job.totalSize);
  const fastestPart = findFastestWorkingSetPart(serverOrServers, job.workingSetSize);
  const hasSufficientWorkingSet = fastestPart !== null;

  return hasSufficientTotalStorage && hasSufficientWorkingSet;
}

/**
 * Calculates detailed compute rate and bottleneck information for a job running on server node(s).
 */
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

  const fastestCandidate = findFastestWorkingSetPart(serverOrServers, job.workingSetSize);
  const workingSetThroughput = fastestCandidate
    ? fastestCandidate.bandwidth
    : u.Measure.of(0, bytesPerSecond);

  if (!canServerRunJob(serverOrServers, job) || !fastestCandidate || totalCpuCompute.value === 0) {
    return {
      totalCpuCompute,
      workingSetThroughput,
      ioLimitCompute: u.Measure.of(0, opsPerSecond),
      effectiveComputeRate: u.Measure.of(0, opsPerSecond),
      isIoBottlenecked: false,
      activeStoragePart: fastestCandidate ? fastestCandidate.part : null,
    };
  }

  // If job has 0 io demand, CPU is never bottlenecked by IO
  if (job.ioRatio.value === 0) {
    return {
      totalCpuCompute,
      workingSetThroughput,
      ioLimitCompute: u.Measure.of(Infinity, opsPerSecond),
      effectiveComputeRate: totalCpuCompute,
      isIoBottlenecked: false,
      activeStoragePart: fastestCandidate.part,
    };
  }

  // Calculate IO-limited compute rate: Throughput / DataPerOperation = OperationsPerSecond
  const ioLimitCompute: OperationsPerSecond = workingSetThroughput.over(job.ioRatio);
  const isIoBottlenecked = ioLimitCompute.lt(totalCpuCompute);
  const effectiveComputeRate = isIoBottlenecked ? ioLimitCompute : totalCpuCompute;

  return {
    totalCpuCompute,
    workingSetThroughput,
    ioLimitCompute,
    effectiveComputeRate,
    isIoBottlenecked,
    activeStoragePart: fastestCandidate.part,
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
