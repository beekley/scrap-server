import * as u from 'safe-units'
import {
  type Rarity,
  type Job,
  type Part,
  type PartKind,
  type CasePart,
  type MotherboardPart,
  ops,
  GB,
  megabytesPerOp,
  B,
} from '../types'
import { allParts as parts } from '../data/index'

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  COMMON: 60,
  UNCOMMON: 25,
  RARE: 12,
  MYTHIC: 3,
}

export function rollRarity(): Rarity {
  const totalWeight = Object.values(RARITY_WEIGHTS).reduce((sum, w) => sum + w, 0)
  let roll = Math.random() * totalWeight

  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    if (roll < weight) return rarity as Rarity
    roll -= weight
  }
  return 'COMMON'
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickRandomElement<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined
  return arr[Math.floor(Math.random() * arr.length)]
}

function getPartsByRarity(kind: PartKind, rarity: Rarity): Part[] {
  return parts.filter((p: Part) => p.kind === kind && p.rarity === rarity)
}

function getCompatiblePartsByRarity(kind: PartKind, rarity: Rarity, socketTag: string | string[]): Part[] {
  return parts.filter(
    (p: Part) => p.kind === kind && p.rarity === rarity && (Array.isArray(socketTag) ? socketTag.includes(p.socketTag as any) : p.socketTag === socketTag),
  )
}

export function generateSinglePartReward(rarity: Rarity): {
  description: string
  partIds: string[]
} {
  const possibleParts = parts.filter((p) => p.rarity === rarity)
  if (possibleParts.length === 0) {
    return { description: 'Nothing found', partIds: [] }
  }
  const selectedPart = pickRandomElement(possibleParts)!
  return {
    description: `Found a ${rarity.toLowerCase()} part: ${selectedPart.name}`,
    partIds: [selectedPart.id],
  }
}

export function generateServerReward(rarity: Rarity): { description: string; partIds: string[] } {
  const caseParts = parts.filter((p) => p.kind === 'CASE') as CasePart[]
  const moboParts = parts.filter((p) => p.kind === 'MOTHERBOARD') as MotherboardPart[]

  if (caseParts.length === 0 || moboParts.length === 0) {
    return generateSinglePartReward(rarity)
  }

  const casePart = pickRandomElement(caseParts)!
  const moboPart = pickRandomElement(moboParts)!

  const generatedIds: string[] = [casePart.id, moboPart.id]

  for (const slot of moboPart.slots || []) {
    // 70% chance to fill a slot
    if (Math.random() < 0.7) {
      const partRarity = rollRarity()
      const compatibleParts = getCompatiblePartsByRarity(
        slot.acceptsKind,
        partRarity,
        slot.socketTag,
      )

      if (compatibleParts.length > 0) {
        const selected = pickRandomElement(compatibleParts)
        if (selected) {
          generatedIds.push(selected.id)
        }
      } else {
        // Fallback to any compatible part
        const anyCompatible = parts.filter(
          (p: Part) => p.kind === slot.acceptsKind && (Array.isArray(slot.socketTag) ? slot.socketTag.includes(p.socketTag as any) : p.socketTag === slot.socketTag),
        )
        if (anyCompatible.length > 0) {
          const selected = pickRandomElement(anyCompatible)
          if (selected) generatedIds.push(selected.id)
        }
      }
    }
  }

  return {
    description: `A scavenged ${rarity.toLowerCase()} server build`,
    partIds: generatedIds,
  }
}

export function generateBundleReward(rarity: Rarity): { description: string; partIds: string[] } {
  const kinds: PartKind[] = ['RAM', 'STORAGE', 'CPU']
  const kind = pickRandomElement(kinds) ?? 'RAM'

  let validParts = getPartsByRarity(kind, rarity)
  if (validParts.length === 0) validParts = getPartsByRarity(kind, 'COMMON')
  if (validParts.length === 0) return generateSinglePartReward(rarity)

  const selectedPart = pickRandomElement(validParts)
  if (!selectedPart) return generateSinglePartReward(rarity)

  const quantity = getRandomInt(2, 5)
  const generatedIds = Array(quantity).fill(selectedPart.id)

  return {
    description: `Bundle of ${quantity}x ${selectedPart.name}`,
    partIds: generatedIds,
  }
}

const JOB_TITLES = [
  'Decrypt Corporate Database',
  'Scrape Video Metadata',
  'Brute-Force Password Dump',
  'Recover Corrupted Text Archive',
  'Mine Cryptocurrency Block',
  'Render 3D Architectural Scene',
  'Train Simple Neural Network',
  'Compile Legacy Monolith',
  'Process Satellite Imagery',
]

let jobCounter = 0

export function generateProceduralJob(): Job {
  const rarity = rollRarity()

  let diffMultiplier = 1
  switch (rarity) {
    case 'COMMON':
      diffMultiplier = 1
      break
    case 'UNCOMMON':
      diffMultiplier = 3
      break
    case 'RARE':
      diffMultiplier = 8
      break
    case 'MYTHIC':
      diffMultiplier = 20
      break
  }

  const title = pickRandomElement(JOB_TITLES) ?? 'Unknown Task'
  const baseOps = getRandomInt(50, 150) * 1000
  const totalOps = baseOps * diffMultiplier

  const rewardTypeRoll = Math.random()
  let reward

  if (rewardTypeRoll < 0.4) {
    // 40% chance
    reward = generateSinglePartReward(rarity)
  } else if (rewardTypeRoll < 0.7) {
    // 30% chance
    reward = generateBundleReward(rarity)
  } else {
    // 30% chance
    reward = generateServerReward(rarity)
  }

  jobCounter++

  return {
    id: `job_gen_${Date.now()}_${jobCounter}`,
    title: `${title}`,
    description: `A ${rarity.toLowerCase()} difficulty task.`,
    rarity: rarity,

    downloadSize: u.Measure.of(getRandomInt(1, 10) * diffMultiplier, GB),
    uploadSize: u.Measure.of(getRandomInt(1, 5) * diffMultiplier, GB),
    operationsRequired: u.Measure.of(totalOps, ops),
    memoryAccessPerOp: u.Measure.of(Math.random() * 2 + 0.1, megabytesPerOp),

    workingSetSize: u.Measure.of(getRandomInt(1, 4) * diffMultiplier, GB),
    totalSize: u.Measure.of(getRandomInt(10, 100) * diffMultiplier, GB), // footprint

    rewardPartIds: reward.partIds,
    rewardDescription: reward.description,

    status: 'NOT_STARTED',
    downloadedBytes: u.Measure.of(0, B),
    workCompleted: u.Measure.of(0, ops),
    uploadedBytes: u.Measure.of(0, B),
  }
}
