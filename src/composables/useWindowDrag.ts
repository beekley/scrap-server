import { ref } from 'vue'

export function useWindowDrag(initialX: number, initialY: number) {
  const x = ref(initialX)
  const y = ref(initialY)
  
  let dragOffsetX = 0
  let dragOffsetY = 0
  let isDragging = false

  function handleMouseDown(e: MouseEvent) {
    if (e.button !== 0) return
    isDragging = true
    const target = e.currentTarget as HTMLElement
    const windowEl = target.closest('.window') as HTMLElement
    if (!windowEl) return
    
    // Calculate offset relative to the window's top-left corner
    const rect = windowEl.getBoundingClientRect()
    dragOffsetX = e.clientX - rect.left
    dragOffsetY = e.clientY - rect.top

    // Bring to front
    const allWindows = document.querySelectorAll('.window-drag-container')
    let maxZ = 1000
    allWindows.forEach((el) => {
      const z = parseInt(window.getComputedStyle(el).zIndex) || 0
      if (z > maxZ) maxZ = z
    })
    windowEl.style.zIndex = (maxZ + 1).toString()

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return
    let newX = e.clientX - dragOffsetX
    let newY = e.clientY - dragOffsetY

    // Optional: Keep window somewhat visible
    newX = Math.max(0, Math.min(window.innerWidth - 100, newX))
    newY = Math.max(0, Math.min(window.innerHeight - 30, newY))

    x.value = newX
    y.value = newY
  }

  function handleMouseUp() {
    isDragging = false
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }

  return {
    x,
    y,
    handleMouseDown
  }
}
