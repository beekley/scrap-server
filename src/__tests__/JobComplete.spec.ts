import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import JobComplete from '../components/JobComplete.vue';
import { useGameStore } from '../stores/game';
import * as u from 'safe-units';
import { ops, megabytesPerOp, GB } from '../types';

describe('JobComplete.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders rewards and handles claim', async () => {
    const store = useGameStore();
    store.activeJob = {
      id: 'job_test',
      title: 'Finished Job',
      description: 'Test',
      operationsRequired: u.Measure.of(100, ops),
      totalSize: u.Measure.of(1, GB),
      workingSetSize: u.Measure.of(1, GB),
      ioRatio: u.Measure.of(1, megabytesPerOp),
      rewardCash: 150,
      rewardPartIds: ['ram_1gb'],
      workCompleted: u.Measure.of(100, ops),
      serverNodeIds: [store.servers[0].id]
    };
    
    // Set a known job in availableJobs so we can verify it gets removed
    store.availableJobs = [store.activeJob];
    
    // Initial cash
    const initialCash = store.cash;
    const initialInventoryLength = store.inventory.length;

    const wrapper = mount(JobComplete);
    
    expect(wrapper.text()).toContain('Finished Job');
    expect(wrapper.text()).toContain('$150');
    expect(wrapper.text()).toContain('ram_1gb');

    const claimBtn = wrapper.findAll('button').find(b => b.text() === 'Return to Rack');
    await claimBtn!.trigger('click');

    expect(store.cash).toBe(initialCash + 150);
    expect(store.inventory.length).toBe(initialInventoryLength + 1);
    expect(store.activeJob).toBeNull();
    expect(store.availableJobs.length).toBe(0);
    expect(store.currentScreen).toBe('BOUNTY_BOARD');
  });
});
