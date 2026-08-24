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
    
    // Check if it renders jobs from seed data
    expect(wrapper.text()).toContain('Recover Corrupted Text Archive');
    expect(wrapper.findAll('li').length).toBe(store.availableJobs.length);
  });

  it('selects a job and updates the store state', async () => {
    const store = useGameStore();
    const wrapper = mount(BountyBoard);
    
    const selectButtons = wrapper.findAll('button');
    await selectButtons[0].trigger('click');

    expect(store.activeJob).not.toBeNull();
    expect(store.activeJob?.id).toBe(store.availableJobs[0].id);
    expect(store.currentScreen).toBe('RACK_ASSEMBLY');
  });

  it('shows no jobs available message when list is empty', async () => {
    const store = useGameStore();
    store.availableJobs = [];
    
    // We need to await next tick if we mount after or if we mount after changing store
    const wrapper = mount(BountyBoard);
    expect(wrapper.text()).toContain('No jobs available.');
  });
});
