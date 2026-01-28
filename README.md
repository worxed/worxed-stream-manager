# WORXED Stream Manager

A comprehensive, self-hosted streaming overlay and alert system for Twitch. Built with a modern **React + Node.js + Vue** stack featuring real-time WebSocket communication and a professional multi-theme interface.

**Complete independence from third-party services** like StreamElements or Streamlabs - you own your data and control your stream experience.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18-61dafb)
![Vue](https://img.shields.io/badge/Vue-3-42b883)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Architecture Overview

```
                    ┌─────────────────────────────────────┐
                    │     SUPERVISOR (port 4000)          │
                    │  Process manager + WebSocket logs   │
                    │  REST: /status /start /stop /restart│
                    └──────────────┬──────────────────────┘
                                   │ spawns & monitors
                    ┌──────────────▼──────────────────────┐
                    │     BACKEND (port 4001)             │
                    │  Express API + Socket.IO + tmi.js   │
                    │  Vue Admin Console (built-in)       │
                    │  Twitch OAuth + EventSub            │
                    └──────────────┬──────────────────────┘
                                   │ WebSocket + REST
                    ┌──────────────▼──────────────────────┐
                    │   STREAM MANAGER (port 5173)        │
                    │  React + Mantine + TypeScript       │
                    │  Overlays, Alerts, Dashboard        │
                    └─────────────────────────────────────┘
```

| Service | Port | Description |
|---------|------|-------------|
| **Supervisor** | 4000 | Process manager, health checks, log streaming |
| **Backend + Admin** | 4001 | API server + Vue admin console |
| **Stream Manager** | 5173 | React frontend for stream overlays |

## Quick Start

### Prerequisites

- **Node.js 18+**
- **npm or pnpm**
- **Twitch Developer Account** ([dev.twitch.tv](https://dev.twitch.tv/console))

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/worxed-stream-manager.git
cd worxed-stream-manager

# Install all dependencies
npm run install:all

# Copy and configure environment
cp .env.example .env
# Edit .env with your Twitch credentials
```

### Configuration

Create a `.env` file in the root directory:

```env
# Twitch Application (from dev.twitch.tv/console)
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret

# OAuth Tokens
TWITCH_OAUTH_TOKEN=your_oauth_token
TWITCH_REFRESH_TOKEN=your_refresh_token

# Channel Configuration
TWITCH_CHANNEL=your_twitch_username
TWITCH_BOT_USERNAME=your_twitch_username

# Server (don't change unless needed)
PORT=4001
```

### Start Development

```bash
# Start everything (recommended)
npm start

# This starts:
# - Supervisor on http://localhost:4000
# - Backend + Admin on http://localhost:4001
# - Frontend on http://localhost:5173
```

### Access Points

| URL | What You Get |
|-----|--------------|
| `http://localhost:4001` | Admin Console (process management, logs) |
| `http://localhost:5173` | Stream Manager (overlays, alerts, dashboard) |
| `http://localhost:4000/status` | Supervisor API (JSON status) |

## Features

### Stream Manager (React Frontend)

- **Dashboard** - Real-time stream stats, activity feed, live chat
- **Alerts** - Configure and test follower/sub/raid/donation alerts
- **Customizer** - Design overlays, generate OBS browser source URLs
- **Backend Console** - Monitor system, view logs, run commands

### Admin Console (Vue)

- **Process Manager** - Start/stop/restart backend and frontend
- **Live Terminal** - Real-time log streaming from all services
- **Status Cards** - Service health, uptime, connection status

### Multi-Theme System

Three professional themes with light/dark modes:

| Theme | Style | Primary Color |
|-------|-------|---------------|
| **Magma Forge** | Industrial command center | `#FF3B30` (Red) |
| **Techno-Organic** | Warm amber aesthetic | `#FFB627` (Amber) |
| **Synthetica** | Monochromatic OLED | `#B8C5D6` (Cool gray) |

### Real-Time Communication

- **WebSocket** via Socket.IO for instant updates
- **Twitch IRC** via tmi.js for chat messages
- **EventSub** webhooks for follows, subs, raids

## API Reference

### Supervisor API (port 4000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/status` | GET | Full system status |
| `/start` | POST | Start backend |
| `/stop` | POST | Stop backend |
| `/restart` | POST | Restart backend |
| `/frontend/start` | POST | Start frontend dev server |
| `/frontend/stop` | POST | Stop frontend |
| `/start-all` | POST | Start all services |
| `/stop-all` | POST | Stop all services |

### Backend API (port 4001)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/status` | GET | Server health & connection status |
| `/api/stream` | GET | Current stream info |
| `/api/analytics` | GET | Session analytics |
| `/api/alerts` | GET/POST | Alert settings |
| `/api/test-alert` | POST | Trigger test alert |
| `/api/navigation` | GET | Service discovery |
| `/webhooks/twitch` | POST | Twitch EventSub endpoint |

## Project Structure

```
worxed-stream-manager/
├── supervisor.js           # Process manager (entry point)
├── backend/
│   ├── server.js           # Express + Socket.IO server
│   ├── admin/              # Vue 3 admin console source
│   │   └── src/
│   │       ├── App.vue
│   │       └── components/
│   └── public/             # Built admin UI (served at /)
├── frontend/
│   ├── src/
│   │   ├── App.tsx         # React root component
│   │   ├── components/     # Dashboard, Alerts, Customizer
│   │   ├── services/       # socket.ts, api.ts
│   │   └── themes/         # Theme system
│   └── vite.config.ts
├── .env                    # Environment variables
├── ARCHITECTURE.md         # Technical architecture
├── COLORS.md               # Theme color specifications
└── TASKS.md                # Project roadmap
```

## Development Commands

```bash
# Full stack (supervisor manages everything)
npm start

# Individual services
npm run dev:admin      # Admin console only (port 4002)
npm run dev:frontend   # Stream manager only (port 5173)

# Build for production
npm run build          # Build both admin and frontend
npm run build:admin    # Admin only
npm run build:frontend # Frontend only
```

## Documentation

| File | Description |
|------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technical architecture & system design |
| [COLORS.md](COLORS.md) | Complete theme color specifications |
| [TASKS.md](TASKS.md) | Project roadmap & task tracking |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines & templates |

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Development setup
- Code guidelines
- PR/Issue templates
- Where to contribute (check TASKS.md for priorities)

**Quick start:**
```bash
git clone https://github.com/YOUR_USERNAME/worxed-stream-manager.git
cd worxed-stream-manager
npm run install:all
cp .env.example .env
npm start
```

High priority areas: Database layer, Endpoint builder, Theme system

## Roadmap

### v1.1 - Core Stability (Next)

- SQLite database for persistent storage
- Endpoint builder for custom API integrations
- Theme system overhaul (3 themes × 2 modes)
- Enhanced analytics dashboard

### v1.2 - Integrations

- **OBS WebSocket** - Scene switching, source control, recording status
- **Stream Deck** - Custom actions plugin, alert triggers, quick stats
- Advanced alert customization
- Data export/import

### v1.3 - Multi-Platform

- YouTube Live integration
- Kick integration
- Unified multi-platform chat
- Plugin system architecture

### v1.4 - Community

- Shareable overlay templates
- Community theme gallery
- Alert sound library
- Cloud sync (optional)

### v1.5 - Ecosystem

- Mobile companion app
- Browser extension
- Voice command integration
- Third-party developer API

See [TASKS.md](TASKS.md) for detailed task tracking and planning.

## Troubleshooting

**Port already in use:**

```bash
# Windows
taskkill /F /IM node.exe

# Mac/Linux
killall node
```

**Admin UI not loading at localhost:4001:**

- Run `npm run build:admin` to build the Vue app
- Check that backend/public/ has index.html

**Frontend can't connect to backend:**

- Verify backend is running on port 4001
- Check browser console for CORS errors
- Test API: `curl http://localhost:4001/api/status`

**Twitch authentication errors:**

- Verify credentials in `.env`
- Check OAuth token hasn't expired
- Ensure required scopes: `channel:read:subscriptions`, `moderator:read:followers`, `chat:read`

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Process Manager** | Node.js + ws |
| **Backend** | Express 4.21 + Socket.IO 4.7 + tmi.js 1.8 |
| **Admin UI** | Vue 3 + Naive UI |
| **Frontend** | React 18 + TypeScript 5.6 + Mantine 7.15 |
| **Build** | Vite 6.0 |

---

**Built for streamers who want complete control over their stream.**
