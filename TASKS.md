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

### Database Layer
- [ ] Choose database (SQLite/PostgreSQL)
- [ ] Alert history storage
- [ ] User preferences persistence
- [ ] Analytics data collection
- [ ] Backup/restore functionality

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
- Theme system overhaul
- Accessibility improvements
- Database integration
- Better error handling

### v1.2 - Enhanced Features
- Advanced alert customization
- Analytics dashboard
- Multi-language support
- Plugin system architecture

### v1.3 - Community Features
- Shareable overlay templates
- Community theme gallery
- Alert sound library
- Integration marketplace

## 🐛 Known Bugs

- [ ] Port 3001 conflict when backend crashes
- [ ] WebSocket disconnect doesn't always trigger reconnect
- [ ] Theme switcher needs backend console case added to renderView
- [ ] React strict mode console warnings

## 💡 Ideas & Future Considerations

- OBS WebSocket integration
- Mobile companion app
- Browser extension for quick controls
- Stream deck integration
- Multi-platform support (YouTube, Kick)
- Cloud sync for settings
- Collaborative alert management
- Voice command integration

---

## Notes

**Priority Legend:**
- 🔴 Critical - Blocks functionality
- 🎨 High - Significantly improves UX
- 🎯 Medium - Quality of life improvements
- 🚀 Low - Nice to have features

**Last Updated:** January 28, 2026
