# Worxed Stream Manager - Tasks & Planning

## Completed (v1.0 → v1.1)

### Database Layer
- [x] Implement SQLite for local storage (better-sqlite3, WAL mode)
- [x] Schema: settings, alert_configs, events, endpoints, analytics, _migrations
- [x] Alert history storage (DB-backed, replaces in-memory)
- [x] User preferences persistence (settings API)
- [x] Analytics data collection (analytics table + helpers)
- [x] Graceful shutdown (waits for child processes before closing DB)
- [x] Move admin UI from backend (4001) to supervisor (4000)
- [x] Supervisor proxies /api/* and /webhooks/* to backend

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

### Theme System
- [x] Create 3 professional theme palettes (Magma Forge, Techno-Organic, Synthetica)
- [x] Implement light/dark mode toggle for each theme (6 variants)
- [x] Update themes.ts with comprehensive color palettes
- [x] Mode switcher UI component alongside theme selector
- [x] Store theme + mode preference in localStorage
- [x] DB settings override localStorage (overlay.theme, overlay.mode)
- [x] Real-time theme propagation via settings-changed Socket.IO event

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

## In Progress

### Endpoint Builder (Admin UI Polish)
- [ ] Visual API endpoint creator improvements
- [ ] Integration templates:
  - [ ] Discord webhooks (stream notifications)
  - [ ] OBS WebSocket commands
  - [ ] Custom HTTP callbacks
  - [ ] Slack notifications
- [ ] Drag-and-drop endpoint configuration
- [ ] Request/response mapping UI
- [ ] Endpoint analytics (call counts, response times)

---

## Backlog

### Critical Issues
- [ ] Backend port conflict detection and handling
- [ ] WebSocket reconnection logic improvements
- [ ] Error boundary implementation for React components

### Theme System Polish
- [ ] Implement gap-based layout system (12-16px between panels)
- [ ] Apply 85-90% opacity to sidebar for floating aesthetic
- [ ] Update AppShell spacing and panel styling
- [ ] Add panel elevation/shadow effects
- [ ] Test responsive behavior on different screen sizes

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

### Overlay Customizer
- [ ] Live preview iframe
- [ ] Drag-and-drop positioning
- [ ] Font selection for overlays
- [ ] Animation speed controls
- [ ] Export/import overlay configs

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
- [ ] Bundle size optimization

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
- ~~Theme system (3 themes x 2 modes)~~ Done
- Endpoint builder UI polish
- Theme layout refinements (gaps, elevation)
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

**Last Updated:** February 1, 2026
