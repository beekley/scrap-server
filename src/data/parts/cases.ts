import * as u from 'safe-units';
import { W, type CasePart } from '../../types';

export const cases: CasePart[] = [
  {
    id: 'case_chassis',
    name: 'Rusty Tower',
    kind: 'CASE',
    socketTag: 'TOWER',
    powerDraw: u.Measure.of(0, W),
    slots: [
      { id: 'mb_0', label: 'Motherboard Tray', acceptsKind: 'MOTHERBOARD', socketTag: 'CHASSIS_MOUNT' }
    ]
  }
];
