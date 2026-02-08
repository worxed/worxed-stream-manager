# Worxed Stream Manager - Tasks & Planning

## Completed (v1.0 → v1.1)

### Database Layer

- [x] Implement SQLite for local storage (better-sqlite3, WAL mode)
- [x] Schema: settings, alert_configs, events, endpoints, analytics,_migrations
- [x] Alert history storage (DB-backed, replaces in-memory)
- [x] User preferences persistence (settings API)
- [x] Analytics data collection (analytics table + helpers)
- [x] Graceful shutdown (waits for child processes before closing DB)
- [x] Move admin UI from backend (4001) to supervisor (4000)
- [x] Supervisor proxies /api/*and /webhooks/* to backend

### Endpoint Builder (Backend)

- [x] CRUD API for custom endpoints (/api/endpoints)
- [x] Dynamic /custom/* catch-all route handler
- [x] Handler types: json, redirect, webhook, event
- [x] Template resolution ({{body.key}}, {{query.key}}, etc.)
- [x] Dry-run endpoint testing (/api/endpoints/:id/test)
- [x] Path validation and duplicate detection
- [x] Socket.IO events for endpoint CRUD changes

### Settings & Endpoint Integration (Frontend ↔ Backend)

- [x] Backend emits `settings-changed` on PUT/DELETE settings
- [x] Frontend types: SettingEntry, SettingsChangedEvent, CustomEndpoint, CustomEvent
- [x] Frontend API client: getSettings(), getEndpoints()
- [x] Socket service: onSettingsChanged(), generic on(), onAnyCustomEvent()
- [x] App.tsx: live settings sync (overlay.theme, overlay.mode, overlay.fontSize)
- [x] EventFeed component on Dashboard (live custom endpoint events)
- [x] OBS Overlay page (/overlay route) with alert + chat + custom event modes
- [x] Overlay uses transparent background, inline styles, CSS animations

### UI Migration (Mantine → PrimeReact + Tailwind v4)

- [x] Remove Mantine, install PrimeReact + Tailwind CSS v4
- [x] PrimeReact unstyled/passthrough mode — all styling via Tailwind CSS
- [x] CSS bridge in index.css mapping PrimeReact classes → CSS variables
- [x] Delete old ShadCN ui/ component directory
- [x] New components: ColorPicker, EmptyState, toast service
- [x] Remove stale Mantine files (worxed.ts, postcss.config.js)

### Multi-Theme System

- [x] 4 themes: zinc (default), synthetica, magma, arctic
- [x] Light/dark mode for each theme (8 combinations)
- [x] CSS-variable theming via Tailwind v4 @theme + [data-theme] selectors
- [x] ThemePicker with PrimeReact OverlayPanel, color swatches, mode toggle
- [x] applyTheme() / initTheme() with localStorage + DB settings sync
- [x] Real-time theme propagation via settings-changed Socket.IO event

### Layout & Polish

- [x] Content constrained to max-w-6xl (~80% on 2K monitors)
- [x] Glass header (bg-card/80 backdrop-blur-md)
- [x] Ambient background orbs (CSS gradients, theme-aware)
- [x] Page transitions (CSS view-enter animation on tab switch)
- [x] Skeleton loading states (Dashboard initial load)
- [x] Top navigation with centered tabs, bottom-border active indicator
- [x] All animations respect prefers-reduced-motion

### Scene Editor + Overlay Renderer

- [x] Scene database layer (migration v2: scenes table)
- [x] Scene query helpers (db.scenes: getAll, get, getActive, create, update, delete, activate)
- [x] Scene REST API (7 endpoints: CRUD + activate)
- [x] Scene Socket.IO events (scene-created/updated/deleted/activated)
- [x] Scene types (ElementType, SceneElement, Scene + config interfaces)
- [x] Scene API client + socket event listeners
- [x] Element renderers: AlertBox (queue, auto-dismiss), Chat (scrolling), Text, Image
- [x] Overlay.tsx rewrite — scene-based renderer, loads active scene, live sync
- [x] Migrated from react-rnd (DOM) to react-konva (canvas) + Zustand (centralized state)
- [x] KonvaCanvas: Stage/Layer/Transformer, zoom-to-fit, keyboard shortcuts
- [x] KonvaElement: Group + Rect/Text/Image per element type
- [x] editorStore: Zustand with scene CRUD, element CRUD, multi-select, undo/redo, clipboard, auto-save
- [x] ElementToolbox: add elements + layers (visibility/lock/reorder)
- [x] PropertiesPanel: position, size, rotation, style, type-specific config, data binding

### Editor UX Enhancements

- [x] Testing panel: fire test alerts, chat messages, custom events from editor
- [x] Backend test endpoints: POST /api/test-chat, POST /api/test-event
- [x] Pop-out preview: state tracking, focus existing window, green indicator
- [x] Customizable canvas resolution: presets (1080p, 1440p, 720p) + custom dimensions
- [x] Resolution stored per-scene, syncs to overlay via auto-save
- [x] Undo/redo includes resolution changes
- [x] Better canvas previews: alert-box mockup (title + username), chat (fake chat lines)
- [x] Canvas letterbox: dim overlay outside bounds, center crosshair guides, resolution label
- [x] Floating side panels: toolbox + properties float over canvas (no rescaling on open/close)

### Remove Tailwind CSS + Dependency Upgrades

- [x] Remove `@import "tailwindcss"` and `@theme` block from index.css
- [x] Add ~250 lines of hand-written utility CSS classes (same names as Tailwind)
- [x] Fix `var(--color-*)` → `var(--*)` references throughout index.css
- [x] Fix Tailwind-specific syntax in TSX (arbitrary values → inline styles)
- [x] Remove `@tailwindcss/vite` from vite.config.ts and package.json
- [x] Upgrade React 18 → 19.2, react-konva 18 → 19.2
- [x] Upgrade Vite 6/5 → 7.3 (frontend + admin)
- [x] Upgrade TypeScript 5.6 → 5.8
- [x] Upgrade all other deps (lucide-react, socket.io, express, vue, naive-ui, etc.)
- [x] Fix React 19 type errors (KonvaEventObject MouseEvent → MouseEvent | TouchEvent)
- [x] Update engines.node >=18 → >=20 (Vite 7 requirement)
- [x] Add esbuild to pnpm.onlyBuiltDependencies
- [x] Fix backend package.json scripts: npm → pnpm

### Accessibility

- [x] Replace terminal font (VT323) with Inter for readability
- [x] Increase font sizes for 2K monitors (18px base)

### Admin Console Components

- [x] DatabaseStatus - DB health, table counts, migration info
- [x] ConfigManager - Settings CRUD with category filtering
- [x] EventViewer - Event history browser with type filters
- [x] EndpointBuilder - Visual custom endpoint creator
- [x] JsonDesigner - JSON payload editor
- [x] SettingsManager - Category-based settings UI

---

## Backlog

### Critical Issues

- [ ] Backend port conflict detection and handling
- [ ] WebSocket reconnection logic improvements
- [ ] Error boundary implementation for React components

### Responsive Layout

- [ ] Mobile/tablet breakpoints for all views
- [ ] Narrow viewport testing
- [ ] Touch-friendly scene editor controls

### Accessibility

- [ ] Add keyboard navigation support
- [ ] Implement focus indicators
- [ ] Test color contrast ratios (WCAG AA compliance)
- [ ] Add aria-labels to interactive elements

### Dashboard Enhancements

- [ ] Real-time viewer count display
- [ ] Stream uptime tracker
- [ ] Chat activity graph
- [ ] Quick stats cards (follows, subs, bits)

### Alerts System

- [ ] Alert history viewer
- [ ] Sound preview for alerts
- [ ] Alert queue management
- [ ] Custom alert templates

### Scene Editor Polish

- [ ] Element snapping/guides (snap to center, edges, other elements)
- [ ] Element grouping
- [ ] Element copy/paste between scenes
- [ ] Scene import/export (JSON)
- [ ] Element templates/presets

### Endpoint Builder (Admin UI Polish)

- [ ] Visual API endpoint creator improvements
- [ ] Integration templates (Discord, OBS, Slack)
- [ ] Endpoint analytics (call counts, response times)

### Backend Console

- [ ] Real-time log filtering
- [ ] Log export functionality
- [ ] System resource monitoring graphs
- [ ] Connection history table

### Database

- [ ] Backup/restore functionality
- [ ] Data export (JSON/CSV)

### Twitch Integration

- [ ] Channel points redemption handling
- [ ] Hype train events
- [ ] Poll/Prediction integration

### Code Quality

- [ ] Separate concerns (hooks, utils, constants)
- [ ] Create custom hooks for socket management
- [ ] Add TypeScript strict mode
- [ ] Implement error boundary components
- [ ] Add loading states for async operations

### Performance

- [ ] Implement React.memo for heavy components
- [ ] Lazy load dashboard components
- [ ] Optimize WebSocket message handling
- [ ] Add debouncing for user inputs
- [ ] Bundle size optimization (code splitting)

### Testing

- [ ] Set up Vitest for unit tests
- [ ] Add component tests (React Testing Library)
- [ ] Integration tests for API routes
- [ ] E2E tests for critical flows
- [ ] WebSocket connection tests

### Documentation

- [ ] API documentation (endpoints, events)
- [ ] Setup guide for new users
- [ ] Troubleshooting guide

---

## Feature Roadmap

### v1.1 - Core Stability (Current)

- ~~SQLite database integration~~ Done
- ~~Endpoint builder (backend CRUD + handler)~~ Done
- ~~Settings & endpoint frontend integration~~ Done
- ~~OBS overlay page~~ Done
- ~~Theme system (4 themes x 2 modes)~~ Done
- ~~PrimeReact UI migration~~ Done
- ~~Scene editor + overlay renderer~~ Done
- ~~react-konva + Zustand migration~~ Done
- ~~Editor UX: testing, preview, resolution, canvas guides~~ Done
- ~~Remove Tailwind CSS~~ Done (replaced with hand-written utility CSS)
- ~~Upgrade all dependencies~~ Done (React 19, Vite 7, TypeScript 5.8)
- Responsive layout (mobile/tablet)
- WebSocket reconnection + error boundaries
- Port conflict detection

### v1.2 - Integrations & Data

- **OBS WebSocket Integration**
  - Scene switching from dashboard
  - Source visibility controls
  - Recording/streaming status
  - Custom hotkey triggers
- **Stream Deck Integration**
  - Custom actions plugin
  - Alert triggers
  - Scene switching
  - Quick stats display
- Advanced alert customization
- Analytics dashboard with charts
- Data export/import

### v1.3 - Advanced Features

- **Multi-Platform Support**
  - YouTube Live integration
  - Kick integration
  - Unified chat view
- Plugin system architecture
- Custom widget builder
- Multi-language support (i18n)

### v1.4 - Community & Cloud

- Shareable overlay templates
- Community theme gallery
- Alert sound library
- Integration marketplace
- Cloud sync for settings (optional)
- Collaborative alert management

### v1.5 - Extended Ecosystem

- Mobile companion app (React Native)
- Browser extension for quick controls
- Voice command integration
- Twitch Extension companion
- API for third-party developers

---

## Known Bugs

- [ ] Port conflict when backend crashes (no detection/handling)
- [ ] WebSocket disconnect doesn't always trigger reconnect
- [ ] React strict mode console warnings

---

## Ideas & Future Considerations

### Integrations (Exploring)

- Spotify Now Playing widget
- Discord Rich Presence
- Twitter/X auto-post on go-live
- Streamlabs/StreamElements migration tool
- IFTTT/Zapier webhooks
- Home Assistant integration (smart lights on alerts)

### Advanced Features (Dreaming)

- AI-powered chat moderation
- Automatic highlight clipping
- Viewer engagement analytics
- Heat map of chat activity
- Sentiment analysis for chat
- Auto-generated stream summaries
- Multi-camera/multi-source preview

### Monetization Tools

- Donation goal trackers
- Sub goal widgets
- Merch integration
- Patreon/Ko-fi integration
- Crypto donation support

### Accessibility & Inclusion

- Screen reader optimization
- Colorblind mode themes
- High contrast options
- Reduced motion mode
- Multi-language chat translation

---

## Notes

**Priority Legend:**

- Critical - Blocks functionality
- High - Significantly improves UX
- Medium - Quality of life improvements
- Low - Nice to have features

**Last Updated:** February 8, 2026
