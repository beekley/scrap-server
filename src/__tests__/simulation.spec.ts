import { describe, it, expect } from "vitest";
import * as u from "safe-units";
import {
  B,
  GB,
  mBPerSecond,
  megabytesPerOp,
  ops,
  opsPerSecond,
  s,
  W,
  type CasePart,
  type CpuPart,
  type Job,
  type MotherboardPart,
  type PsuPart,
  type RamPart,
  type ServerNode,
  type StoragePart,
} from "../types";
import {
  canServerRunJob,
  calculateComputeDetails,
  calculateEffectiveComputeRate,
  calculateTotalStorage,
  calculateWorkingSetAllocation,
  getJobProgress,
  tickJob,
} from "../simulation";

describe("Simulation Engine & Job Execution Logic", () => {
  // Sample parts
  const caseChassis: CasePart = {
    id: "case_01",
    name: "2U Rackmount Chassis",
    kind: "CASE",
    socketTag: "RACKMOUNT_2U",
    powerDraw: u.Measure.of(0, W),
  };

  const mbTrash: MotherboardPart = {
    id: "mb_trash",
    name: "Salvaged OEM Board",
    kind: "MOTHERBOARD",
    socketTag: "CHASSIS_MOUNT",
    powerDraw: u.Measure.of(15, W),
    slots: [],
  };

  const cpuOld: CpuPart = {
    id: "cpu_old",
    name: "Dual-Core E-Waste CPU",
    kind: "CPU",
    socketTag: "SOCKET_V1",
    computeRate: u.Measure.of(50, opsPerSecond),
    powerDraw: u.Measure.of(65, W),
  };

  const ram1gb: RamPart = {
    id: "ram_1gb",
    name: "Generic 1GB DDR Stick",
    kind: "RAM",
    socketTag: "DDR_LEGACY",
    memoryCapacity: u.Measure.of(1, GB),
    ioBandwidth: u.Measure.of(5000, mBPerSecond),
    powerDraw: u.Measure.of(5, W),
  };

  const hddSlow: StoragePart = {
    id: "hdd_slow",
    name: "250GB Mechanical HDD",
    kind: "STORAGE",
    socketTag: "SATA",
    storageCapacity: u.Measure.of(250, GB),
    ioBandwidth: u.Measure.of(60, mBPerSecond),
    powerDraw: u.Measure.of(10, W),
  };

  const psu200: PsuPart = {
    id: "psu_200",
    name: "Sparky 200W PSU",
    kind: "PSU",
    socketTag: "STANDARD_ATX",
    powerCapacity: u.Measure.of(200, W),
    powerDraw: u.Measure.of(0, W),
  };

  const standardServer: ServerNode = {
    id: "node_01",
    name: "Scrap Node 1",
    installedParts: [caseChassis, mbTrash, cpuOld, ram1gb, hddSlow, psu200],
  };

  describe("Total Storage & Working Set Pre-requisites", () => {
    it("should calculate total storage by summing RAM and Storage drives", () => {
      const total = calculateTotalStorage(standardServer);
      // 1 GB RAM + 250 GB HDD = 251 GB
      expect(total.value).toBe(251 * 1000 * 1000 * 1000);
    });

    it("should allow a job when total storage and working set fit", () => {
      const job: Job = {
        id: "job_01",
        title: "Test Job",
        description: "Test",
        operationsRequired: u.Measure.of(500, ops),
        totalSize: u.Measure.of(10, GB),
        workingSetSize: u.Measure.of(1, GB),
        ioRatio: u.Measure.of(0.2, megabytesPerOp),
        rewardCash: 50,
        rewardPartIds: [],
        workCompleted: u.Measure.of(0, ops),
      };

      expect(canServerRunJob(standardServer, job)).toBe(true);
    });

    it("should reject a job when server does not meet total storage size", () => {
      const smallServer: ServerNode = {
        id: "small_node",
        name: "Small Node",
        installedParts: [ram1gb], // only 1 GB total
      };

      const job: Job = {
        id: "job_big_storage",
        title: "Big Storage Job",
        description: "Test",
        operationsRequired: u.Measure.of(500, ops),
        totalSize: u.Measure.of(10, GB), // requires 10 GB
        workingSetSize: u.Measure.of(1, GB),
        ioRatio: u.Measure.of(0.2, megabytesPerOp),
        rewardCash: 50,
        rewardPartIds: [],
        workCompleted: u.Measure.of(0, ops),
      };

      expect(canServerRunJob(smallServer, job)).toBe(false);
    });

    it("should successfully spill over working set across multiple parts when no single part can fit it", () => {
      const fragmentedServer: ServerNode = {
        id: "frag_node",
        name: "Fragmented Node",
        installedParts: [
          ram1gb, // 1 GB (5000 MB/s)
          {
            id: "ram_1gb_b",
            name: "Generic 1GB DDR Stick B",
            kind: "RAM",
            socketTag: "DDR_LEGACY",
            memoryCapacity: u.Measure.of(1, GB),
            ioBandwidth: u.Measure.of(5000, mBPerSecond),
            powerDraw: u.Measure.of(5, W),
          },
          {
            id: "usb_1gb",
            name: "1GB USB Drive",
            kind: "STORAGE_DEVICE",
            socketTag: "USB",
            storageCapacity: u.Measure.of(1, GB),
            powerDraw: u.Measure.of(1, W),
          },
        ], // Total = 3 GB, but max single part = 1 GB
      };

      const job: Job = {
        id: "job_2gb_workingset",
        title: "2GB Working Set Job",
        description: "Test",
        operationsRequired: u.Measure.of(500, ops),
        totalSize: u.Measure.of(3, GB),
        workingSetSize: u.Measure.of(2, GB),
        ioRatio: u.Measure.of(0.2, megabytesPerOp),
        rewardCash: 50,
        rewardPartIds: [],
        workCompleted: u.Measure.of(0, ops),
      };

      // It CAN run because working set spills over 1GB + 1GB
      expect(canServerRunJob(fragmentedServer, job)).toBe(true);
    });

    it("should support multi-node storage aggregation for future clustering", () => {
      const nodeA: ServerNode = {
        id: "node_a",
        name: "Node A",
        installedParts: [ram1gb], // 1 GB RAM
      };

      const nodeB: ServerNode = {
        id: "node_b",
        name: "Node B",
        installedParts: [hddSlow], // 250 GB HDD
      };

      const job: Job = {
        id: "job_multi",
        title: "Multi-Node Job",
        description: "Test",
        operationsRequired: u.Measure.of(1000, ops),
        totalSize: u.Measure.of(100, GB),
        workingSetSize: u.Measure.of(1, GB),
        ioRatio: u.Measure.of(0.2, megabytesPerOp),
        rewardCash: 100,
        rewardPartIds: [],
        workCompleted: u.Measure.of(0, ops),
      };

      expect(canServerRunJob([nodeA, nodeB], job)).toBe(true);
    });
  });

  describe("Working Set Storage Allocation & Harmonic Mean", () => {
    it("should allocate working set entirely to fastest part if it fits", () => {
      // 500MB working set fits in 1GB RAM (5000 MB/s)
      const workingSet500MB = u.Measure.of(500, u.mega(B));
      
      const alloc = calculateWorkingSetAllocation(standardServer, workingSet500MB);
      expect(alloc).not.toBeNull();
      expect(alloc!.length).toBe(1);
      expect(alloc![0].part.id).toBe("ram_1gb");
      expect(alloc![0].fraction).toBe(1.0);
    });

    it("should spill over from RAM to HDD and calculate harmonic mean effective bandwidth", () => {
      // 2GB working set: 1GB RAM (5000 MB/s) + 1GB HDD (60 MB/s)
      const workingSet2GB = u.Measure.of(2, GB);
      const alloc = calculateWorkingSetAllocation(standardServer, workingSet2GB);

      expect(alloc).not.toBeNull();
      expect(alloc!.length).toBe(2);
      expect(alloc![0].part.id).toBe("ram_1gb");
      expect(alloc![0].fraction).toBe(0.5);
      
      expect(alloc![1].part.id).toBe("hdd_slow");
      expect(alloc![1].fraction).toBe(0.5);

      // Now test harmonic mean throughput in compute details
      const job: Job = {
        id: "job_spill",
        title: "Spillover",
        description: "Test",
        operationsRequired: u.Measure.of(500, ops),
        totalSize: u.Measure.of(10, GB),
        workingSetSize: u.Measure.of(2, GB),
        ioRatio: u.Measure.of(1, megabytesPerOp), // 1 MB per op for easy math
        rewardCash: 50,
        rewardPartIds: [],
        workCompleted: u.Measure.of(0, ops),
      };

      const details = calculateComputeDetails(standardServer, job);
      // Harmonic mean: 1 / (0.5/5000 + 0.5/60) = 1 / (0.0001 + 0.008333333333333333) = 118.577 MB/s
      // ioLimit = 118.577 MB/s / 1 MB/op = 118.577 op/s
      // The CPU is 50 op/s, so we should NOT be I/O bottlenecked! (CPU Limit)
      expect(details.isIoBottlenecked).toBe(false);
      expect(details.effectiveComputeRate.value).toBe(50);
      expect(details.workingSetThroughput.value).toBeCloseTo(118.577 * 1000 * 1000, -5);
    });

    it("should return null allocation when no parts can fit the working set combined", () => {
      const workingSet500GB = u.Measure.of(500, GB);
      const alloc = calculateWorkingSetAllocation(standardServer, workingSet500GB);
      expect(alloc).toBeNull();
    });
  });

  describe("Compute Rate & Bottleneck Evaluation", () => {
    it("should run at CPU speed when I/O throughput is sufficiently fast (Compute Bound)", () => {
      // Job 2: Brute-Force Password Dump (1 GB working set -> RAM 5000 MB/s, 0.01 MB/op)
      // I/O limit = 5000 MB/s / 0.01 MB/op = 500,000 op/s
      // CPU rate = 50 op/s
      // Effective rate should be 50 op/s
      const job: Job = {
        id: "job_02",
        title: "Brute-Force Password Dump",
        description: "Compute Bound",
        operationsRequired: u.Measure.of(1500, ops),
        totalSize: u.Measure.of(2, GB),
        workingSetSize: u.Measure.of(1, GB),
        ioRatio: u.Measure.of(0.01, megabytesPerOp),
        rewardCash: 120,
        rewardPartIds: [],
        workCompleted: u.Measure.of(0, ops),
      };

      const details = calculateComputeDetails(standardServer, job);
      expect(details.isIoBottlenecked).toBe(false);
      expect(details.effectiveComputeRate.value).toBe(50);
      expect(calculateEffectiveComputeRate(standardServer, job).value).toBe(50);
    });

    it("should throttle compute rate when storage I/O throughput is slow (I/O Bound)", () => {
      // Job 3: Scrape Video Metadata (2 GB working set -> HDD 60 MB/s, 2.5 MB/op)
      // I/O limit = 60 MB/s / 2.5 MB/op = 24 op/s
      // CPU rate = 50 op/s
      // Effective rate should be throttled to 24 op/s
      const job: Job = {
        id: "job_03",
        title: "Scrape Video Metadata",
        description: "IO Bound",
        operationsRequired: u.Measure.of(2000, ops),
        totalSize: u.Measure.of(50, GB),
        workingSetSize: u.Measure.of(2, GB),
        ioRatio: u.Measure.of(2.5, megabytesPerOp),
        rewardCash: 250,
        rewardPartIds: [],
        workCompleted: u.Measure.of(0, ops),
      };

      const details = calculateComputeDetails(standardServer, job);
      expect(details.isIoBottlenecked).toBe(true);
      expect(details.effectiveComputeRate.value).toBeCloseTo(47.4308, 3);
      expect(calculateEffectiveComputeRate(standardServer, job).value).toBeCloseTo(47.4308, 3);
    });

    it("should aggregate compute across multiple CPUs across nodes for future scaling", () => {
      const dualCpuNode: ServerNode = {
        id: "dual_cpu_node",
        name: "Dual CPU Server",
        installedParts: [
          caseChassis,
          mbTrash,
          cpuOld, // 50 op/s
          {
            id: "cpu_old_2",
            name: "Dual-Core E-Waste CPU 2",
            kind: "CPU",
            socketTag: "SOCKET_V1",
            computeRate: u.Measure.of(50, opsPerSecond),
            powerDraw: u.Measure.of(65, W),
          },
          ram1gb, // 5000 MB/s
          hddSlow,
          psu200,
        ],
      };

      const job: Job = {
        id: "job_compute",
        title: "Compute Test",
        description: "Test",
        operationsRequired: u.Measure.of(1000, ops),
        totalSize: u.Measure.of(1, GB),
        workingSetSize: u.Measure.of(1, GB),
        ioRatio: u.Measure.of(0.01, megabytesPerOp), // IO limit = 500,000 op/s
        rewardCash: 100,
        rewardPartIds: [],
        workCompleted: u.Measure.of(0, ops),
      };

      // 50 + 50 = 100 op/s
      const details = calculateComputeDetails(dualCpuNode, job);
      expect(details.effectiveComputeRate.value).toBe(100);
    });
  });

  describe("Time Progression & Job Execution (tickJob)", () => {
    it("should advance job progress according to dt and effective compute rate", () => {
      const job: Job = {
        id: "job_01",
        title: "Recover Corrupted Text Archive",
        description: "Low IO Job",
        operationsRequired: u.Measure.of(500, ops),
        totalSize: u.Measure.of(10, GB),
        workingSetSize: u.Measure.of(1, GB),
        ioRatio: u.Measure.of(0.2, megabytesPerOp), // 5000 / 0.2 = 25,000 op/s limit -> runs at 50 op/s
        rewardCash: 50,
        rewardPartIds: [],
        workCompleted: u.Measure.of(0, ops),
      };

      // 1 tick = 5 seconds
      const dt5s = u.Measure.of(5, s);
      const result = tickJob(job, standardServer, dt5s);

      // 50 op/s * 5s = 250 ops completed
      expect(result.opsCompletedThisTick.value).toBe(250);
      expect(job.workCompleted.value).toBe(250);
      expect(result.progress).toBe(0.5);
      expect(result.isCompleted).toBe(false);
      expect(getJobProgress(job)).toBe(0.5);
    });

    it("should complete a job and clamp progress at 100% when operationsRequired is reached", () => {
      const job: Job = {
        id: "job_01",
        title: "Recover Corrupted Text Archive",
        description: "Low IO Job",
        operationsRequired: u.Measure.of(500, ops),
        totalSize: u.Measure.of(10, GB),
        workingSetSize: u.Measure.of(1, GB),
        ioRatio: u.Measure.of(0.2, megabytesPerOp),
        rewardCash: 50,
        rewardPartIds: [],
        workCompleted: u.Measure.of(400, ops), // 100 ops remaining
      };

      // 1 tick = 10 seconds -> 50 op/s * 10s = 500 ops (more than 100 remaining)
      const dt10s = u.Measure.of(10, s);
      const result = tickJob(job, standardServer, dt10s);

      expect(result.opsCompletedThisTick.value).toBe(100);
      expect(job.workCompleted.value).toBe(500);
      expect(result.progress).toBe(1.0);
      expect(result.isCompleted).toBe(true);
      expect(getJobProgress(job)).toBe(1.0);
    });

    it("should perform no work if the job is already completed", () => {
      const job: Job = {
        id: "job_done",
        title: "Completed Job",
        description: "Done",
        operationsRequired: u.Measure.of(500, ops),
        totalSize: u.Measure.of(10, GB),
        workingSetSize: u.Measure.of(1, GB),
        ioRatio: u.Measure.of(0.2, megabytesPerOp),
        rewardCash: 50,
        rewardPartIds: [],
        workCompleted: u.Measure.of(500, ops),
      };

      const dt10s = u.Measure.of(10, s);
      const result = tickJob(job, standardServer, dt10s);

      expect(result.opsCompletedThisTick.value).toBe(0);
      expect(result.progress).toBe(1.0);
      expect(result.isCompleted).toBe(true);
    });

    it("should perform no work if the server cannot run the job", () => {
      const invalidServer: ServerNode = {
        id: "empty_node",
        name: "Empty Node",
        installedParts: [],
      };

      const job: Job = {
        id: "job_01",
        title: "Job",
        description: "Job",
        operationsRequired: u.Measure.of(500, ops),
        totalSize: u.Measure.of(10, GB),
        workingSetSize: u.Measure.of(1, GB),
        ioRatio: u.Measure.of(0.2, megabytesPerOp),
        rewardCash: 50,
        rewardPartIds: [],
        workCompleted: u.Measure.of(0, ops),
      };

      const result = tickJob(job, invalidServer, u.Measure.of(10, s));
      expect(result.opsCompletedThisTick.value).toBe(0);
      expect(result.effectiveRate.value).toBe(0);
      expect(result.isCompleted).toBe(false);
      expect(job.workCompleted.value).toBe(0);
    });
  });
});
