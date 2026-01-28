# Worxed Stream Manager - Architecture

## System Overview

Worxed Stream Manager is a full-stack streaming management platform with three main components: a process supervisor, a backend API server with embedded admin console, and a React-based stream manager frontend.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SUPERVISOR (port 4000)                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │  Process Mgmt   │  │  Health Checks  │  │  Log Streaming  │         │
│  │  start/stop/    │  │  /status API    │  │  WebSocket to   │         │
│  │  restart        │  │                 │  │  admin console  │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                              Node.js + ws                               │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ spawns & monitors
┌────────────────────────────────▼────────────────────────────────────────┐
│                         BACKEND (port 4001)                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │  Express API    │  │  Socket.IO      │  │  Vue Admin      │         │
│  │  /api/*         │  │  Real-time      │  │  Console (/)    │         │
│  │  /webhooks/*    │  │  events         │  │  built-in       │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │  tmi.js         │  │  Twitch OAuth   │  │  Supervisor     │         │
│  │  IRC Chat       │  │  + Helix API    │  │  Proxy          │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                        Node.js + Express + Socket.IO                    │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ WebSocket + REST
┌────────────────────────────────▼────────────────────────────────────────┐
│                    STREAM MANAGER FRONTEND (port 5173)                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │  Dashboard      │  │  Alerts         │  │  Customizer     │         │
│  │  Stream stats   │  │  Configuration  │  │  Overlay design │         │
│  │  Chat, Activity │  │  Testing        │  │  OBS URLs       │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│  ┌─────────────────┐                                                    │
│  │  Backend        │     React 18 + TypeScript + Mantine UI             │
│  │  Console        │     Socket.IO Client + REST API                    │
│  └─────────────────┘                                                    │
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
| **4000** | Supervisor | Node.js + ws | Process management, log streaming |
| **4001** | Backend + Admin | Express + Vue | API server, admin console |
| **4002** | Admin Dev | Vite | Admin console development only |
| **5173** | Frontend | Vite | Stream manager (React) |

---

## Tech Stack

### Supervisor
| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime |
| **ws** | WebSocket server for log streaming |
| **child_process** | Spawn and manage backend/frontend |

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
├── backend/
│   ├── server.js                 # Express + Socket.IO server
│   ├── admin/                    # Vue admin console source
│   │   ├── src/
│   │   │   ├── App.vue           # Main admin layout
│   │   │   ├── main.js           # Vue entry point
│   │   │   └── components/
│   │   │       ├── LiveTerminal.vue    # Real-time log viewer
│   │   │       ├── ProcessManager.vue  # Start/stop controls
│   │   │       ├── StatusCard.vue      # Metric display
│   │   │       └── LogViewer.vue       # Log filtering
│   │   ├── vite.config.js        # Builds to ../public
│   │   └── package.json
│   ├── public/                   # Built admin UI (served at /)
│   │   ├── index.html
│   │   └── assets/
│   ├── .env                      # Environment variables
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # Root component, 4-view navigation
│   │   ├── main.tsx              # React entry point
│   │   ├── index.css             # Global styles, CSS variables
│   │   ├── components/
│   │   │   ├── Dashboard.tsx     # Stream stats, chat, activity
│   │   │   ├── Alerts.tsx        # Alert configuration
│   │   │   ├── Customizer.tsx    # Overlay designer
│   │   │   ├── BackendDashboard.tsx  # System monitoring
│   │   │   └── ThemeSwitcher.tsx # Theme selection
│   │   ├── services/
│   │   │   ├── socket.ts         # Socket.IO client wrapper
│   │   │   └── api.ts            # REST API client
│   │   ├── themes/
│   │   │   ├── themes.ts         # Theme definitions
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
└── .claude/
    ├── context.md                # Claude session context
    └── settings.local.json       # Claude permissions
```

---

## Communication Architecture

### Supervisor API (port 4000)

REST endpoints for process control:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/status` | GET | Full system status (supervisor, backend, frontend) |
| `/start` | POST | Start backend server |
| `/stop` | POST | Stop backend server |
| `/restart` | POST | Restart backend server |
| `/frontend/start` | POST | Start frontend dev server |
| `/frontend/stop` | POST | Stop frontend dev server |
| `/frontend/restart` | POST | Restart frontend |
| `/start-all` | POST | Start all services |
| `/stop-all` | POST | Stop all services |

WebSocket for log streaming:
- Connects to admin console
- Broadcasts logs from backend/frontend stdout/stderr
- Maintains 100-entry log buffer for new connections

### Backend API (port 4001)

REST endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/status` | GET | Server health, Twitch connection status |
| `/api/stream` | GET | Current stream info, follower count |
| `/api/analytics` | GET | Session stats, recent activity |
| `/api/alerts` | GET | Alert configuration |
| `/api/alerts` | POST | Update alert settings |
| `/api/test-alert` | POST | Trigger test alert |
| `/api/navigation` | GET | Service discovery (all URLs) |
| `/api/health` | GET | Simple health check |
| `/webhooks/twitch` | POST | Twitch EventSub handler |
| `/supervisor/*` | * | Proxy to supervisor (port 4000) |

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
   ↓
3. Supervisor spawns: node backend/server.js
   ↓
4. Backend starts on port 4001
   - Loads .env configuration
   - Initializes Express + Socket.IO
   - Connects to Twitch (OAuth validation, tmi.js)
   - Serves Vue admin from /public
   ↓
5. Supervisor spawns: npm run dev (in frontend/)
   ↓
6. Frontend starts on port 5173
   - Vite dev server with HMR
   - Proxies /api and /socket.io to port 4001
   ↓
7. User accesses:
   - http://localhost:4001 → Admin Console (Vue)
   - http://localhost:5173 → Stream Manager (React)
```

### Real-Time Event Flow

```
Twitch Event (follow, sub, chat, raid)
   ↓
tmi.js IRC client / EventSub webhook
   ↓
Backend event handler (server.js)
   ↓
Socket.IO broadcast to all connected clients
   ↓
Frontend Socket.IO client (socket.ts)
   ↓
React component state update
   ↓
Mantine UI re-renders with new data
```

### Admin Console → Supervisor Flow

```
Admin Console (Vue at :4001)
   ↓
fetch('/supervisor/restart', { method: 'POST' })
   ↓
Backend proxy middleware
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

Single-file process manager (~200 lines):
- Spawns backend and frontend as child processes
- Captures stdout/stderr and broadcasts via WebSocket
- REST API for process control
- Graceful shutdown handling (SIGINT, SIGTERM)
- Maintains log buffer for late-connecting clients

### Backend (backend/server.js)

Express server (~550 lines):
- **State Management**: In-memory storage for recent events, alert settings
- **Twitch Integration**: OAuth validation, token refresh, Helix API calls
- **Chat Client**: tmi.js for IRC connection
- **WebSocket**: Socket.IO for real-time frontend updates
- **Proxy**: Routes /supervisor/* to supervisor API
- **Static Files**: Serves built Vue admin from /public

### Admin Console (backend/admin/)

Vue 3 application:
- **App.vue**: Main layout with sidebar navigation
- **LiveTerminal**: WebSocket connection to supervisor for log streaming
- **ProcessManager**: Start/stop/restart buttons for services
- **StatusCard**: Display metrics (uptime, status, port)
- **LogViewer**: Filter and search logs

### Frontend (frontend/)

React 18 application with 4 views:
- **Dashboard**: Stream stats, chat monitor, activity feed
- **Alerts**: Alert configuration, testing, history
- **Customizer**: Overlay design, theme selection, OBS URL generator
- **BackendDashboard**: System monitoring, terminal access

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
┌─────────────────────────────────────┐
│   localStorage                      │
│   worxed-theme, worxed-theme-mode   │
└─────────────────────────────────────┘
```

### CSS Variables

```css
:root {
  /* Canvas */
  --primary-bg: #0a0a0b;
  --surface: #141416;
  --surface-elevated: #1c1c1f;

  /* Brand */
  --primary: #ff3b30;
  --secondary: #ff6b35;
  --accent: #00fbff;

  /* Semantic */
  --success: #30d158;
  --warning: #ffd60a;
  --danger: #ff453a;

  /* Typography */
  --text-primary: #ffffff;
  --text-secondary: #a1a1a6;
  --text-muted: #636366;
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
→ Supervisor: http://localhost:4000
→ Backend + Admin: http://localhost:4001
→ Frontend: http://localhost:5173
```

### Production (Planned)
```
┌─────────────────────────────────────┐
│      Reverse Proxy (nginx)          │
│   stream.example.com                │
│   /api/* → backend:4001             │
│   /admin/* → backend:4001           │
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

### Database Layer (Planned)
```
┌─────────────────────────────────────┐
│   SQLite Database                   │
│   ├── users (preferences)           │
│   ├── alerts (configurations)       │
│   ├── events (history)              │
│   ├── endpoints (custom APIs)       │
│   └── analytics (metrics)           │
└─────────────────────────────────────┘
```

### Endpoint Builder (Planned)
```
Admin Console
    ↓
Endpoint Builder UI
    ↓
Store in SQLite
    ↓
Dynamic Express routes
    ↓
External Services (Discord, OBS, etc.)
```

### Integration Layer (Planned)
```
┌─────────────────────────────────────┐
│   Integration Manager               │
│   ├── OBS WebSocket                 │
│   ├── Stream Deck Plugin            │
│   ├── Discord Webhooks              │
│   └── Custom HTTP Endpoints         │
└─────────────────────────────────────┘
```

---

**Last Updated:** January 28, 2026
