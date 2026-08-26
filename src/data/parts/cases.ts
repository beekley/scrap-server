import * as u from 'safe-units';
import { W, type CasePart } from '../../types';

export const cases: CasePart[] = [
  {
    id: 'case_techmaker_atx',
    name: 'TechMaker Basic ATX Case',
    kind: 'CASE',
    socketTag: 'ATX_MID_TOWER',
    manufacturerId: 'mfg_techmaker',
    rarity: 'COMMON',
    value: 20,
    width: 20,
    height: 45,
    powerDraw: u.Measure.of(0, W),
    slots: [
      { id: 'mb_0', label: 'Motherboard Tray', acceptsKind: 'MOTHERBOARD', socketTag: 'ATX' }
    ]
  },
  {
    id: 'case_xblaze_rgb',
    name: 'XBlaze Hellfire Mid-Tower',
    kind: 'CASE',
    socketTag: 'ATX_MID_TOWER',
    manufacturerId: 'mfg_xblaze',
    rarity: 'RARE',
    value: 120,
    width: 20,
    height: 45,
    powerDraw: u.Measure.of(15, W), // RGB uses power!
    slots: [
      { id: 'mb_0', label: 'Motherboard Tray', acceptsKind: 'MOTHERBOARD', socketTag: 'ATX' }
    ]
  }
];
