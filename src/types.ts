import type {
  DataPerOperation,
  Operations,
  OperationsPerSecond,
  Power,
  Storage,
  Throughput,
} from "./units";

export * from "./units";

// ==========================================
// Sockets & Part Kinds
// ==========================================

export type CpuSocketTag = "SOCKET_V1" | "SOCKET_V2" | "LGA1155" | "AM4" | (string & {});
export type RamSocketTag = "DDR_LEGACY" | "DDR_MODERN" | "DDR3" | "DDR4" | (string & {});
export type StorageSocketTag = "SATA" | "NVME" | "IDE" | "USB" | (string & {});
export type BusSocketTag = "PCIE" | "PCIE_X16" | "PCIE_X4" | "PCIE_X1" | (string & {});
export type PowerSocketTag = "STANDARD_ATX" | "PROPRIETARY_12VO" | (string & {});
export type FanSocketTag = "CHASSIS_FAN" | "CHASSIS_FAN_3PIN" | "CHASSIS_FAN_4PIN" | (string & {});
export type MotherboardSocketTag = "CHASSIS_MOUNT" | "STANDOFF" | (string & {});

export interface SocketTagMap {
  CPU: CpuSocketTag;
  RAM: RamSocketTag;
  STORAGE: StorageSocketTag;
  GPU: BusSocketTag;
  PSU: PowerSocketTag;
  FAN: FanSocketTag;
  MOTHERBOARD: MotherboardSocketTag;
  STORAGE_DEVICE: StorageSocketTag;
}

export type PartKind = keyof SocketTagMap;

// ==========================================
// Slots
// ==========================================

export interface SlotDefinition<K extends PartKind = PartKind> {
  id: string;
  label?: string;
  acceptsKind: K;
  socketTag: SocketTagMap[K];
  installedPartId?: string | null;
}

// ==========================================
// Parts
// ==========================================

export interface BasePart<K extends PartKind = PartKind> {
  id: string;
  name: string;
  kind: K;
  socketTag: SocketTagMap[K];
  powerDraw: Power; // Active power consumed in Watts
  slots?: SlotDefinition[]; // Sockets/slots this part provides (e.g. on a motherboard or chassis)
}

export interface CpuPart extends BasePart<"CPU"> {
  computeRate: OperationsPerSecond; // Base Compute Units per second (CU/s)
}

export interface RamPart extends BasePart<"RAM"> {
  memoryCapacity: Storage; // RAM capacity
  ioBandwidth: Throughput; // Max transfer speed (B/s)
}

export interface StoragePart extends BasePart<"STORAGE"> {
  storageCapacity: Storage; // Storage capacity
  ioBandwidth: Throughput; // Max transfer speed (B/s)
}

export interface PsuPart extends BasePart<"PSU"> {
  powerCapacity: Power; // Max power supplied in Watts (for PSUs)
}

export interface FanPart extends BasePart<"FAN"> {
  coolingPower: Power; // Heat dissipation capacity
}

export interface MotherboardPart extends BasePart<"MOTHERBOARD"> {
  slots: SlotDefinition[]; // Motherboard always provides slots for CPU, RAM, etc.
}

export interface GpuPart extends BasePart<"GPU"> {
  computeRate: OperationsPerSecond; // GPU compute rate in operations per second
  memoryCapacity: Storage; // VRAM capacity
  ioBandwidth: Throughput; // Max transfer speed (B/s)
}

export interface StorageDevicePart extends BasePart<"STORAGE_DEVICE"> {
  storageCapacity: Storage;
}

export type Part =
  | CpuPart
  | RamPart
  | StoragePart
  | PsuPart
  | FanPart
  | MotherboardPart
  | GpuPart
  | StorageDevicePart;

export type PartOfKind<K extends PartKind> = Extract<Part, { kind: K }>;

// ==========================================
// Compatibility Helpers
// ==========================================

export function isPartCompatibleWithSlot<K extends PartKind>(
  part: Part,
  slot: SlotDefinition<K>
): part is PartOfKind<K> {
  return part.kind === slot.acceptsKind && part.socketTag === slot.socketTag;
}

// ==========================================
// SERVER
// ==========================================

export interface ServerNode {
  id: string;
  name: string;
  installedParts: Part[];
}

// ==========================================
// JOB
// ==========================================

export interface Job {
  id: string;
  title: string;
  description: string;

  // Requirements & Bottlenecks
  workRequired: Operations; // Total operations needed
  requiredStorage: Storage; // Storage footprint
  ioRatio: DataPerOperation; // IO demand: storage transfer needed per operation (Storage / Operations)

  // Rewards
  rewardCash: number;
  rewardPartIds: string[]; // Hardware drops upon completion

  // Runtime Progress
  workCompleted: Operations; // 0 to workRequired
  servers: ServerNode[];
}
