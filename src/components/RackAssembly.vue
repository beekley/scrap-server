<script setup lang="ts">
import ServerRoom from './ServerRoom.vue';
import ContextPanel from './ContextPanel.vue';
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: baseline;">
      <h2>Server Room (Assembly)</h2>
    </div>

    <div style="display: flex; gap: 20px;">
      
      <!-- 2D Server Room -->
      <div style="flex: 2; min-width: 600px;">
        <ServerRoom />
      </div>

      <!-- Side Panel -->
      <ContextPanel />

    </div>
  </div>
</template>
