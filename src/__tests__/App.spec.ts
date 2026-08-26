import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import App from '../App.vue';
import { useGameStore } from '../stores/game';

describe('App', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders the single page dashboard layout', () => {
    const wrapper = mount(App);

    expect(wrapper.text()).toContain('Scavenged Server Sim');
    
    // Check that child components are rendered
    expect(wrapper.text()).toContain('Bounty Board');
    expect(wrapper.text()).toContain('Server Room (Assembly)');
    
    // ContextPanel is rendered because selectedItemId is implicitly set to the first server
    expect(wrapper.text()).toContain('Server:');
  });

  it('formats and advances the game clock correctly on tick', async () => {
    const store = useGameStore();
    const wrapper = mount(App);

    // Initial time
    expect(wrapper.text()).toContain('Day 1, 00:00');

    // Simulate 1 tick (60s)
    store.tick(60);
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Day 1, 00:01');
    
    // Simulate 10 default ticks (10 x 6s = 60s / 1 game-minute)
    for (let i = 0; i < 10; i++) {
      store.tick();
    }
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Day 1, 00:02');

    // Simulate enough ticks to advance to next day (24 hours = 1440 minutes)
    store.tick(1440 * 60);
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Day 2, 00:02');
  });
});
