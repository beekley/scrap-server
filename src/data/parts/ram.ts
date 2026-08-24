import * as u from 'safe-units';
import { GB, mBPerSecond, W, type RamPart } from '../../types';

export const ram: RamPart[] = [
  {
    id: 'ram_techmaker_4gb_ddr3',
    name: 'TechMaker Value 4GB DDR3',
    kind: 'RAM',
    socketTag: 'DDR3',
    manufacturerId: 'mfg_techmaker',
    rarity: 'COMMON',
    value: 20,
    memoryCapacity: u.Measure.of(4, GB),
    ioBandwidth: u.Measure.of(10000, mBPerSecond),
    powerDraw: u.Measure.of(4, W),
  },
  {
    id: 'ram_xblaze_8gb_ddr4',
    name: 'XBlaze RGB 8GB DDR4',
    kind: 'RAM',
    socketTag: 'DDR4',
    manufacturerId: 'mfg_xblaze',
    rarity: 'RARE',
    value: 120,
    memoryCapacity: u.Measure.of(8, GB),
    ioBandwidth: u.Measure.of(25600, mBPerSecond),
    powerDraw: u.Measure.of(6, W),
  }
];
