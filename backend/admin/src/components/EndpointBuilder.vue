<script setup>
import { ref, onMounted, computed } from 'vue';
import {
  NCard, NDataTable, NButton, NSpace, NTag, NInput, NSelect, NSwitch,
  NModal, NForm, NFormItem, useMessage, NCode,
} from 'naive-ui';
import { IconPlus, IconRefresh, IconTrash, IconPencil, IconPlayerPlay } from '@tabler/icons-vue';
import JsonDesigner from './JsonDesigner.vue';

const message = useMessage();
const endpoints = ref([]);
const loading = ref(false);

// Modal state
const showEditModal = ref(false);
const showTestModal = ref(false);
const isEditing = ref(false);
const editingId = ref(null);
const testResult = ref(null);
const testLoading = ref(false);

const defaultForm = () => ({
  name: '',
  path: '',
  method: 'GET',
  description: '',
  handler: {
    type: 'json',
    body: '{\n  "message": "Hello!"\n}',
    url: '',
    method: 'POST',
    headers: '{\n  "Content-Type": "application/json"\n}',
    event: '',
    data: '{}',
    status: 200,
  },
});

const form = ref(defaultForm());

const methodOptions = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'DELETE', value: 'DELETE' },
  { label: 'ANY', value: 'ANY' },
];

const handlerTypeOptions = [
  { label: 'JSON Response', value: 'json' },
  { label: 'Redirect', value: 'redirect' },
  { label: 'Webhook (Forward)', value: 'webhook' },
  { label: 'Socket.IO Event', value: 'event' },
];

const methodColors = {
  GET: 'success',
  POST: 'info',
  PUT: 'warning',
  DELETE: 'error',
  ANY: 'default',
};

async function fetchEndpoints() {
  loading.value = true;
  try {
    const res = await fetch('/api/endpoints');
    endpoints.value = await res.json();
  } catch {
    endpoints.value = [];
  }
  loading.value = false;
}

function openCreate() {
  isEditing.value = false;
  editingId.value = null;
  form.value = defaultForm();
  showEditModal.value = true;
}

function openEdit(row) {
  isEditing.value = true;
  editingId.value = row.id;

  const handler = typeof row.handler === 'string' ? JSON.parse(row.handler) : row.handler;

  form.value = {
    name: row.name,
    path: row.path,
    method: row.method,
    description: row.description || '',
    handler: {
      type: handler.type || 'json',
      body: handler.body ? (typeof handler.body === 'object' ? JSON.stringify(handler.body, null, 2) : handler.body) : '{}',
      url: handler.url || '',
      method: handler.method || 'POST',
      headers: handler.headers ? (typeof handler.headers === 'object' ? JSON.stringify(handler.headers, null, 2) : handler.headers) : '{\n  "Content-Type": "application/json"\n}',
      event: handler.event || '',
      data: handler.data ? (typeof handler.data === 'object' ? JSON.stringify(handler.data, null, 2) : handler.data) : '{}',
      status: handler.status || 200,
    },
  };
  showEditModal.value = true;
}

function buildHandler() {
  const h = form.value.handler;
  switch (h.type) {
    case 'json': {
      let body;
      try { body = JSON.parse(h.body); } catch { body = h.body; }
      return { type: 'json', body, status: h.status || 200 };
    }
    case 'redirect':
      return { type: 'redirect', url: h.url, status: h.status || 302 };
    case 'webhook': {
      let headers;
      try { headers = JSON.parse(h.headers); } catch { headers = {}; }
      let body;
      try { body = JSON.parse(h.body); } catch { body = h.body; }
      return { type: 'webhook', url: h.url, method: h.method, headers, body };
    }
    case 'event': {
      let data;
      try { data = JSON.parse(h.data); } catch { data = {}; }
      return { type: 'event', event: h.event, data };
    }
    default:
      return { type: h.type };
  }
}

async function saveEndpoint() {
  if (!form.value.name || !form.value.path) {
    message.warning('Name and path are required');
    return;
  }

  const payload = {
    name: form.value.name,
    path: form.value.path,
    method: form.value.method,
    description: form.value.description,
    handler: buildHandler(),
  };

  try {
    if (isEditing.value) {
      const res = await fetch(`/api/endpoints/${editingId.value}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        message.error(err.error || 'Failed to update');
        return;
      }
      message.success(`Endpoint "${form.value.name}" updated`);
    } else {
      const res = await fetch('/api/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        message.error(err.error || 'Failed to create');
        return;
      }
      message.success(`Endpoint "${form.value.name}" created`);
    }
    showEditModal.value = false;
    fetchEndpoints();
  } catch (err) {
    message.error('Request failed: ' + err.message);
  }
}

async function deleteEndpoint(row) {
  try {
    await fetch(`/api/endpoints/${row.id}`, { method: 'DELETE' });
    message.success(`Endpoint "${row.name}" deleted`);
    fetchEndpoints();
  } catch {
    message.error('Failed to delete endpoint');
  }
}

async function toggleEnabled(row) {
  try {
    await fetch(`/api/endpoints/${row.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: row.enabled ? 0 : 1 }),
    });
    fetchEndpoints();
  } catch {
    message.error('Failed to toggle endpoint');
  }
}

// Test state
const testingEndpoint = ref(null);
const testRequest = ref({ body: '{}', query: '{}', headers: '{}' });

function openTest(row) {
  testingEndpoint.value = row;
  testRequest.value = { body: '{}', query: '{}', headers: '{}' };
  testResult.value = null;
  testLoading.value = false;
  showTestModal.value = true;
}

async function runTest() {
  if (!testingEndpoint.value) return;
  testLoading.value = true;
  testResult.value = null;
  try {
    let body, query, headers;
    try { body = JSON.parse(testRequest.value.body); } catch { body = {}; }
    try { query = JSON.parse(testRequest.value.query); } catch { query = {}; }
    try { headers = JSON.parse(testRequest.value.headers); } catch { headers = {}; }

    const res = await fetch(`/api/endpoints/${testingEndpoint.value.id}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, query, params: {}, headers }),
    });
    testResult.value = await res.json();
  } catch (err) {
    testResult.value = { error: err.message };
  }
  testLoading.value = false;
}

const columns = [
  {
    title: 'Name',
    key: 'name',
    width: 150,
    ellipsis: { tooltip: true },
  },
  {
    title: 'Path',
    key: 'path',
    width: 180,
    render(row) {
      return h('code', { style: 'font-size: 12px; color: #8cffbe;' }, `/custom/${row.path}`);
    },
  },
  {
    title: 'Method',
    key: 'method',
    width: 80,
    render(row) {
      return h(NTag, { size: 'small', type: methodColors[row.method] || 'default' }, { default: () => row.method });
    },
  },
  {
    title: 'Type',
    key: 'type',
    width: 100,
    render(row) {
      const handler = typeof row.handler === 'string' ? JSON.parse(row.handler) : row.handler;
      return handler.type || '-';
    },
  },
  {
    title: 'Enabled',
    key: 'enabled',
    width: 80,
    render(row) {
      return h(NSwitch, {
        size: 'small',
        value: !!row.enabled,
        onUpdateValue: () => toggleEnabled(row),
      });
    },
  },
  {
    title: '',
    key: 'actions',
    width: 120,
    render(row) {
      return h(NSpace, { size: 'small' }, {
        default: () => [
          h(NButton, { size: 'tiny', quaternary: true, type: 'info', onClick: () => openTest(row) },
            { icon: () => h(IconPlayerPlay, { size: 14 }) }),
          h(NButton, { size: 'tiny', quaternary: true, type: 'warning', onClick: () => openEdit(row) },
            { icon: () => h(IconPencil, { size: 14 }) }),
          h(NButton, { size: 'tiny', quaternary: true, type: 'error', onClick: () => deleteEndpoint(row) },
            { icon: () => h(IconTrash, { size: 14 }) }),
        ],
      });
    },
  },
];

onMounted(fetchEndpoints);
</script>

<script>
import { h } from 'vue';
export default { methods: { h } };
</script>

<template>
  <NCard title="Endpoint Builder" size="small">
    <template #header-extra>
      <NSpace>
        <NButton size="tiny" secondary @click="openCreate">
          <template #icon><IconPlus :size="14" /></template>
          New
        </NButton>
        <NButton size="tiny" secondary :loading="loading" @click="fetchEndpoints">
          <template #icon><IconRefresh :size="14" /></template>
        </NButton>
      </NSpace>
    </template>

    <NDataTable
      :columns="columns"
      :data="endpoints"
      :loading="loading"
      size="small"
      :bordered="false"
      :single-line="false"
      :max-height="500"
    />
  </NCard>

  <!-- Create / Edit Modal -->
  <NModal v-model:show="showEditModal" preset="card" :title="isEditing ? 'Edit Endpoint' : 'Create Endpoint'" style="width: 550px;">
    <NForm label-placement="left" label-width="100">
      <NFormItem label="Name">
        <NInput v-model:value="form.name" placeholder="My Endpoint" />
      </NFormItem>
      <NFormItem label="Path">
        <NInput v-model:value="form.path" placeholder="hello">
          <template #prefix><span style="color: #666; font-size: 12px;">/custom/</span></template>
        </NInput>
      </NFormItem>
      <NFormItem label="Method">
        <NSelect v-model:value="form.method" :options="methodOptions" style="width: 120px;" />
      </NFormItem>
      <NFormItem label="Handler Type">
        <NSelect v-model:value="form.handler.type" :options="handlerTypeOptions" style="width: 200px;" />
      </NFormItem>

      <!-- JSON handler -->
      <template v-if="form.handler.type === 'json'">
        <NFormItem label="JSON Body">
          <JsonDesigner v-model="form.handler.body" />
        </NFormItem>
        <NFormItem label="Status Code">
          <NInput v-model:value="form.handler.status" placeholder="200" style="width: 100px;" />
        </NFormItem>
      </template>

      <!-- Redirect handler -->
      <template v-if="form.handler.type === 'redirect'">
        <NFormItem label="Redirect URL">
          <NInput v-model:value="form.handler.url" placeholder="https://twitch.tv/worxed" />
        </NFormItem>
        <NFormItem label="Status Code">
          <NInput v-model:value="form.handler.status" placeholder="302" style="width: 100px;" />
        </NFormItem>
      </template>

      <!-- Webhook handler -->
      <template v-if="form.handler.type === 'webhook'">
        <NFormItem label="URL">
          <NInput v-model:value="form.handler.url" placeholder="https://discord.com/api/webhooks/..." />
        </NFormItem>
        <NFormItem label="HTTP Method">
          <NSelect v-model:value="form.handler.method" :options="[{ label: 'POST', value: 'POST' }, { label: 'GET', value: 'GET' }, { label: 'PUT', value: 'PUT' }]" style="width: 120px;" />
        </NFormItem>
        <NFormItem label="Headers">
          <JsonDesigner v-model="form.handler.headers" />
        </NFormItem>
        <NFormItem label="Body">
          <JsonDesigner v-model="form.handler.body" />
        </NFormItem>
      </template>

      <!-- Event handler -->
      <template v-if="form.handler.type === 'event'">
        <NFormItem label="Event Name">
          <NInput v-model:value="form.handler.event" placeholder="custom-alert" />
        </NFormItem>
        <NFormItem label="Event Data">
          <JsonDesigner v-model="form.handler.data" />
        </NFormItem>
      </template>

      <NFormItem label="Description">
        <NInput v-model:value="form.description" placeholder="Optional description" />
      </NFormItem>
    </NForm>
    <template #footer>
      <NSpace justify="end">
        <NButton @click="showEditModal = false">Cancel</NButton>
        <NButton type="primary" @click="saveEndpoint" :disabled="!form.name || !form.path">
          {{ isEditing ? 'Update' : 'Create' }}
        </NButton>
      </NSpace>
    </template>
  </NModal>

  <!-- Test Modal with Request Builder -->
  <NModal
    v-model:show="showTestModal"
    preset="card"
    :title="testingEndpoint ? `Test: ${testingEndpoint.name}` : 'Test Endpoint'"
    style="width: 600px; max-height: 85vh;"
    content-style="overflow-y: auto;"
  >
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <!-- Endpoint info -->
      <div v-if="testingEndpoint" style="display: flex; align-items: center; gap: 8px; padding: 8px; background: #1a1a1e; border-radius: 4px;">
        <NTag :type="methodColors[testingEndpoint.method] || 'default'" size="small">{{ testingEndpoint.method }}</NTag>
        <code style="font-size: 12px; color: #8cffbe;">/custom/{{ testingEndpoint.path }}</code>
      </div>

      <!-- Request Body -->
      <div>
        <div style="color: #888; font-size: 12px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Request Body</div>
        <JsonDesigner v-model="testRequest.body" />
      </div>

      <!-- Query Parameters -->
      <div>
        <div style="color: #888; font-size: 12px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Query Parameters</div>
        <JsonDesigner v-model="testRequest.query" />
      </div>

      <!-- Headers -->
      <div>
        <div style="color: #888; font-size: 12px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Headers</div>
        <JsonDesigner v-model="testRequest.headers" />
      </div>

      <!-- Run button -->
      <NButton type="primary" @click="runTest" :loading="testLoading" block>
        Run Test
      </NButton>

      <!-- Result -->
      <div v-if="testResult">
        <div style="color: #888; font-size: 12px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Result</div>
        <pre style="background: #1a1a1e; padding: 12px; border-radius: 4px; overflow: auto; max-height: 250px; font-size: 12px; color: #e0e0e0; margin: 0; border: 1px solid #333;">{{ JSON.stringify(testResult, null, 2) }}</pre>
      </div>
    </div>

    <template #footer>
      <NSpace justify="end">
        <NButton @click="showTestModal = false">Close</NButton>
      </NSpace>
    </template>
  </NModal>
</template>
