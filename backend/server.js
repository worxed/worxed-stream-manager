const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const tmi = require('tmi.js');
const path = require('path');
const cors = require('cors');
const fetch = require('node-fetch');
const crypto = require('crypto');
require('dotenv').config();
const db = require('../shared');

function getSetting(key, defaultValue) {
  try { return db.settings.get(key, defaultValue); } catch { return defaultValue; }
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:4000', 'http://localhost:4001', 'http://localhost:4002'],
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// ===========================================
// STATE MANAGEMENT
// ===========================================
let twitchAccessToken = null;
let broadcasterUserId = null;
let tokenExpiresAt = null;
let twitchClient = null;

const recentEvents = {
  followers: [],
  subscribers: [],
  donations: [],
  chatMessages: [],
  raids: []
};

// Alert settings are now DB-backed. This helper returns the legacy format.
function getAlertSettings() {
  try {
    return db.alerts.toLegacyFormat();
  } catch {
    // Fallback if DB not ready
    return {
      follow: { enabled: true, sound: true, duration: 5000 },
      subscribe: { enabled: true, sound: true, duration: 7000 },
      donation: { enabled: true, sound: true, duration: 10000 },
      raid: { enabled: true, sound: true, duration: 8000 }
    };
  }
}

// ===========================================
// ENDPOINT BUILDER HELPERS
// ===========================================

function safeParseJSON(str) {
  if (typeof str !== 'string') return str;
  try { return JSON.parse(str); } catch { return str; }
}

/**
 * Replace {{scope.key}} placeholders in a string.
 * Only allows body, query, params, headers scopes.
 */
function resolveTemplate(template, context) {
  if (typeof template !== 'string') return template;
  return template.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, scope, key) => {
    if (!['body', 'query', 'params', 'headers'].includes(scope)) return match;
    const val = context[scope]?.[key];
    return val !== undefined ? String(val) : match;
  });
}

/**
 * Recursively resolve templates in an object/array.
 */
function resolveTemplateDeep(obj, context) {
  if (typeof obj === 'string') return resolveTemplate(obj, context);
  if (Array.isArray(obj)) return obj.map(item => resolveTemplateDeep(item, context));
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [key, val] of Object.entries(obj)) {
      result[key] = resolveTemplateDeep(val, context);
    }
    return result;
  }
  return obj;
}

/**
 * Execute a handler config against a request context.
 * Returns { status, headers, body } for the HTTP response.
 */
async function executeHandler(handlerConfig, context, ioRef) {
  const handler = typeof handlerConfig === 'string' ? safeParseJSON(handlerConfig) : handlerConfig;
  const type = handler.type;

  switch (type) {
    case 'json': {
      const body = resolveTemplateDeep(
        typeof handler.body === 'string' ? safeParseJSON(handler.body) : handler.body,
        context
      );
      return { status: handler.status || 200, headers: { 'Content-Type': 'application/json' }, body };
    }

    case 'redirect': {
      const url = resolveTemplate(handler.url, context);
      return { status: handler.status || 302, headers: { Location: url }, body: null };
    }

    case 'webhook': {
      const url = resolveTemplate(handler.url, context);
      const method = (handler.method || 'POST').toUpperCase();
      const headers = resolveTemplateDeep(handler.headers || { 'Content-Type': 'application/json' }, context);
      const body = handler.body ? resolveTemplateDeep(
        typeof handler.body === 'string' ? safeParseJSON(handler.body) : handler.body,
        context
      ) : context.body;

      const resp = await fetch(url, {
        method,
        headers,
        body: method !== 'GET' ? JSON.stringify(body) : undefined,
      });

      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: { forwarded: true, targetStatus: resp.status, targetUrl: url }
      };
    }

    case 'event': {
      const eventName = resolveTemplate(handler.event, context);
      const eventData = resolveTemplateDeep(
        typeof handler.data === 'string' ? safeParseJSON(handler.data) : (handler.data || {}),
        context
      );
      if (ioRef) ioRef.emit(eventName, eventData);
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: { emitted: true, event: eventName, data: eventData }
      };
    }

    default:
      return { status: 400, headers: { 'Content-Type': 'application/json' }, body: { error: `Unknown handler type: ${type}` } };
  }
}

/**
 * Simulate handler execution without side effects (no fetch, no Socket.IO emit).
 */
function executeHandlerDryRun(handlerConfig, context) {
  const handler = typeof handlerConfig === 'string' ? safeParseJSON(handlerConfig) : handlerConfig;
  const type = handler.type;

  switch (type) {
    case 'json': {
      const body = resolveTemplateDeep(
        typeof handler.body === 'string' ? safeParseJSON(handler.body) : handler.body,
        context
      );
      return { status: handler.status || 200, body, action: 'Return JSON response' };
    }

    case 'redirect': {
      const url = resolveTemplate(handler.url, context);
      return { status: handler.status || 302, redirectTo: url, action: 'HTTP redirect' };
    }

    case 'webhook': {
      const url = resolveTemplate(handler.url, context);
      const method = (handler.method || 'POST').toUpperCase();
      const headers = resolveTemplateDeep(handler.headers || { 'Content-Type': 'application/json' }, context);
      const body = handler.body ? resolveTemplateDeep(
        typeof handler.body === 'string' ? safeParseJSON(handler.body) : handler.body,
        context
      ) : context.body;
      return { action: `${method} ${url}`, headers, body, note: 'Would forward request to external URL' };
    }

    case 'event': {
      const eventName = resolveTemplate(handler.event, context);
      const eventData = resolveTemplateDeep(
        typeof handler.data === 'string' ? safeParseJSON(handler.data) : (handler.data || {}),
        context
      );
      return { action: `Emit Socket.IO event: ${eventName}`, event: eventName, data: eventData, note: 'Would emit to all connected clients' };
    }

    default:
      return { error: `Unknown handler type: ${type}` };
  }
}

// ===========================================
// TWITCH API CONFIGURATION
// ===========================================
const TWITCH_API_BASE = 'https://api.twitch.tv/helix';

async function validateTwitchToken() {
  if (!process.env.TWITCH_OAUTH_TOKEN) return false;

  try {
    const response = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: { 'Authorization': `Bearer ${process.env.TWITCH_OAUTH_TOKEN}` }
    });

    if (response.ok) {
      const data = await response.json();
      tokenExpiresAt = Date.now() + (data.expires_in * 1000);
      console.log(`✅ Token valid, expires in ${data.expires_in} seconds`);
      return true;
    }

    console.log('❌ Token validation failed, attempting refresh...');
    return await refreshTwitchToken();
  } catch (error) {
    console.error('❌ Token validation error:', error.message);
    return false;
  }
}

async function refreshTwitchToken() {
  if (!process.env.TWITCH_REFRESH_TOKEN) {
    console.log('⚠️  No refresh token available');
    return false;
  }

  try {
    console.log('🔄 Refreshing Twitch access token...');

    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: process.env.TWITCH_REFRESH_TOKEN
      })
    });

    const data = await response.json();

    if (data.access_token) {
      process.env.TWITCH_OAUTH_TOKEN = data.access_token;
      if (data.refresh_token) {
        process.env.TWITCH_REFRESH_TOKEN = data.refresh_token;
      }
      tokenExpiresAt = Date.now() + (data.expires_in * 1000);
      console.log('✅ Access token refreshed successfully');
      return true;
    }

    console.error('❌ Failed to refresh token:', data);
    return false;
  } catch (error) {
    console.error('❌ Token refresh error:', error.message);
    return false;
  }
}

async function getTwitchAccessToken() {
  try {
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET || '',
        grant_type: 'client_credentials'
      })
    });

    const data = await response.json();
    if (data.access_token) {
      twitchAccessToken = data.access_token;
      console.log('✅ Twitch API access token obtained');
      return true;
    }
  } catch (error) {
    console.error('❌ Failed to get Twitch API token:', error.message);
  }
  return false;
}

async function getBroadcasterUserId() {
  if (!twitchAccessToken) return false;

  try {
    const response = await fetch(`${TWITCH_API_BASE}/users?login=${process.env.TWITCH_CHANNEL}`, {
      headers: {
        'Authorization': `Bearer ${twitchAccessToken}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID
      }
    });

    const data = await response.json();
    if (data.data?.[0]) {
      broadcasterUserId = data.data[0].id;
      console.log(`✅ Broadcaster ID: ${broadcasterUserId}`);
      return true;
    }
  } catch (error) {
    console.error('❌ Failed to get broadcaster ID:', error.message);
  }
  return false;
}

// ===========================================
// TWITCH DATA FETCHERS
// ===========================================
async function getStreamInfo() {
  if (!twitchAccessToken || !broadcasterUserId) return null;

  try {
    const response = await fetch(`${TWITCH_API_BASE}/streams?user_id=${broadcasterUserId}`, {
      headers: {
        'Authorization': `Bearer ${twitchAccessToken}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID
      }
    });
    const data = await response.json();
    return data.data?.[0] || null;
  } catch (error) {
    console.error('❌ Failed to get stream info:', error.message);
    return null;
  }
}

async function getFollowerCount() {
  if (!twitchAccessToken || !broadcasterUserId) return 0;

  try {
    const response = await fetch(`${TWITCH_API_BASE}/channels/followers?broadcaster_id=${broadcasterUserId}`, {
      headers: {
        'Authorization': `Bearer ${twitchAccessToken}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID
      }
    });
    const data = await response.json();
    return data.total || 0;
  } catch (error) {
    console.error('❌ Failed to get follower count:', error.message);
    return 0;
  }
}

async function getRecentFollowers(count = 5) {
  if (!twitchAccessToken || !broadcasterUserId) return [];

  try {
    const response = await fetch(`${TWITCH_API_BASE}/channels/followers?broadcaster_id=${broadcasterUserId}&first=${count}`, {
      headers: {
        'Authorization': `Bearer ${twitchAccessToken}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID
      }
    });
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('❌ Failed to get recent followers:', error.message);
    return [];
  }
}

// ===========================================
// TWITCH CHAT CLIENT
// ===========================================
function initializeTwitchChat() {
  if (!process.env.TWITCH_BOT_USERNAME || !process.env.TWITCH_OAUTH_TOKEN || !process.env.TWITCH_CHANNEL) {
    console.log('⚠️  Twitch chat credentials not configured');
    return;
  }

  twitchClient = new tmi.Client({
    options: { debug: false },
    connection: { reconnect: true, secure: true },
    identity: {
      username: process.env.TWITCH_BOT_USERNAME,
      password: `oauth:${process.env.TWITCH_OAUTH_TOKEN.replace('oauth:', '')}`
    },
    channels: [process.env.TWITCH_CHANNEL]
  });

  twitchClient.on('message', (channel, tags, message, self) => {
    if (self) return;

    const chatData = {
      id: tags.id || Date.now().toString(),
      username: tags['display-name'] || tags.username,
      message,
      color: tags.color || '#8cffbe',
      badges: tags.badges || {},
      timestamp: new Date().toISOString(),
      userType: tags['user-type'] || 'viewer'
    };

    recentEvents.chatMessages.push(chatData);
    if (recentEvents.chatMessages.length > getSetting('twitch.chat_buffer_size', 100)) {
      recentEvents.chatMessages.shift();
    }

    io.emit('chat-message', chatData);
  });

  twitchClient.on('subscription', (channel, username, method, message, userstate) => {
    const subData = {
      id: Date.now().toString(),
      username,
      method,
      message,
      months: userstate['msg-param-cumulative-months'] || 1,
      timestamp: new Date().toISOString()
    };

    recentEvents.subscribers.push(subData);
    if (recentEvents.subscribers.length > getSetting('services.subscriber_buffer_size', 50)) {
      recentEvents.subscribers.shift();
    }

    // Persist to DB
    db.events.insert('subscribe', username, { method, message, months: subData.months });

    io.emit('new-subscriber', subData);
  });

  twitchClient.on('raided', (channel, username, viewers) => {
    const raidData = {
      id: Date.now().toString(),
      username,
      viewers,
      timestamp: new Date().toISOString()
    };

    recentEvents.raids.push(raidData);
    if (recentEvents.raids.length > getSetting('services.raid_buffer_size', 20)) {
      recentEvents.raids.shift();
    }

    // Persist to DB
    db.events.insert('raid', username, { viewers });

    io.emit('raid', raidData);
  });

  twitchClient.connect().catch(console.error);
  console.log('✅ Twitch chat client initialized');
}

// ===========================================
// SOCKET.IO HANDLERS
// ===========================================
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // Send initial state
  socket.emit('recent-events', recentEvents);
  socket.emit('alert-settings', getAlertSettings());

  // Handle test alerts
  socket.on('test-alert', (data) => {
    console.log('🧪 Test alert:', data.type);
    io.emit('alert', {
      id: Date.now().toString(),
      type: data.type,
      username: data.username || `TestUser${Math.floor(Math.random() * 1000)}`,
      message: data.message || 'Test alert!',
      amount: data.amount,
      timestamp: new Date().toISOString()
    });
  });

  // Handle overlay customization
  socket.on('overlay-update', (data) => {
    console.log('🎨 Overlay update:', data.type);
    io.emit('overlay-update', data);
  });

  // Handle alert settings
  socket.on('update-alert-settings', (data) => {
    // Persist each alert type to DB
    for (const [type, config] of Object.entries(data)) {
      db.alerts.update(type, config);
    }
    io.emit('alert-settings', getAlertSettings());
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// ===========================================
// API ROUTES
// ===========================================
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    twitchConnected: twitchClient?.readyState() === 'OPEN',
    channel: process.env.TWITCH_CHANNEL,
    botUsername: process.env.TWITCH_BOT_USERNAME || null,
    clientIdConfigured: !!process.env.TWITCH_CLIENT_ID,
    connectedClients: io.engine.clientsCount
  });
});

// Navigation/Discovery endpoint - tells clients where everything is
app.get('/api/navigation', (req, res) => {
  res.json({
    admin: {
      url: 'http://localhost:4001',
      description: 'Admin Console - Backend management'
    },
    frontend: {
      url: 'http://localhost:5173',
      description: 'Stream Manager - Overlays & alerts'
    },
    supervisor: {
      url: 'http://localhost:4000',
      description: 'Supervisor API - Process control'
    },
    api: {
      base: 'http://localhost:4001/api',
      endpoints: [
        { method: 'GET', path: '/status', description: 'Server status' },
        { method: 'GET', path: '/stream', description: 'Stream info' },
        { method: 'GET', path: '/analytics', description: 'Stream analytics' },
        { method: 'GET', path: '/alerts', description: 'Alert settings' },
        { method: 'POST', path: '/alerts', description: 'Update alert settings' },
        { method: 'GET', path: '/alerts/configs', description: 'Detailed alert configs' },
        { method: 'PUT', path: '/alerts/configs/:type', description: 'Update alert config' },
        { method: 'POST', path: '/test-alert', description: 'Trigger test alert' },
        { method: 'GET', path: '/settings', description: 'All settings' },
        { method: 'GET', path: '/settings/:key', description: 'Get setting' },
        { method: 'PUT', path: '/settings/:key', description: 'Set setting' },
        { method: 'GET', path: '/events', description: 'Event history' },
        { method: 'GET', path: '/events/summary', description: 'Event counts by type' },
        { method: 'GET', path: '/db/status', description: 'Database status' },
        { method: 'GET', path: '/endpoints', description: 'List custom endpoints' },
        { method: 'GET', path: '/endpoints/:id', description: 'Get custom endpoint' },
        { method: 'POST', path: '/endpoints', description: 'Create custom endpoint' },
        { method: 'PUT', path: '/endpoints/:id', description: 'Update custom endpoint' },
        { method: 'DELETE', path: '/endpoints/:id', description: 'Delete custom endpoint' },
        { method: 'POST', path: '/endpoints/:id/test', description: 'Test custom endpoint (dry run)' },
        { method: 'ALL', path: '/custom/*', description: 'Dynamic custom endpoint handler' },
        { method: 'GET', path: '/navigation', description: 'This endpoint' }
      ]
    }
  });
});

// Health check for supervisor
app.get('/api/health', (req, res) => {
  res.json({ healthy: true, timestamp: new Date().toISOString() });
});

app.get('/api/stream', async (req, res) => {
  const streamInfo = await getStreamInfo();
  const followerCount = await getFollowerCount();

  res.json({
    isLive: !!streamInfo,
    stream: streamInfo,
    followers: followerCount
  });
});

app.get('/api/analytics', async (req, res) => {
  const streamInfo = await getStreamInfo();
  const followerCount = await getFollowerCount();
  const recentFollowers = await getRecentFollowers(5);

  res.json({
    stream: {
      isLive: !!streamInfo,
      game: streamInfo?.game_name || 'Not streaming',
      title: streamInfo?.title || '',
      viewers: streamInfo?.viewer_count || 0,
      startedAt: streamInfo?.started_at || null
    },
    followers: { total: followerCount, recent: recentFollowers },
    session: {
      chatMessages: recentEvents.chatMessages.length,
      followers: recentEvents.followers.length,
      subscribers: recentEvents.subscribers.length,
      donations: recentEvents.donations.length
    }
  });
});

app.get('/api/alerts', (req, res) => {
  res.json(getAlertSettings());
});

app.post('/api/alerts', (req, res) => {
  for (const [type, config] of Object.entries(req.body)) {
    db.alerts.update(type, config);
  }
  const settings = getAlertSettings();
  io.emit('alert-settings', settings);
  res.json({ success: true, settings });
});

app.post('/api/test-alert', (req, res) => {
  const { type, username, message, amount } = req.body;

  io.emit('alert', {
    id: Date.now().toString(),
    type: type || 'follow',
    username: username || 'TestUser',
    message: message || 'Test alert!',
    amount,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true });
});

app.post('/api/test-chat', (req, res) => {
  const { username, message, color } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  io.emit('chat-message', {
    id: Date.now().toString(),
    username: username || `TestUser${Math.floor(Math.random() * 1000)}`,
    message,
    color: color || '#8cffbe',
    badges: {},
    timestamp: new Date().toISOString(),
    userType: 'viewer'
  });

  res.json({ success: true });
});

app.post('/api/test-event', (req, res) => {
  const { eventName, data } = req.body;
  if (!eventName) return res.status(400).json({ error: 'eventName is required' });

  io.emit(eventName, data || {});
  res.json({ success: true });
});

// ===========================================
// EVENTSUB WEBHOOK (Optional)
// ===========================================
function verifyTwitchSignature(req, res, next) {
  const signature = req.headers['twitch-eventsub-message-signature'];
  const timestamp = req.headers['twitch-eventsub-message-timestamp'];
  const messageId = req.headers['twitch-eventsub-message-id'];

  if (!signature || !timestamp || !messageId) {
    return res.status(400).send('Missing headers');
  }

  const body = JSON.stringify(req.body);
  const message = messageId + timestamp + body;
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', process.env.TWITCH_WEBHOOK_SECRET || 'secret')
    .update(message)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(403).send('Invalid signature');
  }

  next();
}

app.post('/webhooks/twitch', express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }), verifyTwitchSignature, (req, res) => {
  const messageType = req.headers['twitch-eventsub-message-type'];

  if (messageType === 'webhook_callback_verification') {
    return res.status(200).send(req.body.challenge);
  }

  if (messageType === 'notification') {
    const { event } = req.body;
    const subscriptionType = req.body.subscription.type;

    console.log(`🔔 EventSub: ${subscriptionType}`);

    switch (subscriptionType) {
      case 'channel.follow':
        db.events.insert('follow', event.user_name, { followed_at: event.followed_at });
        io.emit('new-follower', {
          id: Date.now().toString(),
          username: event.user_name,
          timestamp: event.followed_at
        });
        break;
      case 'channel.subscribe':
        db.events.insert('subscribe', event.user_name, { tier: event.tier });
        io.emit('new-subscriber', {
          id: Date.now().toString(),
          username: event.user_name,
          tier: event.tier,
          timestamp: new Date().toISOString()
        });
        break;
      case 'channel.raid':
        db.events.insert('raid', event.from_broadcaster_user_name, { viewers: event.viewers });
        io.emit('raid', {
          id: Date.now().toString(),
          username: event.from_broadcaster_user_name,
          viewers: event.viewers,
          timestamp: new Date().toISOString()
        });
        break;
    }
  }

  res.status(200).send('OK');
});

// ===========================================
// DATABASE API ROUTES
// ===========================================

// Settings CRUD
app.get('/api/settings', (req, res) => {
  const category = req.query.category || null;
  res.json(db.settings.getAll(category));
});

app.get('/api/settings/:key', (req, res) => {
  const value = db.settings.get(req.params.key);
  if (value === null) {
    return res.status(404).json({ error: 'Setting not found' });
  }
  res.json({ key: req.params.key, value });
});

app.put('/api/settings/:key', (req, res) => {
  const { value, category } = req.body;
  const cat = category || 'general';
  db.settings.set(req.params.key, value, cat);
  io.emit('settings-changed', { key: req.params.key, value, category: cat });
  res.json({ success: true, key: req.params.key, value });
});

app.delete('/api/settings/:key', (req, res) => {
  db.settings.delete(req.params.key);
  io.emit('settings-changed', { key: req.params.key, value: null, deleted: true });
  res.json({ success: true });
});

// Event history
app.get('/api/events', (req, res) => {
  const { type, limit, offset, since, until } = req.query;
  const events = db.events.query({
    type,
    limit: parseInt(limit) || 50,
    offset: parseInt(offset) || 0,
    since,
    until
  });
  const total = db.events.count(type || null);
  res.json({ events, total });
});

app.get('/api/events/summary', (req, res) => {
  res.json({
    total: db.events.count(),
    byType: db.events.countByType()
  });
});

// Alert configs (detailed DB view)
app.get('/api/alerts/configs', (req, res) => {
  res.json(db.alerts.getAll());
});

app.put('/api/alerts/configs/:type', (req, res) => {
  const updated = db.alerts.update(req.params.type, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Alert type not found' });
  }
  io.emit('alert-settings', getAlertSettings());
  res.json(updated);
});

// Database status
app.get('/api/db/status', (req, res) => {
  try {
    const stats = db.getStats();
    const migration = db.getMigrationStatus();
    res.json({ ...stats, migration });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===========================================
// ENDPOINT BUILDER CRUD ROUTES
// ===========================================

// List all endpoints
app.get('/api/endpoints', (req, res) => {
  const rows = db.endpoints.getAll().map(row => {
    row.handler = safeParseJSON(row.handler);
    return row;
  });
  res.json(rows);
});

// Get single endpoint
app.get('/api/endpoints/:id', (req, res) => {
  const row = db.endpoints.get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Endpoint not found' });
  row.handler = safeParseJSON(row.handler);
  res.json(row);
});

// Create endpoint
app.post('/api/endpoints', (req, res) => {
  const { name, path: p, method, handler, description } = req.body;

  if (!name || !p || !handler) {
    return res.status(400).json({ error: 'name, path, and handler are required' });
  }

  // Validate path format: alphanumeric, hyphens, slashes
  if (!/^[a-zA-Z0-9\-_/]+$/.test(p)) {
    return res.status(400).json({ error: 'Path must contain only letters, numbers, hyphens, underscores, and slashes' });
  }

  // Check for duplicate path
  const existing = db.endpoints.getByPath(p);
  if (existing) {
    return res.status(409).json({ error: `Path "${p}" already exists` });
  }

  const handlerStr = typeof handler === 'object' ? JSON.stringify(handler) : handler;
  const row = db.endpoints.create({ name, path: p, method: method || 'GET', handler: handlerStr, description: description || '' });
  row.handler = safeParseJSON(row.handler);

  io.emit('endpoint-created', row);
  res.status(201).json(row);
});

// Update endpoint
app.put('/api/endpoints/:id', (req, res) => {
  const existing = db.endpoints.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Endpoint not found' });

  const fields = { ...req.body };

  // Validate path if changed
  if (fields.path && fields.path !== existing.path) {
    if (!/^[a-zA-Z0-9\-_/]+$/.test(fields.path)) {
      return res.status(400).json({ error: 'Path must contain only letters, numbers, hyphens, underscores, and slashes' });
    }
    const dup = db.endpoints.getByPath(fields.path);
    if (dup && dup.id !== existing.id) {
      return res.status(409).json({ error: `Path "${fields.path}" already exists` });
    }
  }

  // Serialize handler if it's an object
  if (fields.handler && typeof fields.handler === 'object') {
    fields.handler = JSON.stringify(fields.handler);
  }

  const row = db.endpoints.update(req.params.id, fields);
  if (row) row.handler = safeParseJSON(row.handler);

  io.emit('endpoint-updated', row);
  res.json(row);
});

// Delete endpoint
app.delete('/api/endpoints/:id', (req, res) => {
  const existing = db.endpoints.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Endpoint not found' });

  db.endpoints.delete(req.params.id);
  io.emit('endpoint-deleted', { id: parseInt(req.params.id) });
  res.json({ success: true });
});

// Test endpoint (dry run)
app.post('/api/endpoints/:id/test', (req, res) => {
  const row = db.endpoints.get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Endpoint not found' });

  const context = {
    body: req.body.body || {},
    query: req.body.query || {},
    params: req.body.params || {},
    headers: req.body.headers || {},
  };

  const result = executeHandlerDryRun(row.handler, context);
  res.json({ endpoint: row.name, path: row.path, method: row.method, dryRun: true, result });
});

// ===========================================
// SCENE API ROUTES
// ===========================================

// List all scenes
app.get('/api/scenes', (req, res) => {
  res.json(db.scenes.getAll());
});

// Get active scene (for overlay)
app.get('/api/scenes/active', (req, res) => {
  const scene = db.scenes.getActive();
  if (!scene) return res.status(404).json({ error: 'No active scene' });
  res.json(scene);
});

// Get single scene
app.get('/api/scenes/:id', (req, res) => {
  const scene = db.scenes.get(req.params.id);
  if (!scene) return res.status(404).json({ error: 'Scene not found' });
  res.json(scene);
});

// Create scene
app.post('/api/scenes', (req, res) => {
  const { name, width, height, elements, is_active } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const scene = db.scenes.create({
    name,
    width: width || 1920,
    height: height || 1080,
    elements: elements || [],
    is_active: is_active || 0
  });

  io.emit('scene-created', scene);
  res.status(201).json(scene);
});

// Update scene
app.put('/api/scenes/:id', (req, res) => {
  const existing = db.scenes.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Scene not found' });

  const scene = db.scenes.update(req.params.id, req.body);
  io.emit('scene-updated', scene);
  res.json(scene);
});

// Activate scene
app.put('/api/scenes/:id/activate', (req, res) => {
  const existing = db.scenes.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Scene not found' });

  const scene = db.scenes.activate(req.params.id);
  io.emit('scene-activated', scene);
  res.json(scene);
});

// Delete scene
app.delete('/api/scenes/:id', (req, res) => {
  try {
    const existing = db.scenes.get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Scene not found' });

    db.scenes.delete(req.params.id);
    io.emit('scene-deleted', { id: parseInt(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ===========================================
// DYNAMIC CUSTOM ENDPOINT CATCH-ALL
// ===========================================
app.all('/custom/*', async (req, res) => {
  const customPath = req.params[0]; // everything after /custom/
  const endpoint = db.endpoints.getByPath(customPath);

  if (!endpoint) {
    return res.status(404).json({ error: 'Custom endpoint not found' });
  }

  if (!endpoint.enabled) {
    return res.status(503).json({ error: 'Endpoint is disabled' });
  }

  // Check method (ANY matches all)
  if (endpoint.method !== 'ANY' && endpoint.method !== req.method) {
    return res.status(405).json({ error: `Method ${req.method} not allowed, expected ${endpoint.method}` });
  }

  const context = {
    body: req.body || {},
    query: req.query || {},
    params: req.params || {},
    headers: req.headers || {},
  };

  try {
    const result = await executeHandler(endpoint.handler, context, io);

    // Log the call as an event
    db.events.insert('endpoint_call', endpoint.name, {
      path: customPath,
      method: req.method,
      status: result.status,
    });

    if (result.headers) {
      for (const [key, val] of Object.entries(result.headers)) {
        res.setHeader(key, val);
      }
    }

    if (result.body === null) {
      res.status(result.status).end();
    } else {
      res.status(result.status).json(result.body);
    }
  } catch (err) {
    db.events.insert('endpoint_call', endpoint.name, {
      path: customPath,
      method: req.method,
      error: err.message,
    });
    res.status(500).json({ error: 'Handler execution failed', message: err.message });
  }
});

// ===========================================
// INITIALIZATION
// ===========================================
async function initialize() {
  console.log('🚀 Initializing Worxed Stream Manager...');

  // Initialize database
  try {
    db.init();
    console.log('✅ Database initialized');
  } catch (err) {
    console.error('❌ Database init failed:', err.message);
  }

  await validateTwitchToken();
  await getTwitchAccessToken();
  await getBroadcasterUserId();
  initializeTwitchChat();

  // Periodic token refresh check
  setInterval(async () => {
    if (tokenExpiresAt && Date.now() > tokenExpiresAt - 300000) {
      await refreshTwitchToken();
    }
  }, getSetting('twitch.token_refresh_interval', 3600000));
}

const PORT = process.env.PORT || 4001;
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     WORXED STREAM MANAGER - Backend Server                 ║
╠════════════════════════════════════════════════════════════╣
║  🚀 Server running on port ${PORT}                            ║
║  📡 API: http://localhost:${PORT}/api/status                  ║
║  🔌 WebSocket: ws://localhost:${PORT}                         ║
╚════════════════════════════════════════════════════════════╝
  `);

  initialize();
});
