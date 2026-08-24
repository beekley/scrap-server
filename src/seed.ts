import * as u from "safe-units";
import {
  GB,
  mBPerSecond,
  megabytesPerOp,
  ops,
  opsPerSecond,
  W,
  type Job,
  type Part,
  type ServerNode,
} from "./types";

// ==========================================
// Seed Parts
// ==========================================

export const sampleParts: Part[] = [
  {
    id: "mb_trash",
    name: "Salvaged OEM Board",
    kind: "MOTHERBOARD",
    socketTag: "CHASSIS_MOUNT",
    powerDraw: u.Measure.of(15, W),
    slots: [
      { id: "cpu_0", label: "CPU Socket", acceptsKind: "CPU", socketTag: "SOCKET_V1" },
      { id: "ram_0", label: "RAM Slot 1", acceptsKind: "RAM", socketTag: "DDR_LEGACY" },
      { id: "ram_1", label: "RAM Slot 2", acceptsKind: "RAM", socketTag: "DDR_LEGACY" },
      { id: "sata_0", label: "SATA Port 1", acceptsKind: "STORAGE", socketTag: "SATA" },
      { id: "sata_1", label: "SATA Port 2", acceptsKind: "STORAGE", socketTag: "SATA" },
      { id: "psu_0", label: "Power", acceptsKind: "PSU", socketTag: "STANDARD_ATX" },
    ],
  },
  {
    id: "cpu_old",
    name: "Dual-Core E-Waste CPU",
    kind: "CPU",
    socketTag: "SOCKET_V1",
    computeRate: u.Measure.of(50, opsPerSecond),
    powerDraw: u.Measure.of(65, W),
  },
  {
    id: "ram_1gb",
    name: "Generic 1GB DDR Stick",
    kind: "RAM",
    socketTag: "DDR_LEGACY",
    memoryCapacity: u.Measure.of(1, GB),
    ioBandwidth: u.Measure.of(5000, mBPerSecond),
    powerDraw: u.Measure.of(5, W),
  },
  {
    id: "hdd_slow",
    name: "250GB Mechanical HDD",
    kind: "STORAGE",
    socketTag: "SATA",
    storageCapacity: u.Measure.of(250, GB),
    ioBandwidth: u.Measure.of(60, mBPerSecond),
    powerDraw: u.Measure.of(10, W),
  },
  {
    id: "psu_200",
    name: "Sparky 200W PSU",
    kind: "PSU",
    socketTag: "STANDARD_ATX",
    powerCapacity: u.Measure.of(200, W),
    powerDraw: u.Measure.of(0, W),
  },
  {
    id: "soc_phone",
    name: "Cracked Android Phone",
    kind: "STORAGE_DEVICE",
    socketTag: "USB",
    storageCapacity: u.Measure.of(2, GB),
    ioBandwidth: u.Measure.of(30, mBPerSecond),
    powerDraw: u.Measure.of(10, W),
  },
  {
    id: "case_chassis",
    name: "Rusty Tower",
    kind: "CASE",
    socketTag: "TOWER",
    powerDraw: u.Measure.of(0, W),
    slots: [
      { id: "mb_0", label: "Motherboard Tray", acceptsKind: "MOTHERBOARD", socketTag: "CHASSIS_MOUNT" }
    ]
  }
];

export function getPartTemplate(id: string): Part {
  const p = sampleParts.find((p) => p.id === id);
  if (!p) throw new Error(`Unknown part ID: ${id}`);
  
  // Shallow clone and then recreate measures just to be safe
  const cloned = { ...p };
  
  // Create unique instance IDs for parts so they can be identified in slots
  const instanceId = `${id}_${Math.random().toString(36).substr(2, 9)}`;
  cloned.id = instanceId;

  // Restore measures by copying them explicitly if we needed a deep clone,
  // but since we aren't mutating the measures themselves, sharing the reference is fine.
  // The only thing we might mutate is `installedPartId` inside slots.
  if ("slots" in cloned && cloned.slots) {
    cloned.slots = cloned.slots.map(s => ({ ...s }));
  }

  return cloned as Part;
}

// ==========================================
// Seed Jobs
// ==========================================

export const sampleJobs: Job[] = [
  {
    id: "job_01",
    title: "Recover Corrupted Text Archive",
    description: "Low IO Job",
    operationsRequired: u.Measure.of(50000, ops),
    workingSetSize: u.Measure.of(1, GB),
    totalSize: u.Measure.of(10, GB),
    ioRatio: u.Measure.of(0.2, megabytesPerOp),
    rewardCash: 50,
    rewardPartIds: ["ram_1gb"],
    workCompleted: u.Measure.of(0, ops),
  },
  {
    id: "job_02",
    title: "Brute-Force Password Dump",
    description: "Compute Bound",
    operationsRequired: u.Measure.of(150000, ops),
    workingSetSize: u.Measure.of(1, GB),
    totalSize: u.Measure.of(2, GB),
    ioRatio: u.Measure.of(0.01, megabytesPerOp),
    rewardCash: 120,
    rewardPartIds: ["cpu_old"],
    workCompleted: u.Measure.of(0, ops),
  },
  {
    id: "job_03",
    title: "Scrape Video Metadata",
    description: "IO Bound",
    operationsRequired: u.Measure.of(50000, ops),
    workingSetSize: u.Measure.of(2, GB),
    totalSize: u.Measure.of(50, GB),
    ioRatio: u.Measure.of(2.5, megabytesPerOp),
    rewardCash: 250,
    rewardPartIds: ["psu_200", "mb_trash"],
    workCompleted: u.Measure.of(0, ops),
  },
];

export function getJobTemplate(id: string): Job {
  const j = sampleJobs.find((j) => j.id === id);
  if (!j) throw new Error(`Unknown job ID: ${id}`);
  return {
    ...j,
    // safe-units measures don't survive JSON.parse(JSON.stringify()) cleanly if we rely on prototypes,
    // but in safe-units they are plain objects. Just to be safe, recreate measures if needed,
    // or just spread. For our MVP, spread is fine as jobs are generally recreated.
    operationsRequired: j.operationsRequired,
    workingSetSize: j.workingSetSize,
    totalSize: j.totalSize,
    ioRatio: j.ioRatio,
    workCompleted: u.Measure.of(0, ops),
    rewardPartIds: [...j.rewardPartIds]
  };
}

// ==========================================
// Initial Server
// ==========================================

export function createInitialServer(): ServerNode {
  return {
    id: "server_01",
    name: "Scrap Node 1",
    installedParts: [],
  };
}
