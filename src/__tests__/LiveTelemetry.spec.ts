import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import LiveTelemetry from '../components/LiveTelemetry.vue';
import { useGameStore } from '../stores/game';
import * as u from 'safe-units';
import { ops, megabytesPerOp, GB } from '../types';

describe('LiveTelemetry.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders "No active job" if no job is active', () => {
    const wrapper = mount(LiveTelemetry);
    expect(wrapper.text()).toContain('No active job running');
  });

  it('renders telemetry and progress when job is active', () => {
    const store = useGameStore();
    store.activeJob = {
      id: 'job_test',
      title: 'Running Job',
      description: 'Test',
      operationsRequired: u.Measure.of(1000, ops),
      totalSize: u.Measure.of(1, GB),
      workingSetSize: u.Measure.of(1, GB),
      ioRatio: u.Measure.of(1, megabytesPerOp),
      rewardCash: 0,
      rewardPartIds: [],
      workCompleted: u.Measure.of(250, ops), // 25% complete
      serverNodeIds: [store.servers[0].id]
    };

    const wrapper = mount(LiveTelemetry);
    
    expect(wrapper.text()).toContain('Running Job');
    expect(wrapper.text()).toContain('Progress: 25.0%');
    expect(wrapper.text()).toContain('Bottleneck');
  });

  it('aborts job when clicking Abort', async () => {
    const store = useGameStore();
    store.activeJob = {
      id: 'job_test',
      title: 'Running Job',
      description: 'Test',
      operationsRequired: u.Measure.of(1000, ops),
      totalSize: u.Measure.of(1, GB),
      workingSetSize: u.Measure.of(1, GB),
      ioRatio: u.Measure.of(1, megabytesPerOp),
      rewardCash: 0,
      rewardPartIds: [],
      workCompleted: u.Measure.of(250, ops),
      serverNodeIds: [store.servers[0].id]
    };
    store.currentScreen = 'LIVE_TELEMETRY';

    const wrapper = mount(LiveTelemetry);
    
    const abortBtn = wrapper.findAll('button').find(b => b.text() === 'Abort Job');
    await abortBtn!.trigger('click');

    expect(store.currentScreen).toBe('RACK_ASSEMBLY');
    expect(store.activeJob.workCompleted.value).toBe(0);
    expect(store.activeJob.serverNodeIds).toEqual([]);
  });
});
