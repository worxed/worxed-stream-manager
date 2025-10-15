import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store connected clients
const clients = new Set();
const overlayClients = new Set();

// Mock data for development
let streamData = {
  status: 'OFFLINE',
  viewers: 0,
  followers: 1234,
  uptime: '00:00:00',
  title: 'Worxed Stream Manager - Testing',
  game: 'Software Development'
};

let recentActivity = [
  { time: '12:34:56', type: 'follower', user: 'TestUser123', message: 'New follower' },
  { time: '12:33:45', type: 'chat', user: 'Viewer456', message: 'Chat message' },
  { time: '12:32:10', type: 'stream', user: 'System', message: 'Stream started' }
];

let alertSettings = {
  follow: { enabled: true, sound: true, duration: 5000 },
  subscribe: { enabled: true, sound: true, duration: 7000 },
  donation: { enabled: true, sound: true, duration: 10000 },
  raid: { enabled: false, sound: false, duration: 8000 }
};

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  console.log('🔌 New WebSocket connection');
  
  // Determine client type from URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  const clientType = url.searchParams.get('type') || 'dashboard';
  
  if (clientType === 'overlay') {
    overlayClients.add(ws);
    console.log(`📺 Overlay client connected (${overlayClients.size} total)`);
  } else {
    clients.add(ws);
    console.log(`🖥️ Dashboard client connected (${clients.size} total)`);
  }
  
  // Send initial data
  ws.send(JSON.stringify({
    type: 'init',
    data: {
      streamData,
      recentActivity,
      alertSettings,
      connected: true
    }
  }));
  
  // Handle messages from client
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleClientMessage(ws, data);
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error);
    }
  });
  
  // Handle client disconnect
  ws.on('close', () => {
    clients.delete(ws);
    overlayClients.delete(ws);
    console.log(`🔌 Client disconnected (${clients.size} dashboard, ${overlayClients.size} overlay)`);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// Handle client messages
function handleClientMessage(ws, data) {
  console.log('📨 Received message:', data.type);
  
  switch (data.type) {
    case 'test_chat':
      handleTestChat(data.payload);
      break;
    case 'test_alert':
      handleTestAlert(data.payload);
      break;
    case 'update_overlay':
      handleOverlayUpdate(data.payload);
      break;
    case 'toggle_alert':
      handleAlertToggle(data.payload);
      break;
    case 'stream_action':
      handleStreamAction(data.payload);
      break;
    default:
      console.log('❓ Unknown message type:', data.type);
  }
}

// Test chat message
function handleTestChat(payload) {
  const testMessage = {
    username: payload?.username || 'TestUser123',
    message: payload?.message || 'This is a test chat message! 🎮',
    color: payload?.color || '#8cffbe',
    timestamp: new Date().toISOString()
  };
  
  // Add to recent activity
  recentActivity.unshift({
    time: new Date().toLocaleTimeString(),
    type: 'chat',
    user: testMessage.username,
    message: testMessage.message
  });
  
  // Keep only last 10 activities
  recentActivity = recentActivity.slice(0, 10);
  
  // Broadcast to all clients
  broadcast({
    type: 'chat_message',
    data: testMessage
  });
  
  // Broadcast to overlay clients
  broadcastToOverlays({
    type: 'chat_message',
    data: testMessage
  });
  
  console.log('💬 Test chat sent:', testMessage.username);
}

// Test alert
function handleTestAlert(payload) {
  const alertType = payload?.type || 'follow';
  const testAlert = {
    type: alertType,
    username: payload?.username || 'TestUser123',
    message: payload?.message || getDefaultAlertMessage(alertType),
    amount: payload?.amount || null,
    timestamp: new Date().toISOString(),
    duration: alertSettings[alertType]?.duration || 5000
  };
  
  // Add to recent activity
  recentActivity.unshift({
    time: new Date().toLocaleTimeString(),
    type: 'alert',
    user: testAlert.username,
    message: `${alertType.toUpperCase()}: ${testAlert.message}`
  });
  
  // Keep only last 10 activities
  recentActivity = recentActivity.slice(0, 10);
  
  // Broadcast to all clients
  broadcast({
    type: 'alert',
    data: testAlert
  });
  
  // Broadcast to overlay clients
  broadcastToOverlays({
    type: 'alert',
    data: testAlert
  });
  
  console.log('🚨 Test alert sent:', alertType, testAlert.username);
}

// Update overlay settings
function handleOverlayUpdate(payload) {
  console.log('🎨 Overlay update:', payload);
  
  // Broadcast overlay update to overlay clients
  broadcastToOverlays({
    type: 'overlay_update',
    data: payload
  });
  
  // Confirm update to dashboard clients
  broadcast({
    type: 'overlay_updated',
    data: payload
  });
}

// Toggle alert setting
function handleAlertToggle(payload) {
  const { alertType, enabled } = payload;
  
  if (alertSettings[alertType]) {
    alertSettings[alertType].enabled = enabled;
    
    console.log(`🔔 Alert ${alertType} ${enabled ? 'enabled' : 'disabled'}`);
    
    // Broadcast updated settings
    broadcast({
      type: 'alert_settings_updated',
      data: alertSettings
    });
  }
}

// Handle stream actions
function handleStreamAction(payload) {
  const { action } = payload;
  
  switch (action) {
    case 'start_stream':
      streamData.status = 'LIVE';
      streamData.viewers = Math.floor(Math.random() * 100) + 1;
      console.log('🔴 Stream started');
      break;
    case 'stop_stream':
      streamData.status = 'OFFLINE';
      streamData.viewers = 0;
      streamData.uptime = '00:00:00';
      console.log('⏹️ Stream stopped');
      break;
    case 'update_title':
      streamData.title = payload.title || streamData.title;
      console.log('📝 Stream title updated');
      break;
  }
  
  // Broadcast updated stream data
  broadcast({
    type: 'stream_data_updated',
    data: streamData
  });
}

// Helper functions
function getDefaultAlertMessage(type) {
  const messages = {
    follow: 'Thanks for the follow!',
    subscribe: 'Thanks for subscribing!',
    donation: 'Thanks for the donation!',
    raid: 'Thanks for the raid!'
  };
  return messages[type] || 'Thanks for your support!';
}

function broadcast(message) {
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

function broadcastToOverlays(message) {
  overlayClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// REST API Endpoints
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    clients: clients.size,
    overlayClients: overlayClients.size,
    streamData,
    alertSettings
  });
});

app.get('/api/stream', (req, res) => {
  res.json(streamData);
});

app.post('/api/stream', (req, res) => {
  const updates = req.body;
  streamData = { ...streamData, ...updates };
  
  broadcast({
    type: 'stream_data_updated',
    data: streamData
  });
  
  res.json(streamData);
});

app.get('/api/activity', (req, res) => {
  res.json(recentActivity);
});

app.get('/api/alerts', (req, res) => {
  res.json(alertSettings);
});

app.post('/api/alerts', (req, res) => {
  const updates = req.body;
  alertSettings = { ...alertSettings, ...updates };
  
  broadcast({
    type: 'alert_settings_updated',
    data: alertSettings
  });
  
  res.json(alertSettings);
});

// Test endpoints
app.post('/api/test/chat', (req, res) => {
  handleTestChat(req.body);
  res.json({ success: true, message: 'Test chat sent' });
});

app.post('/api/test/alert', (req, res) => {
  handleTestAlert(req.body);
  res.json({ success: true, message: 'Test alert sent' });
});

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/overlay', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'overlay.html'));
});

app.get('/customizer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'customizer.html'));
});

// Simulate stream data updates
setInterval(() => {
  if (streamData.status === 'LIVE') {
    // Update viewer count randomly
    const change = Math.floor(Math.random() * 10) - 5;
    streamData.viewers = Math.max(0, streamData.viewers + change);
    
    // Update uptime (simplified)
    const uptimeSeconds = parseInt(streamData.uptime.split(':')[2]) + 1;
    const uptimeMinutes = parseInt(streamData.uptime.split(':')[1]) + Math.floor(uptimeSeconds / 60);
    const uptimeHours = parseInt(streamData.uptime.split(':')[0]) + Math.floor(uptimeMinutes / 60);
    
    streamData.uptime = `${String(uptimeHours % 24).padStart(2, '0')}:${String(uptimeMinutes % 60).padStart(2, '0')}:${String(uptimeSeconds % 60).padStart(2, '0')}`;
    
    // Broadcast updated data
    broadcast({
      type: 'stream_data_updated',
      data: streamData
    });
  }
}, 30000); // Update every 30 seconds

// Simulate random chat messages when live
setInterval(() => {
  if (streamData.status === 'LIVE' && Math.random() < 0.3) {
    const randomUsers = ['StreamFan123', 'GamerGirl456', 'CodeMaster789', 'PixelPusher', 'RetroGamer'];
    const randomMessages = [
      'Great stream! 🎮',
      'Love the setup!',
      'How long have you been coding?',
      'This game looks awesome',
      'Keep up the great work!',
      'First time here, loving it!',
      'Can you show the overlay again?'
    ];
    
    handleTestChat({
      username: randomUsers[Math.floor(Math.random() * randomUsers.length)],
      message: randomMessages[Math.floor(Math.random() * randomMessages.length)]
    });
  }
}, 45000); // Random chat every 45 seconds

// Error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('🚀 Worxed Stream Manager Server');
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server ready`);
  console.log(`📺 Overlay URL: http://localhost:${PORT}/overlay`);
  console.log(`🎨 Customizer URL: http://localhost:${PORT}/customizer`);
  console.log('');
  console.log('🎯 Ready for connections!');
});

export { app, server, wss }; 