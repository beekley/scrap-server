<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { isPartCompatibleWithSlot, type Part, type SlotDefinition, type ServerNode } from '../types'
import PartSlots from './PartSlots.vue'

const props = defineProps<{
  slots: SlotDefinition[]
  serverNode?: ServerNode
  isRunningJob: boolean
}>()

const gameStore = useGameStore()

function getCompatibleInventoryParts(slot: SlotDefinition): Part[] {
  return (gameStore.inventory as Part[]).filter((p) => isPartCompatibleWithSlot(p, slot))
}

function handleSlotChange(slotId: string, event: Event) {
  if (props.isRunningJob || !props.serverNode) return
  const select = event.target as HTMLSelectElement
  const selectedPartId = select.value

  if (selectedPartId === '') {
    gameStore.removePart(props.serverNode.id, slotId)
  } else {
    gameStore.installPart(props.serverNode.id, slotId, selectedPartId)
  }
}

function getInstalledPart(partId: string): Part | undefined {
  if (!props.serverNode) return undefined
  return props.serverNode.installedParts.find((p) => p.id === partId)
}
</script>

<template>
  <ul
    style="padding-left: 12px; list-style-type: none; margin: 4px 0; border-left: 1px dotted var(--surf-highlight);"
  >
    <li v-for="slot in slots" :key="slot.id" style="margin-bottom: 4px; position: relative">
      <div style="display: flex; flex-direction: column; gap: 2px">
        <div style="display: flex; align-items: center; position: relative">
          <!-- A little line indicator for tree depth -->
          <div
            style="
              position: absolute;
              left: -12px;
              top: 50%;
              width: 10px;
              border-top: 1px dotted var(--surf-highlight);
            "
          ></div>

          <span style="display: inline-block; width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" :title="slot.label">{{
            slot.label
          }}</span>
          <div style="display: inline-flex; align-items: center; gap: 4px; flex: 1;">
            <select @change="handleSlotChange(slot.id, $event)" :disabled="isRunningJob || !serverNode" style="max-width: 130px; flex: 1;">
              <option value="" :selected="!slot.installedPartId">Empty</option>
              <option v-if="slot.installedPartId" :value="slot.installedPartId" selected>
                {{ getInstalledPart(slot.installedPartId)?.name || slot.installedPartId }}
              </option>
              <option
                v-for="invPart in getCompatibleInventoryParts(slot)"
                :key="invPart.id"
                :value="invPart.id"
              >
                {{ invPart.name }}
              </option>
            </select>
            <button
              v-if="slot.installedPartId"
              @click="gameStore.selectedItemId = slot.installedPartId"
            >
              Inspect
            </button>
          </div>
        </div>

        <!-- RECURSIVE SLOTS -->
        <template v-if="slot.installedPartId">
          <PartSlots
            v-if="getInstalledPart(slot.installedPartId)?.slots?.length"
            :slots="getInstalledPart(slot.installedPartId)!.slots!"
            :serverNode="serverNode"
            :isRunningJob="isRunningJob"
          />
        </template>
      </div>
    </li>
  </ul>
</template>
