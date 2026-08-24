import * as u from 'safe-units';
import { GB, megabytesPerOp, ops, type Job } from '../../types';

export const earlyGameJobs: Job[] = [
  {
    id: 'job_01',
    title: 'Recover Corrupted Text Archive',
    description: 'Low IO Job',
    operationsRequired: u.Measure.of(50000, ops),
    workingSetSize: u.Measure.of(1, GB),
    totalSize: u.Measure.of(10, GB),
    ioRatio: u.Measure.of(0.2, megabytesPerOp),
    rewardCash: 50,
    rewardPartIds: ['ram_1gb'],
    workCompleted: u.Measure.of(0, ops),
  },
  {
    id: 'job_02',
    title: 'Brute-Force Password Dump',
    description: 'Compute Bound',
    operationsRequired: u.Measure.of(150000, ops),
    workingSetSize: u.Measure.of(1, GB),
    totalSize: u.Measure.of(2, GB),
    ioRatio: u.Measure.of(0.01, megabytesPerOp),
    rewardCash: 120,
    rewardPartIds: ['cpu_old'],
    workCompleted: u.Measure.of(0, ops),
  },
  {
    id: 'job_03',
    title: 'Scrape Video Metadata',
    description: 'IO Bound',
    operationsRequired: u.Measure.of(50000, ops),
    workingSetSize: u.Measure.of(2, GB),
    totalSize: u.Measure.of(50, GB),
    ioRatio: u.Measure.of(2.5, megabytesPerOp),
    rewardCash: 250,
    rewardPartIds: ['psu_200', 'mb_trash'],
    workCompleted: u.Measure.of(0, ops),
  }
];
