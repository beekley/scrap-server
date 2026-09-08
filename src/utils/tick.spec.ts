import { describe, it, expect } from 'vitest'
import { processAutoSellPure, chargePower } from './tick'
import { type Part, type ServerNode, type Currency, ETC } from '../types'
import * as u from 'safe-units'

describe('tick utils', () => {
  it('processes auto sell and removes parts outside', () => {
    const p1 = { id: 'p1', value: u.Measure.of(100, ETC), x: 210, width: 10, kind: 'RAM' } as Part // Inside (x: 210, STORAGE_UNIT_START_X is 200)
    const p2 = { id: 'p2', value: u.Measure.of(200, ETC), x: 10, width: 10, kind: 'RAM' } as Part // Outside

    const servers: ServerNode[] = []
    const inventory: Part[] = [p1, p2]
    const etc = u.Measure.of(50, ETC)

    const result = processAutoSellPure(servers, inventory, etc, 0.25)
    
    // Total value outside is 200. Earned = 200 * 0.25 = 50. Total ETC = 100.
    expect(result.newEtc.value).toBe(100)
    expect(result.newInventory.length).toBe(1)
    expect(result.newInventory[0].id).toBe('p1')
  })

  it('charges power correctly', () => {
    const etc = u.Measure.of(10, ETC)
    const result1 = chargePower(etc, 4)
    expect(result1.newEtc.value).toBe(6)
    expect(result1.outOfPower).toBe(false)

    const result2 = chargePower(etc, 15)
    expect(result2.newEtc.value).toBe(0)
    expect(result2.outOfPower).toBe(true)
  })
})
