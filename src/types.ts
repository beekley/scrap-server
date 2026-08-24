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
export type PowerSocketTag = "STANDARD_ATX" | "PROPRIETARY_12VO" | (string & {});
export type MotherboardSocketTag = "CHASSIS_MOUNT" | "STANDOFF" | (string & {});
export type CaseSocketTag = "RACKMOUNT_1U" | "RACKMOUNT_2U" | "RACKMOUNT_4U" | "TOWER" | "DESKTOP" | "SHELF" | (string & {});

export interface SocketTagMap {
  CASE: CaseSocketTag;
  CPU: CpuSocketTag;
  RAM: RamSocketTag;
  STORAGE: StorageSocketTag;
  PSU: PowerSocketTag;
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

export interface Manufacturer {
  id: string;
  name: string;
  description: string;
  tier: "BUDGET" | "MIDRANGE" | "ENTHUSIAST" | "INDUSTRIAL";
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
  manufacturerId?: string; // Optional manufacturer reference
  slots?: SlotDefinition[]; // Sockets/slots this part provides (e.g. on a motherboard or chassis)
}

export interface CasePart extends BasePart<"CASE"> {
  slots?: SlotDefinition[];
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

export interface MotherboardPart extends BasePart<"MOTHERBOARD"> {
  slots: SlotDefinition[]; // Motherboard always provides slots for CPU, RAM, etc.
}

export interface StorageDevicePart extends BasePart<"STORAGE_DEVICE"> {
  storageCapacity: Storage;
  ioBandwidth?: Throughput;
}

export type Part =
  | CasePart
  | CpuPart
  | RamPart
  | StoragePart
  | PsuPart
  | MotherboardPart
  | StorageDevicePart;

export type PartOfKind<K extends PartKind> = Extract<Part, { kind: K }>;

// ==========================================
// Compatibility & Validation Helpers
// ==========================================

export function isPartCompatibleWithSlot<K extends PartKind>(
  part: Part,
  slot: SlotDefinition<K>
): part is PartOfKind<K> {
  return part.kind === slot.acceptsKind && part.socketTag === slot.socketTag;
}

/**
 * Validates whether a ServerNode contains all required components:
 * case, motherboard, storage, RAM, CPU, and power supply.
 */
export function isServerValid(server: ServerNode): boolean {
  if (!server || !Array.isArray(server.installedParts)) {
    return false;
  }

  const kinds = new Set(server.installedParts.map((part) => part.kind));

  const hasCase = kinds.has("CASE");
  const hasMotherboard = kinds.has("MOTHERBOARD");
  const hasStorage = kinds.has("STORAGE") || kinds.has("STORAGE_DEVICE");
  const hasRam = kinds.has("RAM");
  const hasCpu = kinds.has("CPU");
  const hasPsu = kinds.has("PSU");

  return hasCase && hasMotherboard && hasStorage && hasRam && hasCpu && hasPsu;
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
  operationsRequired: Operations; // Total operations needed
  totalSize: Storage; // Total storage footprint
  workingSetSize: Storage; // Minimum working set storage needed
  ioRatio: DataPerOperation; // IO demand: storage transfer needed per operation (Storage / Operations)

  // Rewards
  rewardCash: number;
  rewardPartIds: string[]; // Hardware drops upon completion

  // Runtime Progress
  workCompleted: Operations; // 0 to operationsRequired
  serverNodeIds?: string[]; // IDs of assigned server nodes (supports multi-node)
  servers?: ServerNode[]; // Assigned server node objects (supports multi-node)
}
