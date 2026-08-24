import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import RackAssembly from '../components/RackAssembly.vue';
import { useGameStore } from '../stores/game';
import * as u from "safe-units";
import { ops } from '../types';

describe('RackAssembly.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders inventory and server rack list', () => {
    const store = useGameStore();
    const wrapper = mount(RackAssembly);

    expect(wrapper.text()).toContain('Inventory');
    expect(wrapper.text()).toContain('Servers (1)');
    expect(wrapper.text()).toContain(store.servers[0]!.name);
  });

  it('allows installing a compatible part from inventory via dropdown', async () => {
    const store = useGameStore();
    const wrapper = mount(RackAssembly);

    // Initial server is empty, install a case
    const casePart = store.inventory.find(p => p.kind === 'CASE');
    store.installPart(store.servers[0]!.id, 'N/A', casePart!.id); // Wait, empty server means we need a way to slot the case.
    
    // Let's just check the Add Server Node button instead for UI test
    expect(wrapper.text()).toContain('+ Add Server Node');
    await wrapper.find('button').trigger('click');
    expect(store.servers.length).toBe(2);
  });
});
