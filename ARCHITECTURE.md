# 🏗️ Worxed Stream Manager - Architecture

## System Overview

Worxed Stream Manager is a full-stack web application for Twitch stream management, built with a modern client-server architecture using WebSocket communication for real-time updates.

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Dashboard   │  │   Alerts     │  │  Customizer  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐                                               │
│  │Backend Console│    Mantine UI + TypeScript + Vite           │
│  └──────────────┘                                               │
│                    Socket.IO Client ↕ REST API                  │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Node.js)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │Express Server│  │  Socket.IO   │  │  Twitch API  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │  TMI.js Chat │  │  Auth Layer  │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                       EXTERNAL SERVICES                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Twitch OAuth │  │ Twitch Helix │  │ Twitch Chat  │          │
│  │     API      │  │     API      │  │     IRC      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3.1 | UI framework |
| **TypeScript** | 5.6.2 | Type safety |
| **Vite** | 6.0.5 | Build tool & dev server |
| **Mantine UI** | 7.15.2 | Component library |
| **Socket.IO Client** | 4.7.5 | WebSocket communication |
| **Tabler Icons** | 3.30.0 | Icon system |
| **Inter Font** | - | Accessible typography |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Runtime environment |
| **Express** | 4.21.2 | HTTP server framework |
| **Socket.IO** | 4.7.5 | WebSocket server |
| **tmi.js** | 1.8.5 | Twitch chat client |
| **node-fetch** | - | HTTP requests (Twitch API) |
| **CORS** | 2.8.5 | Cross-origin resource sharing |

---

## Project Structure

```
worxed-stream-manager/
├── frontend/                      # React TypeScript frontend
│   ├── src/
│   │   ├── components/           # React components
│   │   │   ├── Dashboard.tsx     # Main stream dashboard
│   │   │   ├── Alerts.tsx        # Alert configuration
│   │   │   ├── Customizer.tsx    # Overlay customizer
│   │   │   ├── BackendDashboard.tsx  # Backend monitoring
│   │   │   └── ThemeSwitcher.tsx # Theme selection (WIP)
│   │   ├── services/             # API & Socket services
│   │   │   ├── socket.ts         # Socket.IO client wrapper
│   │   │   └── api.ts            # REST API client
│   │   ├── themes/               # Theme system (WIP)
│   │   │   ├── themes.ts         # Theme definitions
│   │   │   └── worxed.ts         # Mantine theme config
│   │   ├── types/                # TypeScript type definitions
│   │   ├── App.tsx               # Root application component
│   │   ├── main.tsx              # Application entry point
│   │   └── index.css             # Global styles & CSS variables
│   ├── public/                   # Static assets
│   ├── index.html                # HTML entry point
│   ├── vite.config.ts            # Vite configuration
│   ├── tsconfig.json             # TypeScript configuration
│   └── package.json              # Frontend dependencies
│
├── backend/                       # Node.js Express backend
│   ├── server.js                 # Main server file (511 lines)
│   ├── public/                   # Legacy overlay HTML files
│   │   ├── overlay.html          # Standard alert overlays
│   │   ├── overlay-worxed.html   # Custom overlays
│   │   ├── alerts-manager.html   # Alert management
│   │   └── customizer.html       # Overlay customization
│   ├── .env                      # Environment variables (gitignored)
│   ├── env.example               # Environment template
│   └── package.json              # Backend dependencies
│
├── scripts/                       # Utility scripts
│   ├── setup-production-auth.js  # OAuth device flow setup
│   └── setup-github-project.js   # GitHub project automation
│
├── TASKS.md                       # Project tasks & roadmap
├── COLORS.md                      # Color system reference
├── ARCHITECTURE.md                # This file
├── README.md                      # Project documentation
└── package.json                   # Workspace root
```

---

## Communication Architecture

### REST API (HTTP)
**Port:** 3001  
**Purpose:** Initial data fetching, configuration, testing

#### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/status` | GET | Server health check & connection status |
| `/api/stream` | GET | Current stream info & follower count |
| `/api/analytics` | GET | Session analytics & recent activity |
| `/api/alerts` | GET | Retrieve alert configuration |
| `/api/alerts` | POST | Update alert settings |
| `/api/test-alert` | POST | Trigger test alert |
| `/webhooks/twitch` | POST | Twitch EventSub webhook handler |

### WebSocket (Socket.IO)
**Port:** 3001 (same server as REST)  
**Purpose:** Real-time bidirectional communication

#### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `getStatus` | - | Request server status |
| `getStreamInfo` | - | Request current stream data |
| `testAlert` | `{ type, data }` | Trigger test alert |
| `updateAlertSettings` | `{ settings }` | Update alert configuration |

#### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `status` | `{ connected, twitchAuth, ... }` | Server status update |
| `streamUpdate` | `{ viewerCount, followers, ... }` | Live stream metrics |
| `newFollower` | `{ username, timestamp }` | New follower alert |
| `newSubscriber` | `{ username, tier, ... }` | Subscription alert |
| `chatMessage` | `{ username, message, ... }` | Chat activity |
| `alertTriggered` | `{ type, data }` | Alert notification |

---

## Data Flow

### Application Startup

```
1. Frontend (Vite Dev Server) starts on port 5173
   ↓
2. React app loads, renders App.tsx
   ↓
3. App.tsx initializes Socket.IO connection to localhost:3001
   ↓
4. Backend (Express + Socket.IO) running on port 3001
   ↓
5. Backend connects to Twitch IRC via tmi.js
   ↓
6. Backend authenticates with Twitch Helix API
   ↓
7. WebSocket connection established
   ↓
8. Frontend receives initial status and begins listening for events
```

### Real-Time Event Flow

```
Twitch IRC/API Event
   ↓
tmi.js / Twitch API Client
   ↓
Backend Event Handler (server.js)
   ↓
Socket.IO Server broadcasts event
   ↓
Socket.IO Client (frontend/src/services/socket.ts)
   ↓
React Component (Dashboard.tsx, Alerts.tsx, etc.)
   ↓
UI Update (Mantine components re-render)
```

---

## Component Architecture

### Frontend Components

#### App.tsx (Root Component)
- Manages routing between 4 main views
- Handles WebSocket connection lifecycle
- Provides connection status indicator
- Theme system initialization

#### Dashboard.tsx
- Real-time stream statistics
- Activity feed (follows, subs, raids)
- Chat message monitor
- Uses multiple WebSocket subscriptions

#### Alerts.tsx
- Alert configuration interface
- Alert history viewer
- Test alert functionality
- Settings persistence

#### Customizer.tsx
- Live overlay preview
- Theme selection
- Layout configuration
- URL generation for OBS

#### BackendDashboard.tsx
- Backend process monitoring
- System metrics display
- Terminal with command execution
- Log viewer with filtering

---

## Theme System Architecture

### Current Implementation (Transitioning)

```
┌──────────────────────────────────────┐
│     CSS Custom Properties (:root)    │
│  --primary-bg, --fire-red, etc.      │
└──────────────────────────────────────┘
                ↕
┌──────────────────────────────────────┐
│    themes.ts (Theme Definitions)     │
│  { magma, techno, synthetica }       │
└──────────────────────────────────────┘
                ↕
┌──────────────────────────────────────┐
│  ThemeSwitcher.tsx (UI Component)    │
│  Dropdown menu for theme selection   │
└──────────────────────────────────────┘
                ↕
┌──────────────────────────────────────┐
│   localStorage (Theme Persistence)   │
│  Key: 'selectedTheme'                │
└──────────────────────────────────────┘
```

### Planned: Light/Dark Mode Support

```typescript
interface ThemeConfig {
  name: string;
  mode: 'light' | 'dark';
  colors: ThemeColors;
}

// Usage
applyTheme('magmaForge', 'dark');
applyTheme('technoOrganic', 'light');
```

---

## Security Architecture

### Authentication
- **OAuth 2.0**: Twitch authentication flow
- **Token Storage**: Environment variables (.env)
- **Token Refresh**: Automatic refresh on expiry
- **Scopes Required**: 
  - `channel:read:subscriptions`
  - `moderator:read:followers`
  - `chat:read`

### API Security
- **CORS**: Configured for localhost development
- **Webhook Validation**: HMAC signature verification
- **Environment Variables**: Sensitive data in .env (gitignored)

---

## Performance Considerations

### Frontend Optimization
- **Code Splitting**: Vite automatic chunking
- **Lazy Loading**: Route-based component loading (planned)
- **Memoization**: React.memo for expensive components (planned)
- **Debouncing**: User input optimization (planned)

### Backend Optimization
- **Event Throttling**: Limit WebSocket message frequency
- **Connection Pooling**: Reuse Twitch API connections
- **Caching**: Stream data caching (planned)
- **Memory Management**: Clean up old event logs

### WebSocket Optimization
- **Binary Protocol**: Socket.IO binary support
- **Compression**: WebSocket compression enabled
- **Heartbeat**: Connection keep-alive
- **Reconnection**: Exponential backoff strategy

---

## Deployment Architecture

### Development
```
Frontend: http://localhost:5173 (Vite dev server)
Backend:  http://localhost:3001 (Node.js Express)
```

### Production (Planned)
```
┌─────────────────────────────────────────┐
│         Reverse Proxy (nginx)           │
│    https://stream.worxed.com            │
└─────────────────────────────────────────┘
                  ↓
    ┌─────────────────────────┐
    │   Frontend (Static)     │
    │   Vite Build Output     │
    └─────────────────────────┘
                  ↓
    ┌─────────────────────────┐
    │   Backend (PM2)         │
    │   Node.js Process       │
    └─────────────────────────┘
                  ↓
    ┌─────────────────────────┐
    │   Twitch API            │
    └─────────────────────────┘
```

---

**Last Updated:** January 28, 2026
