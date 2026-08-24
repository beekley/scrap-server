import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import BountyBoard from '../components/BountyBoard.vue';
import { useGameStore } from '../stores/game';

describe('BountyBoard.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders available jobs from the store', () => {
    const store = useGameStore();
    const wrapper = mount(BountyBoard);

    // Check if it renders jobs from data
    expect(wrapper.text()).toContain(store.availableJobs[0]!.title);
    expect(wrapper.text()).toContain('Operations:');
  });

  it('selects a job and updates the store state', async () => {
    const store = useGameStore();
    const wrapper = mount(BountyBoard);

    const jobCards = wrapper.findAll('.job-card');
    expect(jobCards.length).toBeGreaterThan(0);
    
    await jobCards[0]!.trigger('click');

    expect(store.selectedJobId).not.toBeNull();
  });
});
