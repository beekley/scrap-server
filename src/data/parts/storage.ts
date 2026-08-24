import * as u from 'safe-units';
import { GB, mBPerSecond, W, type StoragePart, type StorageDevicePart } from '../../types';

export const storage: (StoragePart | StorageDevicePart)[] = [
  {
    id: 'hdd_techmaker_500gb',
    name: 'TechMaker 500GB HDD',
    kind: 'STORAGE',
    socketTag: 'SATA3',
    manufacturerId: 'mfg_techmaker',
    rarity: 'COMMON',
    value: 20,
    storageCapacity: u.Measure.of(500, GB),
    ioBandwidth: u.Measure.of(100, mBPerSecond),
    powerDraw: u.Measure.of(10, W),
  },
  {
    id: 'ssd_haodyn_256gb',
    name: 'Haodyn 256GB SATA SSD',
    kind: 'STORAGE',
    socketTag: 'SATA3',
    manufacturerId: 'mfg_haodyn',
    rarity: 'UNCOMMON',
    value: 50,
    storageCapacity: u.Measure.of(256, GB),
    ioBandwidth: u.Measure.of(500, mBPerSecond),
    powerDraw: u.Measure.of(3, W),
  },
  {
    id: 'nvme_acc_datacore_1tb',
    name: 'ACC DataCore Pro 1TB NVMe',
    kind: 'STORAGE',
    socketTag: 'NVME',
    manufacturerId: 'mfg_acc',
    rarity: 'MYTHIC',
    value: 250,
    storageCapacity: u.Measure.of(1000, GB),
    ioBandwidth: u.Measure.of(3500, mBPerSecond),
    powerDraw: u.Measure.of(5, W),
  }
];
