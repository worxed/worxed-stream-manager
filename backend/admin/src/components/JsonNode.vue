<script>
import { h } from 'vue';
export default { name: 'JsonNode' };
</script>

<script setup>
import { reactive } from 'vue';
import { NInput, NInputNumber, NSelect, NButton, NSwitch } from 'naive-ui';
import { IconPlus, IconTrash } from '@tabler/icons-vue';

const props = defineProps({
  value: { default: null },
  depth: { type: Number, default: 0 },
});

const emit = defineEmits(['update']);

const typeOptions = [
  { label: 'String', value: 'string' },
  { label: 'Number', value: 'number' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'Null', value: 'null' },
  { label: 'Object', value: 'object' },
  { label: 'Array', value: 'array' },
];

const typeDefaults = {
  string: '', number: 0, boolean: false, null: null, object: {}, array: [],
};

function typeOf(v) {
  if (v === null || v === undefined) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

function isComplex(v) {
  return v !== null && typeof v === 'object';
}

// Local key editing buffer — prevents re-render on every keystroke
// Keys are the original property name, values are the in-progress edit text
const keyBuffer = reactive(new Map());

function getKeyDisplay(key) {
  return keyBuffer.has(key) ? keyBuffer.get(key) : key;
}

function onKeyInput(originalKey, value) {
  keyBuffer.set(originalKey, value);
}

function onKeyBlur(originalKey) {
  const newKey = (keyBuffer.get(originalKey) || originalKey).trim();
  keyBuffer.delete(originalKey);
  if (newKey && newKey !== originalKey) {
    // Rebuild object preserving insertion order, swapping the renamed key
    const result = {};
    for (const [k, v] of Object.entries(props.value)) {
      result[k === originalKey ? newKey : k] = v;
    }
    emit('update', result);
  }
}

// --- Object operations ---
function setObjVal(key, val) {
  emit('update', { ...props.value, [key]: val });
}

function delObjKey(key) {
  const o = { ...props.value };
  delete o[key];
  emit('update', o);
}

function addObjProp() {
  let k = 'key';
  let i = 1;
  while (props.value?.hasOwnProperty(k)) k = `key${i++}`;
  emit('update', { ...(props.value || {}), [k]: '' });
}

// --- Array operations ---
function setArrItem(idx, val) {
  const a = [...props.value];
  a[idx] = val;
  emit('update', a);
}

function delArrItem(idx) {
  const a = [...props.value];
  a.splice(idx, 1);
  emit('update', a);
}

function addArrItem() {
  emit('update', [...(props.value || []), '']);
}
</script>

<template>
  <div :style="depth > 0 ? { paddingLeft: '12px', marginLeft: '4px', borderLeft: '1px solid #333' } : {}">

    <!-- OBJECT -->
    <template v-if="typeOf(value) === 'object'">
      <div
        v-for="([key, val], idx) in Object.entries(value)"
        :key="idx"
        style="margin-bottom: 4px;"
      >
        <div style="display: flex; align-items: flex-start; gap: 4px;">
          <NInput
            :value="getKeyDisplay(key)"
            size="tiny"
            style="width: 100px; flex-shrink: 0;"
            placeholder="key"
            @update:value="v => onKeyInput(key, v)"
            @blur="() => onKeyBlur(key)"
          />
          <span style="color: #555; line-height: 28px; flex-shrink: 0;">:</span>
          <NSelect
            :value="typeOf(val)"
            :options="typeOptions"
            size="tiny"
            style="width: 95px; flex-shrink: 0;"
            @update:value="t => setObjVal(key, typeDefaults[t])"
          />
          <!-- Primitive value editors -->
          <NInput
            v-if="typeof val === 'string'"
            :value="val"
            size="tiny"
            style="flex: 1; min-width: 80px;"
            @update:value="v => setObjVal(key, v)"
            placeholder="value"
          />
          <NInputNumber
            v-else-if="typeof val === 'number'"
            :value="val"
            size="tiny"
            style="flex: 1; min-width: 80px;"
            @update:value="v => setObjVal(key, v ?? 0)"
            :show-button="false"
          />
          <NSwitch
            v-else-if="typeof val === 'boolean'"
            :value="val"
            size="small"
            @update:value="v => setObjVal(key, v)"
            style="margin-top: 4px; flex-shrink: 0;"
          />
          <span
            v-else-if="val === null"
            style="color: #666; font-style: italic; line-height: 28px; flex: 1;"
          >null</span>
          <span
            v-else-if="Array.isArray(val)"
            style="color: #888; font-size: 11px; font-family: monospace; line-height: 28px; flex: 1;"
          >[ {{ val.length }} {{ val.length === 1 ? 'item' : 'items' }} ]</span>
          <span
            v-else
            style="color: #888; font-size: 11px; font-family: monospace; line-height: 28px; flex: 1;"
          >{ {{ Object.keys(val).length }} {{ Object.keys(val).length === 1 ? 'prop' : 'props' }} }</span>
          <NButton size="tiny" quaternary type="error" @click="delObjKey(key)" style="flex-shrink: 0;">
            <template #icon><IconTrash :size="12" /></template>
          </NButton>
        </div>
        <!-- Nested object/array rendered below the property row -->
        <JsonNode
          v-if="isComplex(val)"
          :value="val"
          :depth="depth + 1"
          @update="v => setObjVal(key, v)"
        />
      </div>
      <NButton size="tiny" dashed @click="addObjProp" style="margin-top: 2px;">
        <template #icon><IconPlus :size="12" /></template>
        Property
      </NButton>
    </template>

    <!-- ARRAY -->
    <template v-else-if="typeOf(value) === 'array'">
      <div
        v-for="(item, idx) in value"
        :key="idx"
        style="margin-bottom: 4px;"
      >
        <div style="display: flex; align-items: flex-start; gap: 4px;">
          <span style="color: #555; font-size: 11px; min-width: 20px; line-height: 28px; text-align: right; flex-shrink: 0;">{{ idx }}</span>
          <NSelect
            :value="typeOf(item)"
            :options="typeOptions"
            size="tiny"
            style="width: 95px; flex-shrink: 0;"
            @update:value="t => setArrItem(idx, typeDefaults[t])"
          />
          <NInput
            v-if="typeof item === 'string'"
            :value="item"
            size="tiny"
            style="flex: 1; min-width: 80px;"
            @update:value="v => setArrItem(idx, v)"
            placeholder="value"
          />
          <NInputNumber
            v-else-if="typeof item === 'number'"
            :value="item"
            size="tiny"
            style="flex: 1; min-width: 80px;"
            @update:value="v => setArrItem(idx, v ?? 0)"
            :show-button="false"
          />
          <NSwitch
            v-else-if="typeof item === 'boolean'"
            :value="item"
            size="small"
            @update:value="v => setArrItem(idx, v)"
            style="margin-top: 4px; flex-shrink: 0;"
          />
          <span
            v-else-if="item === null"
            style="color: #666; font-style: italic; line-height: 28px; flex: 1;"
          >null</span>
          <span
            v-else-if="Array.isArray(item)"
            style="color: #888; font-size: 11px; font-family: monospace; line-height: 28px; flex: 1;"
          >[ {{ item.length }} {{ item.length === 1 ? 'item' : 'items' }} ]</span>
          <span
            v-else
            style="color: #888; font-size: 11px; font-family: monospace; line-height: 28px; flex: 1;"
          >{ {{ Object.keys(item).length }} {{ Object.keys(item).length === 1 ? 'prop' : 'props' }} }</span>
          <NButton size="tiny" quaternary type="error" @click="delArrItem(idx)" style="flex-shrink: 0;">
            <template #icon><IconTrash :size="12" /></template>
          </NButton>
        </div>
        <JsonNode
          v-if="isComplex(item)"
          :value="item"
          :depth="depth + 1"
          @update="v => setArrItem(idx, v)"
        />
      </div>
      <NButton size="tiny" dashed @click="addArrItem" style="margin-top: 2px;">
        <template #icon><IconPlus :size="12" /></template>
        Item
      </NButton>
    </template>

    <!-- PRIMITIVE at root (edge case) -->
    <template v-else>
      <div style="display: flex; align-items: center; gap: 4px;">
        <NInput
          v-if="typeof value === 'string'"
          :value="value"
          size="tiny"
          style="flex: 1;"
          @update:value="v => $emit('update', v)"
          placeholder="value"
        />
        <NInputNumber
          v-else-if="typeof value === 'number'"
          :value="value"
          size="tiny"
          style="flex: 1;"
          @update:value="v => $emit('update', v ?? 0)"
          :show-button="false"
        />
        <NSwitch
          v-else-if="typeof value === 'boolean'"
          :value="value"
          size="small"
          @update:value="v => $emit('update', v)"
        />
        <span v-else style="color: #666; font-style: italic;">null</span>
      </div>
    </template>

  </div>
</template>
