# Worxed Stream Manager - Architecture

## System Overview

Worxed Stream Manager is a full-stack streaming management platform with four main layers: a process supervisor, a shared SQLite database, a backend API server, and a React-based stream manager frontend with OBS overlay support.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SUPERVISOR (port 4000)                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │  Process Mgmt   │  │  Admin UI Host  │  │  Log Streaming  │         │
│  │  start/stop/    │  │  Vue 3 (/)      │  │  WebSocket to   │         │
│  │  restart        │  │  API proxy      │  │  admin console  │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                              Node.js + ws + better-sqlite3              │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ spawns & monitors
┌────────────────────────────────┼────────────────────────────────────────┐
│                         SHARED DB LAYER                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │  database.js    │  │  schema.js      │  │  migrations.js  │         │
│  │  Singleton WAL  │  │  Table defs     │  │  Version runner │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │  index.js — Query helpers                                   │        │
│  │  settings · alerts · events · analytics · endpoints         │        │
│  └─────────────────────────────────────────────────────────────┘        │
│                        SQLite 3.51 + better-sqlite3 12.6                │
└────────────────────────────────┼────────────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────────────┐
│                         BACKEND (port 4001)                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │  Express API    │  │  Socket.IO      │  │  Endpoint Builder│        │
│  │  /api/*         │  │  Real-time      │  │  /custom/* routes│        │
│  │  /webhooks/*    │  │  events         │  │  dynamic handlers│        │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│  ┌─────────────────┐  ┌─────────────────┐                              │
│  │  tmi.js         │  │  Twitch OAuth   │                              │
│  │  IRC Chat       │  │  + Helix API    │                              │
│  └─────────────────┘  └─────────────────┘                              │
│                        Node.js + Express + Socket.IO                    │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ WebSocket + REST
┌────────────────────────────────▼────────────────────────────────────────┐
│                    STREAM MANAGER FRONTEND (port 5173)                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │  Dashboard      │  │  Alerts         │  │  Customizer     │         │
│  │  Stream stats   │  │  Configuration  │  │  Overlay design │         │
│  │  Chat, Activity │  │  Testing        │  │  OBS URLs       │         │
│  │  EventFeed      │  │                 │  │                 │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│  ┌─────────────────┐  ┌─────────────────┐                              │
│  │  Backend        │  │  OBS Overlay    │  React 18 + TypeScript       │
│  │  Console        │  │  /overlay route │  Mantine UI + Socket.IO      │
│  └─────────────────┘  └─────────────────┘                              │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────────────┐
│                        EXTERNAL SERVICES                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │  Twitch OAuth   │  │  Twitch Helix   │  │  Twitch IRC     │         │
│  │  Authentication │  │  Stream Data    │  │  Chat (tmi.js)  │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│  ┌─────────────────┐  ┌─────────────────┐                              │
│  │  EventSub       │  │  Future:        │                              │
│  │  Webhooks       │  │  OBS, Discord   │                              │
│  └─────────────────┘  └─────────────────┘                              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Port Reference

| Port | Service | Technology | Purpose |
|------|---------|------------|---------|
| **4000** | Supervisor + Admin | Node.js + ws | Process management, admin UI host, API proxy |
| **4001** | Backend | Express + Socket.IO | API server, Twitch integration |
| **4002** | Admin Dev | Vite | Admin console development only |
| **5173** | Frontend | Vite | Stream manager (React) + OBS overlays |

---

## Tech Stack

### Supervisor
| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime |
| **ws** | WebSocket server for log streaming |
| **better-sqlite3** | Database initialization and status |
| **child_process** | Spawn and manage backend/frontend |

### Shared Database
| Technology | Version | Purpose |
|------------|---------|---------|
| **better-sqlite3** | 12.6 | SQLite bindings (WAL mode) |
| **SQLite** | 3.51 | Persistent storage |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Runtime |
| **Express** | 4.21 | HTTP server |
| **Socket.IO** | 4.7 | WebSocket server |
| **tmi.js** | 1.8 | Twitch IRC chat |
| **node-fetch** | 2.7 | Twitch API requests |

### Admin Console (Vue)
| Technology | Version | Purpose |
|------------|---------|---------|
| **Vue** | 3.4 | UI framework |
| **Naive UI** | 2.38 | Component library |
| **Vite** | 5.x | Build tool |
| **Tabler Icons** | - | Icon system |

### Frontend (React)
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3 | UI framework |
| **TypeScript** | 5.6 | Type safety |
| **Vite** | 6.0 | Build tool |
| **Mantine UI** | 7.15 | Component library |
| **Socket.IO Client** | 4.7 | WebSocket client |

---

## Project Structure

```
worxed-stream-manager/
├── supervisor.js                 # Entry point - process manager
│
├── shared/                       # Database layer (used by supervisor + backend)
│   ├── database.js               # Singleton connection, WAL mode, pragmas
│   ├── schema.js                 # Table definitions + migration data
│   ├── migrations.js             # Version-based migration runner
│   └── index.js                  # Query helpers (settings, alerts, events, analytics, endpoints)
│
├── data/
│   └── worxed.db                 # SQLite database (auto-created)
│
├── backend/
│   ├── server.js                 # Express + Socket.IO server + Endpoint Builder
│   ├── admin/                    # Vue admin console source
│   │   ├── src/
│   │   │   ├── App.vue           # Main admin layout
│   │   │   ├── main.js           # Vue entry point
│   │   │   └── components/
│   │   │       ├── LiveTerminal.vue      # Real-time log viewer
│   │   │       ├── ProcessManager.vue    # Start/stop controls
│   │   │       ├── StatusCard.vue        # Metric display
│   │   │       ├── LogViewer.vue         # Log filtering
│   │   │       ├── DatabaseStatus.vue    # DB health + table stats
│   │   │       ├── ConfigManager.vue     # Settings CRUD
│   │   │       ├── EventViewer.vue       # Event history browser
│   │   │       ├── EndpointBuilder.vue   # Custom endpoint creator
│   │   │       ├── JsonDesigner.vue      # JSON payload editor
│   │   │       ├── JsonNode.vue          # JSON tree node
│   │   │       └── SettingsManager.vue   # Category-based settings UI
│   │   ├── vite.config.js        # Builds to ../public
│   │   └── package.json
│   ├── public/                   # Built admin UI (served by supervisor at :4000)
│   │   ├── index.html
│   │   └── assets/
│   ├── .env                      # Environment variables
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # Root: /overlay routing + AppMain shell
│   │   ├── main.tsx              # React entry point
│   │   ├── index.css             # Global styles, CSS variables
│   │   ├── components/
│   │   │   ├── Dashboard.tsx     # Stream stats, chat, activity, EventFeed
│   │   │   ├── Alerts.tsx        # Alert configuration
│   │   │   ├── Customizer.tsx    # Overlay designer
│   │   │   ├── BackendDashboard.tsx  # System monitoring
│   │   │   ├── ThemeSwitcher.tsx # Theme selection
│   │   │   ├── EventFeed.tsx     # Live custom endpoint event feed
│   │   │   └── Overlay.tsx       # OBS browser source overlay page
│   │   ├── services/
│   │   │   ├── socket.ts         # Socket.IO client (typed + generic on())
│   │   │   └── api.ts            # REST API client
│   │   ├── themes/
│   │   │   ├── themes.ts         # Theme definitions (3×2)
│   │   │   └── worxed.ts         # Mantine theme config
│   │   └── types/
│   │       └── index.ts          # TypeScript interfaces
│   ├── vite.config.ts
│   └── package.json
│
├── .env                          # Root environment (PORT=4001)
├── package.json                  # Workspace scripts
├── README.md
├── ARCHITECTURE.md               # This file
├── COLORS.md                     # Theme color specifications
├── TASKS.md                      # Roadmap and task tracking
├── CONTRIBUTING.md               # Contribution guidelines
├── CLAUDE.md                     # Claude Code session context
└── .claude/
    └── settings.local.json       # Claude permissions
```

---

## Communication Architecture

### Supervisor API (port 4000)

REST endpoints for process control + admin UI host:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Admin console (Vue SPA) |
| `/status` | GET | Full system status (supervisor, backend, frontend) |
| `/start` | POST | Start backend server |
| `/stop` | POST | Stop backend server |
| `/restart` | POST | Restart backend server |
| `/frontend/start` | POST | Start frontend dev server |
| `/frontend/stop` | POST | Stop frontend dev server |
| `/frontend/restart` | POST | Restart frontend |
| `/start-all` | POST | Start all services |
| `/stop-all` | POST | Stop all services |
| `/db/status` | GET | Database stats + migration info |
| `/db/settings` | GET | All settings from DB |
| `/api/*` | * | Proxied to backend (port 4001) |
| `/webhooks/*` | * | Proxied to backend (port 4001) |

WebSocket for log streaming:
- Connects to admin console
- Broadcasts logs from backend/frontend stdout/stderr
- Maintains 100-entry log buffer for new connections

### Backend API (port 4001)

REST endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/status` | GET | Server health, Twitch connection status |
| `/api/health` | GET | Simple health check |
| `/api/stream` | GET | Current stream info, follower count |
| `/api/analytics` | GET | Session stats, recent activity |
| `/api/alerts` | GET/POST | Alert configuration (legacy format) |
| `/api/alerts/configs` | GET | Detailed alert configs from DB |
| `/api/alerts/configs/:type` | PUT | Update specific alert config |
| `/api/test-alert` | POST | Trigger test alert |
| `/api/settings` | GET | All settings (?category=) |
| `/api/settings/:key` | GET/PUT/DELETE | Single setting CRUD |
| `/api/events` | GET | Event history (?type=&limit=&offset=&since=&until=) |
| `/api/events/summary` | GET | Event counts by type |
| `/api/endpoints` | GET/POST | List/create custom endpoints |
| `/api/endpoints/:id` | GET/PUT/DELETE | Single endpoint CRUD |
| `/api/endpoints/:id/test` | POST | Dry-run endpoint handler |
| `/api/db/status` | GET | Database stats |
| `/api/navigation` | GET | Service discovery (all URLs) |
| `/webhooks/twitch` | POST | Twitch EventSub handler |
| `/custom/*` | * | Dynamic custom endpoint handler |

Socket.IO events:

**Server → Client:**
| Event | Payload | Description |
|-------|---------|-------------|
| `chat-message` | `{ username, message, color, ... }` | New chat message |
| `new-subscriber` | `{ username, tier, months }` | Subscription |
| `new-follower` | `{ username, timestamp }` | New follower |
| `raid` | `{ username, viewers }` | Incoming raid |
| `alert` | `{ type, username, message }` | Alert triggered |
| `alert-settings` | `{ follow, subscribe, ... }` | Settings update |
| `recent-events` | `{ followers, subs, ... }` | Initial state |
| `overlay-update` | `{ type, settings }` | Overlay config change |
| `settings-changed` | `{ key, value, category?, deleted? }` | Setting written/deleted |
| `endpoint-created` | `{ id, name, path, ... }` | New custom endpoint |
| `endpoint-updated` | `{ id, name, path, ... }` | Endpoint modified |
| `endpoint-deleted` | `{ id }` | Endpoint removed |
| `<custom-event>` | `<user-defined>` | Dynamic event from endpoint builder |

**Client → Server:**
| Event | Payload | Description |
|-------|---------|-------------|
| `test-alert` | `{ type, username?, message? }` | Trigger test |
| `update-alert-settings` | `{ settings }` | Update config |
| `overlay-update` | `{ type, data }` | Update overlay |

---

## Data Flow

### Startup Sequence

```
1. User runs: npm start
   ↓
2. supervisor.js starts on port 4000
   - Initializes SQLite database (shared/database.js)
   - Runs migrations (shared/migrations.js)
   - Serves Vue admin from backend/public/
   ↓
3. Supervisor spawns: node backend/server.js
   ↓
4. Backend starts on port 4001
   - Loads .env configuration
   - Initializes database connection
   - Initializes Express + Socket.IO
   - Registers API routes + custom endpoint catch-all
   - Connects to Twitch (OAuth validation, tmi.js)
   ↓
5. Supervisor spawns: npm run dev (in frontend/)
   ↓
6. Frontend starts on port 5173
   - Vite dev server with HMR
   - Proxies /api and /socket.io to port 4001
   ↓
7. User accesses:
   - http://localhost:4000 → Admin Console (Vue)
   - http://localhost:5173 → Stream Manager (React)
   - http://localhost:5173/overlay?type=alerts → OBS Overlay
```

### Real-Time Event Flow

```
Twitch Event (follow, sub, chat, raid)
   ↓
tmi.js IRC client / EventSub webhook
   ↓
Backend event handler (server.js)
   ↓
Database insert (db.events.insert)
   ↓
Socket.IO broadcast to all connected clients
   ↓
Frontend Socket.IO client (socket.ts)
   ↓
React component state update → Dashboard + Overlay
   ↓
Mantine UI re-renders with new data
```

### Settings Sync Flow

```
Admin saves setting (PUT /api/settings/:key)
   ↓
Backend writes to DB (db.settings.set)
   ↓
io.emit('settings-changed', { key, value, category })
   ↓
Frontend App.tsx listener → applyTheme() / fontSize
   ↓
OBS Overlay listener → live update without refresh
```

### Custom Endpoint Event Flow

```
External trigger (curl, Stream Deck, webhook)
   ↓
POST /custom/{path} → backend catch-all
   ↓
executeHandler(type=event) → io.emit(eventName, data)
   ↓
Frontend EventFeed (Dashboard) → shows in live feed
   ↓
OBS Overlay → custom event popup (auto-dismiss)
```

### Admin Console → Supervisor Flow

```
Admin Console (Vue at :4000)
   ↓
fetch('/restart', { method: 'POST' })
   ↓
Supervisor API (port 4000)
   ↓
Supervisor kills and respawns backend process
   ↓
WebSocket broadcasts restart logs to admin console
```

---

## Component Architecture

### Supervisor (supervisor.js)

Single-file process manager:
- Spawns backend and frontend as child processes
- Captures stdout/stderr and broadcasts via WebSocket
- REST API for process control
- Hosts Vue admin UI (serves from backend/public/)
- Proxies /api/* and /webhooks/* to backend
- Database initialization and graceful shutdown
- Maintains log buffer for late-connecting clients

### Shared Database Layer (shared/)

SQLite database with WAL mode:
- **database.js**: Singleton connection, WAL mode, pragmas
- **schema.js**: Table definitions (settings, alert_configs, events, endpoints, analytics, _migrations)
- **migrations.js**: Version-based migration runner
- **index.js**: Query helpers for settings, alerts, events, analytics, endpoints

### Backend (backend/server.js)

Express server:
- **State Management**: In-memory buffers for recent events + DB persistence
- **Twitch Integration**: OAuth validation, token refresh, Helix API calls
- **Chat Client**: tmi.js for IRC connection
- **WebSocket**: Socket.IO for real-time frontend updates
- **Settings API**: CRUD with `settings-changed` Socket.IO broadcast
- **Endpoint Builder**: CRUD for custom endpoints + dynamic /custom/* catch-all
- **Handler Types**: json, redirect, webhook, event (with template resolution)

### Admin Console (backend/admin/)

Vue 3 application served by supervisor at port 4000:
- **App.vue**: Main layout with sidebar navigation
- **LiveTerminal**: WebSocket connection to supervisor for log streaming
- **ProcessManager**: Start/stop/restart buttons for services
- **StatusCard**: Display metrics (uptime, status, port)
- **LogViewer**: Filter and search logs
- **DatabaseStatus**: DB health, table counts, migration info
- **ConfigManager**: Settings CRUD with category filtering
- **EventViewer**: Event history browser with type filters
- **EndpointBuilder**: Visual custom endpoint creator
- **SettingsManager**: Category-based settings management

### Frontend (frontend/)

React 18 application with 5 views + OBS overlay:
- **Dashboard**: Stream stats, chat monitor, activity feed, EventFeed
- **Alerts**: Alert configuration, testing, history
- **Customizer**: Overlay design, theme selection, OBS URL generator
- **BackendDashboard**: System monitoring, terminal access
- **Overlay** (`/overlay`): Transparent OBS browser source page

#### Overlay Component

The overlay is a standalone page at `/overlay` designed for OBS browser sources:
- Transparent background for compositing
- URL params: `type` (alerts/chat), `primary`, `secondary`, `bg`, `fontSize`
- Subscribes to alerts, chat, custom endpoint events, settings changes
- Pure inline styles (no Mantine) for OBS compatibility
- CSS animations: fadeInUp for alerts, fadeIn for chat

#### EventFeed Component

Live feed of custom endpoint events on the Dashboard:
- Fetches enabled event-type endpoints on mount
- Subscribes dynamically via `socketService.onAnyCustomEvent()`
- Renders nothing until events arrive (lazy)
- Max 50 events, newest first

#### Socket Service

Enhanced Socket.IO client wrapper:
- Typed callbacks for all standard events
- `onSettingsChanged()` for live settings sync
- `on(eventName, callback)` — generic subscription for dynamic events
- `onAnyCustomEvent(names[], callback)` — multi-event subscription
- All subscription methods return unsubscribe functions

---

## Database Schema

```sql
-- Key-value settings with categories
settings (key TEXT PK, value TEXT, category TEXT, updated_at TEXT)

-- Alert configurations per type
alert_configs (type TEXT PK, enabled INT, sound INT, duration INT,
              volume REAL, custom_sound TEXT, custom_image TEXT,
              message_template TEXT, updated_at TEXT)

-- Event history (follows, subs, raids, donations, endpoint_call)
events (id INTEGER PK, type TEXT, username TEXT, data TEXT,
        created_at TEXT)

-- Custom endpoint definitions
endpoints (id INTEGER PK, name TEXT, path TEXT UNIQUE, method TEXT,
          handler TEXT, enabled INT, description TEXT,
          created_at TEXT, updated_at TEXT)

-- Aggregated metrics
analytics (id INTEGER PK, metric TEXT, value REAL, period TEXT,
          recorded_at TEXT)

-- Schema version tracking
_migrations (version INT PK, applied_at TEXT)
```

---

## Theme System

### Architecture

```
┌─────────────────────────────────────┐
│   themes.ts (Theme Definitions)     │
│   3 themes × 2 modes = 6 variants   │
│   - Magma Forge (red)               │
│   - Techno-Organic (amber)          │
│   - Synthetica (cool gray)          │
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│   CSS Custom Properties (:root)     │
│   --primary-bg, --surface, etc.     │
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│   ThemeSwitcher.tsx (UI)            │
│   Dropdown + light/dark toggle      │
└─────────────────┬───────────────────┘
                  ↓
┌────────────────────┬────────────────┐
│   localStorage     │   DB Settings  │
│   (fast fallback)  │   (source of   │
│                    │   truth)        │
└────────────────────┴────────────────┘
```

Settings sync: Admin can change theme via `overlay.theme` / `overlay.mode` settings. The `settings-changed` Socket.IO event propagates to all connected frontends and overlays in real-time.

### CSS Variables

```css
:root {
  /* Canvas */
  --primary-bg: #0a0a0a;
  --surface: #141414;
  --surface-elevated: #1f1f1f;

  /* Brand */
  --primary: #ff3b30;
  --secondary: #8b0000;
  --accent: #e5e5e5;

  /* Semantic */
  --success: #32d74b;
  --warning: #ff9f0a;
  --danger: #ff3b30;

  /* Typography */
  --text-primary: #ffffff;
  --text-secondary: #a1a1aa;
  --text-muted: #71717a;
}
```

---

## Security

### Authentication
- **Twitch OAuth 2.0**: Device code flow for initial setup
- **Token Storage**: .env file (gitignored)
- **Auto-Refresh**: Token refresh before expiry
- **Required Scopes**:
  - `channel:read:subscriptions`
  - `moderator:read:followers`
  - `chat:read`

### API Security
- **CORS**: Configured for localhost origins
- **EventSub Validation**: HMAC signature verification
- **No Auth on Local**: Supervisor/backend APIs are localhost-only
- **Endpoint Builder**: Path validation (alphanumeric, hyphens, underscores, slashes only)

### Environment Variables
```bash
# Required
TWITCH_CLIENT_ID=xxx
TWITCH_CLIENT_SECRET=xxx
TWITCH_OAUTH_TOKEN=xxx
TWITCH_REFRESH_TOKEN=xxx
TWITCH_CHANNEL=username
TWITCH_BOT_USERNAME=username
PORT=4001

# Optional
TWITCH_WEBHOOK_SECRET=xxx
WEBHOOK_URL=https://...
SUPERVISOR_URL=http://localhost:4000
```

---

## Deployment

### Development (Current)
```
npm start
→ Supervisor + Admin: http://localhost:4000
→ Backend API: http://localhost:4001
→ Frontend: http://localhost:5173
→ OBS Overlay: http://localhost:5173/overlay?type=alerts
```

### Production (Planned)
```
┌─────────────────────────────────────┐
│      Reverse Proxy (nginx)          │
│   stream.example.com                │
│   /api/* → backend:4001             │
│   /admin/* → supervisor:4000        │
│   /* → frontend static              │
└─────────────────────────────────────┘
          ↓
┌─────────────────────────────────────┐
│   PM2 Process Manager               │
│   - supervisor.js (cluster mode)    │
└─────────────────────────────────────┘
          ↓
┌─────────────────────────────────────┐
│   Built Static Files                │
│   - frontend/dist/                  │
│   - backend/public/                 │
└─────────────────────────────────────┘
```

---

## Future Architecture

### Integration Layer (Planned)
```
┌─────────────────────────────────────┐
│   Integration Manager               │
│   ├── OBS WebSocket                 │
│   ├── Stream Deck Plugin            │
│   ├── Discord Webhooks              │
│   └── Custom HTTP Endpoints ✓       │
└─────────────────────────────────────┘
```

---

**Last Updated:** February 1, 2026
