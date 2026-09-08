import type { Decoration, ServerNode } from '../types'
import { getPartTemplate } from './index'
import { STORAGE_UNIT_START_X } from '../constants/room'

export function createStarterServer(): ServerNode {
  const c = getPartTemplate('case_techmaker_atx')
  const mb = getPartTemplate('mb_techmaker_am2')
  const cpu = getPartTemplate('cpu_acc_titan_legacy_4200')
  const ram = getPartTemplate('ram_techmaker_512mb')
  const hdd = getPartTemplate('hdd_techmaker_250gb')
  const psu = getPartTemplate('psu_techmaker_300w')
  const fan = getPartTemplate('fan_basic_120mm')

  if (c.slots) c.slots[0]!.installedPartId = mb.id
  if (c.slots) c.slots[1]!.installedPartId = fan.id
  if (mb.slots) mb.slots.find((s) => s.id === 'cpu_0')!.installedPartId = cpu.id
  if (mb.slots) mb.slots.find((s) => s.id === 'ram_0')!.installedPartId = ram.id
  if (mb.slots) mb.slots.find((s) => s.id === 'sata_0')!.installedPartId = hdd.id
  if (mb.slots) mb.slots.find((s) => s.id === 'psu_0')!.installedPartId = psu.id

  return {
    id: 'server_01',
    name: 'Scrap Node 1',
    installedParts: [c, mb, cpu, ram, hdd, psu, fan],
    x: STORAGE_UNIT_START_X + 20,
    y: 0, // With y=0 as floor, it rests exactly on the floor at y=0
  }
}

export const initialDecorations: Decoration[] = [
  {
    id: 'tut_note_1',
    name: 'Welcome!',
    type: 'NOTE',
    content:
      "Hey kid, heard you're looking to run some compute. Here's a junker case and some old DDR3 to get you started. Hook it up and check the local intranet for jobs. - Uncle Dave\n\nP.S. I leave items outside the unit to be sold by the scrapper at 6 AM. Deliveries arrive at 8 AM.",
    x: STORAGE_UNIT_START_X + 40,
    y: 120, // Adjusted since y=0 is floor. Before it was y=40 from top (140 from bottom).
    width: 21,
    height: 30,
    attachedToDoor: true,
  },
]
