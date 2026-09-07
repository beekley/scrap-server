import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ServerRoom from '../components/ServerRoom.vue'
import { useGameStore } from '../stores/game'
import * as u from 'safe-units'
import { W, GB, mBPerSecond, ETC } from '../types'
describe('ServerRoom.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders servers and inventory items when storage unit is open', () => {
    const store = useGameStore()
    store.isViewingOutside = false

    // Add a fake item inside the storage unit for testing
    store.inventory.push({
      id: 'fake_part',
      name: 'Fake Part',
      kind: 'RAM',
      width: 10,
      height: 5,
      x: 120, // inside storage unit (100 to 300)
      y: 10,
      socketTag: 'DDR4',
      powerDraw: u.Measure.of(1, W),
      rarity: 'COMMON',
      value: u.Measure.of(10, ETC),
      memoryCapacity: u.Measure.of(4, GB),
      ioBandwidth: u.Measure.of(100, mBPerSecond),
    })

    const wrapper = mount(ServerRoom)

    // There should be at least one server and our fake part
    const items = wrapper.findAll('.room-item')
    expect(items.length).toBeGreaterThan(1)
  })

  it('selects a server when clicked while open', async () => {
    const store = useGameStore()
    store.isViewingOutside = false
    const wrapper = mount(ServerRoom)

    const items = wrapper.findAll('.room-item')
    expect(items.length).toBeGreaterThan(0)

    // Initial state check
    expect(store.selectedItemId).toBeNull()

    // Click on the first item (the server)
    await items[0]!.trigger('mousedown', { button: 0 })

    // The clicked server should now be selected
    expect(store.selectedItemId).toBe(store.servers[0]!.id)
  })


  it('renders garage door when storage unit is closed', () => {
    const store = useGameStore()
    store.isViewingOutside = true
    const wrapper = mount(ServerRoom)

    expect(wrapper.find('.garage-door').exists()).toBe(true)
  })
})
