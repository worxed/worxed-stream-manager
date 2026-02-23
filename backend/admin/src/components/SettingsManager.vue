<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import {
  NCard, NTabs, NTabPane, NForm, NFormItem, NInput, NInputNumber,
  NSwitch, NSelect, NSlider, NButton, NSpace, NTag, NAlert, NDivider,
  NSpin, useMessage,
} from 'naive-ui';
import { IconDeviceFloppy, IconRefresh } from '@tabler/icons-vue';
import ConfigManager from './ConfigManager.vue';

const message = useMessage();

// ===== SETTINGS SCHEMA =====
const SETTINGS_SCHEMA = {
  general: {
    label: 'General',
    fields: [
      { key: 'general.app_name', label: 'Application Name', type: 'string', default: 'Worxed Stream Manager', description: 'Display name shown in the admin header' },
      { key: 'general.debug_mode', label: 'Debug Mode', type: 'boolean', default: false, description: 'Enable verbose logging for troubleshooting' },
      { key: 'general.log_buffer_size', label: 'Log Buffer Size', type: 'number', default: 100, min: 10, max: 1000, description: 'Maximum number of log entries kept in memory' },
    ],
  },
  twitch: {
    label: 'Twitch',
    fields: [
      { key: 'twitch.auto_reconnect', label: 'Auto Reconnect', type: 'boolean', default: true, description: 'Automatically reconnect IRC when disconnected' },
      { key: 'twitch.chat_buffer_size', label: 'Chat Buffer Size', type: 'number', default: 100, min: 10, max: 500, description: 'Maximum chat messages kept in memory' },
      { key: 'twitch.token_refresh_interval', label: 'Token Refresh Interval (ms)', type: 'number', default: 3600000, min: 60000, max: 86400000, description: 'How often to check if the OAuth token needs refreshing. Changes require backend restart.' },
    ],
  },
  overlay: {
    label: 'Overlay',
    fields: [
      { key: 'overlay.default_theme', label: 'Default Theme', type: 'select', default: 'synthetica', options: [{ label: 'Magma Forge', value: 'forge' }, { label: 'Techno-Organic', value: 'organic' }, { label: 'Synthetica', value: 'synthetica' }], description: 'Default overlay theme for new sessions' },
      { key: 'overlay.default_mode', label: 'Default Mode', type: 'select', default: 'dark', options: [{ label: 'Dark', value: 'dark' }, { label: 'Light', value: 'light' }], description: 'Default theme mode' },
      { key: 'overlay.font_size_base', label: 'Base Font Size (px)', type: 'number', default: 18, min: 12, max: 24, description: 'Base font size in pixels for overlay text' },
    ],
  },
  services: {
    label: 'Services',
    fields: [
      { key: 'services.restart_delay', label: 'Restart Delay (ms)', type: 'number', default: 500, min: 100, max: 5000, description: 'Delay before restarting a crashed service' },
      { key: 'services.shutdown_timeout', label: 'Shutdown Timeout (ms)', type: 'number', default: 3000, min: 1000, max: 15000, description: 'Maximum wait time for child processes during shutdown' },
      { key: 'services.subscriber_buffer_size', label: 'Subscriber Buffer', type: 'number', default: 50, min: 10, max: 500, description: 'Maximum subscriber events kept in memory' },
      { key: 'services.raid_buffer_size', label: 'Raid Buffer', type: 'number', default: 20, min: 5, max: 200, description: 'Maximum raid events kept in memory' },
    ],
  },
};

// ===== STATE =====
const loading = ref(false);
const saving = ref(false);
const values = reactive({});
const savedValues = reactive({});
const twitchStatus = ref(null);
const alertConfigs = ref([]);
const alertSaving = reactive({});

// ===== DIRTY TRACKING =====
function isDirty(category) {
  const fields = SETTINGS_SCHEMA[category]?.fields || [];
  return fields.some(f => values[f.key] !== savedValues[f.key]);
}

function isDirtyAny() {
  return Object.keys(SETTINGS_SCHEMA).some(cat => isDirty(cat));
}

// ===== LOAD =====
async function loadSettings() {
  loading.value = true;
  try {
    const res = await fetch('/api/settings');
    const rows = await res.json();
    const map = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }

    // Fill values from DB or schema defaults
    for (const [cat, schema] of Object.entries(SETTINGS_SCHEMA)) {
      for (const field of schema.fields) {
        const val = map[field.key] !== undefined ? map[field.key] : field.default;
        values[field.key] = val;
        savedValues[field.key] = val;
      }
    }
  } catch (err) {
    // Fill with defaults on error
    for (const [cat, schema] of Object.entries(SETTINGS_SCHEMA)) {
      for (const field of schema.fields) {
        values[field.key] = field.default;
        savedValues[field.key] = field.default;
      }
    }
  }
  loading.value = false;
}

async function loadTwitchStatus() {
  try {
    const res = await fetch('/api/status');
    twitchStatus.value = await res.json();
  } catch { twitchStatus.value = null; }
}

async function loadAlertConfigs() {
  try {
    const res = await fetch('/api/alerts/configs');
    alertConfigs.value = await res.json();
  } catch { alertConfigs.value = []; }
}

// ===== SAVE =====
async function saveCategory(category) {
  const fields = SETTINGS_SCHEMA[category]?.fields || [];
  const dirtyFields = fields.filter(f => values[f.key] !== savedValues[f.key]);
  if (dirtyFields.length === 0) return;

  saving.value = true;
  try {
    for (const field of dirtyFields) {
      await fetch(`/api/settings/${encodeURIComponent(field.key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: values[field.key], category }),
      });
      savedValues[field.key] = values[field.key];
    }
    message.success(`${SETTINGS_SCHEMA[category].label} settings saved`);
  } catch (err) {
    message.error('Failed to save settings');
  }
  saving.value = false;
}

async function saveAlertField(type, field, value) {
  const saveKey = `${type}.${field}`;
  alertSaving[saveKey] = true;
  try {
    await fetch(`/api/alerts/configs/${encodeURIComponent(type)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
  } catch (err) {
    message.error(`Failed to save ${type} ${field}`);
  }
  alertSaving[saveKey] = false;
}

// Format alert type name
function formatType(type) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

onMounted(() => {
  loadSettings();
  loadTwitchStatus();
  loadAlertConfigs();
});
</script>

<template>
  <NSpin :show="loading">
    <NTabs type="line" animated>
      <!-- GENERAL TAB -->
      <NTabPane name="general" tab="General">
        <NCard size="small">
          <NForm label-placement="left" label-width="200" :show-feedback="false">
            <template v-for="field in SETTINGS_SCHEMA.general.fields" :key="field.key">
              <NFormItem :label="field.label">
                <div style="display: flex; flex-direction: column; gap: 4px; width: 100%;">
                  <NInput v-if="field.type === 'string'" v-model:value="values[field.key]" />
                  <NSwitch v-else-if="field.type === 'boolean'" v-model:value="values[field.key]" />
                  <NInputNumber v-else-if="field.type === 'number'" v-model:value="values[field.key]" :min="field.min" :max="field.max" style="width: 200px;" />
                  <span style="color: #888; font-size: 12px;">{{ field.description }}</span>
                </div>
              </NFormItem>
            </template>
          </NForm>
          <NDivider />
          <NSpace justify="end">
            <NButton type="primary" :disabled="!isDirty('general')" :loading="saving" @click="saveCategory('general')">
              <template #icon><IconDeviceFloppy :size="16" /></template>
              Save General Settings
            </NButton>
          </NSpace>
        </NCard>
      </NTabPane>

      <!-- TWITCH TAB -->
      <NTabPane name="twitch" tab="Twitch">
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- Connection Info Card -->
          <NCard title="Connection Status" size="small">
            <div v-if="twitchStatus" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div>
                <span style="color: #888; font-size: 12px;">Channel</span>
                <div>{{ twitchStatus.channel || 'Not configured' }}</div>
              </div>
              <div>
                <span style="color: #888; font-size: 12px;">Bot Username</span>
                <div>{{ twitchStatus.botUsername || 'Not configured' }}</div>
              </div>
              <div>
                <span style="color: #888; font-size: 12px;">Client ID</span>
                <div>
                  <NTag :type="twitchStatus.clientIdConfigured ? 'success' : 'warning'" size="small">
                    {{ twitchStatus.clientIdConfigured ? 'Configured' : 'Missing' }}
                  </NTag>
                </div>
              </div>
              <div>
                <span style="color: #888; font-size: 12px;">Chat Connection</span>
                <div>
                  <NTag :type="twitchStatus.twitchConnected ? 'success' : 'error'" size="small">
                    {{ twitchStatus.twitchConnected ? 'Connected' : 'Disconnected' }}
                  </NTag>
                </div>
              </div>
            </div>
            <NAlert v-else type="warning" :bordered="false">
              Unable to fetch backend status. Is the backend running?
            </NAlert>
          </NCard>

          <!-- Twitch Settings -->
          <NCard title="Twitch Settings" size="small">
            <NForm label-placement="left" label-width="200" :show-feedback="false">
              <template v-for="field in SETTINGS_SCHEMA.twitch.fields" :key="field.key">
                <NFormItem :label="field.label">
                  <div style="display: flex; flex-direction: column; gap: 4px; width: 100%;">
                    <NSwitch v-if="field.type === 'boolean'" v-model:value="values[field.key]" />
                    <NInputNumber v-else-if="field.type === 'number'" v-model:value="values[field.key]" :min="field.min" :max="field.max" style="width: 200px;" />
                    <span style="color: #888; font-size: 12px;">{{ field.description }}</span>
                  </div>
                </NFormItem>
              </template>
            </NForm>
            <NDivider />
            <NSpace justify="end">
              <NButton type="primary" :disabled="!isDirty('twitch')" :loading="saving" @click="saveCategory('twitch')">
                <template #icon><IconDeviceFloppy :size="16" /></template>
                Save Twitch Settings
              </NButton>
            </NSpace>
          </NCard>
        </div>
      </NTabPane>

      <!-- ALERTS TAB -->
      <NTabPane name="alerts" tab="Alerts">
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <NAlert type="info" :bordered="false" style="margin-bottom: 8px;">
            Alert changes save immediately per field.
          </NAlert>
          <NCard v-for="alert in alertConfigs" :key="alert.type" :title="formatType(alert.type)" size="small">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <NFormItem label="Enabled" :show-feedback="false" label-placement="left">
                <NSwitch :value="!!alert.enabled" @update:value="v => { alert.enabled = v ? 1 : 0; saveAlertField(alert.type, 'enabled', v ? 1 : 0); }" />
              </NFormItem>
              <NFormItem label="Sound" :show-feedback="false" label-placement="left">
                <NSwitch :value="!!alert.sound" @update:value="v => { alert.sound = v ? 1 : 0; saveAlertField(alert.type, 'sound', v ? 1 : 0); }" />
              </NFormItem>
              <NFormItem label="Duration (ms)" :show-feedback="false" label-placement="left">
                <NSlider :value="alert.duration" :min="1000" :max="30000" :step="500" :tooltip="true" :format-tooltip="v => `${v}ms`" @update:value="v => { alert.duration = v; saveAlertField(alert.type, 'duration', v); }" />
              </NFormItem>
              <NFormItem label="Volume" :show-feedback="false" label-placement="left">
                <NSlider :value="alert.volume" :min="0" :max="1" :step="0.05" :tooltip="true" :format-tooltip="v => `${Math.round(v * 100)}%`" @update:value="v => { alert.volume = v; saveAlertField(alert.type, 'volume', v); }" />
              </NFormItem>
            </div>
          </NCard>
          <div v-if="alertConfigs.length === 0" style="color: #888; text-align: center; padding: 24px;">
            No alert configurations found. Backend may not be running.
          </div>
        </div>
      </NTabPane>

      <!-- OVERLAY TAB -->
      <NTabPane name="overlay" tab="Overlay">
        <NCard size="small">
          <NForm label-placement="left" label-width="200" :show-feedback="false">
            <template v-for="field in SETTINGS_SCHEMA.overlay.fields" :key="field.key">
              <NFormItem :label="field.label">
                <div style="display: flex; flex-direction: column; gap: 4px; width: 100%;">
                  <NSelect v-if="field.type === 'select'" v-model:value="values[field.key]" :options="field.options" style="width: 200px;" />
                  <NInputNumber v-else-if="field.type === 'number'" v-model:value="values[field.key]" :min="field.min" :max="field.max" style="width: 200px;" />
                  <span style="color: #888; font-size: 12px;">{{ field.description }}</span>
                </div>
              </NFormItem>
            </template>
          </NForm>
          <NDivider />
          <NSpace justify="end">
            <NButton type="primary" :disabled="!isDirty('overlay')" :loading="saving" @click="saveCategory('overlay')">
              <template #icon><IconDeviceFloppy :size="16" /></template>
              Save Overlay Settings
            </NButton>
          </NSpace>
        </NCard>
      </NTabPane>

      <!-- SERVICES TAB -->
      <NTabPane name="services" tab="Services">
        <NCard size="small">
          <NForm label-placement="left" label-width="200" :show-feedback="false">
            <template v-for="field in SETTINGS_SCHEMA.services.fields" :key="field.key">
              <NFormItem :label="field.label">
                <div style="display: flex; flex-direction: column; gap: 4px; width: 100%;">
                  <NInputNumber v-model:value="values[field.key]" :min="field.min" :max="field.max" style="width: 200px;" />
                  <span style="color: #888; font-size: 12px;">{{ field.description }}</span>
                </div>
              </NFormItem>
            </template>
          </NForm>
          <NDivider />
          <NSpace justify="end">
            <NButton type="primary" :disabled="!isDirty('services')" :loading="saving" @click="saveCategory('services')">
              <template #icon><IconDeviceFloppy :size="16" /></template>
              Save Service Settings
            </NButton>
          </NSpace>
        </NCard>
      </NTabPane>

      <!-- ADVANCED TAB -->
      <NTabPane name="advanced" tab="Advanced">
        <ConfigManager />
      </NTabPane>
    </NTabs>
  </NSpin>
</template>
