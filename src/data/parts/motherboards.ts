import * as u from 'safe-units';
import { W, type MotherboardPart } from '../../types';

export const motherboards: MotherboardPart[] = [
  {
    id: 'mb_trash',
    name: 'Salvaged OEM Board',
    kind: 'MOTHERBOARD',
    socketTag: 'CHASSIS_MOUNT',
    powerDraw: u.Measure.of(15, W),
    slots: [
      { id: 'cpu_0', label: 'CPU Socket', acceptsKind: 'CPU', socketTag: 'SOCKET_V1' },
      { id: 'ram_0', label: 'RAM Slot 1', acceptsKind: 'RAM', socketTag: 'DDR_LEGACY' },
      { id: 'ram_1', label: 'RAM Slot 2', acceptsKind: 'RAM', socketTag: 'DDR_LEGACY' },
      { id: 'sata_0', label: 'SATA Port 1', acceptsKind: 'STORAGE', socketTag: 'SATA' },
      { id: 'sata_1', label: 'SATA Port 2', acceptsKind: 'STORAGE', socketTag: 'SATA' },
      { id: 'psu_0', label: 'Power', acceptsKind: 'PSU', socketTag: 'STANDARD_ATX' },
    ],
  }
];
