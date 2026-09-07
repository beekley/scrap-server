import { ref, computed, onMounted, onUnmounted } from 'vue'

export function usePanZoom(options: {
  initialZoom?: number,
  scale: number,
  minZoom?: number,
  maxZoom?: number,
  onInitPan?: (zoom: number) => { x: number, y: number }
}) {
  const { initialZoom = 1.0, scale, minZoom = 0.5, maxZoom = 3.0, onInitPan } = options

  const zoom = ref(initialZoom)
  const panX = ref(0)
  const panY = ref(0)
  const effectiveScale = computed(() => scale * zoom.value)

  const isPanning = ref(false)
  const lastPanMouseX = ref(0)
  const lastPanMouseY = ref(0)

  function handleBackgroundMouseDown(e: MouseEvent) {
    if (e.button !== 0) return
    isPanning.value = true
    lastPanMouseX.value = e.clientX
    lastPanMouseY.value = e.clientY
  }

  function handleGlobalMouseMove(e: MouseEvent) {
    if (isPanning.value) {
      panX.value += e.clientX - lastPanMouseX.value
      panY.value += e.clientY - lastPanMouseY.value
      lastPanMouseX.value = e.clientX
      lastPanMouseY.value = e.clientY
    }
  }

  function handleGlobalMouseUp() {
    isPanning.value = false
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault()
    const zoomSpeed = 0.1
    const direction = e.deltaY < 0 ? 1 : -1
    const newZoom = zoom.value + direction * zoomSpeed
    zoom.value = Math.max(minZoom, Math.min(newZoom, maxZoom))
  }

  if (onInitPan) {
    const initPan = onInitPan(zoom.value)
    panX.value = initPan.x
    panY.value = initPan.y
  }

  onMounted(() => {
    window.addEventListener('mousemove', handleGlobalMouseMove)
    window.addEventListener('mouseup', handleGlobalMouseUp)
  })

  onUnmounted(() => {
    window.removeEventListener('mousemove', handleGlobalMouseMove)
    window.removeEventListener('mouseup', handleGlobalMouseUp)
  })

  return {
    zoom,
    panX,
    panY,
    effectiveScale,
    isPanning,
    handleBackgroundMouseDown,
    handleWheel
  }
}
