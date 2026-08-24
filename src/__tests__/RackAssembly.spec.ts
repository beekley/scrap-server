import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import RackAssembly from '../components/RackAssembly.vue';
import { useGameStore } from '../stores/game';
import * as u from 'safe-units';
import { GB, megabytesPerOp, ops } from '../types';

describe('RackAssembly.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders inventory and server slots', () => {
    const wrapper = mount(RackAssembly);
    const store = useGameStore();

    expect(wrapper.text()).toContain('Inventory');
    expect(wrapper.text()).toContain('Server Node');
    expect(wrapper.text()).toContain(store.servers[0].installedParts[1].name); // Motherboard
  });

  it('allows installing a compatible part from inventory via dropdown', async () => {
    const store = useGameStore();
    // Pre-requisite: we have 'ram_1gb' in inventory, and 'DDR Slot 1' is empty
    const cpuInvPart = store.inventory.find(p => p.kind === 'CPU');
    expect(cpuInvPart).toBeDefined();

    const wrapper = mount(RackAssembly);

    // Find the select element for CPU socket
    const selects = wrapper.findAll('select');
    // We expect multiple selects. Let's find the one that has our CPU part as an option.
    const cpuSelect = selects.find(s => s.html().includes(cpuInvPart!.id));
    
    expect(cpuSelect).toBeDefined();
    
    // Select the part
    await cpuSelect!.setValue(cpuInvPart!.id);

    // Verify store state updated
    expect(store.inventory.find(p => p.id === cpuInvPart!.id)).toBeUndefined();
    expect(store.servers[0].installedParts.find(p => p.id === cpuInvPart!.id)).toBeDefined();
  });

  it('allows removing an installed part', async () => {
    const store = useGameStore();
    
    // Force install a part first so we can remove it
    const cpuInvPart = store.inventory.find(p => p.kind === 'CPU');
    const cpuSlot = store.servers[0].installedParts[1].slots!.find(s => s.acceptsKind === 'CPU');
    store.installPart(store.servers[0].id, cpuSlot!.id, cpuInvPart!.id);

    const wrapper = mount(RackAssembly);
    
    // Find the select for CPU which now has the part selected
    const selects = wrapper.findAll('select');
    const cpuSelect = selects.find(s => s.html().includes(cpuInvPart!.id));
    
    // Set to empty string
    await cpuSelect!.setValue('');

    // Verify it's back in inventory
    expect(store.inventory.find(p => p.id === cpuInvPart!.id)).toBeDefined();
    expect(store.servers[0].installedParts.find(p => p.id === cpuInvPart!.id)).toBeUndefined();
  });

  it('disables Start Job button if server cannot run job', async () => {
    const store = useGameStore();
    store.activeJob = {
      id: 'job_test',
      title: 'Impossible Job',
      description: 'Test',
      operationsRequired: u.Measure.of(100, ops),
      totalSize: u.Measure.of(1000, GB), // Requires 1000 GB, server has none installed
      workingSetSize: u.Measure.of(10, GB),
      ioRatio: u.Measure.of(1, megabytesPerOp),
      rewardCash: 0,
      rewardPartIds: [],
      workCompleted: u.Measure.of(0, ops),
    };

    const wrapper = mount(RackAssembly);
    
    const startBtn = wrapper.findAll('button').find(b => b.text() === 'Start Job');
    expect(startBtn?.attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('Server is lacking requirements');
  });
});
