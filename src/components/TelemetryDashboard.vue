<script setup lang="ts">
import { ref } from 'vue'
import SimpleChart from './SimpleChart.vue'
import { useGameStore } from '../stores/game'

defineProps<{
  telemetry: unknown
  serverTelemetry: unknown
}>()

const gameStore = useGameStore()
const chartScale = ref(3600) // Default 1h (3600s)
</script>

<template>
  <fieldset v-if="serverTelemetry" style="margin-top: 15px">
    <legend>Telemetry</legend>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px">
      <div style="display: flex; gap: 2px;">
        <button style="min-width: 0; padding: 2px 4px;" :style="chartScale === 3600 ? 'outline: 1px dotted black inset;' : ''" @click="chartScale = 3600">1h</button>
        <button style="min-width: 0; padding: 2px 4px;" :style="chartScale === 86400 ? 'outline: 1px dotted black inset;' : ''" @click="chartScale = 86400">24h</button>
        <button style="min-width: 0; padding: 2px 4px;" :style="chartScale === 604800 ? 'outline: 1px dotted black inset;' : ''" @click="chartScale = 604800">7d</button>
      </div>
    </div>
    <div style="padding: 2px;">
      <SimpleChart
        :times="serverTelemetry.time"
        :values="serverTelemetry.power"
        :current-time="gameStore.gameTimeSeconds"
        :scale="chartScale"
        label="Power Draw"
        unit="W"
        color="#800000"
      />
      <SimpleChart
        :times="serverTelemetry.time"
        :values="serverTelemetry.cpu"
        :current-time="gameStore.gameTimeSeconds"
        :scale="chartScale"
        label="CPU Utilization"
        unit="%"
        color="#000080"
      />
      <SimpleChart
        :times="serverTelemetry.time"
        :values="serverTelemetry.ram"
        :current-time="gameStore.gameTimeSeconds"
        :scale="chartScale"
        label="RAM Utilization"
        unit="%"
        color="#800080"
      />
      <SimpleChart
        :times="serverTelemetry.time"
        :values="serverTelemetry.swap"
        :current-time="gameStore.gameTimeSeconds"
        :scale="chartScale"
        label="Swap Size"
        unit=" GB"
        color="#ff0000"
      />
      <SimpleChart
        :times="serverTelemetry.time"
        :values="serverTelemetry.ramThroughput"
        :current-time="gameStore.gameTimeSeconds"
        :scale="chartScale"
        label="RAM Throughput Util"
        unit="%"
        color="#008080"
      />
      <SimpleChart
        :times="serverTelemetry.time"
        :values="serverTelemetry.storageThroughput"
        :current-time="gameStore.gameTimeSeconds"
        :scale="chartScale"
        label="Storage Throughput Util"
        unit="%"
        color="#808000"
      />
      <SimpleChart
        :times="serverTelemetry.time"
        :values="serverTelemetry.temp"
        :current-time="gameStore.gameTimeSeconds"
        :scale="chartScale"
        label="Temperature"
        unit="°C"
        color="#ff8c00"
      />
    </div>
  </fieldset>
</template>
