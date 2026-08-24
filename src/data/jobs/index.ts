import type { Job } from '../../types';
import { earlyGameJobs } from './early_game';

export const allJobs: Job[] = [
  ...earlyGameJobs
];
