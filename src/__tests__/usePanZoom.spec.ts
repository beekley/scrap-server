import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { usePanZoom } from '../composables/usePanZoom'
import { defineComponent } from 'vue'

const TestComponent = defineComponent({
  template: '<div></div>',
  setup() {
    return usePanZoom({ scale: 2, minZoom: 0.5, maxZoom: 2.0 })
  }
})

describe('usePanZoom', () => {
  it('initializes with default values', () => {
    const { zoom, panX, panY, effectiveScale } = usePanZoom({ scale: 2 })
    expect(zoom.value).toBe(1.0)
    expect(panX.value).toBe(0)
    expect(panY.value).toBe(0)
    expect(effectiveScale.value).toBe(2)
  })

  it('respects initial zoom and custom initialization', () => {
    const { panX, panY, zoom } = usePanZoom({
      initialZoom: 1.5,
      scale: 2,
      onInitPan: (z) => ({ x: z * 10, y: z * 20 })
    })

    expect(zoom.value).toBe(1.5)
    expect(panX.value).toBe(15) // 1.5 * 10
    expect(panY.value).toBe(30) // 1.5 * 20
  })

  it('pans on mouse drag when mounted', async () => {
    const wrapper = mount(TestComponent)
    const { handleBackgroundMouseDown, panX, panY, isPanning } = wrapper.vm

    // Mouse down initiates pan
    const downEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 100, button: 0 })
    handleBackgroundMouseDown(downEvent)
    expect(wrapper.vm.isPanning).toBe(true)

    // Trigger global mousemove
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 120 }))
    
    expect(wrapper.vm.panX).toBe(50) // 150 - 100
    expect(wrapper.vm.panY).toBe(20) // 120 - 100

    // Mouse up stops pan
    window.dispatchEvent(new MouseEvent('mouseup'))
    expect(wrapper.vm.isPanning).toBe(false)

    wrapper.unmount()
  })
})
