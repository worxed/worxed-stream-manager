<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { NCard, NGrid, NGridItem, NTag, NDescriptions, NDescriptionsItem, NButton } from 'naive-ui';
import { IconRefresh, IconDatabase } from '@tabler/icons-vue';

const dbStatus = ref(null);
const loading = ref(false);

async function fetchDbStatus() {
  loading.value = true;
  try {
    const res = await fetch('/api/db/status');
    dbStatus.value = await res.json();
  } catch (err) {
    dbStatus.value = null;
  }
  loading.value = false;
}

let interval;
onMounted(() => {
  fetchDbStatus();
  interval = setInterval(fetchDbStatus, 10000);
});
onUnmounted(() => clearInterval(interval));
</script>

<template>
  <NCard title="Database Status" size="small">
    <template #header-extra>
      <NButton size="tiny" secondary :loading="loading" @click="fetchDbStatus">
        <template #icon><IconRefresh :size="14" /></template>
      </NButton>
    </template>

    <div v-if="!dbStatus" style="color: #666; padding: 12px;">
      Database not available
    </div>

    <template v-else>
      <NDescriptions label-placement="left" :column="1" size="small" bordered>
        <NDescriptionsItem label="WAL Mode">
          <NTag size="small" :type="dbStatus.walMode === 'wal' ? 'success' : 'default'">
            {{ dbStatus.walMode }}
          </NTag>
        </NDescriptionsItem>
        <NDescriptionsItem label="Size">
          {{ dbStatus.sizeMB }} MB
        </NDescriptionsItem>
        <NDescriptionsItem label="Schema Version">
          v{{ dbStatus.migration?.currentVersion || 0 }}
        </NDescriptionsItem>
        <NDescriptionsItem label="Pending Migrations">
          <NTag size="small" :type="dbStatus.migration?.pending?.length > 0 ? 'warning' : 'success'">
            {{ dbStatus.migration?.pending?.length || 0 }}
          </NTag>
        </NDescriptionsItem>
      </NDescriptions>

      <div style="margin-top: 16px;">
        <div style="color: #888; font-size: 12px; margin-bottom: 8px;">TABLE ROW COUNTS</div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px;">
          <div
            v-for="(count, table) in dbStatus.tables"
            :key="table"
            style="background: #1e1e24; border-radius: 6px; padding: 10px; text-align: center;"
          >
            <div style="font-size: 20px; font-weight: 600; color: #fff;">{{ count }}</div>
            <div style="font-size: 11px; color: #888; margin-top: 4px;">{{ table }}</div>
          </div>
        </div>
      </div>
    </template>
  </NCard>
</template>
