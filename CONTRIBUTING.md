# Contributing to Worxed Stream Manager

Thanks for your interest in contributing! This guide will help you get started.

## Project Structure

```
worxed-stream-manager/
├── supervisor.js         # Process manager - START HERE for architecture
├── backend/
│   ├── server.js         # Express API + Socket.IO + Twitch
│   └── admin/            # Vue admin console
├── frontend/             # React stream manager
├── ARCHITECTURE.md       # Technical deep-dive
├── TASKS.md              # Roadmap & task tracking
└── COLORS.md             # Theme specifications
```

## Quick Start for Contributors

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/worxed-stream-manager.git
cd worxed-stream-manager

# 2. Install dependencies
npm run install:all

# 3. Set up environment
cp .env.example .env
# Edit .env with your Twitch credentials (or use dummy values for UI work)

# 4. Start development
npm start

# 5. Access the apps
# Admin Console: http://localhost:4001
# Stream Manager: http://localhost:5173
```

## Development Workflow

### Ports Reference
| Port | Service | When to use |
|------|---------|-------------|
| 4000 | Supervisor | Process management changes |
| 4001 | Backend + Admin | API or Vue admin changes |
| 4002 | Admin Dev | `npm run dev:admin` for hot reload |
| 5173 | Frontend | React/UI changes |

### Running Individual Services

```bash
# Full stack (recommended)
npm start

# Just admin console with hot reload
npm run dev:admin

# Just frontend with hot reload
npm run dev:frontend

# Rebuild admin after changes
npm run build:admin
```

## Where to Contribute

### High Priority Areas (v1.1)

Check [TASKS.md](TASKS.md) for the full roadmap. Current priorities:

1. **Database Layer** - SQLite integration for persistent storage
2. **Endpoint Builder** - Visual API endpoint creator
3. **Theme System** - Implement 3 themes × 2 modes from COLORS.md

### Good First Issues

- UI polish and accessibility improvements
- Documentation improvements
- Bug fixes (see Known Bugs in TASKS.md)
- Test coverage

### Bigger Features

- OBS WebSocket integration
- Stream Deck plugin
- Multi-platform support (YouTube, Kick)

## Code Guidelines

### General
- Keep it simple - avoid over-engineering
- Match existing code style
- Test your changes manually before submitting

### Frontend (React)
- Functional components with hooks
- Use Mantine UI components
- Follow existing patterns in `frontend/src/components/`
- Theme colors via CSS variables (see `index.css`)

### Backend (Node.js)
- Express middleware patterns
- Socket.IO for real-time events
- Keep `server.js` organized by sections

### Admin Console (Vue)
- Vue 3 Composition API
- Naive UI components
- Build to `backend/public/` before committing

## Commit Messages

Format: `type: short description`

Types:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting, no code change
- `refactor:` - Code restructuring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add SQLite database layer
fix: resolve WebSocket reconnection issue
docs: update API endpoints in ARCHITECTURE.md
```

## Pull Request Process

1. **Branch from `main`** (or current development branch)
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** - Keep PRs focused on one thing

3. **Test locally**
   - Run `npm start` and verify everything works
   - Check both Admin (4001) and Frontend (5173)

4. **Update documentation** if needed
   - README.md for user-facing changes
   - ARCHITECTURE.md for structural changes
   - TASKS.md to mark completed items

5. **Submit PR** with clear description of:
   - What you changed
   - Why you changed it
   - How to test it

## Pull Request Template

When submitting a PR, include:

```markdown
## Summary
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Refactoring

## Changes Made
- Change 1
- Change 2

## Testing
How did you test this?

## Screenshots (if UI changes)

## Related Issues
Closes #XX
```

## Issue Template

When reporting bugs or requesting features:

```markdown
## Description
Clear description of the issue or feature

## For Bugs:
**Steps to reproduce:**
1. Go to...
2. Click on...
3. See error

**Expected behavior:**
What should happen

**Actual behavior:**
What actually happens

**Environment:**
- OS: Windows/Mac/Linux
- Node version:
- Browser:

## For Features:
**Use case:**
Why is this needed?

**Proposed solution:**
How should it work?
```

## Architecture Decisions

Before making significant changes, read [ARCHITECTURE.md](ARCHITECTURE.md) to understand:

- Why we have a separate supervisor process
- How the admin console and frontend are decoupled
- The WebSocket communication patterns
- Future plans (database, endpoint builder, integrations)

## Questions?

- Check existing documentation first
- Look at similar code in the project
- Open an issue for discussion on bigger changes

---

**Thanks for contributing!**
