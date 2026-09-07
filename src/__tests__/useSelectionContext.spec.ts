import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '../stores/game'
import { useSelectionContext } from '../composables/useSelectionContext'
import type { Part, ServerNode } from '../types'

describe('useSelectionContext', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('computes selectedServer correctly', () => {
    const store = useGameStore()
    const ctx = useSelectionContext()

    const server: ServerNode = {
      id: 'server-1',
      name: 'Server 1',
      installedParts: [],
      x: 0,
      y: 0,
    }
    store.servers.push(server)
    store.selectedItemId = 'server-1'

    expect(ctx.selectedServer.value).toMatchObject(server)
    expect(ctx.selectedPart.value).toBeNull()
  })

  it('computes selectedPart from inventory', () => {
    const store = useGameStore()
    const ctx = useSelectionContext()

    const part = {
      id: 'part-1',
      name: 'Test Part',
      kind: 'RAM',
      slots: [],
      width: 1,
      height: 1,
      value: { value: 10, unit: 'ETC' },
    } as unknown as Part
    store.inventory.push(part)
    store.selectedItemId = 'part-1'

    expect(ctx.selectedPart.value).toMatchObject(part)
    expect(ctx.selectedServer.value).toBeNull()
  })

  it('computes displayedPart for a server as its CASE', () => {
    const store = useGameStore()
    const ctx = useSelectionContext()

    const casePart = {
      id: 'case-1',
      kind: 'CASE',
      name: 'Case',
    } as unknown as Part

    const server: ServerNode = {
      id: 'server-1',
      name: 'Server 1',
      installedParts: [casePart],
      x: 0,
      y: 0,
    }
    store.servers.push(server)
    store.selectedItemId = 'server-1'

    expect(ctx.displayedPart.value).toMatchObject(casePart)
  })

  it('calculates totalRam of selectedServer', () => {
    const store = useGameStore()
    const ctx = useSelectionContext()

    const ram1 = { kind: 'RAM', memoryCapacity: { value: 8, unit: 'GB' } } as unknown as Part
    const ram2 = { kind: 'RAM', memoryCapacity: { value: 16, unit: 'GB' } } as unknown as Part

    const server: ServerNode = {
      id: 'server-1',
      name: 'Server 1',
      installedParts: [ram1, ram2],
      x: 0,
      y: 0,
    }
    store.servers.push(server)
    store.selectedItemId = 'server-1'

    expect(ctx.totalRam.value).toBe(24)
  })
})
