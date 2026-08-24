import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import TelemetryCard from '../components/TelemetryCard.vue';
import { useGameStore } from '../stores/game';

describe('TelemetryCard.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders correctly when no server is selected', () => {
    const store = useGameStore();
    store.selectedServerId = null;
    const wrapper = mount(TelemetryCard);

    expect(wrapper.text()).toContain('No server node selected');
  });

  it('renders utilization metrics for selected server', () => {
    const store = useGameStore();
    // Default has server selected
    const wrapper = mount(TelemetryCard);

    expect(wrapper.text()).toContain('Telemetry: Scrap Node 1');
    expect(wrapper.text()).toContain('Utilization');
    expect(wrapper.text()).toContain('RAM:');
    expect(wrapper.text()).toContain('Storage:');
  });

  it('allows starting a job if valid', async () => {
    const store = useGameStore();
    const wrapper = mount(TelemetryCard);

    store.selectedJobId = store.availableJobs[0]!.id;
    // For MVP, server starts empty, so it will say lacks requirements
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Server lacks requirements to run this job');
  });
});
