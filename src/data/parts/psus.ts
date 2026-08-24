import * as u from 'safe-units';
import { W, type PsuPart } from '../../types';

export const psus: PsuPart[] = [
  {
    id: 'psu_200',
    name: 'Sparky 200W PSU',
    kind: 'PSU',
    socketTag: 'STANDARD_ATX',
    powerCapacity: u.Measure.of(200, W),
    powerDraw: u.Measure.of(0, W),
  }
];
