<script setup>
import { computed } from 'vue';
import { NCard, NDataTable, NTag, NButton, NSpace } from 'naive-ui';
import { IconRefresh } from '@tabler/icons-vue';

const props = defineProps({
  status: { type: Object, default: null },
});

const columns = [
  { title: 'Process', key: 'name', width: 200 },
  { title: 'Status', key: 'status', width: 120 },
  { title: 'PID', key: 'pid', width: 100 },
  { title: 'Port', key: 'port', width: 100 },
  { title: 'Uptime', key: 'uptime', width: 120 },
  { title: 'Actions', key: 'actions', width: 150 },
];

const processes = computed(() => {
  if (!props.status) return [];

  const backend = props.status.backend || {};

  return [
    {
      name: 'Supervisor',
      status: props.status.supervisor || 'unknown',
      pid: process?.pid || '-',
      port: props.status.supervisorPort || 3000,
      uptime: '-',
      canRestart: false,
    },
    {
      name: 'Backend Server',
      status: backend.status || 'stopped',
      pid: backend.pid || '-',
      port: backend.port || 3001,
      uptime: backend.uptime ? `${backend.uptime}s` : '-',
      canRestart: true,
    },
  ];
});

function statusType(status) {
  switch (status) {
    case 'running': return 'success';
    case 'starting': return 'warning';
    case 'stopped': return 'error';
    default: return 'default';
  }
}
</script>

<template>
  <NCard title="Process Manager">
    <NDataTable
      :columns="columns"
      :data="processes"
      :bordered="false"
    >
      <template #empty>
        <span style="color: #666;">No process data available</span>
      </template>
    </NDataTable>

    <template #header-extra>
      <NButton text size="small">
        <template #icon><IconRefresh :size="16" /></template>
      </NButton>
    </template>
  </NCard>

  <NCard title="Process Details" style="margin-top: 16px;">
    <div v-if="status?.backend" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
      <div>
        <span style="color: #888; font-size: 12px;">Last Started</span>
        <p style="margin: 4px 0 0; color: #fff;">
          {{ status.backend.lastStartTime || 'Never' }}
        </p>
      </div>
      <div>
        <span style="color: #888; font-size: 12px;">Total Restarts</span>
        <p style="margin: 4px 0 0; color: #fff;">
          {{ status.backend.restartCount }}
        </p>
      </div>
      <div>
        <span style="color: #888; font-size: 12px;">Backend Port</span>
        <p style="margin: 4px 0 0; color: #fff;">
          {{ status.backend.port }}
        </p>
      </div>
      <div>
        <span style="color: #888; font-size: 12px;">Status</span>
        <p style="margin: 4px 0 0;">
          <NTag :type="statusType(status.backend.status)" size="small">
            {{ status.backend.status }}
          </NTag>
        </p>
      </div>
    </div>
    <div v-else style="color: #666;">
      Unable to fetch process details. Is the supervisor running?
    </div>
  </NCard>
</template>
