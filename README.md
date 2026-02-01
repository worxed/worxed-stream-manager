# WORXED Stream Manager

A comprehensive, self-hosted streaming overlay and alert system for Twitch. Built with a modern **React + Node.js + Vue** stack featuring real-time WebSocket communication, a professional multi-theme interface, and OBS overlay support.

**Complete independence from third-party services** like StreamElements or Streamlabs - you own your data and control your stream experience.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18-61dafb)
![Vue](https://img.shields.io/badge/Vue-3-42b883)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![SQLite](https://img.shields.io/badge/SQLite-WAL-003B57)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Architecture Overview

```
                    ┌─────────────────────────────────────┐
                    │     SUPERVISOR (port 4000)          │
                    │  Process manager + Admin UI host    │
                    │  API proxy + WebSocket logs         │
                    │  SQLite database init               │
                    └──────────────┬──────────────────────┘
                                   │ spawns & monitors
                    ┌──────────────▼──────────────────────┐
                    │     BACKEND (port 4001)             │
                    │  Express API + Socket.IO + tmi.js   │
                    │  Endpoint Builder (/custom/*)       │
                    │  Twitch OAuth + EventSub            │
                    │  Settings sync (Socket.IO events)   │
                    └──────────────┬──────────────────────┘
                                   │ WebSocket + REST
                    ┌──────────────▼──────────────────────┐
                    │   STREAM MANAGER (port 5173)        │
                    │  React + Mantine + TypeScript       │
                    │  Dashboard, Alerts, Customizer      │
                    │  OBS Overlay (/overlay)             │
                    └─────────────────────────────────────┘
```

| Service | Port | Description |
|---------|------|-------------|
| **Supervisor + Admin** | 4000 | Process manager, Vue admin console, API proxy |
| **Backend** | 4001 | API server, Twitch integration, Endpoint Builder |
| **Stream Manager** | 5173 | React frontend, OBS overlays |

## Quick Start

### Prerequisites

- **Node.js 18+**
- **pnpm** (recommended) or npm
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
# - Supervisor + Admin on http://localhost:4000
# - Backend API on http://localhost:4001
# - Frontend on http://localhost:5173
```

### Access Points

| URL | What You Get |
|-----|--------------|
| `http://localhost:4000` | Admin Console (process management, settings, endpoints) |
| `http://localhost:5173` | Stream Manager (overlays, alerts, dashboard) |
| `http://localhost:5173/overlay?type=alerts` | OBS Alert Overlay (transparent, browser source) |
| `http://localhost:5173/overlay?type=chat` | OBS Chat Overlay (transparent, browser source) |
| `http://localhost:4000/status` | Supervisor API (JSON status) |

## Features

### Stream Manager (React Frontend)

- **Dashboard** - Real-time stream stats, activity feed, live chat, custom event feed
- **Alerts** - Configure and test follower/sub/raid/donation alerts
- **Customizer** - Design overlays, generate OBS browser source URLs
- **Backend Console** - Monitor system, view logs, run commands

### OBS Overlay

Dedicated overlay page at `/overlay` for OBS browser sources:
- **Transparent background** for compositing
- **Alert mode** - Animated popup for follows, subs, raids, donations
- **Chat mode** - Bottom-aligned chat messages with fade-in
- **Custom events** - Endpoint builder events appear as popups
- **Live settings sync** - Admin changes theme/font size, overlay updates instantly
- URL params for colors, font size, overlay type

### Admin Console (Vue)

- **Process Manager** - Start/stop/restart backend and frontend
- **Live Terminal** - Real-time log streaming from all services
- **Status Cards** - Service health, uptime, connection status
- **Database Status** - DB health, table counts, migration info
- **Settings Manager** - Category-based key-value settings CRUD
- **Event Viewer** - Browse event history with type filters
- **Endpoint Builder** - Create custom API endpoints with handler types:
  - **JSON** - Return static/templated JSON responses
  - **Redirect** - HTTP redirects with template URLs
  - **Webhook** - Forward requests to external services
  - **Event** - Emit Socket.IO events (shows on Dashboard + Overlay)

### Custom Endpoint Builder

Create API endpoints that external tools (Stream Deck, scripts, webhooks) can call:

```bash
# Example: Create a "hype" endpoint that emits a Socket.IO event
# (via admin console or API)
curl -X POST http://localhost:4000/api/endpoints \
  -H "Content-Type: application/json" \
  -d '{"name":"Hype","path":"hype","method":"POST","handler":{"type":"event","event":"hype-alert","data":{"message":"LETS GO!"}}}'

# Trigger it
curl -X POST http://localhost:4000/custom/hype

# → Dashboard EventFeed shows the event
# → OBS Overlay shows a popup
```

### Multi-Theme System

Three professional themes with light/dark modes:

| Theme | Style | Primary Color |
|-------|-------|---------------|
| **Magma Forge** | Industrial command center | `#FF3B30` (Red) |
| **Techno-Organic** | Warm amber aesthetic | `#FFB627` (Amber) |
| **Synthetica** | Monochromatic OLED | `#B8C5D6` (Cool gray) |

Themes can be changed from the frontend ThemeSwitcher or remotely via admin settings (`overlay.theme`, `overlay.mode`). Changes propagate in real-time to all connected clients and overlays.

### Real-Time Communication

- **WebSocket** via Socket.IO for instant updates
- **Twitch IRC** via tmi.js for chat messages
- **EventSub** webhooks for follows, subs, raids
- **Settings sync** - Admin changes push to all clients instantly
- **Custom events** - Endpoint builder events flow to Dashboard + Overlay

### SQLite Database

Persistent storage with WAL mode for concurrent access:
- **Settings** - Key-value config with categories
- **Alert configs** - Per-type alert configuration
- **Events** - Full history of follows, subs, raids, endpoint calls
- **Endpoints** - Custom API endpoint definitions
- **Analytics** - Aggregated metrics

## API Reference

### Supervisor API (port 4000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Admin console (Vue SPA) |
| `/status` | GET | Full system status |
| `/start` | POST | Start backend |
| `/stop` | POST | Stop backend |
| `/restart` | POST | Restart backend |
| `/frontend/start` | POST | Start frontend dev server |
| `/frontend/stop` | POST | Stop frontend |
| `/start-all` | POST | Start all services |
| `/stop-all` | POST | Stop all services |
| `/db/status` | GET | Database stats |
| `/db/settings` | GET | All settings |
| `/api/*` | * | Proxied to backend |
| `/webhooks/*` | * | Proxied to backend |

### Backend API (port 4001)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/status` | GET | Server health & connection status |
| `/api/stream` | GET | Current stream info |
| `/api/analytics` | GET | Session analytics |
| `/api/alerts` | GET/POST | Alert settings (legacy format) |
| `/api/alerts/configs` | GET | Detailed alert configs from DB |
| `/api/alerts/configs/:type` | PUT | Update specific alert config |
| `/api/test-alert` | POST | Trigger test alert |
| `/api/settings` | GET | All settings (?category=) |
| `/api/settings/:key` | GET/PUT/DELETE | Single setting CRUD |
| `/api/events` | GET | Event history (?type=&limit=&offset=) |
| `/api/events/summary` | GET | Event counts by type |
| `/api/endpoints` | GET/POST | List/create custom endpoints |
| `/api/endpoints/:id` | GET/PUT/DELETE | Single endpoint CRUD |
| `/api/endpoints/:id/test` | POST | Dry-run endpoint (no side effects) |
| `/api/db/status` | GET | Database stats |
| `/api/navigation` | GET | Service discovery |
| `/webhooks/twitch` | POST | Twitch EventSub endpoint |
| `/custom/*` | * | Dynamic custom endpoint handler |

## Project Structure

```
worxed-stream-manager/
├── supervisor.js           # Process manager (entry point)
├── shared/                 # SQLite database layer
│   ├── database.js         # Connection manager (WAL mode)
│   ├── schema.js           # Table definitions
│   ├── migrations.js       # Migration runner
│   └── index.js            # Query helpers
├── data/
│   └── worxed.db           # SQLite database (auto-created)
├── backend/
│   ├── server.js           # Express + Socket.IO + Endpoint Builder
│   ├── admin/              # Vue 3 admin console source
│   │   └── src/
│   │       ├── App.vue
│   │       └── components/ # 11 components
│   └── public/             # Built admin UI (served by supervisor)
├── frontend/
│   ├── src/
│   │   ├── App.tsx         # Root: /overlay routing + AppMain
│   │   ├── components/
│   │   │   ├── Dashboard.tsx     # Stats, chat, activity, EventFeed
│   │   │   ├── Alerts.tsx        # Alert configuration
│   │   │   ├── Customizer.tsx    # Overlay designer
│   │   │   ├── BackendDashboard.tsx
│   │   │   ├── ThemeSwitcher.tsx
│   │   │   ├── EventFeed.tsx     # Live custom event feed
│   │   │   └── Overlay.tsx       # OBS browser source page
│   │   ├── services/       # socket.ts, api.ts
│   │   ├── themes/         # 3 themes x 2 modes
│   │   └── types/          # TypeScript interfaces
│   └── vite.config.ts
├── .env                    # Environment variables
├── ARCHITECTURE.md         # Technical architecture
├── COLORS.md               # Theme color specifications
├── TASKS.md                # Project roadmap
├── CONTRIBUTING.md         # Contribution guidelines
└── CLAUDE.md               # Claude Code context
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
npm run build:admin    # Admin only → backend/public/
npm run build:frontend # Frontend only
```

## Documentation

| File | Description |
|------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technical architecture & system design |
| [COLORS.md](COLORS.md) | Complete theme color specifications |
| [TASKS.md](TASKS.md) | Project roadmap & task tracking |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines & templates |
| [CLAUDE.md](CLAUDE.md) | Claude Code session context |

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

Current priority areas: Endpoint builder UI polish, theme layout refinements, OBS WebSocket integration

## Roadmap

### v1.1 - Core Stability (Current)

- ~~SQLite database for persistent storage~~ Done
- ~~Endpoint builder for custom API integrations~~ Done
- ~~Settings & endpoint frontend integration~~ Done
- ~~OBS overlay page~~ Done
- ~~Theme system (3 themes x 2 modes)~~ Done
- Endpoint builder UI polish
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

**Admin UI not loading at localhost:4000:**

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

**OBS overlay not transparent:**

- Use Browser Source in OBS
- Set URL to `http://localhost:5173/overlay?type=alerts`
- Set width/height to match your canvas
- Ensure "Shutdown source when not visible" is unchecked

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Process Manager** | Node.js + ws |
| **Database** | SQLite (better-sqlite3, WAL mode) |
| **Backend** | Express 4.21 + Socket.IO 4.7 + tmi.js 1.8 |
| **Admin UI** | Vue 3 + Naive UI |
| **Frontend** | React 18 + TypeScript 5.6 + Mantine 7.15 |
| **Build** | Vite 6.0 |

---

**Built for streamers who want complete control over their stream.**
