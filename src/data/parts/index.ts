import type { Part } from '../../types'
import { cases } from './cases'
import { motherboards } from './motherboards'
import { cpus } from './cpus'
import { ram } from './ram'
import { storage } from './storage'
import { psus } from './psus'
import { fans } from './fans'

export const allParts: Part[] = [...cases, ...motherboards, ...cpus, ...ram, ...storage, ...psus, ...fans]
