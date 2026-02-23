<script setup>
import { NScrollbar, NEmpty } from 'naive-ui';

const props = defineProps({
  logs: { type: Array, default: () => [] },
  maxHeight: { type: Number, default: 300 },
});

function logColor(type) {
  switch (type) {
    case 'success': return '#52c41a';
    case 'error': return '#ff4d4f';
    case 'warning': return '#faad14';
    case 'info': return '#1890ff';
    default: return '#888';
  }
}
</script>

<template>
  <NScrollbar :style="{ maxHeight: `${maxHeight}px` }">
    <div v-if="logs.length === 0" style="padding: 20px; text-align: center;">
      <NEmpty description="No logs yet" />
    </div>
    <div v-else style="font-family: 'Monaco', 'Menlo', monospace; font-size: 12px;">
      <div
        v-for="(log, index) in logs"
        :key="index"
        style="padding: 6px 0; border-bottom: 1px solid #2a2a2e;"
      >
        <span style="color: #666; margin-right: 12px;">{{ log.timestamp }}</span>
        <span :style="{ color: logColor(log.type) }">{{ log.message }}</span>
      </div>
    </div>
  </NScrollbar>
</template>
