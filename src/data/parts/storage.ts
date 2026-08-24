import * as u from 'safe-units';
import { GB, mBPerSecond, W, type StoragePart, type StorageDevicePart } from '../../types';

export const storage: (StoragePart | StorageDevicePart)[] = [
  {
    id: 'hdd_slow',
    name: '250GB Mechanical HDD',
    kind: 'STORAGE',
    socketTag: 'SATA',
    storageCapacity: u.Measure.of(250, GB),
    ioBandwidth: u.Measure.of(60, mBPerSecond),
    powerDraw: u.Measure.of(10, W),
  },
  {
    id: 'soc_phone',
    name: 'Cracked Android Phone',
    kind: 'STORAGE_DEVICE',
    socketTag: 'USB',
    storageCapacity: u.Measure.of(2, GB),
    ioBandwidth: u.Measure.of(30, mBPerSecond),
    powerDraw: u.Measure.of(10, W),
  }
];
