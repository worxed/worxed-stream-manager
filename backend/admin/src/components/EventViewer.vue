<script setup>
import { ref, onMounted, computed } from 'vue';
import {
  NCard, NDataTable, NButton, NSpace, NTag, NSelect, NStatistic, NGrid, NGridItem,
} from 'naive-ui';
import { IconRefresh } from '@tabler/icons-vue';

const events = ref([]);
const summary = ref({ total: 0, byType: [] });
const loading = ref(false);
const typeFilter = ref(null);
const pageSize = 50;
const currentPage = ref(1);

const typeOptions = computed(() => [
  { label: `All (${summary.value.total})`, value: null },
  ...summary.value.byType.map(t => ({ label: `${t.type} (${t.count})`, value: t.type })),
]);

async function fetchEvents() {
  loading.value = true;
  try {
    const params = new URLSearchParams({ limit: pageSize, offset: (currentPage.value - 1) * pageSize });
    if (typeFilter.value) params.set('type', typeFilter.value);

    const [eventsRes, summaryRes] = await Promise.all([
      fetch(`/api/events?${params}`),
      fetch('/api/events/summary'),
    ]);

    const eventsData = await eventsRes.json();
    events.value = eventsData.events || [];

    summary.value = await summaryRes.json();
  } catch (err) {
    events.value = [];
  }
  loading.value = false;
}

function onTypeChange() {
  currentPage.value = 1;
  fetchEvents();
}

const typeColors = {
  follow: 'success',
  subscribe: 'info',
  raid: 'warning',
  donation: 'error',
  bits: 'error',
  gift_sub: 'info',
  system: 'default',
};

const columns = [
  {
    title: 'Type',
    key: 'type',
    width: 100,
    render(row) {
      return h(NTag, { size: 'small', type: typeColors[row.type] || 'default' }, { default: () => row.type });
    }
  },
  { title: 'Username', key: 'username', width: 150, ellipsis: { tooltip: true } },
  {
    title: 'Details',
    key: 'data',
    render(row) {
      if (!row.data || typeof row.data !== 'object') return String(row.data || '-');
      const entries = Object.entries(row.data).slice(0, 3);
      return entries.map(([k, v]) => `${k}: ${v}`).join(', ');
    }
  },
  {
    title: 'Time',
    key: 'created_at',
    width: 160,
    render(row) {
      if (!row.created_at) return '-';
      return new Date(row.created_at + 'Z').toLocaleString();
    }
  },
];

onMounted(fetchEvents);
</script>

<script>
import { h } from 'vue';
export default { methods: { h } };
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <!-- Summary cards -->
    <NGrid :cols="4" :x-gap="12" :y-gap="12" v-if="summary.byType.length > 0">
      <NGridItem v-for="item in summary.byType" :key="item.type">
        <div style="background: #1e1e24; border-radius: 6px; padding: 12px; text-align: center;">
          <div style="font-size: 22px; font-weight: 600; color: #fff;">{{ item.count }}</div>
          <div style="font-size: 11px; color: #888; margin-top: 4px;">{{ item.type }}</div>
        </div>
      </NGridItem>
    </NGrid>

    <!-- Events table -->
    <NCard title="Event History" size="small">
      <template #header-extra>
        <NSpace>
          <NSelect
            v-model:value="typeFilter"
            :options="typeOptions"
            size="tiny"
            style="width: 160px;"
            placeholder="All types"
            @update:value="onTypeChange"
          />
          <NButton size="tiny" secondary :loading="loading" @click="fetchEvents">
            <template #icon><IconRefresh :size="14" /></template>
          </NButton>
        </NSpace>
      </template>

      <NDataTable
        :columns="columns"
        :data="events"
        :loading="loading"
        size="small"
        :bordered="false"
        :single-line="false"
        :max-height="400"
        virtual-scroll
      />

      <div v-if="events.length >= pageSize" style="margin-top: 12px; text-align: center;">
        <NSpace justify="center">
          <NButton size="tiny" :disabled="currentPage <= 1" @click="currentPage--; fetchEvents()">Prev</NButton>
          <span style="color: #888; font-size: 12px; line-height: 28px;">Page {{ currentPage }}</span>
          <NButton size="tiny" :disabled="events.length < pageSize" @click="currentPage++; fetchEvents()">Next</NButton>
        </NSpace>
      </div>
    </NCard>
  </div>
</template>
