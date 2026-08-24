import * as u from 'safe-units';
import { W, opsPerSecond, type CpuPart } from '../../types';

export const cpus: CpuPart[] = [
  {
    id: 'cpu_acc_vectra_1155',
    name: 'ACC Vectra-II 1155',
    kind: 'CPU',
    socketTag: 'LGA1155',
    manufacturerId: 'mfg_acc',
    computeRate: u.Measure.of(300, opsPerSecond),
    powerDraw: u.Measure.of(65, W),
  },
  {
    id: 'cpu_acc_titan_am4',
    name: 'ACC Titan-V 3600',
    kind: 'CPU',
    socketTag: 'AM4',
    manufacturerId: 'mfg_acc',
    computeRate: u.Measure.of(1500, opsPerSecond),
    powerDraw: u.Measure.of(75, W),
  }
];
