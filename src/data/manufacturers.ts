import type { Manufacturer } from '../types';

export const manufacturers: Manufacturer[] = [
  {
    id: 'mfg_haodyn',
    name: 'Haodyn',
    description: 'A Chinese manufacturer known for simple, but highly effective industrial parts.',
    tier: 'MIDRANGE'
  },
  {
    id: 'mfg_techmaker',
    name: 'TechMaker',
    description: 'An American company focused on mass-producing budget, low-end computing parts.',
    tier: 'BUDGET'
  },
  {
    id: 'mfg_xblaze',
    name: 'XBlaze',
    description: 'An American brand famous for high-performance, gaming-focused hardware with aggressive styling.',
    tier: 'ENTHUSIAST'
  },
  {
    id: 'mfg_acc',
    name: 'ACC (Advanced Computer Components)',
    description: 'An old-school manufacturer of processors and NVMe storage renowned for high-reliability computing.',
    tier: 'INDUSTRIAL'
  }
];
