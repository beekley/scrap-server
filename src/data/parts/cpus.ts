import * as u from 'safe-units';
import { W, opsPerSecond, type CpuPart } from '../../types';

export const cpus: CpuPart[] = [
  {
    id: 'cpu_old',
    name: 'Dual-Core E-Waste CPU',
    kind: 'CPU',
    socketTag: 'SOCKET_V1',
    computeRate: u.Measure.of(50, opsPerSecond),
    powerDraw: u.Measure.of(65, W),
  }
];
