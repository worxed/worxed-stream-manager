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
    if (recentEvents.chatMessages.length > 100) {
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
    if (recentEvents.subscribers.length > 50) {
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
    if (recentEvents.raids.length > 20) {
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
  db.settings.set(req.params.key, value, category || 'general');
  res.json({ success: true, key: req.params.key, value });
});

app.delete('/api/settings/:key', (req, res) => {
  db.settings.delete(req.params.key);
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
  }, 3600000);
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
