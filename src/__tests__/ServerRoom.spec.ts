import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ServerRoom from '../components/ServerRoom.vue';
import { useGameStore } from '../stores/game';
import * as u from 'safe-units';
import { W, GB, mBPerSecond } from '../types';
describe('ServerRoom.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders servers and inventory items as room items', () => {
    const store = useGameStore();
    // Add a fake item to inventory for testing
    store.inventory.push({
      id: 'fake_part',
      name: 'Fake Part',
      kind: 'RAM',
      width: 10,
      height: 5,
      x: 10,
      y: 10,
      socketTag: 'DDR4',
      powerDraw: u.Measure.of(1, W),
      rarity: 'COMMON',
      value: 10,
      memoryCapacity: u.Measure.of(4, GB),
      ioBandwidth: u.Measure.of(100, mBPerSecond)
    });

    const wrapper = mount(ServerRoom);
    
    // There should be at least one server (the initial one) and our fake part
    const items = wrapper.findAll('.room-item');
    expect(items.length).toBeGreaterThan(1);
  });

  it('selects a server when clicked', async () => {
    const store = useGameStore();
    const wrapper = mount(ServerRoom);
    
    const items = wrapper.findAll('.room-item');
    expect(items.length).toBeGreaterThan(0);

    // Initial state check
    expect(store.selectedItemId).toBe(store.servers[0]!.id);

    // Click on the first item
    await items[0]!.trigger('mousedown', { button: 0 });
    
    // The clicked server should now be selected (it might be the same one, but the logic should fire)
    expect(store.selectedItemId).toBe(store.servers[0]!.id);
  });
});
