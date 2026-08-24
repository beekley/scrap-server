import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import App from '../App.vue';
import { useGameStore } from '../stores/game';

describe('App', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mounts and renders Scavenged Server Sim title', () => {
    const wrapper = mount(App);
    expect(wrapper.text()).toContain('Scavenged Server Sim');
  });

  it('navigates to different screens using debug menu', async () => {
    const wrapper = mount(App);
    const store = useGameStore();

    expect(wrapper.text()).toContain('Bounty Board'); // Default screen

    await wrapper.findAll('button').filter(b => b.text() === 'Rack Assembly')[0].trigger('click');
    expect(store.currentScreen).toBe('RACK_ASSEMBLY');
    expect(wrapper.text()).toContain('Rack Assembly');

    await wrapper.findAll('button').filter(b => b.text() === 'Bounty Board')[0].trigger('click');
    expect(store.currentScreen).toBe('BOUNTY_BOARD');
  });

  it('ticks the game loop every second', () => {
    const wrapper = mount(App);
    const store = useGameStore();
    const tickSpy = vi.spyOn(store, 'tick');

    vi.advanceTimersByTime(2500); // 2.5 seconds

    expect(tickSpy).toHaveBeenCalledTimes(2);
    
    wrapper.unmount();
  });
});
