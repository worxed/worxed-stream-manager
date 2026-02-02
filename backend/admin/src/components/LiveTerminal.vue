<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { NCard, NScrollbar, NTag, NSpace, NBadge, NButton } from 'naive-ui';
import { IconTrash, IconPlayerPause, IconPlayerPlay } from '@tabler/icons-vue';

const props = defineProps({
  maxLines: { type: Number, default: 500 },
});

const logs = ref([]);
const isConnected = ref(false);
const isPaused = ref(false);
const autoScroll = ref(true);
const scrollRef = ref(null);
let ws = null;

function connect() {
  // Connect to supervisor WebSocket (same host as admin)
  const wsUrl = import.meta.env.DEV
    ? 'ws://localhost:4000'
    : `ws://${window.location.host}`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    isConnected.value = true;
    addLocalLog('Connected to supervisor', 'success');
  };

  ws.onclose = () => {
    isConnected.value = false;
    addLocalLog('Disconnected from supervisor', 'warning');
    // Reconnect after 2 seconds
    setTimeout(connect, 2000);
  };

  ws.onerror = (err) => {
    addLocalLog('WebSocket error', 'error');
  };

  ws.onmessage = (event) => {
    if (isPaused.value) return;

    try {
      const msg = JSON.parse(event.data);

      if (msg.type === 'log') {
        addLog(msg.data);
      } else if (msg.type === 'history') {
        // Prepend history
        logs.value = [...msg.data, ...logs.value];
        trimLogs();
      } else if (msg.type === 'status') {
        // Could update status display
      }
    } catch (e) {
      console.error('Failed to parse message:', e);
    }
  };
}

function addLog(entry) {
  logs.value.push(entry);
  trimLogs();
  if (autoScroll.value) {
    nextTick(scrollToBottom);
  }
}

function addLocalLog(message, type) {
  addLog({
    timestamp: new Date().toISOString(),
    source: 'terminal',
    message,
    type,
  });
}

function trimLogs() {
  if (logs.value.length > props.maxLines) {
    logs.value = logs.value.slice(-props.maxLines);
  }
}

function scrollToBottom() {
  if (scrollRef.value) {
    const el = scrollRef.value.$el?.querySelector('.n-scrollbar-container');
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}

function clearLogs() {
  logs.value = [];
  addLocalLog('Logs cleared', 'info');
}

function togglePause() {
  isPaused.value = !isPaused.value;
  addLocalLog(isPaused.value ? 'Log stream paused' : 'Log stream resumed', 'info');
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('en-US', { hour12: false });
}

function getTypeColor(type) {
  switch (type) {
    case 'error': return '#ff4d4f';
    case 'warning': return '#faad14';
    case 'success':
    case 'green': return '#52c41a';
    case 'cyan': return '#13c2c2';
    default: return '#888';
  }
}

function getSourceColor(source) {
  switch (source) {
    case 'backend': return '#1890ff';
    case 'supervisor': return '#722ed1';
    case 'terminal': return '#666';
    default: return '#888';
  }
}

onMounted(() => {
  connect();
});

onUnmounted(() => {
  if (ws) {
    ws.close();
  }
});
</script>

<template>
  <NCard
    title="Live Terminal"
    size="small"
    style="background: #0a0a0a; height: 100%;"
  >
    <template #header-extra>
      <NSpace>
        <NBadge :dot="true" :color="isConnected ? '#52c41a' : '#ff4d4f'" />
        <NButton
          text
          size="small"
          @click="togglePause"
          :type="isPaused ? 'warning' : 'default'"
        >
          <template #icon>
            <IconPlayerPause v-if="!isPaused" :size="16" />
            <IconPlayerPlay v-else :size="16" />
          </template>
        </NButton>
        <NButton text size="small" @click="clearLogs">
          <template #icon><IconTrash :size="16" /></template>
        </NButton>
      </NSpace>
    </template>

    <NScrollbar
      ref="scrollRef"
      style="max-height: 400px;"
      @scroll="autoScroll = false"
    >
      <div
        style="
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 12px;
          line-height: 1.6;
          padding: 8px;
          background: #0a0a0a;
          min-height: 380px;
        "
      >
        <div v-if="logs.length === 0" style="color: #444; padding: 20px; text-align: center;">
          Waiting for logs...
        </div>
        <div
          v-for="(log, index) in logs"
          :key="index"
          style="display: flex; gap: 8px; padding: 2px 0;"
        >
          <span style="color: #444; flex-shrink: 0;">
            {{ formatTime(log.timestamp) }}
          </span>
          <span
            :style="{ color: getSourceColor(log.source), flexShrink: 0, width: '80px' }"
          >
            [{{ log.source?.toUpperCase() || 'LOG' }}]
          </span>
          <span :style="{ color: getTypeColor(log.type) }">
            {{ log.message }}
          </span>
        </div>
      </div>
    </NScrollbar>
  </NCard>
</template>
