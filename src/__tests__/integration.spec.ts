import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '../stores/game'
import * as u from 'safe-units'
import { s, ETC, type Job, B, ops, megabytesPerOp } from '../types'

import { vi } from 'vitest'

describe('Game Integration: Simulation over time', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  it('runs a tick and completes a job correctly', () => {
    const store = useGameStore()
    
    // We expect the store to initialize with a starter server
    expect(store.servers.length).toBeGreaterThan(0)
    
    const server = store.servers[0]
    
    // Let's create a small test job
    const testJob: Job = {
      id: 'test_job_1',
      title: 'Quick Task',
      description: 'Finish quickly',
      operationsRequired: u.Measure.of(100, ops),
      totalSize: u.Measure.of(1, B),
      workingSetSize: u.Measure.of(1, B),
      memoryAccessPerOp: u.Measure.of(0, megabytesPerOp),
      rewardDescription: '100 ETC',
      rarity: 'COMMON',
      rewardPartIds: [],
      status: 'NOT_STARTED',
      downloadSize: u.Measure.of(0, B),
      downloadedBytes: u.Measure.of(0, B),
      uploadSize: u.Measure.of(0, B),
      uploadedBytes: u.Measure.of(0, B),
      workCompleted: u.Measure.of(0, ops),
      baseReward: u.Measure.of(100, ETC),
    }
    testJob.serverNodeIds = [server.id]
    store.activeJobs.push(testJob)
    
    const initialEtc = store.etc.value
    
    // The job transitions through NOT_STARTED -> LOADING -> COMPUTING -> SAVING -> COMPLETED
    store.lastTickTime = performance.now()
    
    for (let i = 0; i < 10; i++) {
      store.lastTickTime -= 1000 // Force dtSeconds to be 1.0
      store.tick() 
    }

    const jobIndex = store.activeJobs.findIndex(j => j.id === testJob.id)
    
    // The job should have been completed and removed from active jobs
    expect(jobIndex).toBe(-1)
        // Check if job is in completedJobs
    const completedJob = store.completedJobs.find((j) => j.id === testJob.id)
    expect(completedJob).toBeDefined()
  })
})
