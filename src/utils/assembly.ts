import { getPartTemplate } from '../data'
import {
  isPartCompatibleWithSlot,
  type Part,
  type ServerNode,
  type SlotDefinition,
  type PartKind,
} from '../types'
import type { RoomRect } from './physics'

export function autoAssembleRewards(
  rewardPartIds: string[],
  existingServersCount: number,
  getRoomItems: () => RoomRect[],
  findValidDropLocation: (
    w: number,
    h: number,
    items: RoomRect[],
    id: string,
  ) => { x: number; y: number },
): { newServers: ServerNode[]; leftoverParts: Part[] } {
  const rewardedParts = rewardPartIds.map((id) => getPartTemplate(id))
  const cases = rewardedParts.filter((p) => p.kind === 'CASE')
  const otherParts = rewardedParts.filter((p) => p.kind !== 'CASE')

  const newServers: ServerNode[] = []

  for (const c of cases) {
    const newServer: ServerNode = {
      id: `server_${existingServersCount + newServers.length + 1}_${Math.random().toString(36).substring(2, 8)}`,
      name: `Scrap Node ${existingServersCount + newServers.length + 1}`,
      installedParts: [c],
      x: 0,
      y: 0,
    }

    let changed = true
    while (changed) {
      changed = false
      for (const p of newServer.installedParts) {
        if (!p.slots) continue
        for (const slot of p.slots) {
          if (!slot.installedPartId) {
            const index = otherParts.findIndex((op) =>
              isPartCompatibleWithSlot(op, slot as SlotDefinition<PartKind>),
            )
            if (index !== -1) {
              const op = otherParts[index]
              if (op) {
                slot.installedPartId = op.id
                newServer.installedParts.push(op)
                otherParts.splice(index, 1)
                changed = true
              }
            }
          }
        }
      }
    }

    const loc = findValidDropLocation(c.width, c.height, getRoomItems(), newServer.id)
    newServer.x = loc.x
    newServer.y = loc.y

    newServers.push(newServer)
  }

  // Anything left goes to inventory
  for (const part of otherParts) {
    const loc = findValidDropLocation(part.width, part.height, getRoomItems(), part.id)
    part.x = loc.x
    part.y = loc.y
  }

  return { newServers, leftoverParts: otherParts }
}
