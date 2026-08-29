import * as u from 'safe-units'
import { W, ETC, type CasePart } from '../../types'

export const cases: CasePart[] = [
  {
    id: 'case_techmaker_atx',
    name: 'TechMaker Basic ATX Case',
    kind: 'CASE',
    socketTag: 'ATX_MID_TOWER',
    manufacturerId: 'mfg_techmaker',
    rarity: 'COMMON',
    value: u.Measure.of(0.01, ETC),
    width: 20,
    height: 45,
    baseImage: 'assets/cases/techmaker_1_20x45.png',
    powerDraw: u.Measure.of(0, W),
    slots: [
      { id: 'mb_0', label: 'Motherboard Tray', acceptsKind: 'MOTHERBOARD', socketTag: 'ATX' },
    ],
  },
  {
    id: 'case_xblaze_rgb',
    name: 'XBlaze Hellfire Mid-Tower',
    kind: 'CASE',
    socketTag: 'ATX_MID_TOWER',
    manufacturerId: 'mfg_xblaze',
    rarity: 'RARE',
    value: u.Measure.of(0.06, ETC),
    width: 20,
    height: 45,
    baseImage: 'assets/cases/xblaze_1_20x45.png',
    powerDraw: u.Measure.of(15, W), // RGB uses power!
    slots: [
      { id: 'mb_0', label: 'Motherboard Tray', acceptsKind: 'MOTHERBOARD', socketTag: 'ATX' },
    ],
  },
]
