import * as u from 'safe-units'
import { GB, mBPerSecond, W, ETC, type RamPart, type Rarity } from '../../types'

interface RamVariantDef {
  capacity: number
  rarity: Rarity
  value: number
  bandwidth: number
  power: number
}

function generateRam(
  baseId: string,
  baseName: string,
  socketTag: string,
  manufacturerId: string,
  variants: RamVariantDef[],
): RamPart[] {
  return variants.map((v) => {
    const capLabel = v.capacity < 1 ? `${v.capacity * 1024}MB` : `${v.capacity}GB`
    const idLabel = v.capacity < 1 ? `${v.capacity * 1024}mb` : `${v.capacity}gb`
    return {
      id: `${baseId}_${idLabel}`,
      name: `${baseName} ${capLabel} ${socketTag}`,
      kind: 'RAM',
      socketTag,
      manufacturerId,
      rarity: v.rarity,
      value: u.Measure.of(v.value / 2000, ETC),
      width: 13,
      height: 3,
      memoryCapacity: u.Measure.of(v.capacity, GB),
      ioBandwidth: u.Measure.of(v.bandwidth, mBPerSecond),
      powerDraw: u.Measure.of(v.power, W),
    }
  })
}

export const ram: RamPart[] = [
  ...generateRam('ram_techmaker', 'TechMaker Old', 'DDR2', 'mfg_techmaker', [
    { capacity: 0.5, rarity: 'COMMON', value: 2, bandwidth: 3200, power: 1 },
    { capacity: 1, rarity: 'UNCOMMON', value: 5, bandwidth: 4266, power: 2 },
    { capacity: 2, rarity: 'RARE', value: 12, bandwidth: 5333, power: 2 },
  ]),
  ...generateRam('ram_techmaker', 'TechMaker Value', 'DDR3', 'mfg_techmaker', [
    { capacity: 1, rarity: 'COMMON', value: 5, bandwidth: 8000, power: 2 },
    { capacity: 2, rarity: 'UNCOMMON', value: 12, bandwidth: 9000, power: 3 },
    { capacity: 4, rarity: 'RARE', value: 25, bandwidth: 10000, power: 4 },
    { capacity: 8, rarity: 'MYTHIC', value: 60, bandwidth: 12000, power: 5 },
  ]),
  ...generateRam('ram_xblaze', 'XBlaze RGB', 'DDR4', 'mfg_xblaze', [
    { capacity: 4, rarity: 'COMMON', value: 40, bandwidth: 21333, power: 4 },
    { capacity: 8, rarity: 'UNCOMMON', value: 85, bandwidth: 25600, power: 6 },
    { capacity: 16, rarity: 'RARE', value: 180, bandwidth: 32000, power: 8 },
    { capacity: 32, rarity: 'MYTHIC', value: 400, bandwidth: 36000, power: 10 },
  ]),
]
