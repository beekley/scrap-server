<script setup lang="ts">
import { computed } from 'vue'
import { formatGB, formatMB, formatOps } from '../utils/formatting'
import PartSlots from './PartSlots.vue'
import type { Part, ServerNode } from '../types'

const props = defineProps<{
  displayedPart: Part
  parentServer?: ServerNode | null
  isRunningJob: boolean
}>()

const asCpu = computed(() => (props.displayedPart?.kind === 'CPU' ? props.displayedPart : null))
const asRam = computed(() => (props.displayedPart?.kind === 'RAM' ? props.displayedPart : null))
const asStorage = computed(() =>
  props.displayedPart?.kind === 'STORAGE' || props.displayedPart?.kind === 'STORAGE_DEVICE'
    ? props.displayedPart
    : null,
)
const asPsu = computed(() => (props.displayedPart?.kind === 'PSU' ? props.displayedPart : null))

</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 10px;">
    <ul style="list-style-type: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 2px;">
      <li><strong>Kind:</strong> {{ displayedPart.kind }}</li>
      <li><strong>Socket:</strong> {{ displayedPart.socketTag }}</li>
      <li><strong>Power Draw:</strong> {{ displayedPart.powerDraw?.value || 0 }} W</li>
      <li><strong>Value:</strong> {{ displayedPart.value.value.toFixed(2) }} $ETC</li>
    </ul>

    <ul v-if="asCpu" style="list-style-type: none; padding: 0; margin: 0;">
      <li style="word-break: break-word;"><strong>Compute Rate:</strong> {{ formatOps(asCpu.computeRate?.value || 0) }} op/s</li>
    </ul>
    <ul v-if="asRam" style="list-style-type: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 2px;">
      <li><strong>Capacity:</strong> {{ formatGB(asRam.memoryCapacity?.value || 0) }} GB</li>
      <li><strong>Bandwidth:</strong> {{ formatMB(asRam.ioBandwidth?.value || 0) }} MB/s</li>
    </ul>
    <ul v-if="asStorage" style="list-style-type: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 2px;">
      <li><strong>Capacity:</strong> {{ formatGB(asStorage.storageCapacity?.value || 0) }} GB</li>
      <li v-if="'ioBandwidth' in asStorage && asStorage.ioBandwidth">
        <strong>Bandwidth:</strong> {{ formatMB(asStorage.ioBandwidth.value) }} MB/s
      </li>
    </ul>
    <ul v-if="asPsu" style="list-style-type: none; padding: 0; margin: 0;">
      <li><strong>Power Capacity:</strong> {{ asPsu.powerCapacity?.value || 0 }} W</li>
    </ul>

    <!-- SLOTS -->
    <fieldset v-if="displayedPart.slots && displayedPart.slots.length > 0">
      <legend>Attached Components</legend>
      <PartSlots
        :slots="displayedPart.slots"
        :serverNode="parentServer as ServerNode | undefined"
        :isRunningJob="!!isRunningJob"
      />
    </fieldset>
  </div>
</template>
