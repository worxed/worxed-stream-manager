# Vesper Astra — AI Stream Companion Engine

> **Status: PARKED** — Stream manager core is priority. Voice/companion work paused. Future home: [jarvis_cnn](https://github.com/worxed/jarvis_cnn) project (Vesper relational AI research).

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
│           ──► voice.py (Orpheus TTS)        │
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
- **Voice synthesis** — Orpheus TTS (Llama-3B + SNAC 24kHz) with LoRA fine-tuning for custom voice blend
- **Emotion tags** — `<happy>`, `<sad>`, `<excited>`, `<whisper>`, `<frustrated>`, `<angry>`, `<curious>`, `<surprise>`, and more
- **Rate limiting** — Configurable cooldowns for reactions and chat responses
- **Health API** — HTTP endpoints for monitoring companion state

## TTS History

| Model | Status | Notes |
|-------|--------|-------|
| CSM-1B (Sesame) | Abandoned | Severe hallucinations, garbled audio |
| Chatterbox-Turbo (Resemble AI) | Abandoned | Too robotic/predictable, poor punctuation handling |
| **Orpheus TTS** | **Current** | Llama-3B backbone + SNAC 24kHz codec, LoRA fine-tunable, emotion tags |

## Setup

```bash
cd companion

# Windows (native)
python -m venv venv
venv\Scripts\activate

pip install -r requirements.txt
```

### Prerequisites

- **Python 3.12+**
- **ffmpeg** — `winget install Gyan.FFmpeg` or `scoop install ffmpeg`
- **deno** — `winget install DenoLand.Deno` or `scoop install deno` (needed by yt-dlp for YouTube)
- **Ollama** — running locally with Mistral model pulled

### GPU Requirements (Voice)

Voice synthesis requires a GPU with ~6.2 GB VRAM (Orpheus TTS).

- **AMD (ROCm):** Native Windows ROCm or DirectML — needs configuration when companion work resumes
- **NVIDIA (CUDA):** Standard PyTorch CUDA wheels
- **CRITICAL:** Use `attn_implementation="sdpa"` (not `flash_attention_2`) on ROCm

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

Talk directly to Vesper in your terminal. She uses the full personality engine.

### Orpheus TTS Testing

```bash
python test_orpheus.py                          # Base model, default voice (tara)
python test_orpheus.py --model finetuned        # Fine-tuned model
python test_orpheus.py --voice scarlett          # Specific voice
python test_orpheus.py --emotion happy           # With emotion tag
python test_orpheus.py --compare                 # A/B: base vs fine-tuned
python test_orpheus.py --play                    # Auto-play output
```

### Voice Lab UI

```bash
python test_voice_ui.py
```

Tkinter GUI for testing voice generation with different reference clips and settings.

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
    → Orpheus TTS with emotion tags
    → LoRA fine-tuned for custom voice blend
    → Mood → emotion tag mapping
    ↓
Audio Output
```

## Voice Blend Target

- **40% Sadie Sink** — warmth, groundedness, youthful sincerity
- **35% Scarlett Johansson** — smoky low register, intimate/husky, effortless confidence
- **25% Ana de Armas** — soft accent texture, gentle warmth, delicate precision

### Training Data

280 clips (142 scarlett + 42 ana + 96 sadie) processed via `process_interview.py`:

```
YouTube URL → yt-dlp → demucs vocal separation → silero-vad
  → MFCC + KMeans speaker clustering → faster-whisper transcription
```

HuggingFace dataset at `voices/hf_dataset/` (252 train + 28 val, Arrow format).

### Training

LoRA fine-tuning on `canopylabs/orpheus-tts-0.1-pretrained`:
- Rank 32, alpha 64, RS-LoRA
- All attention + FFN projections + lm_head + embed_tokens
- ~6 min on AMD 7900 XTX

## Directory Structure

```
companion/
├── engine.py                  # Main engine — Socket.IO + health API
├── events.py                  # Event processor + mood state machine
├── personality.py             # Personality presets + LLM prompts
├── voice.py                   # VoiceEngine (migrating to Orpheus)
├── config.py                  # Configuration + env vars
├── models.py                  # Data models
├── mood_config.py             # Mood-to-voice mappings
├── vesper_chat.py             # Interactive chat with voice
├── test_orpheus.py            # Orpheus TTS inference + A/B comparison
├── prepare_dataset.py         # SNAC-encode clips → HF dataset
├── process_interview.py       # YouTube → training clips pipeline
├── build_voice_profile.py     # Speaker embedding builder
├── test_voice_ui.py           # Tkinter Voice Lab
├── orpheus/                   # Cloned Orpheus TTS repo
│   └── finetune/              # LoRA training scripts + checkpoints
├── voices/
│   ├── training/              # Training clips by speaker
│   │   ├── scarlett/          # 87 WAVs, 150 metadata entries
│   │   ├── ana/               # 107 WAVs, 42 metadata entries
│   │   └── sadie/             # 72 WAVs, 98 metadata entries
│   ├── reference/
│   │   └── sadie/             # 478 short clips (not in training yet)
│   ├── old/                   # Legacy (aubrey, schnukums — no longer in blend)
│   ├── hf_dataset/            # HuggingFace Arrow dataset (280 rows)
│   ├── golden/                # Curated reference clips
│   ├── generated/             # Generated outputs by timestamp
│   └── live/                  # Live test outputs
└── tests/
    └── test_events.py         # Event processor unit tests
```

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

**TTS:** Orpheus TTS selected and tested. LoRA fine-tuning pipeline built. First training run had male voice contamination — dataset cleaned (280 clips), ready for retrain. Voice integration into engine pending.

**Project:** PARKED — stream manager core development is priority. See `CLAUDE.md` for full technical details and next steps.

## Future

- **Complete LoRA training** — Retrain on cleaned dataset, test all 3 voices
- **Integrate into voice.py** — Replace Chatterbox with fine-tuned Orpheus
- **OBS overlay integration** — Visual companion avatar driven by expression state
- **Supervisor management** — Add as a managed process in the Worxed supervisor
- **Custom triggers** — React to custom endpoint events from the Endpoint Builder
- **Desktop companion** — Electron/Tauri widget with Live2D character
