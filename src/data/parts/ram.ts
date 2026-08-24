import * as u from 'safe-units';
import { GB, mBPerSecond, W, type RamPart } from '../../types';

export const ram: RamPart[] = [
  {
    id: 'ram_1gb',
    name: 'Generic 1GB DDR Stick',
    kind: 'RAM',
    socketTag: 'DDR_LEGACY',
    memoryCapacity: u.Measure.of(1, GB),
    ioBandwidth: u.Measure.of(5000, mBPerSecond),
    powerDraw: u.Measure.of(5, W),
  }
];
