import { describe, it, expect } from "vitest";
import * as u from "safe-units";
import {
  isServerValid,
  isPartCompatibleWithSlot,
  type CasePart,
  type CpuPart,
  type MotherboardPart,
  type PsuPart,
  type RamPart,
  type ServerNode,
  type SlotDefinition,
  type StoragePart,
  type StorageDevicePart,
  opsPerSecond,
  GB,
  mBPerSecond,
  W,
} from "../types";

describe("Server Assembly & Part Requirements", () => {
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
    slots: [
      { id: "cpu_0", label: "CPU Socket 0", acceptsKind: "CPU", socketTag: "SOCKET_V1" },
      { id: "ram_0", label: "DDR Slot 0", acceptsKind: "RAM", socketTag: "DDR_LEGACY" },
      { id: "ram_1", label: "DDR Slot 1", acceptsKind: "RAM", socketTag: "DDR_LEGACY" },
      { id: "sata_0", label: "SATA Port 0", acceptsKind: "STORAGE", socketTag: "SATA" },
      { id: "sata_1", label: "SATA Port 1", acceptsKind: "STORAGE", socketTag: "SATA" },
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

  const usbDrive: StorageDevicePart = {
    id: "usb_drive",
    name: "32GB USB Thumb Drive",
    kind: "STORAGE_DEVICE",
    socketTag: "USB",
    storageCapacity: u.Measure.of(32, GB),
    powerDraw: u.Measure.of(1, W),
  };

  const psu200: PsuPart = {
    id: "psu_200",
    name: "Sparky 200W PSU",
    kind: "PSU",
    socketTag: "STANDARD_ATX",
    powerCapacity: u.Measure.of(200, W),
    powerDraw: u.Measure.of(0, W),
  };

  describe("Valid Server Node Assembly", () => {
    it("should return true when a server contains all required parts (case, motherboard, storage, RAM, CPU, PSU)", () => {
      const server: ServerNode = {
        id: "node_01",
        name: "Scrap Rack Node 1",
        installedParts: [caseChassis, mbTrash, cpuOld, ram1gb, hddSlow, psu200],
      };

      expect(isServerValid(server)).toBe(true);
    });

    it("should return true when storage is provided by a STORAGE_DEVICE part", () => {
      const server: ServerNode = {
        id: "node_usb",
        name: "USB Boot Node",
        installedParts: [caseChassis, mbTrash, cpuOld, ram1gb, usbDrive, psu200],
      };

      expect(isServerValid(server)).toBe(true);
    });
  });

  describe("Invalid Server Assembly (Missing Required Parts)", () => {
    it("should return false when case is missing", () => {
      const server: ServerNode = {
        id: "node_no_case",
        name: "Benchtop Server",
        installedParts: [mbTrash, cpuOld, ram1gb, hddSlow, psu200],
      };

      expect(isServerValid(server)).toBe(false);
    });

    it("should return false when motherboard is missing", () => {
      const server: ServerNode = {
        id: "node_no_mb",
        name: "Boardless Server",
        installedParts: [caseChassis, cpuOld, ram1gb, hddSlow, psu200],
      };

      expect(isServerValid(server)).toBe(false);
    });

    it("should return false when CPU is missing", () => {
      const server: ServerNode = {
        id: "node_no_cpu",
        name: "CPU-less Server",
        installedParts: [caseChassis, mbTrash, ram1gb, hddSlow, psu200],
      };

      expect(isServerValid(server)).toBe(false);
    });

    it("should return false when RAM is missing", () => {
      const server: ServerNode = {
        id: "node_no_ram",
        name: "RAM-less Server",
        installedParts: [caseChassis, mbTrash, cpuOld, hddSlow, psu200],
      };

      expect(isServerValid(server)).toBe(false);
    });

    it("should return false when storage is missing", () => {
      const server: ServerNode = {
        id: "node_no_storage",
        name: "Diskless Server",
        installedParts: [caseChassis, mbTrash, cpuOld, ram1gb, psu200],
      };

      expect(isServerValid(server)).toBe(false);
    });

    it("should return false when power supply is missing", () => {
      const server: ServerNode = {
        id: "node_no_psu",
        name: "Unpowered Server",
        installedParts: [caseChassis, mbTrash, cpuOld, ram1gb, hddSlow],
      };

      expect(isServerValid(server)).toBe(false);
    });

    it("should return false for an empty server node", () => {
      const server: ServerNode = {
        id: "node_empty",
        name: "Empty Rack Node",
        installedParts: [],
      };

      expect(isServerValid(server)).toBe(false);
    });
  });

  describe("Slot Compatibility for Assembly", () => {
    it("should accept matching part kind and socket tag into a slot", () => {
      const cpuSlot = mbTrash.slots[0] as SlotDefinition<"CPU">;
      expect(isPartCompatibleWithSlot(cpuOld, cpuSlot)).toBe(true);
    });

    it("should reject incompatible socket tag for same kind", () => {
      const cpuSlot = mbTrash.slots[0] as SlotDefinition<"CPU">;
      expect(isPartCompatibleWithSlot(cpuV2Incompatible, cpuSlot)).toBe(false);
    });

    it("should reject mismatched part kind for a slot", () => {
      const cpuSlot = mbTrash.slots[0] as SlotDefinition<"CPU">;
      expect(isPartCompatibleWithSlot(ram1gb, cpuSlot)).toBe(false);
    });
  });
});
