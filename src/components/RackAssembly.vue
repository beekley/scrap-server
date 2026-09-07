<script setup lang="ts">
import ServerRoom from './ServerRoom.vue'
import ContextPanel from './ContextPanel.vue'
import BountyBoard from './BountyBoard.vue'
</script>

<template>
  <div class="rack-assembly-container">
    <!-- 2D Server Room (Background Layer) -->
    <ServerRoom />

    <!-- Left Panel: Bounty Board -->
    <BountyBoard />

    <!-- Right Panel: Context Panel -->
    <ContextPanel />
  </div>
</template>

<style scoped>
.rack-assembly-container {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>
