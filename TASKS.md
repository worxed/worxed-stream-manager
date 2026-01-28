# Worxed Stream Manager - Tasks & Planning

## 🔴 Critical Issues

- [ ] Backend port conflict detection and handling
- [ ] WebSocket reconnection logic improvements
- [ ] Error boundary implementation for React components

## 🎨 Theme System Overhaul (High Priority)

### Phase 1: Multi-Theme Implementation

- [ ] Create 3 professional theme palettes:
  - [ ] **Magma Forge** (Console aesthetic) - High contrast, industrial
  - [ ] **Techno-Organic** (Amber aesthetic) - Warm amber tones
  - [ ] **Synthetica** (Monolith aesthetic) - Monochromatic, OLED-optimized
- [ ] Implement light/dark mode toggle for each theme
- [ ] Update `themes.ts` with comprehensive color palettes
- [ ] Add mode switcher UI component alongside theme selector
- [ ] Store theme + mode preference in localStorage

### Phase 2: Architecture Updates

- [ ] Implement gap-based layout system (12-16px between panels)
- [ ] Apply 85-90% opacity to sidebar for floating aesthetic
- [ ] Update AppShell spacing and panel styling
- [ ] Add panel elevation/shadow effects
- [ ] Test responsive behavior on different screen sizes

## 🎯 UI/UX Improvements

### Accessibility

- [x] Replace terminal font (VT323) with Inter for readability
- [x] Increase font sizes for 2K monitors (18px base)
- [ ] Add keyboard navigation support
- [ ] Implement focus indicators
- [ ] Test color contrast ratios (WCAG AA compliance)
- [ ] Add aria-labels to interactive elements

### Dashboard Enhancements

- [ ] Real-time viewer count display
- [ ] Stream uptime tracker
- [ ] Chat activity graph
- [ ] Quick stats cards (follows, subs, bits)
- [ ] Recent events timeline

### Alerts System

- [ ] Alert history viewer
- [ ] Test alert functionality
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

- [ ] Add process restart button
- [ ] Real-time log filtering
- [ ] Log export functionality
- [ ] System resource monitoring graphs
- [ ] Connection history table

## 🔧 Backend Features

### Twitch Integration

- [ ] Token refresh logic
- [ ] Channel points redemption handling
- [ ] Raid detection and alerts
- [ ] Hype train events
- [ ] Poll/Prediction integration

### Database Layer (High Priority)

- [ ] Implement SQLite for local storage (zero setup)
- [ ] Schema design:
  - [ ] `users` - User preferences, theme settings
  - [ ] `alerts` - Alert configurations per user
  - [ ] `events` - Event history (follows, subs, raids, donations)
  - [ ] `endpoints` - Custom endpoint definitions
  - [ ] `analytics` - Aggregated metrics and stats
- [ ] Alert history storage
- [ ] User preferences persistence
- [ ] Analytics data collection
- [ ] Backup/restore functionality
- [ ] Data export (JSON/CSV)

### Endpoint Builder (High Priority)

- [ ] Visual API endpoint creator in admin console
- [ ] Custom webhook handlers for external services
- [ ] Integration templates:
  - [ ] Discord webhooks (stream notifications)
  - [ ] OBS WebSocket commands
  - [ ] Custom HTTP callbacks
  - [ ] Slack notifications
- [ ] Drag-and-drop endpoint configuration
- [ ] Request/response mapping UI
- [ ] Test endpoint functionality
- [ ] Endpoint analytics (call counts, response times)

### API Endpoints

- [ ] GET /api/stream-info
- [ ] GET /api/alerts/history
- [ ] POST /api/alerts/test
- [ ] GET /api/analytics
- [ ] WebSocket event documentation

## 🏗️ Architecture & Code Quality

### Code Organization

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

## 📚 Documentation

- [ ] API documentation (endpoints, events)
- [ ] Component documentation (Storybook?)
- [ ] Setup guide for new users
- [ ] Environment variables reference
- [ ] Troubleshooting guide
- [ ] Architecture decision records (ADRs)

## 🚀 Feature Roadmap

### v1.1 - Core Stability

- Theme system overhaul (3 themes × 2 modes)
- Accessibility improvements (WCAG AA)
- SQLite database integration
- Better error handling & reconnection logic
- Endpoint builder (basic)

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

## 🐛 Known Bugs

- [ ] Port 3001 conflict when backend crashes
- [ ] WebSocket disconnect doesn't always trigger reconnect
- [ ] Theme switcher needs backend console case added to renderView
- [ ] React strict mode console warnings

## 💡 Ideas & Future Considerations

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

- 🔴 Critical - Blocks functionality
- 🎨 High - Significantly improves UX
- 🎯 Medium - Quality of life improvements
- 🚀 Low - Nice to have features

**Last Updated:** January 28, 2026
