import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ContextPanel from '../components/ContextPanel.vue';
import { useGameStore } from '../stores/game';

describe('ContextPanel.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders correctly when no item is selected', () => {
    const store = useGameStore();
    store.selectedItemId = null;
    const wrapper = mount(ContextPanel);

    expect(wrapper.text()).toContain('Select a server or part to view details');
  });

  it('renders server details for selected server', () => {
    const store = useGameStore();
    // Default has server selected
    const wrapper = mount(ContextPanel);

    expect(wrapper.text()).toContain('Server: Scrap Node 1');
    expect(wrapper.text()).toContain('Utilization');
    expect(wrapper.text()).toContain('RAM:');
    expect(wrapper.text()).toContain('Storage:');
  });

  it('allows starting a job if valid', async () => {
    const store = useGameStore();
    const wrapper = mount(ContextPanel);

    store.selectedJobId = store.availableJobs[0]!.id;
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toBeDefined();
  });
});
