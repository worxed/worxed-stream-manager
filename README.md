# WORXED Stream Manager

A comprehensive, self-hosted streaming overlay and alert system for Twitch. Built with a modern **React + Node.js + Vue** stack featuring real-time WebSocket communication, a professional multi-theme interface, a Figma-like scene editor, and OBS overlay support.

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
                    │  Scene API + Settings sync          │
                    └──────────────┬──────────────────────┘
                                   │ WebSocket + REST
                    ┌──────────────▼──────────────────────┐
                    │   STREAM MANAGER (port 5173)        │
                    │  React + Tailwind v4 + PrimeReact   │
                    │  Dashboard, Alerts, Scene Editor    │
                    │  OBS Overlay (/overlay)             │
                    └─────────────────────────────────────┘
```

| Service | Port | Description |
|---------|------|-------------|
| **Supervisor + Admin** | 4000 | Process manager, Vue admin console, API proxy |
| **Backend** | 4001 | API server, Twitch integration, Scene & Endpoint Builder |
| **Stream Manager** | 5173 | React frontend, scene editor, OBS overlays |

## Quick Start

### Prerequisites

- **Node.js 18+**
- **pnpm** (`npm install -g pnpm`)
- **Twitch Developer Account** ([dev.twitch.tv](https://dev.twitch.tv/console))

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/worxed-stream-manager.git
cd worxed-stream-manager

# Install all dependencies (pnpm workspaces)
pnpm install

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
pnpm start

# This starts:
# - Supervisor + Admin on http://localhost:4000
# - Backend API on http://localhost:4001
# - Frontend on http://localhost:5173
```

### Access Points

| URL | What You Get |
|-----|--------------|
| `http://localhost:4000` | Admin Console (process management, settings, endpoints) |
| `http://localhost:5173` | Stream Manager (overlays, alerts, scene editor) |
| `http://localhost:5173/overlay` | OBS Overlay (scene-based, transparent, browser source) |
| `http://localhost:5173/overlay?scene=ID` | OBS Overlay for a specific scene |
| `http://localhost:4000/status` | Supervisor API (JSON status) |

## Features

### Scene Editor (Customizer)

Figma-like canvas editor for designing OBS overlays:

- **Konva canvas** with drag, resize, rotate, multi-select
- **Element types**: Alert Box, Chat, Text, Image, Custom Event
- **Floating panels**: Toolbox (layers + add elements), Properties (per-element config)
- **Canvas guides**: Letterbox boundary, center crosshairs, resolution label
- **Resolution presets**: 1080p, 1440p, 720p, or custom dimensions
- **Testing panel**: Fire test alerts, chat messages, and custom events directly from the editor
- **Pop-out preview**: Opens `/overlay` in a new window with state tracking
- **Auto-save**: Debounced 800ms save to database via API
- **Undo/redo**: Full history with keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)
- **Zustand store**: Centralized state with scene CRUD, element CRUD, clipboard, multi-select

### Stream Manager (React Frontend)

- **Dashboard** - Real-time stream stats, activity feed, live chat, custom event feed
- **Alerts** - Configure and test follower/sub/raid/donation alerts
- **Customizer** - Scene editor for overlay design
- **Backend Console** - Monitor system, view logs, run commands

### OBS Overlay

Scene-based overlay page at `/overlay` for OBS browser sources:

- **Scene renderer** - Loads active scene, renders elements at their positions
- **Transparent background** for compositing
- **Alert box** - Animated popup for follows, subs, raids, donations (queue + auto-dismiss)
- **Chat** - Scrolling messages with badges and fade
- **Custom events** - Endpoint builder events appear as popups
- **Live sync** - Scene changes in editor propagate instantly via Socket.IO
- URL param `?scene=ID` to override active scene

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

Four professional themes with light/dark modes (8 combinations):

| Theme | Style | Primary Color |
|-------|-------|---------------|
| **Zinc** | Clean neutral (default) | Neutral gray |
| **Synthetica** | Cool blue-gray | `#334680` / `#6889c8` |
| **Magma** | Warm amber/fire | `#b45309` / `#f59e0b` |
| **Arctic** | Icy blue | `#0c4a6e` / `#38bdf8` |

Themes use CSS-variable theming via Tailwind v4 `@theme` + `[data-theme]` selectors. Changes propagate in real-time to all connected clients and overlays via Socket.IO.

### Real-Time Communication

- **WebSocket** via Socket.IO for instant updates
- **Twitch IRC** via tmi.js for chat messages
- **EventSub** webhooks for follows, subs, raids
- **Settings sync** - Admin changes push to all clients instantly
- **Scene sync** - Editor changes propagate to overlay in real-time
- **Custom events** - Endpoint builder events flow to Dashboard + Overlay

### SQLite Database

Persistent storage with WAL mode for concurrent access:

- **Settings** - Key-value config with categories
- **Alert configs** - Per-type alert configuration
- **Events** - Full history of follows, subs, raids, endpoint calls
- **Endpoints** - Custom API endpoint definitions
- **Scenes** - Overlay scenes with elements (JSON), resolution, active state
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
| `/api/test-chat` | POST | Trigger test chat message |
| `/api/test-event` | POST | Trigger custom Socket.IO event |
| `/api/settings` | GET | All settings (?category=) |
| `/api/settings/:key` | GET/PUT/DELETE | Single setting CRUD |
| `/api/events` | GET | Event history (?type=&limit=&offset=) |
| `/api/events/summary` | GET | Event counts by type |
| `/api/endpoints` | GET/POST | List/create custom endpoints |
| `/api/endpoints/:id` | GET/PUT/DELETE | Single endpoint CRUD |
| `/api/endpoints/:id/test` | POST | Dry-run endpoint (no side effects) |
| `/api/scenes` | GET/POST | List/create scenes |
| `/api/scenes/active` | GET | Get active scene (for overlay) |
| `/api/scenes/:id` | GET/PUT/DELETE | Single scene CRUD |
| `/api/scenes/:id/activate` | PUT | Set scene as active |
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
│   ├── schema.js           # Table definitions + migrations
│   ├── migrations.js       # Migration runner
│   └── index.js            # Query helpers (settings, alerts, events, endpoints, scenes)
├── data/
│   └── worxed.db           # SQLite database (auto-created)
├── backend/
│   ├── server.js           # Express + Socket.IO + Endpoint Builder + Scene API
│   ├── admin/              # Vue 3 admin console source
│   │   └── src/
│   │       ├── App.vue
│   │       └── components/ # 11 components
│   └── public/             # Built admin UI (served by supervisor)
├── frontend/
│   ├── src/
│   │   ├── App.tsx         # Root: /overlay routing + AppMain
│   │   ├── index.css       # Tailwind v4 @theme + CSS variables + animations
│   │   ├── components/
│   │   │   ├── Dashboard.tsx          # Stats, chat, activity, EventFeed
│   │   │   ├── Alerts.tsx             # Alert configuration
│   │   │   ├── Customizer.tsx         # Scene editor shell
│   │   │   ├── BackendDashboard.tsx   # System monitoring
│   │   │   ├── ThemeSwitcher.tsx      # Theme/mode picker
│   │   │   ├── EventFeed.tsx          # Live custom event feed
│   │   │   ├── Overlay.tsx            # OBS scene-based overlay renderer
│   │   │   ├── ColorPicker.tsx        # Color picker component
│   │   │   ├── common/
│   │   │   │   └── EmptyState.tsx     # Reusable empty state
│   │   │   ├── editor/               # Scene editor components
│   │   │   │   ├── OverlayEditor.tsx  # Editor shell (toolbar, layout)
│   │   │   │   ├── KonvaCanvas.tsx    # Konva Stage/Layer/Transformer
│   │   │   │   ├── KonvaElement.tsx   # Element rendering on canvas
│   │   │   │   ├── ElementToolbox.tsx # Add elements + layers panel
│   │   │   │   ├── PropertiesPanel.tsx# Per-element property editor
│   │   │   │   └── TestingPanel.tsx   # Alert/chat/event test buttons
│   │   │   └── overlay/              # OBS overlay renderers (DOM-based)
│   │   │       ├── ElementRenderer.tsx
│   │   │       ├── AlertBoxRenderer.tsx
│   │   │       ├── ChatRenderer.tsx
│   │   │       ├── TextRenderer.tsx
│   │   │       └── ImageRenderer.tsx
│   │   ├── stores/
│   │   │   └── editorStore.ts  # Zustand store (scenes, elements, history)
│   │   ├── services/       # socket.ts, api.ts, toast.ts
│   │   ├── themes/         # 4 themes x 2 modes
│   │   └── types/          # TypeScript interfaces
│   └── vite.config.ts
├── .env                    # Environment variables
├── pnpm-workspace.yaml     # pnpm workspace config
├── ARCHITECTURE.md         # Technical architecture
├── COLORS.md               # Theme color specifications
├── TASKS.md                # Project roadmap
├── CONTRIBUTING.md         # Contribution guidelines
└── CLAUDE.md               # Claude Code context
```

## Development Commands

```bash
# Full stack (supervisor manages everything)
pnpm start

# Individual services
pnpm run dev:admin      # Admin console only (port 4002)
pnpm run dev:frontend   # Stream manager only (port 5173)

# Build for production
pnpm run build          # Build both admin and frontend
pnpm run build:admin    # Admin only → backend/public/
pnpm run build:frontend # Frontend only

# Install all workspace dependencies
pnpm install
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
pnpm install
cp .env.example .env
pnpm start
```

Current priority areas: Scene editor polish, responsive layout, OBS WebSocket integration

## Roadmap

### v1.1 - Core Stability (Current)

- ~~SQLite database for persistent storage~~ Done
- ~~Endpoint builder for custom API integrations~~ Done
- ~~Settings & endpoint frontend integration~~ Done
- ~~OBS overlay page~~ Done
- ~~Theme system (4 themes x 2 modes)~~ Done
- ~~PrimeReact UI migration~~ Done
- ~~Scene editor + overlay renderer~~ Done
- ~~Editor UX: testing panel, preview, resolution, canvas guides~~ Done
- Responsive layout (mobile/tablet)
- WebSocket reconnection + error boundaries

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

- Run `pnpm run build:admin` to build the Vue app
- Check that backend/public/ has index.html

**Frontend can't connect to backend:**

- Verify backend is running on port 4001
- Check browser console for CORS errors
- Test API: `curl http://localhost:4001/api/status`

**Twitch authentication errors:**

- Verify credentials in `.env`
- Check OAuth token hasn't expired
- Ensure required scopes: `channel:read:subscriptions`, `moderator:read:followers`, `chat:read`

**OBS overlay not showing:**

- Use Browser Source in OBS
- Set URL to `http://localhost:5173/overlay`
- Set width/height to match your scene resolution (e.g. 1920x1080)
- Ensure "Shutdown source when not visible" is unchecked

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Process Manager** | Node.js + ws |
| **Database** | SQLite (better-sqlite3, WAL mode) |
| **Backend** | Express 4.21 + Socket.IO 4.7 + tmi.js 1.8 |
| **Admin UI** | Vue 3 + Naive UI |
| **Frontend** | React 18 + TypeScript 5.6 + Tailwind CSS v4 + PrimeReact 10 |
| **Scene Editor** | react-konva + Konva + Zustand |
| **Build** | Vite 6 + pnpm workspaces |

---

**Built for streamers who want complete control over their stream.**
