<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { TRANSFER_ZONE_START_X } from '../utils/physics'

const gameStore = useGameStore()

const totalSellValue = computed(() => {
  let total = 0
  for (const s of gameStore.servers) {
    if (s.x !== undefined && s.x >= TRANSFER_ZONE_START_X) {
      for (const p of s.installedParts) total += p.value.value
    }
  }
  for (const p of gameStore.inventory) {
    if (p.x !== undefined && p.x >= TRANSFER_ZONE_START_X) {
      total += p.value.value
    }
  }
  return total * 0.25
})
</script>

<template>
  <div
    v-if="gameStore.showTransferPanel"
    class="window transfer-controls"
    style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 1000;"
  >
    <div class="title-bar">
      <div class="title-bar-text">Transfer Panel</div>
    </div>
    <div class="window-body" style="display: flex; align-items: center; justify-content: center; padding: 10px;">
      <button @click="gameStore.sellTransferPanel()" class="sell-btn">
        Sell Items ({{ totalSellValue.toFixed(4) }} $ETC) & Close
      </button>
    </div>
  </div>
</template>
