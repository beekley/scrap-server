import { describe, it, expect } from 'vitest'
import { tickThermal, createInitialGrid, calculateServerThermalMass, AMBIENT_TEMP } from '../thermal'
import * as u from 'safe-units'
import { W, ETC, type ServerNode, type CasePart, type FanPart } from '../types'

describe('Thermal System', () => {
  it('transfers heat correctly with forced convection', () => {
    const roomGrid = createInitialGrid()
    const serverTemps: Record<string, number> = {}
    
    const casePart: CasePart = {
      id: 'case_test',
      name: 'Test Case',
      kind: 'CASE',
      socketTag: 'ATX_MID_TOWER',
      rarity: 'COMMON',
      value: u.Measure.of(0, ETC),
      width: 20,
      height: 40,
      powerDraw: u.Measure.of(0, W),
      slots: [
        { id: 'fan_rear', acceptsKind: 'FAN', socketTag: '120MM', position: 'REAR' },
        { id: 'fan_front', acceptsKind: 'FAN', socketTag: '120MM', position: 'LEFT' }
      ]
    }
    
    const exhaustFan: FanPart = {
      id: 'fan_1',
      name: 'Exhaust Fan',
      kind: 'FAN',
      socketTag: '120MM',
      rarity: 'COMMON',
      value: u.Measure.of(0, ETC),
      width: 12,
      height: 12,
      powerDraw: u.Measure.of(2, W),
      flowRate: 50,
      direction: 'EXHAUST'
    }
    
    const intakeFan: FanPart = {
      id: 'fan_2',
      name: 'Intake Fan',
      kind: 'FAN',
      socketTag: '120MM',
      rarity: 'COMMON',
      value: u.Measure.of(0, ETC),
      width: 12,
      height: 12,
      powerDraw: u.Measure.of(2, W),
      flowRate: 50,
      direction: 'INTAKE'
    }
    
    // Setup slot links
    casePart.slots![0]!.installedPartId = exhaustFan.id
    casePart.slots![1]!.installedPartId = intakeFan.id

    const server: ServerNode = {
      id: 'server_1',
      name: 'Server 1',
      installedParts: [casePart, exhaustFan, intakeFan],
      x: 100,
      y: 100
    }

    serverTemps[server.id] = 80 // Hot server
    const serverWatts = { 'server_1': 100 } // 100W heat load

    // Run 10 seconds of simulation
    for (let i = 0; i < 10; i++) {
      tickThermal(serverTemps, roomGrid, [server], serverWatts, 1.0)
    }

    // Server should cool down from 80 because fans remove much more heat than 100W
    expect(serverTemps[server.id]).toBeLessThan(80)
    
    // Target cells should heat up. 
    // Left fan is intake (x=100 -> col=10, so col=9 is left).
    // Rear fan is exhaust (all surrounding).
    // We expect room temp to be above ambient overall due to dumped heat.
    let totalRoomTemp = 0;
    for (const row of roomGrid) {
      for (const temp of row) {
        totalRoomTemp += temp;
      }
    }
    const avgTemp = totalRoomTemp / (roomGrid.length * roomGrid[0]!.length);
    expect(avgTemp).toBeGreaterThan(AMBIENT_TEMP)
  })
})
