import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ServerRoom from '../components/ServerRoom.vue';
import { useGameStore } from '../stores/game';

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
      powerDraw: { value: 1, unit: 'W' },
      rarity: 'COMMON',
      value: 10,
      memoryCapacity: { value: 4, unit: 'GB' },
      ioBandwidth: { value: 100, unit: 'mB/s' }
    } as any);

    const wrapper = mount(ServerRoom);
    
    // There should be at least one server (the initial one) and our fake part
    const items = wrapper.findAll('.room-item');
    expect(items.length).toBeGreaterThan(1);
  });

  it('selects a server when clicked', async () => {
    const store = useGameStore();
    const wrapper = mount(ServerRoom);
    
    const firstServer = wrapper.find('.is-server');
    expect(firstServer.exists()).toBe(true);

    // Initial state check
    const initialSelectedId = store.selectedItemId;
    
    // Simulate mousedown
    await firstServer.trigger('mousedown', { button: 0 });
    
    // The clicked server should now be selected (it might be the same one, but the logic should fire)
    expect(store.selectedItemId).toBe(store.servers[0].id);
  });
});
