import * as u from 'safe-units'
import { ETC, type Currency, type Part, type ServerNode } from '../types'
import { isItemOutside } from './physics'

export interface AutoSellResult {
  newServers: ServerNode[]
  newInventory: Part[]
  newEtc: Currency
}

export function processAutoSellPure(
  servers: ServerNode[],
  inventory: Part[],
  currentEtc: Currency,
  multiplier: number
): AutoSellResult {
  let totalValue = 0
  const newServers: ServerNode[] = []
  
  for (const server of servers) {
    const casePart = server.installedParts.find((p) => p.kind === 'CASE')
    if (server.x !== undefined && casePart && isItemOutside(server.x, casePart.width)) {
      for (const part of server.installedParts) {
        totalValue += part.value.value
      }
    } else {
      newServers.push({ ...server })
    }
  }

  const newInventory: Part[] = []
  for (const part of inventory) {
    if (part.x !== undefined && isItemOutside(part.x, part.width)) {
      totalValue += part.value.value
    } else {
      newInventory.push({ ...part })
    }
  }

  const earned = totalValue * multiplier
  const newEtc = earned > 0 ? u.Measure.of(currentEtc.value + earned, ETC) : u.Measure.of(currentEtc.value, ETC)

  return { newServers, newInventory, newEtc }
}

export function calculatePowerCost(
  totalWatts: number,
  dtSeconds: number,
  costPerKwh: number
): number {
  const kwh = (totalWatts / 1000) * (dtSeconds / 3600)
  return kwh * costPerKwh
}

export function chargePower(
  currentEtc: Currency,
  cost: number
): { newEtc: Currency; outOfPower: boolean } {
  if (currentEtc.value >= cost) {
    return { newEtc: u.Measure.of(currentEtc.value - cost, ETC), outOfPower: false }
  } else {
    return { newEtc: u.Measure.of(0, ETC), outOfPower: true }
  }
}
