<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  times: number[]
  values: number[]
  currentTime: number
  scale: number
  label: string
  unit: string
  color: string
}>()

const filteredData = computed(() => {
  if (!props.times || !props.values) return []
  const cutoff = props.currentTime - props.scale
  
  // Find start index using simple backwards scan
  let startIdx = props.times.length - 1
  while (startIdx >= 0 && props.times[startIdx]! >= cutoff) {
    startIdx--
  }
  startIdx = Math.max(0, startIdx)
  
  const sliceTimes = props.times.slice(startIdx)
  const sliceValues = props.values.slice(startIdx)
  
  const points: {t: number, v: number}[] = []
  const MAX_POINTS = 100
  if (sliceTimes.length <= MAX_POINTS) {
    for (let i = 0; i < sliceTimes.length; i++) {
      points.push({ t: sliceTimes[i] as number, v: sliceValues[i] as number })
    }
  } else {
    const step = sliceTimes.length / MAX_POINTS
    for (let i = 0; i < MAX_POINTS; i++) {
      const idx = Math.floor(i * step)
      points.push({ t: sliceTimes[idx] as number, v: sliceValues[idx] as number })
    }
    points.push({ t: sliceTimes[sliceTimes.length - 1] as number, v: sliceValues[sliceValues.length - 1] as number })
  }
  return points
})

const maxVal = computed(() => {
  if (filteredData.value.length === 0) return 100
  const m = Math.max(...filteredData.value.map(d => d.v))
  return m === 0 ? (props.unit === '%' ? 100 : 10) : m
})

const minVal = computed(() => {
  if (filteredData.value.length === 0) return 0
  return Math.min(...filteredData.value.map(d => d.v))
})

const svgPoints = computed(() => {
  const data = filteredData.value
  if (data.length === 0) return ''
  
  const tMin = props.currentTime - props.scale
  const vMin = minVal.value
  const vMax = maxVal.value
  const vRange = vMax === vMin ? 1 : vMax - vMin

  return data.map(d => {
    let x = ((d.t - tMin) / props.scale) * 100
    x = Math.max(0, Math.min(100, x))
    const y = 57 - ((d.v - vMin) / vRange) * 55
    return `${x},${y}`
  }).join(' ')
})
</script>

<template>
  <fieldset class="chart-container" style="margin-bottom: 8px;">
    <legend class="chart-label">{{ label }}</legend>
    <div class="sunken-panel chart-box">
      <svg width="100%" height="60" preserveAspectRatio="none" viewBox="0 0 100 60">
        <polyline :points="svgPoints" fill="none" :stroke="color" stroke-width="2" />
      </svg>
    </div>
    <div class="chart-footer">
      <span>Min: {{ minVal.toFixed(1) }}{{ unit }}</span>
      <span>Max: {{ maxVal.toFixed(1) }}{{ unit }}</span>
    </div>
  </fieldset>
</template>

<style scoped>
.chart-container {
  padding: 4px 8px;
}
.chart-label {
}

.chart-box {
  width: 100%;
  height: 60px;
  overflow: hidden;
}
.chart-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
}
</style>
