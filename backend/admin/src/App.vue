<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import {
  NConfigProvider,
  NLayout,
  NLayoutHeader,
  NLayoutContent,
  NLayoutSider,
  NMenu,
  NCard,
  NGrid,
  NGridItem,
  NStatistic,
  NButton,
  NSpace,
  NTag,
  NAlert,
  NScrollbar,
  NMessageProvider,
  darkTheme,
} from 'naive-ui';
import {
  IconServer,
  IconActivity,
  IconSettings,
  IconTerminal2,
  IconRefresh,
  IconPlayerPlay,
  IconPlayerStop,
  IconExternalLink,
  IconDatabase,
  IconApi,
} from '@tabler/icons-vue';

import StatusCard from './components/StatusCard.vue';
import ProcessManager from './components/ProcessManager.vue';
import LogViewer from './components/LogViewer.vue';
import LiveTerminal from './components/LiveTerminal.vue';
import DatabaseStatus from './components/DatabaseStatus.vue';
import SettingsManager from './components/SettingsManager.vue';
import EventViewer from './components/EventViewer.vue';
import EndpointBuilder from './components/EndpointBuilder.vue';

// Supervisor state
const supervisorStatus = ref(null);
const backendLogs = ref([]);
const isConnected = ref(false);
const activeMenu = ref('dashboard');

// Fetch status from supervisor
async function fetchStatus() {
  try {
    const res = await fetch('/status');
    supervisorStatus.value = await res.json();
    isConnected.value = true;
  } catch (err) {
    isConnected.value = false;
    supervisorStatus.value = null;
  }
}

// Control actions - Backend
async function restartBackend() {
  try {
    await fetch('/restart', { method: 'POST' });
    addLog('Backend restart command sent', 'info');
    setTimeout(fetchStatus, 1000);
  } catch (err) {
    addLog('Failed to restart backend: ' + err.message, 'error');
  }
}

async function stopBackend() {
  try {
    await fetch('/stop', { method: 'POST' });
    addLog('Backend stop command sent', 'warning');
    setTimeout(fetchStatus, 500);
  } catch (err) {
    addLog('Failed to stop backend: ' + err.message, 'error');
  }
}

async function startBackend() {
  try {
    await fetch('/start', { method: 'POST' });
    addLog('Backend start command sent', 'success');
    setTimeout(fetchStatus, 1000);
  } catch (err) {
    addLog('Failed to start backend: ' + err.message, 'error');
  }
}

// Control actions - Frontend
async function startFrontend() {
  try {
    await fetch('/frontend/start', { method: 'POST' });
    addLog('Frontend start command sent', 'success');
    setTimeout(fetchStatus, 1000);
  } catch (err) {
    addLog('Failed to start frontend: ' + err.message, 'error');
  }
}

async function stopFrontend() {
  try {
    await fetch('/frontend/stop', { method: 'POST' });
    addLog('Frontend stop command sent', 'warning');
    setTimeout(fetchStatus, 500);
  } catch (err) {
    addLog('Failed to stop frontend: ' + err.message, 'error');
  }
}

async function restartFrontend() {
  try {
    await fetch('/frontend/restart', { method: 'POST' });
    addLog('Frontend restart command sent', 'info');
    setTimeout(fetchStatus, 1000);
  } catch (err) {
    addLog('Failed to restart frontend: ' + err.message, 'error');
  }
}

// Control all
async function startAll() {
  try {
    await fetch('/start-all', { method: 'POST' });
    addLog('Starting all services...', 'success');
    setTimeout(fetchStatus, 2000);
  } catch (err) {
    addLog('Failed to start all: ' + err.message, 'error');
  }
}

async function stopAll() {
  try {
    await fetch('/stop-all', { method: 'POST' });
    addLog('Stopping all services...', 'warning');
    setTimeout(fetchStatus, 500);
  } catch (err) {
    addLog('Failed to stop all: ' + err.message, 'error');
  }
}

function addLog(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  backendLogs.value.unshift({ timestamp, message, type });
  if (backendLogs.value.length > 100) backendLogs.value.pop();
}

// Menu items
const menuOptions = [
  { label: 'Dashboard', key: 'dashboard', icon: IconActivity },
  { label: 'Processes', key: 'processes', icon: IconServer },
  { label: 'Logs', key: 'logs', icon: IconTerminal2 },
  { label: 'Endpoints', key: 'endpoints', icon: IconApi },
  { label: 'Database', key: 'database', icon: IconDatabase },
  { label: 'Settings', key: 'settings', icon: IconSettings },
];

// Poll status
let statusInterval;
onMounted(() => {
  fetchStatus();
  statusInterval = setInterval(fetchStatus, 2000);
});

onUnmounted(() => {
  clearInterval(statusInterval);
});
</script>

<template>
  <NConfigProvider :theme="darkTheme">
    <NMessageProvider>
    <NLayout has-sider style="height: 100vh;">
      <!-- Sidebar -->
      <NLayoutSider
        bordered
        :width="220"
        :native-scrollbar="false"
        style="background: #18181c;"
      >
        <div style="padding: 20px; border-bottom: 1px solid #333;">
          <h2 style="margin: 0; color: #fff; font-size: 18px;">
            WORXED
          </h2>
          <span style="color: #666; font-size: 12px;">Admin Console</span>
        </div>
        <NMenu
          v-model:value="activeMenu"
          :options="menuOptions.map(m => ({
            label: m.label,
            key: m.key,
            icon: () => h(m.icon, { size: 18 }),
          }))"
          style="padding: 8px;"
        />
      </NLayoutSider>

      <!-- Main Content -->
      <NLayout>
        <NLayoutHeader bordered style="height: 60px; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; background: #18181c;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <NTag :type="isConnected ? 'success' : 'error'" size="small">
              {{ isConnected ? 'Connected' : 'Disconnected' }}
            </NTag>
            <span style="color: #888; font-size: 13px;">
              Supervisor: {{ supervisorStatus?.supervisorPort || '...' }}
            </span>
          </div>
          <NSpace>
            <NButton
              tag="a"
              href="http://localhost:5173"
              target="_blank"
              secondary
              size="small"
            >
              <template #icon><IconExternalLink :size="16" /></template>
              Stream Manager
            </NButton>
            <NButton
              secondary
              size="small"
              @click="fetchStatus"
            >
              <template #icon><IconRefresh :size="16" /></template>
              Refresh
            </NButton>
          </NSpace>
        </NLayoutHeader>

        <NLayoutContent style="padding: 24px; background: #101014;">
          <!-- Dashboard View -->
          <div v-if="activeMenu === 'dashboard'">
            <NGrid :cols="4" :x-gap="16" :y-gap="16">
              <NGridItem>
                <StatusCard
                  title="Backend Status"
                  :value="supervisorStatus?.backend?.status || 'Unknown'"
                  :type="supervisorStatus?.backend?.status === 'running' ? 'success' : 'warning'"
                />
              </NGridItem>
              <NGridItem>
                <StatusCard
                  title="Backend Uptime"
                  :value="supervisorStatus?.backend?.uptime ? `${supervisorStatus.backend.uptime}s` : '-'"
                  type="info"
                />
              </NGridItem>
              <NGridItem>
                <StatusCard
                  title="Frontend Status"
                  :value="supervisorStatus?.frontend?.status || 'Unknown'"
                  :type="supervisorStatus?.frontend?.status === 'running' ? 'success' : 'warning'"
                />
              </NGridItem>
              <NGridItem>
                <StatusCard
                  title="Frontend Uptime"
                  :value="supervisorStatus?.frontend?.uptime ? `${supervisorStatus.frontend.uptime}s` : '-'"
                  type="info"
                />
              </NGridItem>
            </NGrid>

            <NCard title="Quick Actions" style="margin-top: 24px;">
              <div style="display: flex; flex-direction: column; gap: 16px;">
                <div>
                  <div style="color: #888; font-size: 12px; margin-bottom: 8px;">BACKEND (Port 4001)</div>
                  <NSpace>
                    <NButton
                      type="primary"
                      @click="restartBackend"
                      :disabled="!isConnected"
                      size="small"
                    >
                      <template #icon><IconRefresh :size="16" /></template>
                      Restart
                    </NButton>
                    <NButton
                      type="warning"
                      @click="stopBackend"
                      :disabled="!isConnected || supervisorStatus?.backend?.status !== 'running'"
                      size="small"
                    >
                      <template #icon><IconPlayerStop :size="16" /></template>
                      Stop
                    </NButton>
                    <NButton
                      type="success"
                      @click="startBackend"
                      :disabled="!isConnected || supervisorStatus?.backend?.status === 'running'"
                      size="small"
                    >
                      <template #icon><IconPlayerPlay :size="16" /></template>
                      Start
                    </NButton>
                  </NSpace>
                </div>
                <div>
                  <div style="color: #888; font-size: 12px; margin-bottom: 8px;">FRONTEND (Port 5173)</div>
                  <NSpace>
                    <NButton
                      type="primary"
                      @click="restartFrontend"
                      :disabled="!isConnected"
                      size="small"
                    >
                      <template #icon><IconRefresh :size="16" /></template>
                      Restart
                    </NButton>
                    <NButton
                      type="warning"
                      @click="stopFrontend"
                      :disabled="!isConnected || supervisorStatus?.frontend?.status !== 'running'"
                      size="small"
                    >
                      <template #icon><IconPlayerStop :size="16" /></template>
                      Stop
                    </NButton>
                    <NButton
                      type="success"
                      @click="startFrontend"
                      :disabled="!isConnected || supervisorStatus?.frontend?.status === 'running'"
                      size="small"
                    >
                      <template #icon><IconPlayerPlay :size="16" /></template>
                      Start
                    </NButton>
                  </NSpace>
                </div>
                <div style="border-top: 1px solid #333; padding-top: 16px;">
                  <NSpace>
                    <NButton
                      type="success"
                      @click="startAll"
                      :disabled="!isConnected"
                    >
                      <template #icon><IconPlayerPlay :size="18" /></template>
                      Start All Services
                    </NButton>
                    <NButton
                      type="error"
                      @click="stopAll"
                      :disabled="!isConnected"
                    >
                      <template #icon><IconPlayerStop :size="18" /></template>
                      Stop All Services
                    </NButton>
                  </NSpace>
                </div>
              </div>
            </NCard>

            <div style="margin-top: 24px;">
              <LiveTerminal :max-lines="500" />
            </div>
          </div>

          <!-- Processes View -->
          <div v-else-if="activeMenu === 'processes'">
            <ProcessManager :status="supervisorStatus" />
          </div>

          <!-- Logs View -->
          <div v-else-if="activeMenu === 'logs'">
            <LiveTerminal :max-lines="1000" />
          </div>

          <!-- Endpoints View -->
          <div v-else-if="activeMenu === 'endpoints'">
            <EndpointBuilder />
          </div>

          <!-- Database View -->
          <div v-else-if="activeMenu === 'database'">
            <div style="display: flex; flex-direction: column; gap: 16px;">
              <DatabaseStatus />
              <EventViewer />
            </div>
          </div>

          <!-- Settings View -->
          <div v-else-if="activeMenu === 'settings'">
            <SettingsManager />
          </div>
        </NLayoutContent>
      </NLayout>
    </NLayout>
    </NMessageProvider>
  </NConfigProvider>
</template>

<script>
import { h } from 'vue';
export default {
  methods: { h },
};
</script>
