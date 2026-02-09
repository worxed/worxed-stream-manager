# Schnukums — AI Stream Companion Engine

An AI-powered stream companion that connects to the [Worxed Stream Manager](https://github.com/worxed/worxed-stream-manager) backend, processes stream events in real-time, and maintains a dynamic personality state.

## Architecture

```
┌─────────────────────────────────────────────┐
│           Worxed Backend (:4001)            │
│  Socket.IO server (chat, follows, subs...)  │
└──────────────┬──────────────────────────────┘
               │ Socket.IO client
┌──────────────▼──────────────────────────────┐
│         Schnukums Engine (:4003)            │
│                                             │
│  engine.py ──► events.py (mood + state)     │
│           ──► personality.py (Anthropic)    │
│           ──► voice.py (Sesame TTS stub)    │
│                                             │
│  GET /status  → current CompanionState      │
│  GET /health  → connection + feature status │
└─────────────────────────────────────────────┘
```

Schnukums is a **standalone Python process** that connects to the existing Worxed backend as an external Socket.IO client — just like the frontend does. It doesn't modify or depend on any Worxed source files.

## Features

- **Mood system** — Energy, positivity, and engagement values (0-100) that shift based on stream activity
- **Expression states** — 12 expressions (idle, happy, excited, snarky, thinking, surprised, sad, angry, sleepy, love, laughing, cat_face) driven by events
- **Mood decay** — Without stream activity, energy and engagement gradually decrease
- **Personality engine** — Anthropic Claude generates reactions and chat responses in-character
- **Rate limiting** — Won't spam the API on every chat message; configurable cooldowns
- **Health API** — HTTP endpoints for monitoring companion state
- **Voice scaffold** — Prepared for Sesame TTS integration (requires CUDA GPU)

## Setup

```bash
cd companion
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
```

## Configuration

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_URL` | `http://localhost:4001` | Worxed backend Socket.IO URL |
| `ANTHROPIC_API_KEY` | *(empty)* | Anthropic API key (optional — runs in silent mode without it) |
| `COMPANION_PORT` | `4003` | Health API port |
| `COMPANION_NAME` | `Schnukums` | Companion character name |
| `PERSONALITY_PRESET` | `snarky` | Personality style: `chill`, `hype`, or `snarky` |
| `REACTION_COOLDOWN_SECONDS` | `5.0` | Min seconds between event reactions |
| `CHAT_RESPONSE_COOLDOWN_SECONDS` | `10.0` | Min seconds between chat replies |
| `REACTION_MODEL` | `claude-haiku-4-5-20251001` | Model for quick event reactions |
| `CHAT_MODEL` | `claude-sonnet-4-5-20250929` | Model for chat responses |

## Running

```bash
# Make sure Worxed backend is running first
# (from worxed-stream-manager root: npm start)

python engine.py
```

The engine will:
1. Connect to the backend via Socket.IO
2. Listen for stream events (chat, follows, subs, raids, alerts)
3. Update mood and expression state in real-time
4. Generate personality-driven reactions if an API key is configured
5. Serve current state at `http://localhost:4003/status`

### Silent mode

Without an `ANTHROPIC_API_KEY`, the engine runs in **silent mode**: it processes events and updates mood/expression state, but doesn't generate text reactions. This is useful for development and testing the event pipeline.

## API Endpoints

### `GET /status`
Returns current companion state:
```json
{
  "mood": {
    "energy": 65.0,
    "positivity": 72.3,
    "engagement": 45.0,
    "current_expression": "happy"
  },
  "last_event": {
    "type": "new-follower",
    "username": "cool_viewer",
    "message": "",
    "amount": 0.0,
    "timestamp": 1738972800.0
  },
  "is_speaking": false,
  "current_response": "",
  "uptime": 3600.1
}
```

### `GET /health`
Returns engine health:
```json
{
  "status": "ok",
  "connected": true,
  "name": "Schnukums",
  "voice_available": false,
  "personality_enabled": true
}
```

## Tests

```bash
python -m pytest tests/ -v
# or
python -m unittest tests.test_events -v
```

## Future

- **Sesame voice synthesis** — GPU-accelerated TTS for spoken reactions (voice.py scaffold ready)
- **OBS overlay integration** — Visual companion avatar driven by expression state
- **Supervisor management** — Add as a managed process in the Worxed supervisor
- **Custom triggers** — React to custom endpoint events from the Endpoint Builder
