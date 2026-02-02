<script setup>
import { ref, onMounted, computed } from 'vue';
import {
  NCard, NDataTable, NButton, NSpace, NTag, NInput, NSelect,
  NModal, NForm, NFormItem, NInputNumber, useMessage,
} from 'naive-ui';
import { IconPlus, IconRefresh, IconTrash } from '@tabler/icons-vue';

const message = useMessage();
const settings = ref([]);
const loading = ref(false);
const showAddModal = ref(false);

const newSetting = ref({ key: '', value: '', category: 'general' });

const categories = computed(() => {
  const cats = [...new Set(settings.value.map(s => s.category))];
  return cats.sort();
});

const categoryFilter = ref(null);

const filteredSettings = computed(() => {
  if (!categoryFilter.value) return settings.value;
  return settings.value.filter(s => s.category === categoryFilter.value);
});

const categoryOptions = computed(() => [
  { label: 'All', value: null },
  ...categories.value.map(c => ({ label: c, value: c })),
]);

async function fetchSettings() {
  loading.value = true;
  try {
    const res = await fetch('/api/settings');
    settings.value = await res.json();
  } catch (err) {
    settings.value = [];
  }
  loading.value = false;
}

async function addSetting() {
  if (!newSetting.value.key || newSetting.value.value === '') return;
  try {
    await fetch(`/api/settings/${encodeURIComponent(newSetting.value.key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: newSetting.value.value, category: newSetting.value.category }),
    });
    message.success(`Setting "${newSetting.value.key}" saved`);
    newSetting.value = { key: '', value: '', category: 'general' };
    showAddModal.value = false;
    fetchSettings();
  } catch (err) {
    message.error('Failed to save setting');
  }
}

async function deleteSetting(key) {
  try {
    await fetch(`/api/settings/${encodeURIComponent(key)}`, { method: 'DELETE' });
    message.success(`Setting "${key}" deleted`);
    fetchSettings();
  } catch (err) {
    message.error('Failed to delete setting');
  }
}

const columns = [
  { title: 'Key', key: 'key', width: 180, ellipsis: { tooltip: true } },
  {
    title: 'Value',
    key: 'value',
    render(row) {
      const val = typeof row.value === 'object' ? JSON.stringify(row.value) : String(row.value);
      return val.length > 60 ? val.slice(0, 60) + '...' : val;
    }
  },
  {
    title: 'Category',
    key: 'category',
    width: 120,
    render(row) {
      return h(NTag, { size: 'small', type: 'info' }, { default: () => row.category });
    }
  },
  {
    title: 'Updated',
    key: 'updated_at',
    width: 160,
    render(row) {
      if (!row.updated_at) return '-';
      return new Date(row.updated_at + 'Z').toLocaleString();
    }
  },
  {
    title: '',
    key: 'actions',
    width: 60,
    render(row) {
      return h(NButton, {
        size: 'tiny',
        type: 'error',
        quaternary: true,
        onClick: () => deleteSetting(row.key),
      }, { icon: () => h(IconTrash, { size: 14 }) });
    }
  }
];

onMounted(fetchSettings);
</script>

<script>
import { h } from 'vue';
export default { methods: { h } };
</script>

<template>
  <NCard title="Settings" size="small">
    <template #header-extra>
      <NSpace>
        <NSelect
          v-model:value="categoryFilter"
          :options="categoryOptions"
          size="tiny"
          style="width: 130px;"
          placeholder="Filter"
        />
        <NButton size="tiny" secondary @click="showAddModal = true">
          <template #icon><IconPlus :size="14" /></template>
          Add
        </NButton>
        <NButton size="tiny" secondary :loading="loading" @click="fetchSettings">
          <template #icon><IconRefresh :size="14" /></template>
        </NButton>
      </NSpace>
    </template>

    <NDataTable
      :columns="columns"
      :data="filteredSettings"
      :loading="loading"
      size="small"
      :bordered="false"
      :single-line="false"
      :max-height="400"
      virtual-scroll
    />
  </NCard>

  <NModal v-model:show="showAddModal" preset="card" title="Add Setting" style="width: 400px;">
    <NForm label-placement="left" label-width="80">
      <NFormItem label="Key">
        <NInput v-model:value="newSetting.key" placeholder="setting.name" />
      </NFormItem>
      <NFormItem label="Value">
        <NInput v-model:value="newSetting.value" placeholder="value" type="textarea" :autosize="{ minRows: 1, maxRows: 4 }" />
      </NFormItem>
      <NFormItem label="Category">
        <NInput v-model:value="newSetting.category" placeholder="general" />
      </NFormItem>
    </NForm>
    <template #footer>
      <NSpace justify="end">
        <NButton @click="showAddModal = false">Cancel</NButton>
        <NButton type="primary" @click="addSetting" :disabled="!newSetting.key">Save</NButton>
      </NSpace>
    </template>
  </NModal>
</template>
