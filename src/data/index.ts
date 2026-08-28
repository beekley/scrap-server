import * as u from 'safe-units'
import { ops, type Job, type Part, type SlotDefinition } from '../types'
import { allParts } from './parts'
import { allJobs } from './jobs'
import { manufacturers } from './manufacturers'

export { allParts } from './parts'
export { allJobs } from './jobs'
export { manufacturers } from './manufacturers'

export function getManufacturer(id: string) {
  return manufacturers.find((m) => m.id === id)
}

export function getPartTemplate(id: string): Part {
  const p = allParts.find((p) => p.id === id)
  if (!p) throw new Error(`Unknown part ID: ${id}`)

  const cloned = { ...p }
  const instanceId = `${id}_${Math.random().toString(36).substr(2, 9)}`
  cloned.id = instanceId

  if ('slots' in cloned && cloned.slots) {
    cloned.slots = cloned.slots.map((s: SlotDefinition) => ({ ...s }))
  }

  return cloned as Part
}

export function getJobTemplate(id: string): Job {
  const j = allJobs.find((j) => j.id === id)
  if (!j) throw new Error(`Unknown job ID: ${id}`)
  return {
    ...j,
    operationsRequired: j.operationsRequired,
    workingSetSize: j.workingSetSize,
    totalSize: j.totalSize,
    ioRatio: j.ioRatio,
    workCompleted: u.Measure.of(0, ops),
    rewardPartIds: [...j.rewardPartIds],
  }
}
