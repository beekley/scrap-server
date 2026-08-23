import { describe, it, expect } from "vitest";
import * as u from "safe-units";
import {
  isPartCompatibleWithSlot,
  type CpuPart,
  type FanPart,
  type MotherboardPart,
  type PsuPart,
  type RamPart,
  type ServerNode,
  type SlotDefinition,
  type StoragePart,
  ops,
  opsPerSecond,
  GB,
  mBPerSecond,
  W,
  s,
  megabytesPerOp,
} from "../types";
import { calculateServerAggregates } from "../server";

describe("Server Assembly & Part Compatibility", () => {
  // Define test parts according to SPEC.md seed data
  const mbTrash: MotherboardPart = {
    id: "mb_trash",
    name: "Salvaged OEM Board",
    kind: "MOTHERBOARD",
    socketTag: "CHASSIS_MOUNT",
    powerDraw: u.Measure.of(15, W),
    slots: [
      { id: "cpu_0", label: "CPU Socket 0", acceptsKind: "CPU", socketTag: "SOCKET_V1" },
      { id: "ram_0", label: "DDR Slot 0", acceptsKind: "RAM", socketTag: "DDR_LEGACY" },
      { id: "ram_1", label: "DDR Slot 1", acceptsKind: "RAM", socketTag: "DDR_LEGACY" },
      { id: "sata_0", label: "SATA Port 0", acceptsKind: "STORAGE", socketTag: "SATA" },
      { id: "sata_1", label: "SATA Port 1", acceptsKind: "STORAGE", socketTag: "SATA" },
      { id: "fan_0", label: "Chassis Fan 0", acceptsKind: "FAN", socketTag: "CHASSIS_FAN" },
      { id: "psu_0", label: "ATX Power Header", acceptsKind: "PSU", socketTag: "STANDARD_ATX" },
    ],
  };

  const cpuOld: CpuPart = {
    id: "cpu_old",
    name: "Dual-Core E-Waste CPU",
    kind: "CPU",
    socketTag: "SOCKET_V1",
    computeRate: u.Measure.of(50, opsPerSecond),
    powerDraw: u.Measure.of(65, W),
  };

  const cpuV2Incompatible: CpuPart = {
    id: "cpu_modern",
    name: "Quad-Core Scrap CPU",
    kind: "CPU",
    socketTag: "SOCKET_V2",
    computeRate: u.Measure.of(120, opsPerSecond),
    powerDraw: u.Measure.of(95, W),
  };

  const ram1gb: RamPart = {
    id: "ram_1gb",
    name: "Generic 1GB DDR Stick",
    kind: "RAM",
    socketTag: "DDR_LEGACY",
    memoryCapacity: u.Measure.of(1, GB),
    ioBandwidth: u.Measure.of(150, mBPerSecond),
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

  const fan80: FanPart = {
    id: "fan_80",
    name: "Noisy 80mm Fan",
    kind: "FAN",
    socketTag: "CHASSIS_FAN",
    coolingPower: u.Measure.of(50, W),
    powerDraw: u.Measure.of(3, W),
  };

  describe("Slot Compatibility Type Guard", () => {
    it("should accept matching part kind and socket tag", () => {
      const cpuSlot = mbTrash.slots[0] as SlotDefinition<"CPU">;
      const compatible = isPartCompatibleWithSlot(cpuOld, cpuSlot);
      expect(compatible).toBe(true);
      expect(cpuOld.computeRate.valueIn(opsPerSecond)).toBe(50);
    });

    it("should reject incompatible socket tag for same kind", () => {
      const cpuSlot = mbTrash.slots[0] as SlotDefinition<"CPU">;
      expect(isPartCompatibleWithSlot(cpuV2Incompatible, cpuSlot)).toBe(false);
    });

    it("should reject mismatched part kind", () => {
      const cpuSlot = mbTrash.slots[0] as SlotDefinition<"CPU">;
      expect(isPartCompatibleWithSlot(ram1gb, cpuSlot)).toBe(false);
    });
  });

  describe("Complete Server Assembly & Dynamic Aggregates", () => {
    it("should assemble a working server node with all slotted parts and compute aggregates dynamically", () => {
      const server: ServerNode = {
        id: "node_01",
        name: "Scrap Rack Node 1",
        installedParts: [mbTrash, cpuOld, ram1gb, hddSlow, psu200, fan80],
      };

      const aggregates = calculateServerAggregates(server);

      // Verify dynamically calculated aggregates
      expect(aggregates.totalCompute.valueIn(opsPerSecond)).toBe(50);
      expect(aggregates.totalMemory.valueIn(GB)).toBe(1);
      expect(aggregates.totalStorage.valueIn(GB)).toBe(250);
      expect(aggregates.maxIOBandwidth.valueIn(mBPerSecond)).toBe(150);

      // Power: 15W (MB) + 65W (CPU) + 5W (RAM) + 10W (HDD) + 0W (PSU) + 3W (Fan) = 98W
      expect(aggregates.totalPowerDraw.valueIn(W)).toBe(98);
      expect(aggregates.totalPowerCapacity.valueIn(W)).toBe(200);
      expect(aggregates.isOverloaded).toBe(false);

      // Net cooling: 50W cooling - 98W heat = -48W
      expect(aggregates.netCoolingCapacity.valueIn(W)).toBe(-48);
    });

    it("should detect overloaded power when power draw exceeds capacity", () => {
      const weakPsu: PsuPart = {
        id: "psu_weak",
        name: "50W Sketchy PSU",
        kind: "PSU",
        socketTag: "STANDARD_ATX",
        powerCapacity: u.Measure.of(50, W),
        powerDraw: u.Measure.of(0, W),
      };

      const server: ServerNode = {
        id: "node_weak",
        name: "Weak Server",
        installedParts: [mbTrash, cpuOld, ram1gb, hddSlow, weakPsu, fan80],
      };

      const aggregates = calculateServerAggregates(server);

      expect(aggregates.totalPowerDraw.valueIn(W)).toBe(98);
      expect(aggregates.totalPowerCapacity.valueIn(W)).toBe(50);
      expect(aggregates.isOverloaded).toBe(true);
    });

    it("should simulate job progression with bottlenecked compute rate using safe-units dimensional analysis", () => {
      const server: ServerNode = {
        id: "node_01",
        name: "Scrap Rack Node 1",
        installedParts: [mbTrash, cpuOld, ram1gb, hddSlow, psu200, fan80],
      };

      const aggregates = calculateServerAggregates(server);

      // Job 01: 500 CU work, 0.2 MB/CU IO intensity
      const workRequired = u.Measure.of(500, ops);
      const ioRatio = u.Measure.of(0.2, megabytesPerOp);

      // HDD throughput: 60 MB/s
      const throughput = hddSlow.ioBandwidth; // 60 MB/s

      // Bottleneck throughput rate: (60 MB/s) / (0.2 MB/op) = 300 op/s
      const ioBoundRate = throughput.over(ioRatio); // Type is OperationsPerSecond!
      expect(ioBoundRate.valueIn(opsPerSecond)).toBe(300);

      // CPU rate is 50 op/s, so effective rate is min(50 op/s, 300 op/s) = 50 op/s
      const effectiveOpsRate = u.Measure.min(aggregates.totalCompute, ioBoundRate);
      expect(effectiveOpsRate.valueIn(opsPerSecond)).toBe(50);

      // Simulate 1 tick of dt = 5 seconds
      const dt = u.Measure.of(5, s);
      const workDoneInTick = effectiveOpsRate.times(dt); // Type is Operations!
      expect(workDoneInTick.valueIn(ops)).toBe(250);

      // Progress calculation (dimensionless ratio)
      const progress = workDoneInTick.over(workRequired).value;
      expect(progress).toBe(0.5); // 250 / 500 = 50%
    });

    it("should bottleneck compute rate when IO is slower than CPU demand", () => {
      // Job 03: Scrape Video Metadata (High IO ratio: 2.5 MB/op)
      const highIoRatio = u.Measure.of(2.5, megabytesPerOp);
      const slowHddThroughput = u.Measure.of(60, mBPerSecond);

      // IO bottleneck: 60 MB/s / 2.5 MB/op = 24 op/s
      const maxIoRate = slowHddThroughput.over(highIoRatio);
      expect(maxIoRate.valueIn(opsPerSecond)).toBe(24);

      // CPU is capable of 50 op/s, but throttled to 24 op/s by storage IO
      const cpuRate = u.Measure.of(50, opsPerSecond);
      const effectiveRate = u.Measure.min(cpuRate, maxIoRate);
      expect(effectiveRate.valueIn(opsPerSecond)).toBe(24);
    });
  });
});

