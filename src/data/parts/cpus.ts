import * as u from 'safe-units'
import { W, opsPerSecond, ETC, type CpuPart, type Rarity } from '../../types'

interface CpuVariantDef {
  modelNumber: string
  rarity: Rarity
  value: number
  computeRate: number
  power: number
}

function generateCpu(
  baseId: string,
  baseName: string,
  socketTag: string,
  manufacturerId: string,
  variants: CpuVariantDef[],
): CpuPart[] {
  return variants.map((v) => ({
    id: `${baseId}_${v.modelNumber}`,
    name: `${baseName} ${v.modelNumber}`,
    kind: 'CPU',
    socketTag,
    manufacturerId,
    rarity: v.rarity,
    value: u.Measure.of(v.value / 2000, ETC),
    width: 4,
    height: 4,
    computeRate: u.Measure.of(v.computeRate, opsPerSecond),
    powerDraw: u.Measure.of(v.power, W),
    baseImage: 'assets/cpus/cpu_1_4x4.png',
  }))
}

export const cpus: CpuPart[] = [
  ...generateCpu('cpu_acc_vectra', 'ACC Vectra-II', 'LGA1155', 'mfg_acc', [
    { modelNumber: '2100', rarity: 'COMMON', value: 25, computeRate: 100, power: 45 },
    { modelNumber: '2400', rarity: 'UNCOMMON', value: 60, computeRate: 150, power: 55 },
    { modelNumber: '2600', rarity: 'RARE', value: 120, computeRate: 220, power: 65 },
    { modelNumber: '2700K', rarity: 'MYTHIC', value: 250, computeRate: 300, power: 85 },
  ]),
  ...generateCpu('cpu_acc_titan', 'ACC Titan X4', 'AM4', 'mfg_acc', [
    { modelNumber: '3100', rarity: 'COMMON', value: 60, computeRate: 400, power: 65 },
    { modelNumber: '3600', rarity: 'UNCOMMON', value: 120, computeRate: 800, power: 75 },
    { modelNumber: '3700X', rarity: 'RARE', value: 240, computeRate: 1200, power: 95 },
    { modelNumber: '3950X', rarity: 'MYTHIC', value: 500, computeRate: 2000, power: 105 },
  ]),
  ...generateCpu('cpu_acc_titan_legacy', 'ACC Titan 64', 'AM2', 'mfg_acc', [
    { modelNumber: '4200', rarity: 'COMMON', value: 10, computeRate: 40, power: 65 },
    { modelNumber: '4600', rarity: 'UNCOMMON', value: 20, computeRate: 60, power: 89 },
    { modelNumber: '6400', rarity: 'RARE', value: 45, computeRate: 90, power: 125 },
  ]),
]
