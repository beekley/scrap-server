import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import RackAssembly from '../components/RackAssembly.vue'
import { useGameStore } from '../stores/game'

describe('RackAssembly.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders Server Room (Assembly) and Node Configuration', () => {
    const store = useGameStore()
    const wrapper = mount(RackAssembly)

    expect(wrapper.text()).toContain('Server Room (Assembly)')
    expect(wrapper.text()).toContain('Server Node: ' + store.servers[0]!.name)
  })
})
