import * as u from 'safe-units';
import { W, type MotherboardPart } from '../../types';

export const motherboards: MotherboardPart[] = [
  {
    id: 'mb_haodyn_h61',
    name: 'Haodyn H61-M',
    kind: 'MOTHERBOARD',
    socketTag: 'ATX',
    manufacturerId: 'mfg_haodyn',
    powerDraw: u.Measure.of(15, W),
    slots: [
      { id: 'cpu_0', label: 'LGA1155 Socket', acceptsKind: 'CPU', socketTag: 'LGA1155' },
      { id: 'ram_0', label: 'DDR3 Slot 1', acceptsKind: 'RAM', socketTag: 'DDR3' },
      { id: 'ram_1', label: 'DDR3 Slot 2', acceptsKind: 'RAM', socketTag: 'DDR3' },
      { id: 'sata_0', label: 'SATA3 Port 1', acceptsKind: 'STORAGE', socketTag: 'SATA3' },
      { id: 'sata_1', label: 'SATA3 Port 2', acceptsKind: 'STORAGE', socketTag: 'SATA3' },
      { id: 'psu_0', label: 'ATX Power', acceptsKind: 'PSU', socketTag: 'STANDARD_ATX' },
    ],
  },
  {
    id: 'mb_xblaze_b450',
    name: 'XBlaze B450 Pro Gaming',
    kind: 'MOTHERBOARD',
    socketTag: 'ATX',
    manufacturerId: 'mfg_xblaze',
    powerDraw: u.Measure.of(25, W),
    slots: [
      { id: 'cpu_0', label: 'AM4 Socket', acceptsKind: 'CPU', socketTag: 'AM4' },
      { id: 'ram_0', label: 'DDR4 Slot 1', acceptsKind: 'RAM', socketTag: 'DDR4' },
      { id: 'ram_1', label: 'DDR4 Slot 2', acceptsKind: 'RAM', socketTag: 'DDR4' },
      { id: 'sata_0', label: 'SATA3 Port', acceptsKind: 'STORAGE', socketTag: 'SATA3' },
      { id: 'm2_0', label: 'M.2 NVMe Slot', acceptsKind: 'STORAGE', socketTag: 'NVME' },
      { id: 'psu_0', label: 'ATX Power', acceptsKind: 'PSU', socketTag: 'STANDARD_ATX' },
    ],
  }
];
