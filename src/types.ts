import type {
  DataPerOperation,
  Operations,
  OperationsPerSecond,
  Power,
  Storage,
  Throughput,
  Currency,
} from './units'

export * from './units'

// ==========================================
// Sockets & Part Kinds
// ==========================================

export type CpuSocketTag = 'LGA1155' | 'AM4' | 'AM2' | (string & {})
export type RamSocketTag = 'DDR2' | 'DDR3' | 'DDR4' | (string & {})
export type StorageSocketTag = 'SATA' | 'NVME' | 'IDE' | 'USB' | (string & {})
export type PowerSocketTag = 'STANDARD_ATX' | (string & {})
export type MotherboardSocketTag = 'CHASSIS_MOUNT' | 'STANDOFF' | (string & {})
export type CaseSocketTag =
  'RACKMOUNT_1U' | 'RACKMOUNT_2U' | 'RACKMOUNT_4U' | 'ATX_MID_TOWER' | (string & {})

export type FanSocketTag = '80MM' | '120MM' | '140MM' | (string & {})

export interface SocketTagMap {
  CASE: CaseSocketTag
  CPU: CpuSocketTag
  RAM: RamSocketTag
  STORAGE: StorageSocketTag
  PSU: PowerSocketTag
  MOTHERBOARD: MotherboardSocketTag
  STORAGE_DEVICE: StorageSocketTag
  FAN: FanSocketTag
}

export type PartKind = keyof SocketTagMap

// ==========================================
// Slots
// ==========================================

export interface SlotDefinition<K extends PartKind = PartKind> {
  id: string
  label?: string
  acceptsKind: K
  socketTag: SocketTagMap[K] | SocketTagMap[K][]
  installedPartId?: string | null
  position?: 'TOP' | 'LEFT' | 'RIGHT' | 'REAR'
}

export interface Manufacturer {
  id: string
  name: string
  description: string
  tier: 'BUDGET' | 'MIDRANGE' | 'ENTHUSIAST' | 'INDUSTRIAL'
}

// ==========================================
// Generation & Rarity
// ==========================================
export type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'MYTHIC'

// ==========================================
// Parts
// ==========================================

export interface BasePart<K extends PartKind = PartKind> {
  id: string
  name: string
  kind: K
  socketTag: SocketTagMap[K]
  powerDraw: Power // Active power consumed in Watts
  idlePowerDraw?: Power // Idle power consumed in Watts
  maxOperatingTemp?: number // Temp above which thermal throttling occurs
  criticalTemp?: number // Temp above which server crashes
  manufacturerId?: string // Optional manufacturer reference
  slots?: SlotDefinition[] // Sockets/slots this part provides (e.g. on a motherboard or chassis)
  rarity: Rarity
  value: Currency // Base monetary value in ETC

  // Physical Dimensions & Location (1 unit = 1cm)
  width: number
  height: number
  x?: number // Position in the room (when loose)
  y?: number // Position in the room (when loose)
  baseImage?: string
  isDecoratable?: boolean
}

export interface CasePart extends BasePart<'CASE'> {
  slots?: SlotDefinition[]
}

export interface CpuPart extends BasePart<'CPU'> {
  computeRate: OperationsPerSecond // Base Compute Units per second (CU/s)
}

export interface RamPart extends BasePart<'RAM'> {
  memoryCapacity: Storage // RAM capacity
  ioBandwidth: Throughput // Max transfer speed (B/s)
}

export interface StoragePart extends BasePart<'STORAGE'> {
  storageCapacity: Storage // Storage capacity
  ioBandwidth: Throughput // Max transfer speed (B/s)
}

export interface PsuPart extends BasePart<'PSU'> {
  powerCapacity: Power // Max power supplied in Watts (for PSUs)
}

export interface MotherboardPart extends BasePart<'MOTHERBOARD'> {
  slots: SlotDefinition[] // Motherboard always provides slots for CPU, RAM, etc.
}

export interface StorageDevicePart extends BasePart<'STORAGE_DEVICE'> {
  storageCapacity: Storage
  ioBandwidth?: Throughput
}

export interface FanPart extends BasePart<'FAN'> {
  flowRate: number // Volumetric flow rate in CFM
  direction: 'INTAKE' | 'EXHAUST' // Current direction
}

export type Part =
  | CasePart
  | CpuPart
  | RamPart
  | StoragePart
  | PsuPart
  | MotherboardPart
  | StorageDevicePart
  | FanPart

export type PartOfKind<K extends PartKind> = Extract<Part, { kind: K }>

// ==========================================
// Compatibility & Validation Helpers
// ==========================================

export function isPartCompatibleWithSlot<K extends PartKind>(
  part: Part,
  slot: SlotDefinition<K>,
): part is PartOfKind<K> {
  if (part.kind !== slot.acceptsKind) return false
  if (Array.isArray(slot.socketTag)) {
    return slot.socketTag.includes(part.socketTag as string)
  }
  return part.socketTag === slot.socketTag
}

/**
 * Validates whether a ServerNode contains all required components:
 * case, motherboard, storage, RAM, CPU, and power supply.
 */
export function isServerValid(server: ServerNode): boolean {
  if (!server || !Array.isArray(server.installedParts)) {
    return false
  }

  const kinds = new Set(server.installedParts.map((part) => part.kind))

  const hasCase = kinds.has('CASE')
  const hasMotherboard = kinds.has('MOTHERBOARD')
  const hasStorage = kinds.has('STORAGE') || kinds.has('STORAGE_DEVICE')
  const hasRam = kinds.has('RAM')
  const hasCpu = kinds.has('CPU')
  const hasPsu = kinds.has('PSU')

  return hasCase && hasMotherboard && hasStorage && hasRam && hasCpu && hasPsu
}

// ==========================================
// SERVER
// ==========================================

export interface ServerNode {
  id: string
  name: string
  installedParts: Part[]
  x?: number // Position in the room
  y?: number // Position in the room
}

// ==========================================
// JOB
// ==========================================

export type JobStatus = 'NOT_STARTED' | 'LOADING' | 'COMPUTING' | 'SAVING' | 'COMPLETED'

export interface Job {
  id: string
  title: string
  description: string
  rarity: Rarity

  // Requirements & Bottlenecks
  downloadSize: Storage // Data read during LOAD phase
  operationsRequired: Operations // Total operations needed
  memoryAccessPerOp: DataPerOperation // Memory bus access required per compute op
  uploadSize: Storage // Data written during SAVE phase

  totalSize: Storage // Total storage footprint
  workingSetSize: Storage // Target working set (must fit in RAM, or suffer swap penalty)

  // Rewards
  rewardPartIds: string[] // Hardware drops upon completion
  rewardDescription: string // Generic description of the reward (e.g. "Lot of 4 RAM sticks")

  // Runtime Progress
  status: JobStatus
  downloadedBytes: Storage // 0 to downloadSize
  workCompleted: Operations // 0 to operationsRequired
  uploadedBytes: Storage // 0 to uploadSize
  serverNodeIds?: string[] // IDs of assigned server nodes (supports multi-node)
  servers?: ServerNode[] // Assigned server node objects (supports multi-node)
}

// ==========================================
// DECORATIONS (Notes, Stickers)
// ==========================================

export type DecorationType = 'NOTE' | 'STICKER'

export interface Decoration {
  id: string
  name: string
  type: DecorationType
  content: string // Text content for notes, or image URL for stickers
  x: number // Room coordinates
  y: number // Room coordinates
  width: number
  height: number
  attachedToDoor?: boolean
}
