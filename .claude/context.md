# Claude Context - Worxed Stream Manager

**Last Updated:** January 28, 2026
**Project Status:** Active Development - Supervisor + Vue Admin + React Frontend

---

## Project Overview

**Worxed Stream Manager** is a self-hosted Twitch stream management system with real-time overlays and alerts. Replaces StreamElements/Streamlabs with complete control.

## Architecture (Current)

```
┌─────────────────────────────────────────────────────────────┐
│ SUPERVISOR (port 4000)                                      │
│ • Process manager for backend/frontend                      │
│ • WebSocket log streaming to admin console                  │
│ • REST: /status, /start, /stop, /restart, /start-all        │
│ • Graceful shutdown handling                                │
└──────────────────────────┬──────────────────────────────────┘
                           │ spawns & monitors
┌──────────────────────────▼──────────────────────────────────┐
│ BACKEND (port 4001)                                         │
│ • Express API (/api/*)                                      │
│ • Socket.IO WebSocket server (Twitch events to frontend)    │
│ • Vue Admin Console served at / (from backend/public/)      │
│ • Proxy: /supervisor/* → localhost:4000                     │
│ • Twitch OAuth + tmi.js chat + EventSub webhooks            │
└──────────────────────────┬──────────────────────────────────┘
                           │ WebSocket + REST
┌──────────────────────────▼──────────────────────────────────┐
│ STREAM MANAGER FRONTEND (port 5173)                         │
│ • React 18 + TypeScript + Mantine UI                        │
│ • Dashboard, Alerts, Customizer, Backend Console views      │
│ • Socket.IO client for real-time updates                    │
│ • Multi-theme system (3 themes × 2 modes)                   │
└─────────────────────────────────────────────────────────────┘
```

### Port Reference

| Port | Service | Notes |
|------|---------|-------|
| 4000 | Supervisor | Process control API |
| 4001 | Backend + Admin | API + Vue admin (production) |
| 4002 | Admin Dev | Vue dev server (npm run dev:admin) |
| 5173 | Frontend | React stream manager |

---

## Key Files

### Entry Point

- `supervisor.js` - Start here with `npm start`

### Backend

- `backend/server.js` - Express + Socket.IO + Twitch integration
- `backend/admin/src/App.vue` - Vue admin console
- `backend/admin/src/components/` - LiveTerminal, ProcessManager, StatusCard, LogViewer
- `backend/public/` - Built admin UI (served by Express)

### Frontend

- `frontend/src/App.tsx` - React root with 4-view navigation
- `frontend/src/components/Dashboard.tsx` - Stream stats, chat, activity
- `frontend/src/components/Alerts.tsx` - Alert configuration
- `frontend/src/components/Customizer.tsx` - Overlay designer
- `frontend/src/components/BackendDashboard.tsx` - System monitoring
- `frontend/src/services/socket.ts` - Socket.IO client
- `frontend/src/themes/themes.ts` - Theme definitions

### Configuration

- `.env` - Environment variables (PORT=4001)
- `backend/.env` - Backend-specific env (also PORT=4001)

### Documentation

- `README.md` - Getting started
- `ARCHITECTURE.md` - Technical details
- `COLORS.md` - Theme color specs
- `TASKS.md` - Roadmap and tasks

---

## Recent Session Work (Jan 28, 2026)

### Fixed Issues

1. **Port mismatch** - .env had PORT=3000, supervisor said 4001. Fixed to PORT=4001 everywhere.
2. **Admin proxy missing** - Backend wasn't proxying /supervisor/* to supervisor. Added proxy middleware.
3. **Admin buttons disabled** - isConnected was false because /supervisor/status failed. Fixed by adding proxy.

### Current State

- Supervisor starts backend + frontend automatically
- Admin console at localhost:4001 fully functional
- Process control (start/stop/restart) working
- Live terminal shows logs from all services

---

## Future Features (Planned)

### v1.1 - Core (Next Priority)

**Database Layer**

- SQLite for local storage (zero setup required)
- Schema: users, alerts, events, endpoints, analytics
- Data persistence for all configurations
- Backup/restore and export functionality

**Endpoint Builder**

- Visual API endpoint creator in admin console
- Custom webhook handlers (Discord, Slack, custom HTTP)
- OBS WebSocket command templates
- Drag-and-drop configuration
- Test and analytics for endpoints

### v1.2 - Integrations

**OBS WebSocket**

- Scene switching from dashboard
- Source visibility controls
- Recording/streaming status
- Custom hotkey triggers

**Stream Deck**

- Custom actions plugin
- Alert triggers from physical buttons
- Scene switching
- Quick stats display on LCD keys

### v1.3+ - The Dream

**Multi-Platform**

- YouTube Live + Kick integration
- Unified chat across platforms
- Platform-specific alert handling

**Ecosystem**

- Mobile companion app (React Native)
- Browser extension for quick controls
- Plugin system for community extensions
- Voice command integration
- Community theme/overlay gallery

See TASKS.md for complete roadmap and detailed task tracking.

---

## Development Commands

```bash
# Start everything (recommended)
npm start

# Individual services
npm run dev:admin      # Admin dev server (4002)
npm run dev:frontend   # Frontend dev server (5173)

# Build
npm run build:admin    # Build Vue admin to backend/public
npm run build:frontend # Build React frontend

# Install
npm run install:all    # Install all dependencies
```

---

## API Quick Reference

### Supervisor (4000)

```
GET  /status        - System status
POST /start         - Start backend
POST /stop          - Stop backend
POST /restart       - Restart backend
POST /frontend/start - Start frontend
POST /frontend/stop  - Stop frontend
POST /start-all     - Start everything
POST /stop-all      - Stop everything
```

### Backend (4001)

```
GET  /api/status     - Health check
GET  /api/stream     - Stream info
GET  /api/analytics  - Session stats
GET  /api/alerts     - Alert config
POST /api/alerts     - Update alerts
POST /api/test-alert - Trigger test
GET  /api/navigation - Service discovery
POST /webhooks/twitch - EventSub endpoint
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Supervisor | Node.js + ws (WebSocket) |
| Backend | Express 4.21 + Socket.IO 4.7 + tmi.js 1.8 |
| Admin UI | Vue 3 + Naive UI + Vite |
| Frontend | React 18 + TypeScript 5.6 + Mantine 7.15 + Vite 6 |
| Twitch | Helix API + IRC (tmi.js) + EventSub |

---

## Code Patterns

### Socket.IO Event Subscription (Frontend)

```typescript
useEffect(() => {
  const unsubscribe = socketService.on('eventName', (data) => {
    // Handle event
  });
  return () => unsubscribe();
}, []);
```

### Theme Application

```typescript
const applyTheme = (theme: Theme, mode: 'dark' | 'light') => {
  const colors = theme[mode];
  Object.entries(colors).forEach(([key, value]) => {
    document.documentElement.style.setProperty(`--${key}`, value);
  });
};
```

### Supervisor Process Control (Vue Admin)

```javascript
async function restartBackend() {
  await fetch('/supervisor/restart', { method: 'POST' });
}
```

---

## Important Notes

1. **Always use port 4001 for backend** - Both .env files set this
2. **Admin requires build** - Run `npm run build:admin` if backend/public is empty
3. **Supervisor auto-starts services** - Just run `npm start`
4. **Proxy handles supervisor calls** - Backend proxies /supervisor/* to port 4000

---

## User Preferences

- Accessibility first (Inter font, 18px base, readable on 2K monitors)
- Professional over gimmicky
- Self-hosted, no third-party dependencies
- Real-time everything via WebSocket
- Multi-theme support for eye comfort

---

## Session Continuity Checklist

When resuming work:

1. Check if services are running: `curl http://localhost:4000/status`
2. Review TASKS.md for current priorities
3. Check git status for uncommitted changes
4. Read this context file for architecture understanding
