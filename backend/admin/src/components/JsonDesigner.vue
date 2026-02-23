<script setup>
import { ref, computed } from 'vue';
import { NInput, NButton, NSpace } from 'naive-ui';
import JsonNode from './JsonNode.vue';

const props = defineProps({
  modelValue: { type: String, default: '{}' },
});

const emit = defineEmits(['update:modelValue']);

const rawMode = ref(false);
const parseError = ref('');

const parsed = computed(() => {
  try {
    return JSON.parse(props.modelValue || '{}');
  } catch {
    return {};
  }
});

const rootType = computed(() => Array.isArray(parsed.value) ? 'array' : 'object');

function onNodeUpdate(newVal) {
  emit('update:modelValue', JSON.stringify(newVal, null, 2));
}

function setRootType(type) {
  if (type === 'array' && rootType.value !== 'array') {
    emit('update:modelValue', '[]');
  } else if (type === 'object' && rootType.value !== 'object') {
    emit('update:modelValue', '{}');
  }
}

function toggleMode() {
  if (rawMode.value) {
    // Switching from raw to visual — validate JSON first
    try {
      JSON.parse(props.modelValue || '{}');
      parseError.value = '';
      rawMode.value = false;
    } catch {
      parseError.value = 'Fix JSON syntax before switching to visual mode';
    }
  } else {
    // Switching from visual to raw — always safe
    parseError.value = '';
    rawMode.value = true;
  }
}
</script>

<template>
  <div style="background: #1e1e22; border-radius: 4px; padding: 8px; border: 1px solid #333;">
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
      <!-- Root type toggle (only in visual mode) -->
      <NSpace v-if="!rawMode" :size="4">
        <NButton
          size="tiny"
          :type="rootType === 'object' ? 'primary' : 'default'"
          :quaternary="rootType !== 'object'"
          @click="setRootType('object')"
          style="font-family: monospace; font-size: 11px;"
        >{ } Object</NButton>
        <NButton
          size="tiny"
          :type="rootType === 'array' ? 'primary' : 'default'"
          :quaternary="rootType !== 'array'"
          @click="setRootType('array')"
          style="font-family: monospace; font-size: 11px;"
        >[ ] Array</NButton>
      </NSpace>
      <div v-else />

      <div style="display: flex; align-items: center; gap: 6px;">
        <span v-if="parseError" style="color: #e88; font-size: 11px;">{{ parseError }}</span>
        <NButton size="tiny" quaternary @click="toggleMode" style="font-size: 11px;">
          {{ rawMode ? 'Visual' : 'Raw JSON' }}
        </NButton>
      </div>
    </div>

    <!-- Raw JSON editor -->
    <div v-if="rawMode">
      <NInput
        :value="modelValue"
        type="textarea"
        :autosize="{ minRows: 3, maxRows: 12 }"
        @update:value="v => $emit('update:modelValue', v)"
        placeholder="{}"
        :input-props="{ style: 'font-family: monospace; font-size: 12px;' }"
      />
    </div>

    <!-- Visual tree editor -->
    <div v-else>
      <JsonNode :value="parsed" :depth="0" @update="onNodeUpdate" />
    </div>
  </div>
</template>
