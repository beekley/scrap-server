import * as u from 'safe-units';
import { W, type PsuPart } from '../../types';

export const psus: PsuPart[] = [
  {
    id: 'psu_techmaker_300w',
    name: 'TechMaker 300W Budget PSU',
    kind: 'PSU',
    socketTag: 'STANDARD_ATX',
    manufacturerId: 'mfg_techmaker',
    rarity: 'COMMON',
    value: 20,
    width: 15,
    height: 8,
    powerCapacity: u.Measure.of(300, W),
    powerDraw: u.Measure.of(0, W),
  },
  {
    id: 'psu_xblaze_650w',
    name: 'XBlaze Supernova 650W',
    kind: 'PSU',
    socketTag: 'STANDARD_ATX',
    manufacturerId: 'mfg_xblaze',
    rarity: 'RARE',
    value: 120,
    width: 15,
    height: 8,
    powerCapacity: u.Measure.of(650, W),
    powerDraw: u.Measure.of(0, W),
  }
];
