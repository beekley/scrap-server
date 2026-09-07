import * as u from 'safe-units'
import {
  GB,
  mBPerSecond,
  W,
  ETC,
  type StoragePart,
  type StorageDevicePart,
  type Rarity,
} from '../../types'

interface StorageVariantDef {
  capacity: number
  rarity: Rarity
  value: number
  bandwidth: number
  power: number
  idlePower?: number
}

function generateStorage(
  baseId: string,
  baseName: string,
  type: 'HDD' | 'SSD' | 'NVMe',
  socketTag: string,
  manufacturerId: string,
  baseImage: string,
  variants: StorageVariantDef[],
): (StoragePart | StorageDevicePart)[] {
  return variants.map((v) => ({
    id: `${baseId}_${v.capacity}gb`,
    name: `${baseName} ${v.capacity}GB ${type}`,
    kind: 'STORAGE',
    socketTag,
    manufacturerId,
    rarity: v.rarity,
    value: u.Measure.of(v.value / 2000, ETC),
    width: type === 'NVMe' ? 2 : type === 'SSD' ? 7 : 10,
    height: type === 'NVMe' ? 8 : type === 'SSD' ? 10 : 15,
    storageCapacity: u.Measure.of(v.capacity, GB),
    ioBandwidth: u.Measure.of(v.bandwidth, mBPerSecond),
    powerDraw: u.Measure.of(v.power, W),
    idlePowerDraw: v.idlePower !== undefined ? u.Measure.of(v.idlePower, W) : undefined,
    baseImage,
  }))
}

export const storage: (StoragePart | StorageDevicePart)[] = [
  ...generateStorage(
    'hdd_techmaker',
    'TechMaker',
    'HDD',
    'SATA3',
    'mfg_techmaker',
    'assets/storage/hdd_1_10x15.png',
    [
      { capacity: 250, rarity: 'COMMON', value: 10, bandwidth: 80, power: 8, idlePower: 5 },
      { capacity: 500, rarity: 'UNCOMMON', value: 20, bandwidth: 100, power: 10, idlePower: 5 },
      { capacity: 1000, rarity: 'RARE', value: 35, bandwidth: 120, power: 12, idlePower: 5 },
      { capacity: 2000, rarity: 'MYTHIC', value: 65, bandwidth: 140, power: 14, idlePower: 5 },
    ],
  ),
  ...generateStorage(
    'ssd_haodyn',
    'Haodyn SATA',
    'SSD',
    'SATA3',
    'mfg_haodyn',
    'assets/storage/ssd_1_7x10.png',
    [
      { capacity: 128, rarity: 'COMMON', value: 25, bandwidth: 400, power: 2 },
      { capacity: 256, rarity: 'UNCOMMON', value: 50, bandwidth: 500, power: 3 },
      { capacity: 512, rarity: 'RARE', value: 90, bandwidth: 550, power: 4 },
      { capacity: 1000, rarity: 'MYTHIC', value: 160, bandwidth: 600, power: 5 },
    ],
  ),
  ...generateStorage(
    'nvme_acc_datacore',
    'ACC DataCore Pro',
    'NVMe',
    'NVME',
    'mfg_acc',
    'assets/storage/nvme_1_2x8.png',
    [
      { capacity: 500, rarity: 'COMMON', value: 120, bandwidth: 2500, power: 4 },
      { capacity: 1000, rarity: 'UNCOMMON', value: 250, bandwidth: 3500, power: 5 },
      { capacity: 2000, rarity: 'RARE', value: 450, bandwidth: 5000, power: 6 },
      { capacity: 4000, rarity: 'MYTHIC', value: 900, bandwidth: 7000, power: 7 },
    ],
  ),
]
