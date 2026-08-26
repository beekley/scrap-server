import * as u from 'safe-units';
import { 
  type Rarity, 
  type Job, 
  type Part, 
  type PartKind, 
  type CasePart, 
  type MotherboardPart, 
  ops, GB, megabytesPerOp
} from '../types';
import { allParts as parts } from '../data/index';

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  COMMON: 60,
  UNCOMMON: 25,
  RARE: 12,
  MYTHIC: 3
};

export function rollRarity(): Rarity {
  const totalWeight = Object.values(RARITY_WEIGHTS).reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * totalWeight;
  
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    if (roll < weight) return rarity as Rarity;
    roll -= weight;
  }
  return 'COMMON';
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandomElement<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

function getPartsByRarity(kind: PartKind, rarity: Rarity): Part[] {
  return parts.filter((p: Part) => p.kind === kind && p.rarity === rarity);
}

function getCompatiblePartsByRarity(kind: PartKind, rarity: Rarity, socketTag: string): Part[] {
  return parts.filter((p: Part) => p.kind === kind && p.rarity === rarity && p.socketTag === socketTag);
}

export function generateServerReward(rarity: Rarity): { description: string, partIds: string[], cash: number } {
  const cases = getPartsByRarity('CASE', rarity);
  const mobos = getPartsByRarity('MOTHERBOARD', rarity);
  
  const targetRarity = (cases.length > 0 && mobos.length > 0) ? rarity : 'COMMON';
  
  const casePart = pickRandomElement(getPartsByRarity('CASE', targetRarity)) as CasePart | undefined;
  const moboPart = pickRandomElement(getPartsByRarity('MOTHERBOARD', targetRarity)) as MotherboardPart | undefined;
  
  if (!casePart || !moboPart) {
    return generateCashReward(rarity); 
  }

  const generatedIds: string[] = [casePart.id, moboPart.id];
  
  for (const slot of moboPart.slots || []) {
    const compatibleParts = getCompatiblePartsByRarity(slot.acceptsKind, targetRarity, slot.socketTag);
    if (compatibleParts.length > 0) {
      const selected = pickRandomElement(compatibleParts);
      if (selected) {
        generatedIds.push(selected.id);
      }
    } else {
      const anyCompatible = parts.filter((p: Part) => p.kind === slot.acceptsKind && p.socketTag === slot.socketTag);
      if (anyCompatible.length > 0) {
        const selected = pickRandomElement(anyCompatible);
        if (selected) generatedIds.push(selected.id);
      }
    }
  }

  return {
    description: `A complete ${targetRarity.toLowerCase()} server`,
    partIds: generatedIds,
    cash: 0
  };
}

export function generateBundleReward(rarity: Rarity): { description: string, partIds: string[], cash: number } {
  const kinds: PartKind[] = ['RAM', 'STORAGE', 'CPU'];
  const kind = pickRandomElement(kinds) ?? 'RAM';
  
  let validParts = getPartsByRarity(kind, rarity);
  if (validParts.length === 0) validParts = getPartsByRarity(kind, 'COMMON');
  if (validParts.length === 0) return generateCashReward(rarity);
  
  const selectedPart = pickRandomElement(validParts);
  if (!selectedPart) return generateCashReward(rarity);

  const quantity = getRandomInt(2, 4);
  
  const generatedIds = Array(quantity).fill(selectedPart.id);
  
  return {
    description: `Bundle of ${quantity}x ${selectedPart.name}`,
    partIds: generatedIds,
    cash: 0
  };
}

export function generateCashReward(rarity: Rarity): { description: string, partIds: string[], cash: number } {
  let multiplier = 1;
  switch (rarity) {
    case 'COMMON': multiplier = 1; break;
    case 'UNCOMMON': multiplier = 2.5; break;
    case 'RARE': multiplier = 5; break;
    case 'MYTHIC': multiplier = 15; break;
  }
  
  const cash = getRandomInt(100 * multiplier, 200 * multiplier);
  
  return {
    description: `$${cash} Cash Reward`,
    partIds: [],
    cash: cash
  };
}

const JOB_TITLES = [
  "Decrypt Corporate Database",
  "Scrape Video Metadata",
  "Brute-Force Password Dump",
  "Recover Corrupted Text Archive",
  "Mine Cryptocurrency Block",
  "Render 3D Architectural Scene",
  "Train Simple Neural Network",
  "Compile Legacy Monolith",
  "Process Satellite Imagery"
];

let jobCounter = 0;

export function generateProceduralJob(): Job {
  const rarity = rollRarity();
  
  let diffMultiplier = 1;
  switch (rarity) {
    case 'COMMON': diffMultiplier = 1; break;
    case 'UNCOMMON': diffMultiplier = 3; break;
    case 'RARE': diffMultiplier = 8; break;
    case 'MYTHIC': diffMultiplier = 20; break;
  }
  
  const title = pickRandomElement(JOB_TITLES) ?? 'Unknown Task';
  
  const baseOps = getRandomInt(50, 150) * 1000;
  const totalOps = baseOps * diffMultiplier;
  
  const rewardTypeRoll = Math.random();
  let reward;
  
  if (rewardTypeRoll < 0.4) {
    reward = generateCashReward(rarity);
  } else if (rewardTypeRoll < 0.8) {
    reward = generateBundleReward(rarity);
  } else {
    reward = generateServerReward(rarity);
  }

  jobCounter++;

  return {
    id: `job_gen_${Date.now()}_${jobCounter}`,
    title: `[${rarity}] ${title}`,
    description: `A ${rarity.toLowerCase()} difficulty task.`,
    rarity: rarity,
    
    operationsRequired: u.Measure.of(totalOps, ops),
    workingSetSize: u.Measure.of(getRandomInt(1, 4) * diffMultiplier, GB),
    totalSize: u.Measure.of(getRandomInt(5, 50) * diffMultiplier, GB),
    ioRatio: u.Measure.of(Math.random() * 2 + 0.1, megabytesPerOp), 
    
    rewardCash: reward.cash,
    rewardPartIds: reward.partIds,
    rewardDescription: reward.description,
    
    workCompleted: u.Measure.of(0, ops)
  };
}
