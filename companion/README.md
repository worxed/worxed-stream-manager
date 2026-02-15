# Vesper Astra — AI Stream Companion Engine

An AI-powered stream companion that connects to the [Worxed Stream Manager](https://github.com/worxed/worxed-stream-manager) backend, processes stream events in real-time, and maintains a dynamic personality with voice synthesis.

## Architecture

```
┌─────────────────────────────────────────────┐
│           Worxed Backend (:4001)            │
│  Socket.IO server (chat, follows, subs...)  │
└──────────────┬──────────────────────────────┘
               │ Socket.IO client
┌──────────────▼──────────────────────────────┐
│         Vesper Engine (:4003)               │
│                                             │
│  engine.py ──► events.py (mood + state)     │
│           ──► personality.py (Ollama/Mistral)│
│           ──► voice.py (Chatterbox-Turbo)   │
│                                             │
│  GET /status  → current CompanionState      │
│  GET /health  → connection + feature status │
└─────────────────────────────────────────────┘
```

Vesper is a **standalone Python process** that connects to the existing Worxed backend as an external Socket.IO client — just like the frontend does. It doesn't modify or depend on any Worxed source files.

## Features

- **Mood system** — Energy, positivity, and engagement values (0-100) that shift based on stream activity
- **Expression states** — 12 expressions (idle, happy, excited, snarky, thinking, surprised, sad, angry, sleepy, love, laughing, cat_face) driven by events
- **Mood decay** — Without stream activity, energy and engagement gradually decrease
- **Personality engine** — Ollama (Mistral) generates reactions and chat responses in-character with 5 personality presets and 6 relationship dynamics
- **Voice synthesis** — Chatterbox-Turbo TTS with trained voice profile (GPU required, ROCm/CUDA)
- **Trained voice profile** — Averaged speaker embedding from 836 clips (35.5 min audio) for consistent voice identity
- **Rate limiting** — Configurable cooldowns for reactions and chat responses
- **Health API** — HTTP endpoints for monitoring companion state

## Setup

```bash
cd companion

# WSL2 (recommended for AMD GPU / ROCm)
python -m venv venv-wsl
source venv-wsl/bin/activate.fish  # fish shell
# or: source venv-wsl/bin/activate  # bash

pip install -r requirements.txt
```

### GPU Requirements (Voice)

Voice synthesis requires a CUDA or ROCm GPU with ~3.2 GB VRAM.

**ROCm (AMD 7900 XTX on WSL2):**
- ROCm 6.4.2.1 with `--usecase=wsl --no-dkms`
- PyTorch from `repo.radeon.com/rocm/manylinux/rocm-rel-6.4.2/`
- Remove PyTorch's bundled `libhsa-runtime64.so`
- Env: `LD_LIBRARY_PATH=/opt/rocm-6.4.2/lib:/opt/rocm/lib`, `HSA_ENABLE_SDMA=0`

See `MEMORY.md` notes for the full ROCm setup.

## Configuration

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_URL` | `http://localhost:4001` | Worxed backend Socket.IO URL |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama API endpoint |
| `LLM_MODEL` | `mistral` | Ollama model for personality responses |
| `COMPANION_PORT` | `4003` | Health API port |
| `COMPANION_NAME` | `Vesper Astra` | Companion character name |
| `STREAMER_NAME` | `redisbananas` | Streamer's display name |
| `PERSONALITY_PRESET` | `snarky` | Personality: `chill`, `hype`, `snarky`, `inappropriate`, `sensual` |
| `RELATIONSHIP_DYNAMIC` | `ride_or_die` | Dynamic: `ride_or_die`, `flirty`, `competitive`, `protective`, `chaotic`, `tender` |
| `REACTION_COOLDOWN_SECONDS` | `5.0` | Min seconds between event reactions |
| `CHAT_RESPONSE_COOLDOWN_SECONDS` | `10.0` | Min seconds between chat replies |

## Running

### Full Engine (stream companion)

```bash
# Make sure Worxed backend + Ollama are running
python engine.py           # with voice
python engine.py --no-voice  # text-only (no GPU needed)
```

### Interactive Chat (testing)

```bash
python vesper_chat.py           # text + voice
python vesper_chat.py --no-voice  # text only
```

Talk directly to Vesper in your terminal. She uses the full personality engine and trained voice profile.

### Voice Lab UI

```bash
python test_voice_ui.py
```

Tkinter GUI for testing voice generation with different reference clips, mood presets, and exaggeration levels.

## Pipeline

```
Stream Event (follow/sub/raid/chat/etc.)
    ↓
EventProcessor (events.py)
    → Updates mood state (energy, positivity, engagement)
    → Sets expression (happy, snarky, excited, etc.)
    ↓
PersonalityEngine (personality.py)
    → Ollama/Mistral generates in-character response
    → 5 presets × 6 relationship dynamics
    ↓
VoiceEngine (voice.py)
    → Chatterbox-Turbo TTS
    → Trained speaker embedding (836 clips averaged)
    → Mood → exaggeration mapping
    ↓
Audio Output
```

## Directory Structure

```
companion/
├── engine.py               # Main engine — Socket.IO client + health API
├── events.py               # Event processor + mood state machine
├── personality.py          # Personality presets + LLM prompt builder
├── voice.py                # VoiceEngine — Chatterbox-Turbo wrapper
├── config.py               # All configuration + env vars
├── models.py               # Data models (CompanionState, MoodState, etc.)
├── mood_config.py          # Mood-to-voice parameter mappings
├── vesper_chat.py          # Interactive terminal chat with voice
├── build_voice_profile.py  # Build averaged speaker embedding from clips
├── test_voice_ui.py        # Tkinter Voice Lab for testing generation
├── test_voice.py           # Quick voice test script
├── voice_collector.py      # YouTube/audio reference collector
├── voice_engine.py         # Voice consistency engine
├── voice_filter.py         # Audio filtering utilities
├── voice_generator.py      # Batch voice generation
├── voice_workshop.py       # Voice tuning workshop
├── voices/
│   ├── training/           # Raw training clips by speaker
│   │   ├── aubrey/         # 179 clips — Aubrey Plaza reference
│   │   ├── sadie/          # 239 clips — Sadie Sink reference
│   │   └── schnukums/      # 418 clips — combined persona
│   ├── golden/             # Curated "this IS her" clips
│   │   ├── warm/           # Warm/sincere golden clips + composite
│   │   ├── snarky/         # Snarky/deadpan golden clips
│   │   └── vesper_trained/ # Averaged speaker embedding (836 clips)
│   ├── generated/          # All generated outputs by timestamp
│   └── live/               # Live test outputs + A/B comparisons
├── tests/
│   └── test_events.py      # Event processor unit tests
└── requirements.txt
```

## Voice System

### Trained Voice Profile

The voice profile is built by averaging speaker embeddings from all training clips:

```bash
python build_voice_profile.py
```

This extracts 256-dimensional embeddings from every clip using Chatterbox's voice encoder and averages them into a stable voice identity stored at `voices/golden/vesper_trained/speaker_embedding.npy`.

**Current profile:** 836 clips, 35.5 minutes of audio, (1, 256) embedding.

### Voice Blend Target

70% Aubrey Plaza + 30% Sadie Sink — see `SCHNUKUMSVOICE.MD` for the full voice identity description.

### Mood-to-Voice Mapping

| Mood | Exaggeration | Character |
|------|-------------|-----------|
| neutral | 0.5 | Default relaxed delivery |
| warm | 0.6 | Softer, genuine feeling |
| amused | 0.65 | Light, playful |
| snarky | 0.4 | Controlled deadpan |
| excited | 0.8 | Higher energy, faster |
| sad | 0.55 | Subdued, slower |
| angry | 0.7 | Sharp, clipped |
| flirty | 0.65 | Breathy, intimate |

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
  "name": "Vesper Astra",
  "voice_available": true,
  "personality_enabled": true
}
```

## Tests

```bash
python -m pytest tests/ -v
```

## Current Status

**LLM:** Ollama + Mistral — working, generates in-character responses with personality presets.

**TTS:** Chatterbox-Turbo (Resemble AI) — functional but under evaluation. Voice quality is too predictable/robotic for the intimate character we're building. Researching alternatives (Orpheus, Dia, Fish Speech, F5-TTS, CosyVoice 2, Kokoro).

**Next:** Find a TTS model that sounds more natural and intimate — less "talking to an AI", more real conversational delivery with proper punctuation/pause handling.

## Future

- **Better TTS model** — Replace Chatterbox with something more natural and expressive
- **OBS overlay integration** — Visual companion avatar driven by expression state
- **Supervisor management** — Add as a managed process in the Worxed supervisor
- **Custom triggers** — React to custom endpoint events from the Endpoint Builder
- **Desktop companion** — Electron/Tauri widget with Live2D character
