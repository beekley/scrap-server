import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import RackAssembly from '../components/RackAssembly.vue'
import { useGameStore } from '../stores/game'

describe('RackAssembly.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders child components', () => {
    const store = useGameStore()
    const wrapper = mount(RackAssembly)

    expect(wrapper.text()).toContain('Bounty Board')
    expect(wrapper.text()).toContain('Context Inspector')
  })
})
