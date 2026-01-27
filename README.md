# 🎮 Worxed Stream Manager

A comprehensive, self-hosted streaming overlay and alert system for Twitch streamers. Built with a modern **React + Node.js** stack featuring real-time WebSocket communication and a professional multi-theme interface.

**Complete independence from third-party services** like StreamElements or Streamlabs - you own your data and control your stream experience.

![Theme](https://img.shields.io/badge/Theme-Multi_Theme-ff2d55)
![Node.js](https://img.shields.io/badge/Node.js-18+-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Twitch](https://img.shields.io/badge/Platform-Twitch-purple)

## 📚 Documentation

- **[TASKS.md](TASKS.md)** - Project roadmap, planned features, and task tracking
- **[COLORS.md](COLORS.md)** - Complete color system documentation for all themes
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture and system design
- **[README.md](README.md)** - This file - getting started and overview

## ✨ Features

### 🎨 **Multi-Theme System**
- **Current**: Neon Ember (Fire Red + Electric Cyan cyberpunk aesthetic)
- **Coming Soon**: 
  - **Magma Forge** - High-contrast industrial theme for intense gaming
  - **Techno-Organic** - Warm amber tones for reduced eye strain
  - **Synthetica** - Monochromatic OLED-optimized theme
- Light and dark mode support for each theme
- Accessible typography with Inter font (18px base for 2K monitors)
- See [COLORS.md](COLORS.md) for complete color specifications

### 🚨 **Complete Alert System**

- Real-time follower alerts
- Subscriber notifications (all tiers)
- Donation alerts (any payment processor)
- Cheer/bits alerts
- Raid notifications
- Custom event alerts
- Milestone celebrations

### 📊 **Four Main Dashboard Views**

1. **Dashboard** - Real-time stream stats, activity feed, live chat monitor
2. **Alerts** - Configure alert settings, test alerts, view history
3. **Overlay Customizer** - Live preview, theme presets, URL generation for OBS
4. **Backend Console** - System monitoring, process management, terminal access

All views update in real-time via WebSocket communication

### 🛠️ **Management Features**

- Real-time overlay customization
- Alert testing and configuration  
- Live analytics and statistics
- Event logging and monitoring
- Multiple theme presets
- URL generation for OBS Browser Sources

### 🔧 **Advanced Features**

- **Production OAuth**: Secure Twitch API integration
- **Real-time Updates**: WebSocket-powered live data
- **Comprehensive API**: RESTful endpoints for all features

### Prerequisites

- **Node.js 18+** - JavaScript runtime
- **npm or pnpm** - Package manager
- **Twitch Developer Account** - For OAuth credentials ([dev.twitch.tv](https://dev.twitch.tv/console))

### 1. Installation

```bash
git clone https://github.com/yourusername/worxed-stream-manager.git
cd worxed-stream-manager

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configuration

```bash
# Copy environment template
cp backend/env.example backend/.env

# Edit backend/.env with your Twitch credentials
# Get credentials from https://dev.twitch.tv/console
```

### 3. Start Development Servers

```bash
# Terminal 1 - Backend (port 3001)
cd backend && npm run dev

# Terminal 2 - Frontend (port 5173)  
cd froTheme System

### Current Theme: Neon Ember

The **Neon Ember** theme uses a cyberpunk-inspired color palette:

| Element | Usage | Hex Code |
|---------|-------|----------|
| 🔴 Fire Red | Primary actions, live indicators, alerts | `#FF2D55` |
| 💠 Electric Cyan | Data visualization, secondary accents | `#00FBFF` |
| ⚫ Nightshade | Primary background, deep contrast | `#0F0E17` |
| 🔘 Cool Slate | Neutral UI elements, borders | `#2C2C2E` |

### Coming Soon: Multi-Theme System

- **Magma Forge** - Industrial high-contrast (red/orange/black)
- **Techno-Organic** - Warm amber aesthetic (amber/gold/brown)
- **Synthetica** - Monochromatic minimalism (blue-gray/white/black)

Each theme includes both light and dark modes with WCAG AA accessibility compliance.

**See [COLORS.md](COLORS.md) for complete theme specifications and design principles.**color palette:

| Element | Usage | Hex Code |
|---------|-------|----------|
| 🔴 Fire Red | Primary actions, live indicators, alerts | `#FF2D55` |
| 💠 Electric Cyan | Data visualization, secondary accents | `#00FBFF` |
| ⚫ Nightshade | Primary background, deep contrast | `#0F0E17` |
| 🔘 Cool Slate | Neutral UI elements, borders | `#2C2C2E` |

**Design Philosophy:**
- **Red** = Action & Status (Live Badge, Stream Controls, Alerts)
- **Cyan** = Data & Information (Viewer Counts, Charts, Analytics)
- **Glassmorphism**: Frosted card backgrounds with subtle transparency
- **Neon Glow**: Text shadows creating depth and atmosphere

---

## 📋 Dashboard Features

## 📋 Dashboard Features

### Main Views

- **Dashboard** (`/`) - Stream stats, activity feed, live chat monitor
- **Alerts** - Configure alert settings, test alerts, view history
- **Overlay Customizer** - Live preview, theme presets, URL generation

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/status` | GET | Server and connection status |
| `/api/stream` | GET | Current stream info and follower count |
| `/api/analytics` | GET | Session analytics and recent activity |
| `/api/alerts` | GET/POST | Alert settings management |
| `/api/test-alert` | POST | Trigger test alerts |
| `/webhooks/twitch` | POST | Twitch EventSub webhook |

## 🔐 Twitch Authentication Setup

1. Create an app at [Twitch Developer Console](https://dev.twitch.tv/console)
2. Set OAuth redirect URI: `http://localhost:3000/auth/callback`
3. Copy your Client ID and Client Secret
4. Update `backend/.env` with your credentials:

```env
TWITCH_CLIENT_ID=your_client_id_here
TWITCH_CLIENT_SECRET=your_client_secret_here
TWITCH_CHANNEL=your_twitch_username
TWFrontend:**
- **React 18.3** + **TypeScript 5.6** - Modern UI framework with type safety
- **Mantine UI 7.15** - Comprehensive component library
- **Vite 6.0** - Lightning-fast build tool and dev server
- **Socket.IO Client 4.7** - Real-time WebSocket communication
- **Inter Font** - Accessible, professional typography

**Backend:**
- **Node.js 18+** + **Express 4.21** - RESTful API server
- **Socket.IO 4.7** - Bidirectional real-time communication
- **tmi.js 1.8.5** - Twitch IRC chat integration
- **node-fetch** - Twitch Helix API requests

**Features:**
- Real-time bidirectional WebSocket communication
- RESTful API with comprehensive endpoints
- Twitch EventSub webhook support
- OAuth 2.0 authentication with token refresh
- Multi-theme system with light/dark modes

For detailed architecture information, see [ARCHITECTURE.md](ARCHITECTURE.md)
- Socket.IO Client - Real-time updates

**Features:**
- Real-time bidirectional communication
- RESTful API with WebSocket events
- Twitch EventSub webhook support
- OAuth 2.0 authentication with token refresh
npm run test:oauth       # OAuth validation
npm run test:api         # Twitch API
npm run test:overlays    # Overlay pages
npm run test:alerts      # Alert system
```

### Pre-Test Check
```bash
npm run pretest
```

## 🎨 Customization

### Terminal Theme Colors
- **Background**: `#121318` (Dark terminal)
- **Primary**: `#8cffbe` (Pastel green)
- **Secondary**: `#b893ff` (Pastel purple)
- **Font**: VT323 (Monospace terminal font)

### Custom Alerts
```javascript
// Send custom alert via API
fetch('/api/custom-alert', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'milestone',
    data: {
      title: '1000 Followers!',
      message: 'Thank you everyone!',
      timestamp: new Date().toISOString()
    }
  })
});
```

### Donation Integration
```javascript
// Webhook for payment processors
fetch('/webhooks/donation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'DonorName',
    amount: '5.00',
    message: 'Great stream!',
    currency: 'USD',
    processor: 'paypal'
  })
});
```

## 🔧 Configuration Management

### Multi-Stream Profiles
- Save unlimited stream configurations
- Quick switching between channels
- Export/import profile backups
- Real-time configuration updates

### Environment Variables
```bash
# Required
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret
TWITCH_OAUTH_TOKEN=your_oauth_token
TWITCH_REFRESH_TOKEN=your_refresh_token
TWITCH_CHANNEL=your_username
TWITCH_BOT_USERNAME=your_username

# Optional
PORT=3000
WEBHOOK_URL=https://your-domain.com/webhooks/twitch
TWITCH_WEBHOOK_SECRET=your_webhook_secret
```

## 📊 Analytics & Monitoring

### Live Statistics
- Current viewer count
- Total followers
- Chat message count
- Stream uptime
- Recent events

### Event Logging
- All alerts and notifications
- Configuration changes
- API requests
- Error tracking
- Performance metrics

## 🌐 Production Deployment

### Local Development
```bash
npm start
# Server runs on http://localhost:3000
```

### Production (VPS/Cloud)
1. Set up domain with SSL
2. Configure reverse proxy (nginx/Apache)
3. Update `WEBHOOK_URL` in `.env`
4. Use PM2 for process management
worxed-stream-manager/
├── frontend/                # React TypeScript application
│   ├── src/
│   │   ├── components/     # Dashboard, Alerts, Customizer, etc.
│   │   ├── services/       # Socket.IO and API clients
│   │   ├── themes/         # Theme system
│   │   └── App.tsx         # Root component
│   └── package.json
├── backend/                 # Node.js Express server
│   ├── server.js           # Main server (511 lines)
│   ├── public/             # Legacy overlay HTML
│   └── package.json
├── scripts/                 # Utility scripts
├── TASKS.md                 # Project roadmap
├── COLORS.md                # Color system docs
├── ARCHITECTURE.md          # Technical architecture
└── README.md                # This file
```

For detailed architecture, see [ARCHITECTURE.md](ARCHITECTURE.md) Project Structure
```
├── server.js                 # Main server
├── public/                   # Frontend files
│   ├── index.html           # Dashboard
│   ├── overlay.html         # Standard overlays
│   ├── overlay-worxed.html  # Terminal overlays
│   ├── customizer.html      # Overlay customizer
│   └── alerts-manager.html  # Alert management
├── test-suite.js            # Comprehensive tests
├── setup-production-auth-device.js # OAuth setup
└── env.example              # Environment template
```

### Adding New Features
1. Update server endpoints in `server.js`
2. Add frontend components to `public/`
3. Create tests in `test-suite.js`
4. Update documentation

### Contributing
1. Fork the repository
2. Create feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit pull request

## 📝 API Documentation

### Custom Alert API
```http
POST /api/custom-alert
Content-Type: application/json

{
  "type": "custom-follow",
  "data": {
    "username": "NewFollower",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Donation Webhook
```http
POPort conflicts**
- **Backend (3001)**: Kill existing Node processes with `taskkill /F /IM node.exe` (Windows) or `killall node` (Mac/Linux)
- **Frontend (5173)**: Check if another Vite server is running
- Verify ports are available: `netstat -ano | findstr :3001` (Windows)

**Server won't start**
- Check if ports 3001 (backend) and 5173 (frontend) are available
- Verify Node.js version (18+) with `node --version`
- Install dependencies in both folders: `cd backend && npm install` then `cd ../frontend && npm install`
  "amount": "5.00",
  "message": "Great stream!",
  "currency": "USD",
  "processor": "paypal"
}
```

## 🔍 Troubleshooting

### Common Issues

**Server won't start**
- Check if ports 3001 (backend) and 5173 (frontend) are available
- Verify Node.js version (18+)
- Run `npm run install:all` to install all dependencies
- Start backend and frontend separately if needed

**OAuth/Twitch errors**
- Check Client ID and Secret in `backend/.env`
- Verify channel name is correct
- Ensure OAuth token has required scopes
- Check Twitch API status

**Frontend not loading**
- Ensure both backend (3001) and frontend (5173) are running
- Check browser console for errors (F12)
- Verify backend is accessible at `http://localhost:3001/api/status`
- Clear browser cache and reload

**Alerts not appearing**
- Test alerts in the Alerts view
- Check WebSocket connection status (badge in header)
- Verify alert settings are enabled
- Check browser console for errors

### Getting Help- Real-time streaming data and authentication
- **Socket.IO** - Bidirectional real-time communication
- **Mantine UI** - Comprehensive React component library
- **Inter Font** - Beautiful accessible typography
- **TMI.js** - Twitch IRC chat integration
- **Vite** - Lightning-fast development experience

---

**Built with ❤️ by the streaming community,tory and analytics
- [ ] Enhanced overlay customizer
- [ ] Keyboard navigation support

### v1.3 - Advanced Features
- [ ] Stream Deck integration
- [ ] Mobile dashboard app
- [ ] Multi-platform support (YouTube, Kick)
- [ ] Plugin system for custom extensions

**See [TASKS.md](TASKS.md) for detailed task tracking and planning**egration

---

**Built with 🔥 by the streaming community**

## 🚀 Roadmap

- [ ] Stream Deck integration
- [ ] Mobile dashboard app
- [ ] Advanced analytics dashboard
- [ ] Multi-platform support (YouTube, etc.)
- [ ] Plugin system for custom extensions
- [ ] Cloud deployment templates

---

**Built with ❤️ for the streaming community**

*Transform your stream with professional overlays and complete control over your alerts - no third-party dependencies required!* 