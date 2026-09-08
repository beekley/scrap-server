import { describe, it, expect } from 'vitest'
import { tickJob } from './simulation'
import type { Job } from './types'
import { ETC, s } from './types'
import * as u from 'safe-units'

describe('tickJob (Pure)', () => {
  it('initializes NOT_STARTED jobs to LOADING', () => {
    const job: Job = {
      id: 'j1',
      name: 'Test Job',
      status: 'NOT_STARTED',
      operationsRequired: u.Measure.of(1000, u.Measure.dimensionless),
      workCompleted: u.Measure.of(0, u.Measure.dimensionless),
      downloadSize: u.Measure.of(100, u.Measure.dimensionless),
      downloadedBytes: u.Measure.of(0, u.Measure.dimensionless),
      uploadSize: u.Measure.of(100, u.Measure.dimensionless),
      uploadedBytes: u.Measure.of(0, u.Measure.dimensionless),
      baseReward: u.Measure.of(1, ETC),
      memoryAccessPerOp: u.Measure.of(1, u.Measure.dimensionless),
      workingSetSize: u.Measure.of(1, u.Measure.dimensionless),
      workingSetType: 'SEQUENTIAL',
      computeType: 'INTEGER',
      rewardPartIds: [],
    } as any

    const server = {
      id: 's1',
      installedParts: [],
    } as any

    const dt = u.Measure.of(1, s)
    const { newJob, result } = tickJob(job, server, dt, {})

    expect(newJob.status).toBe('LOADING')
    expect(newJob.id).toBe(job.id) // Pure function means no mutation, checking return value
    expect(job.status).toBe('NOT_STARTED') // Original job is unchanged
    expect(result.currentPhase).toBe('LOADING')
  })
})
