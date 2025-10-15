const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const tmi = require('tmi.js');
const path = require('path');
const cors = require('cors');
const fetch = require('node-fetch');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// EventSub webhook verification
function verifyTwitchSignature(req, res, next) {
  const signature = req.headers['twitch-eventsub-message-signature'];
  const timestamp = req.headers['twitch-eventsub-message-timestamp'];
  const body = JSON.stringify(req.body);
  
  if (!signature || !timestamp) {
    return res.status(400).send('Missing signature or timestamp');
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', process.env.TWITCH_WEBHOOK_SECRET || 'your_webhook_secret')
    .update(timestamp + body)
    .digest('hex');
    
  if (`sha256=${expectedSignature}` !== signature) {
    return res.status(403).send('Invalid signature');
  }
  
  next();
}

// Check if required environment variables are loaded
if (!process.env.TWITCH_BOT_USERNAME || !process.env.TWITCH_OAUTH_TOKEN || !process.env.TWITCH_CHANNEL) {
  console.error('❌ Missing required environment variables!');
  console.error('Please check your .env file contains:');
  console.error('- TWITCH_BOT_USERNAME');
  console.error('- TWITCH_OAUTH_TOKEN');
  console.error('- TWITCH_CHANNEL');
  console.error('\nCurrent values:');
  console.error('TWITCH_BOT_USERNAME:', process.env.TWITCH_BOT_USERNAME);
  console.error('TWITCH_OAUTH_TOKEN:', process.env.TWITCH_OAUTH_TOKEN ? 'SET' : 'UNDEFINED');
  console.error('TWITCH_CHANNEL:', process.env.TWITCH_CHANNEL);
  process.exit(1);
}

// Twitch chat client configuration
const twitchClient = new tmi.Client({
  options: { debug: true },
  connection: {
    reconnect: true,
    secure: true
  },
  identity: {
    username: process.env.TWITCH_BOT_USERNAME,
    password: `oauth:${process.env.TWITCH_OAUTH_TOKEN.replace('oauth:', '')}`
  },
  channels: [process.env.TWITCH_CHANNEL]
});

// Connect to Twitch chat
twitchClient.connect().catch(console.error);

// Twitch API Configuration
const TWITCH_API_BASE = 'https://api.twitch.tv/helix';
let twitchAccessToken = null;
let broadcasterUserId = null;
let tokenExpiresAt = null;

// Token refresh functionality for production
async function refreshTwitchToken() {
  if (!process.env.TWITCH_REFRESH_TOKEN) {
    console.log('⚠️  No refresh token available, using existing token');
    return false;
  }

  try {
    console.log('🔄 Refreshing Twitch access token...');
    
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: process.env.TWITCH_REFRESH_TOKEN
      })
    });
    
    const data = await response.json();
    
    if (data.access_token) {
      // Update environment variables
      process.env.TWITCH_OAUTH_TOKEN = data.access_token;
      if (data.refresh_token) {
        process.env.TWITCH_REFRESH_TOKEN = data.refresh_token;
      }
      
      // Update token expiration time
      tokenExpiresAt = Date.now() + (data.expires_in * 1000);
      
      console.log('✅ Access token refreshed successfully');
      console.log(`⏰ New token expires in ${data.expires_in} seconds`);
      
      // Update .env file with new tokens
      const fs = require('fs');
      let envContent = '';
      try {
        envContent = fs.readFileSync('.env', 'utf8');
      } catch (error) {
        console.log('⚠️  Could not read .env file for token update');
        return true; // Token is still valid in memory
      }
      
      // Update tokens in .env content
      const envLines = envContent.split('\n');
      const updatedLines = envLines.map(line => {
        if (line.startsWith('TWITCH_OAUTH_TOKEN=')) {
          return `TWITCH_OAUTH_TOKEN=${data.access_token}`;
        }
        if (line.startsWith('TWITCH_REFRESH_TOKEN=') && data.refresh_token) {
          return `TWITCH_REFRESH_TOKEN=${data.refresh_token}`;
        }
        return line;
      });
      
      fs.writeFileSync('.env', updatedLines.join('\n'));
      console.log('💾 Updated .env file with new tokens');
      
      return true;
    } else {
      console.error('❌ Failed to refresh token:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Token refresh error:', error.message);
    return false;
  }
}

// Check if token needs refresh (refresh 5 minutes before expiry)
function shouldRefreshToken() {
  if (!tokenExpiresAt) return false;
  return Date.now() > (tokenExpiresAt - 300000); // 5 minutes before expiry
}

// Validate current token
async function validateTwitchToken() {
  if (!process.env.TWITCH_OAUTH_TOKEN) return false;
  
  try {
    const response = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: {
        'Authorization': `Bearer ${process.env.TWITCH_OAUTH_TOKEN}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      tokenExpiresAt = Date.now() + (data.expires_in * 1000);
      console.log(`✅ Token valid, expires in ${data.expires_in} seconds`);
      return true;
    } else {
      console.log('❌ Token validation failed, attempting refresh...');
      return await refreshTwitchToken();
    }
  } catch (error) {
    console.error('❌ Token validation error:', error.message);
    return false;
  }
}

// Get Twitch API access token
async function getTwitchAccessToken() {
  try {
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET || 'your_client_secret_here',
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

// Get broadcaster user ID
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
    if (data.data && data.data[0]) {
      broadcasterUserId = data.data[0].id;
      console.log(`✅ Broadcaster ID obtained: ${broadcasterUserId}`);
      return true;
    }
  } catch (error) {
    console.error('❌ Failed to get broadcaster ID:', error.message);
  }
  return false;
}

// Get stream information
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
    return data.data[0] || null;
  } catch (error) {
    console.error('❌ Failed to get stream info:', error.message);
    return null;
  }
}

// Get follower count
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

// Get recent followers
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

// Get subscriber count (requires broadcaster token)
async function getSubscriberCount() {
  if (!twitchAccessToken || !broadcasterUserId) return 0;
  
  try {
    const response = await fetch(`${TWITCH_API_BASE}/subscriptions?broadcaster_id=${broadcasterUserId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.TWITCH_OAUTH_TOKEN}`, // Use broadcaster token
        'Client-Id': process.env.TWITCH_CLIENT_ID
      }
    });
    
    const data = await response.json();
    return data.total || 0;
  } catch (error) {
    console.error('❌ Failed to get subscriber count (requires broadcaster token):', error.message);
    return 0;
  }
}

// Initialize Twitch API
async function initializeTwitchAPI() {
  console.log('🔄 Initializing Twitch API...');
  
  // First validate/refresh the user token
  const tokenValid = await validateTwitchToken();
  if (!tokenValid) {
    console.error('❌ Could not obtain valid user token');
    return;
  }
  
  // Then get app access token for API calls
  const appTokenSuccess = await getTwitchAccessToken();
  if (appTokenSuccess) {
    await getBroadcasterUserId();
  }
  
  // Set up periodic token refresh check (every hour)
  setInterval(async () => {
    if (shouldRefreshToken()) {
      console.log('🔄 Token expiring soon, refreshing...');
      await refreshTwitchToken();
    }
  }, 3600000); // Check every hour
}

// Call initialization
initializeTwitchAPI();

// Store recent events for new connections
let recentEvents = {
  followers: [],
  subscribers: [],
  donations: [],
  chatMessages: []
};

// Twitch chat event handlers
twitchClient.on('message', (channel, tags, message, self) => {
  if (self) return;

  const chatData = {
    username: tags['display-name'] || tags.username,
    message: message,
    color: tags.color || '#FFFFFF',
    badges: tags.badges || {},
    timestamp: new Date().toISOString(),
    userType: tags['user-type'] || 'viewer'
  };

  // Store recent chat messages (keep last 50)
  recentEvents.chatMessages.push(chatData);
  if (recentEvents.chatMessages.length > 50) {
    recentEvents.chatMessages.shift();
  }

  // Emit to all connected overlays
  io.emit('chat-message', chatData);
});

twitchClient.on('subscription', (channel, username, method, message, userstate) => {
  const subData = {
    username: username,
    method: method,
    message: message,
    timestamp: new Date().toISOString(),
    months: userstate['msg-param-cumulative-months'] || 1
  };

  recentEvents.subscribers.push(subData);
  if (recentEvents.subscribers.length > 10) {
    recentEvents.subscribers.shift();
  }

  io.emit('new-subscriber', subData);
});

twitchClient.on('follow', (channel, username, userstate) => {
  const followData = {
    username: username,
    timestamp: new Date().toISOString()
  };

  recentEvents.followers.push(followData);
  if (recentEvents.followers.length > 10) {
    recentEvents.followers.shift();
  }

  io.emit('new-follower', followData);
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Overlay connected:', socket.id);

  // Send recent events to newly connected overlay
  socket.emit('recent-events', recentEvents);

  // Handle custom events from overlay
  socket.on('test-alert', (data) => {
    io.emit('test-alert', data);
  });

  // Handle overlay customization
  socket.on('overlay-customization', (data) => {
    console.log('Overlay customization received:', data.overlay);
    io.emit('overlay-customization', data);
  });

  socket.on('disconnect', () => {
    console.log('Overlay disconnected:', socket.id);
  });
});

// StreamElements Integration
async function fetchStreamElementsData() {
  try {
    if (!process.env.STREAMELEMENTS_CHANNEL_ID) {
      return null;
    }

    const response = await fetch(`https://api.streamelements.com/kappa/v2/channels/${process.env.STREAMELEMENTS_CHANNEL_ID}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('StreamElements API error:', error);
    return null;
  }
}

async function fetchStreamElementsActivities() {
  try {
    if (!process.env.STREAMELEMENTS_CHANNEL_ID) {
      return [];
    }

    const response = await fetch(`https://api.streamelements.com/kappa/v2/activities/${process.env.STREAMELEMENTS_CHANNEL_ID}?limit=10`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('StreamElements Activities API error:', error);
    return [];
  }
}

// Periodic StreamElements data fetch
setInterval(async () => {
  const activities = await fetchStreamElementsActivities();
  if (activities && activities.length > 0) {
    activities.forEach(activity => {
      if (activity.type === 'follow') {
        const followData = {
          username: activity.data.username,
          timestamp: activity.createdAt,
          source: 'streamelements'
        };
        
        recentEvents.followers.push(followData);
        if (recentEvents.followers.length > 10) {
          recentEvents.followers.shift();
        }
        
        io.emit('new-follower', followData);
      } else if (activity.type === 'tip') {
        const donationData = {
          username: activity.data.username,
          amount: `$${activity.data.amount}`,
          message: activity.data.message || '',
          timestamp: activity.createdAt,
          source: 'streamelements'
        };
        
        recentEvents.donations.push(donationData);
        if (recentEvents.donations.length > 10) {
          recentEvents.donations.shift();
        }
        
        io.emit('donation', donationData);
      }
    });
  }
}, 30000); // Check every 30 seconds

// API Routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    connected: twitchClient.readyState() === 'OPEN',
    channel: process.env.TWITCH_CHANNEL,
    streamelements: !!process.env.STREAMELEMENTS_CHANNEL_ID
  });
});

app.get('/api/streamelements/stats', async (req, res) => {
  const data = await fetchStreamElementsData();
  res.json(data || { error: 'StreamElements not configured' });
});

app.get('/api/streamelements/activities', async (req, res) => {
  const activities = await fetchStreamElementsActivities();
  res.json(activities);
});

// Twitch EventSub webhook endpoint
app.post('/webhooks/twitch', verifyTwitchSignature, (req, res) => {
  const messageType = req.headers['twitch-eventsub-message-type'];
  
  if (messageType === 'webhook_callback_verification') {
    // Respond with challenge for webhook verification
    return res.status(200).send(req.body.challenge);
  }
  
  if (messageType === 'notification') {
    const event = req.body.event;
    const subscriptionType = req.body.subscription.type;
    
    console.log(`🔔 Received ${subscriptionType} event:`, event);
    
    switch (subscriptionType) {
      case 'channel.follow':
        handleFollowEvent(event);
        break;
      case 'channel.subscribe':
        handleSubscribeEvent(event);
        break;
      case 'channel.subscription.gift':
        handleGiftSubEvent(event);
        break;
      case 'channel.cheer':
        handleCheerEvent(event);
        break;
      case 'channel.raid':
        handleRaidEvent(event);
        break;
      case 'stream.online':
        handleStreamOnlineEvent(event);
        break;
      case 'stream.offline':
        handleStreamOfflineEvent(event);
        break;
      default:
        console.log(`Unknown event type: ${subscriptionType}`);
    }
  }
  
  res.status(200).send('OK');
});

// Event handlers for different Twitch events
function handleFollowEvent(event) {
  const followData = {
    username: event.user_name,
    userId: event.user_id,
    timestamp: event.followed_at,
    source: 'twitch_api'
  };
  
  recentEvents.followers.push(followData);
  if (recentEvents.followers.length > 10) {
    recentEvents.followers.shift();
  }
  
  io.emit('new-follower', followData);
  console.log(`👥 New follower: ${event.user_name}`);
}

function handleSubscribeEvent(event) {
  const subData = {
    username: event.user_name,
    userId: event.user_id,
    tier: event.tier,
    isGift: event.is_gift,
    timestamp: new Date().toISOString(),
    source: 'twitch_api'
  };
  
  recentEvents.subscribers.push(subData);
  if (recentEvents.subscribers.length > 10) {
    recentEvents.subscribers.shift();
  }
  
  io.emit('new-subscriber', subData);
  console.log(`⭐ New subscriber: ${event.user_name} (Tier ${event.tier})`);
}

function handleGiftSubEvent(event) {
  const giftData = {
    gifter: event.user_name,
    recipient: event.recipient_user_name || 'Anonymous',
    tier: event.tier,
    total: event.total,
    timestamp: new Date().toISOString(),
    source: 'twitch_api'
  };
  
  io.emit('gift-subscription', giftData);
  console.log(`🎁 Gift sub: ${event.user_name} gifted ${event.total} subs`);
}

function handleCheerEvent(event) {
  const cheerData = {
    username: event.user_name,
    bits: event.bits,
    message: event.message,
    timestamp: new Date().toISOString(),
    source: 'twitch_api'
  };
  
  io.emit('cheer', cheerData);
  console.log(`💎 Cheer: ${event.user_name} cheered ${event.bits} bits`);
}

function handleRaidEvent(event) {
  const raidData = {
    username: event.from_broadcaster_user_name,
    viewers: event.viewers,
    timestamp: new Date().toISOString(),
    source: 'twitch_api'
  };
  
  io.emit('raid', raidData);
  console.log(`🚀 Raid: ${event.from_broadcaster_user_name} raided with ${event.viewers} viewers`);
}

function handleStreamOnlineEvent(event) {
  const streamData = {
    type: event.type,
    startedAt: event.started_at,
    source: 'twitch_api'
  };
  
  io.emit('stream-online', streamData);
  console.log(`🔴 Stream went online: ${event.type}`);
}

function handleStreamOfflineEvent(event) {
  io.emit('stream-offline', { timestamp: new Date().toISOString() });
  console.log(`⚫ Stream went offline`);
}

// Subscribe to Twitch EventSub events
async function subscribeToTwitchEvents() {
  if (!twitchAccessToken || !broadcasterUserId) {
    console.log('❌ Cannot subscribe to events: missing token or broadcaster ID');
    return;
  }
  
  const webhookUrl = process.env.WEBHOOK_URL || 'https://your-domain.com/webhooks/twitch';
  const events = [
    'channel.follow',
    'channel.subscribe',
    'channel.subscription.gift',
    'channel.cheer',
    'channel.raid',
    'stream.online',
    'stream.offline'
  ];
  
  console.log('🔄 Subscribing to Twitch EventSub events...');
  
  for (const eventType of events) {
    try {
      const condition = eventType.startsWith('stream.') 
        ? { broadcaster_user_id: broadcasterUserId }
        : { broadcaster_user_id: broadcasterUserId };
        
      if (eventType === 'channel.follow') {
        condition.moderator_user_id = broadcasterUserId;
      }
      
      const response = await fetch(`${TWITCH_API_BASE}/eventsub/subscriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${twitchAccessToken}`,
          'Client-Id': process.env.TWITCH_CLIENT_ID,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: eventType,
          version: '1',
          condition: condition,
          transport: {
            method: 'webhook',
            callback: webhookUrl,
            secret: process.env.TWITCH_WEBHOOK_SECRET || 'your_webhook_secret'
          }
        })
      });
      
      const result = await response.json();
      if (response.ok) {
        console.log(`✅ Subscribed to ${eventType}`);
      } else {
        console.log(`❌ Failed to subscribe to ${eventType}:`, result.message);
      }
    } catch (error) {
      console.error(`❌ Error subscribing to ${eventType}:`, error.message);
    }
  }
}

// Enhanced API routes
app.get('/api/twitch/stream', async (req, res) => {
  const streamInfo = await getStreamInfo();
  res.json(streamInfo);
});

app.get('/api/twitch/followers', async (req, res) => {
  const count = await getFollowerCount();
  const recent = await getRecentFollowers(10);
  res.json({ total: count, recent });
});

app.get('/api/twitch/subscribers', async (req, res) => {
  const count = await getSubscriberCount();
  res.json({ total: count });
});

app.post('/api/test-event', (req, res) => {
  const { type, data } = req.body;
  io.emit(type, data);
  res.json({ success: true, message: 'Event sent to overlays' });
});

// Custom donation webhook (for PayPal, Stripe, etc.)
app.post('/webhooks/donation', (req, res) => {
  // This can be customized for different payment processors
  const { username, amount, message, currency = 'USD', processor = 'custom' } = req.body;
  
  const donationData = {
    username: username || 'Anonymous',
    amount: `${currency === 'USD' ? '$' : ''}${amount}`,
    message: message || '',
    currency,
    processor,
    timestamp: new Date().toISOString(),
    source: 'custom_donation'
  };
  
  recentEvents.donations.push(donationData);
  if (recentEvents.donations.length > 10) {
    recentEvents.donations.shift();
  }
  
  io.emit('donation', donationData);
  console.log(`💰 Donation: ${donationData.username} donated ${donationData.amount}`);
  
  res.json({ success: true, message: 'Donation processed' });
});

// Custom alert system for any external service
app.post('/api/custom-alert', (req, res) => {
  const { type, data } = req.body;
  
  // Validate alert type
  const validTypes = [
    'custom-follow', 'custom-subscriber', 'custom-donation', 
    'custom-raid', 'custom-host', 'custom-cheer', 'milestone',
    'shoutout', 'mod-action', 'custom-event'
  ];
  
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid alert type' });
  }
  
  const alertData = {
    ...data,
    timestamp: new Date().toISOString(),
    source: 'custom_alert'
  };
  
  io.emit(type, alertData);
  console.log(`🔔 Custom alert: ${type}`, alertData);
  
  res.json({ success: true, message: 'Custom alert sent' });
});

// Analytics and stats endpoint
app.get('/api/analytics', async (req, res) => {
  const streamInfo = await getStreamInfo();
  const followerCount = await getFollowerCount();
  const recentFollowers = await getRecentFollowers(5);
  
  const analytics = {
    stream: {
      isLive: !!streamInfo,
      game: streamInfo?.game_name || 'Not streaming',
      title: streamInfo?.title || '',
      viewers: streamInfo?.viewer_count || 0,
      startedAt: streamInfo?.started_at || null
    },
    followers: {
      total: followerCount,
      recent: recentFollowers
    },
    session: {
      chatMessages: recentEvents.chatMessages.length,
      recentFollowers: recentEvents.followers.length,
      recentSubscribers: recentEvents.subscribers.length,
      recentDonations: recentEvents.donations.length
    },
    uptime: streamInfo ? 
      Math.floor((new Date() - new Date(streamInfo.started_at)) / 1000) : 0
  };
  
  res.json(analytics);
});

// Configuration management endpoints
app.get('/api/config', (req, res) => {
  // Return current environment configuration (without sensitive data in logs)
  const config = {
    TWITCH_CHANNEL: process.env.TWITCH_CHANNEL,
    TWITCH_BOT_USERNAME: process.env.TWITCH_BOT_USERNAME,
    TWITCH_OAUTH_TOKEN: process.env.TWITCH_OAUTH_TOKEN,
    TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID,
    TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET,
    PORT: process.env.PORT,
    WEBHOOK_URL: process.env.WEBHOOK_URL,
    TWITCH_WEBHOOK_SECRET: process.env.TWITCH_WEBHOOK_SECRET
  };
  
  res.json(config);
});

app.post('/api/config', async (req, res) => {
  const fs = require('fs');
  const newConfig = req.body;
  
  try {
    // Create new .env content
    const envContent = Object.entries(newConfig)
      .filter(([key, value]) => value && value.trim() !== '')
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    // Write to .env file
    fs.writeFileSync('.env', envContent);
    
    // Update process.env
    Object.assign(process.env, newConfig);
    
    console.log('🔄 Configuration updated via API');
    
    // Reinitialize Twitch connections with new config
    if (newConfig.TWITCH_CHANNEL || newConfig.TWITCH_OAUTH_TOKEN) {
      console.log('🔄 Reinitializing Twitch connections...');
      
      // Disconnect current client
      if (twitchClient && twitchClient.readyState() === 'OPEN') {
        twitchClient.disconnect();
      }
      
      // Reinitialize API
      setTimeout(() => {
        initializeTwitchAPI();
      }, 2000);
    }
    
    res.json({ success: true, message: 'Configuration updated successfully' });
  } catch (error) {
    console.error('❌ Failed to update configuration:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/server-config', (req, res) => {
  const fs = require('fs');
  const { PORT, WEBHOOK_URL, TWITCH_WEBHOOK_SECRET } = req.body;
  
  try {
    // Read current .env
    let envContent = '';
    try {
      envContent = fs.readFileSync('.env', 'utf8');
    } catch (error) {
      // File doesn't exist, create new
    }
    
    // Update specific server config values
    const envLines = envContent.split('\n');
    const updatedLines = [];
    const configKeys = ['PORT', 'WEBHOOK_URL', 'TWITCH_WEBHOOK_SECRET'];
    const newValues = { PORT, WEBHOOK_URL, TWITCH_WEBHOOK_SECRET };
    
    // Update existing lines
    envLines.forEach(line => {
      const [key] = line.split('=');
      if (configKeys.includes(key) && newValues[key]) {
        updatedLines.push(`${key}=${newValues[key]}`);
        delete newValues[key]; // Mark as processed
      } else if (line.trim()) {
        updatedLines.push(line);
      }
    });
    
    // Add new config values that weren't in the file
    Object.entries(newValues).forEach(([key, value]) => {
      if (value && value.trim() !== '') {
        updatedLines.push(`${key}=${value}`);
      }
    });
    
    // Write updated .env
    fs.writeFileSync('.env', updatedLines.join('\n'));
    
    // Update process.env
    if (PORT) process.env.PORT = PORT;
    if (WEBHOOK_URL) process.env.WEBHOOK_URL = WEBHOOK_URL;
    if (TWITCH_WEBHOOK_SECRET) process.env.TWITCH_WEBHOOK_SECRET = TWITCH_WEBHOOK_SECRET;
    
    console.log('🔄 Server configuration updated');
    res.json({ success: true, message: 'Server configuration updated' });
  } catch (error) {
    console.error('❌ Failed to update server configuration:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stream switching endpoint
app.post('/api/switch-stream', async (req, res) => {
  const { channel, botUsername, oauthToken, clientId, clientSecret } = req.body;
  
  try {
    // Update environment variables
    process.env.TWITCH_CHANNEL = channel;
    process.env.TWITCH_BOT_USERNAME = botUsername;
    process.env.TWITCH_OAUTH_TOKEN = oauthToken;
    process.env.TWITCH_CLIENT_ID = clientId;
    if (clientSecret) process.env.TWITCH_CLIENT_SECRET = clientSecret;
    
    // Disconnect current Twitch client
    if (twitchClient && twitchClient.readyState() === 'OPEN') {
      console.log(`🔄 Disconnecting from current channel...`);
      twitchClient.disconnect();
    }
    
    // Create new Twitch client with updated config
    const newTwitchClient = new tmi.Client({
      options: { debug: true },
      connection: {
        reconnect: true,
        secure: true
      },
      identity: {
        username: botUsername,
        password: `oauth:${oauthToken.replace('oauth:', '')}`
      },
      channels: [channel]
    });
    
    // Connect to new channel
    await newTwitchClient.connect();
    console.log(`✅ Switched to channel: ${channel}`);
    
    // Update global client reference
    global.twitchClient = newTwitchClient;
    
    // Reinitialize API with new credentials
    await initializeTwitchAPI();
    
    res.json({ 
      success: true, 
      message: `Successfully switched to channel: ${channel}`,
      channel: channel
    });
  } catch (error) {
    console.error('❌ Failed to switch stream:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Serve overlay pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/overlay/:type', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'overlay.html'));
});

// Serve worxed-themed overlay pages
app.get('/overlay-worxed/:type', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'overlay-worxed.html'));
});

// Serve customizer page
app.get('/customizer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'customizer.html'));
});

// Serve alert manager page
app.get('/alerts', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'alerts-manager.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Twitch Overlay Server running on port ${PORT}`);
  console.log(`📺 Main dashboard: http://localhost:${PORT}`);
  console.log(`🎨 Chat overlay: http://localhost:${PORT}/overlay/chat`);
  console.log(`🔔 Alerts overlay: http://localhost:${PORT}/overlay/alerts`);
  console.log(`📊 Stats overlay: http://localhost:${PORT}/overlay/stats`);
  console.log(`🎮 Game overlay: http://localhost:${PORT}/overlay/game`);
  console.log(`\n🖥️  WORXED TERMINAL THEME:`);
  console.log(`💻 Worxed Chat: http://localhost:${PORT}/overlay-worxed/chat`);
  console.log(`⚡ Worxed Alerts: http://localhost:${PORT}/overlay-worxed/alerts`);
  console.log(`📈 Worxed Stats: http://localhost:${PORT}/overlay-worxed/stats`);
  console.log(`🕹️  Worxed Game: http://localhost:${PORT}/overlay-worxed/game`);
  console.log(`\n🎨 MANAGEMENT & CUSTOMIZATION:`);
  console.log(`🛠️  Overlay Customizer: http://localhost:${PORT}/customizer`);
  console.log(`🚨 Alert Manager: http://localhost:${PORT}/alerts`);
}); 