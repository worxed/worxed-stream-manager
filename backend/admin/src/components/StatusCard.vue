<script setup>
import { NCard, NTag } from 'naive-ui';

const props = defineProps({
  title: { type: String, required: true },
  value: { type: String, required: true },
  type: { type: String, default: 'default' },
});

const tagTypeMap = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
  default: 'default',
};
</script>

<template>
  <NCard size="small" style="background: #1e1e24;">
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <span style="color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
        {{ title }}
      </span>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 24px; font-weight: 600; color: #fff;">
          {{ value }}
        </span>
        <NTag v-if="type !== 'default'" :type="tagTypeMap[type]" size="small" round />
      </div>
    </div>
  </NCard>
</template>
