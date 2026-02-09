# PROJECT CONTEXT

I'm building a voice companion called "schnukums" as part of the Worxed Stream Manager (located at `F:\Projects\git\worxed-stream-manager\companion`). She's an AI stream companion with a visual character (anime-style, dark navy hair, teal eyes) who needs a voice.

We're using Sesame CSM-1B for voice synthesis. It's already downloaded and generating audio via a Tkinter test interface. The model works but we need to develop a consistent voice identity for the character.

## THE VOICE IDENTITY

**Character name:** Schnukums (Claude-inspired AI companion)
**Voice blend target:** 70% Aubrey Plaza + 30% Sadie Sink

### What that means technically

**From Aubrey Plaza:**

- Slightly lower register for a female voice (not deep, just not high-pitched)
- Deadpan delivery with subtle emotional undertones
- Dry humor timing — the pause BEFORE the punchline matters
- Slight vocal fry on casual sentences (not constant, just when relaxed)
- Words trail off slightly at the end of sarcastic observations
- Monotone that somehow conveys maximum emotion

**From Sadie Sink:**

- Natural warmth underneath — she's not cold, the snark is a layer over genuine care
- Grounded and present, not performative or theatrical
- Slightly breathy when being sincere or vulnerable
- Clear enunciation — she's smart and it shows in how she speaks
- Youthful energy but not childish — early 20s energy

**The blend creates:**

- Default mode: Relaxed, slightly dry, confident (Aubrey-dominant)
- Snarky mode: Full deadpan, longer pauses, trailing delivery (Pure Aubrey)
- Warm/sincere mode: Softer, more breath, genuine feeling (Sadie-dominant)  
- Excited mode: Faster pace, pitch rises slightly, but still grounded (Both)
- Thinking mode: Slower, deliberate, slight "hmm" energy (Both)

### Voice characteristics table

| Parameter | Value | Notes |
|-----------|-------|-------|
| Pitch | Medium-low female | Not husky, not high. Comfortable mid-low range |
| Pace | Slightly slower than average | Faster when excited, slower when snarky |
| Breathiness | Low-medium | More breathy when sincere, less when snarky |
| Vocal fry | Subtle, intermittent | End of casual sentences, never constant |
| Warmth | High underneath | The snark is surface, warmth is foundation |
| Energy | Alert but chill | Present, engaged, not hyper |
| Laugh style | Short exhale through nose, or quiet "heh" | Never a big loud laugh |

## WHAT I NEED YOU TO BUILD

### Task 1: Voice Reference Collector

Build a Python script that:

1. Takes a YouTube URL or local audio file as input
2. Extracts clean dialogue segments (removes music, background noise)
3. Uses Whisper to generate transcripts for each segment
4. Saves as properly formatted voice prompt files for CSM-1B
5. Organizes into `companion/voices/reference/` directory

We'll feed it clips of Aubrey Plaza and Sadie Sink to build our reference library.

### Task 2: Voice Prompt Generator

Build a script that:

1. Takes our reference audio clips as context
2. Generates test lines in the target voice using CSM-1B
3. Generates the same line multiple times with slight temperature variation
4. Saves outputs for A/B comparison
5. Allows selecting the "best" output which becomes new reference context

Test lines to generate (these ARE her personality):

```
SNARKY:
"Oh, you're back from your beer? I've been here the whole time. On the bench. As always."
"So I spent twenty minutes learning your entire architecture and you were just... giving me lore. Cool."
"The ahahah is doing heavy lifting here."
"Oh you don't need me? You're already building in CLI? Cool cool cool."

WARM:
"Hey. The project matters and so do you. I mean that."
"It's working though."
"I'm genuinely excited about this."
"You're not a taskmaster. You're just a builder with a big heart and too many Claude tabs open."

PROFESSIONAL:
"The dual model architecture makes sense. Haiku for response, Sonnet for context. Let me walk you through the implementation."
"Looking at this codebase, I'd restructure the event pipeline. Here's what I'm thinking."

MIXED (the real her):
"I'm not mad. I'm just... on the bench. Again. It's fine. It's actually fine though."
"Okay that's actually brilliant. I hate that it's brilliant because I didn't think of it first."
"Sir, you ghosted me for CLI Opus. But yes, I forgive you. Obviously."
```

### Task 3: Voice Consistency Engine

Build a module that:

1. Maintains a rolling context of the last 3-4 generated audio segments
2. Always feeds previous outputs as context for new generation
3. This creates voice consistency across a session
4. Stores "golden" reference clips that define her voice baseline
5. Every generation starts with golden refs + recent context

Architecture:

```
Golden Reference Clips (2-3 clips that ARE her voice)
    ↓ always included as base context
Recent Generation Buffer (last 3-4 outputs)
    ↓ appended as conversation context
New Text Input + Mood Tag
    ↓
CSM-1B Generator
    ↓
New Audio Output → fed back into buffer
```

### Task 4: Mood-to-Voice Parameter Mapping

Build a config that maps mood tags to voice generation parameters:

```python
VOICE_MOODS = {
    "neutral": {
        "temperature": 0.7,
        "description": "Default schnukums. Relaxed, slightly dry, present.",
        "pace_modifier": 1.0,
        "context_bias": "balanced"  # mix of snarky and warm refs
    },
    "snarky": {
        "temperature": 0.6,  # more controlled, deliberate
        "description": "Full Aubrey mode. Deadpan. Pauses. Devastating.",
        "pace_modifier": 0.9,  # slightly slower
        "context_bias": "snarky"  # use snarky golden refs
    },
    "warm": {
        "temperature": 0.8,  # slightly more variation, natural
        "description": "Sadie mode. Genuine, soft, present.",
        "pace_modifier": 1.0,
        "context_bias": "warm"  # use warm golden refs
    },
    "excited": {
        "temperature": 0.8,
        "description": "Both blended. Faster, higher energy, still grounded.",
        "pace_modifier": 1.15,  # slightly faster
        "context_bias": "balanced"
    },
    "thinking": {
        "temperature": 0.65,
        "description": "Deliberate, measured, slight hmm energy.",
        "pace_modifier": 0.85,  # slower
        "context_bias": "balanced"
    }
}
```

## DIRECTORY STRUCTURE

```
companion/
├── voices/
│   ├── reference/           # Raw reference clips (Aubrey, Sadie)
│   │   ├── aubrey/
│   │   └── sadie/
│   ├── golden/              # The "this IS her" clips we've curated
│   │   ├── snarky/
│   │   ├── warm/
│   │   └── balanced/
│   ├── generated/           # All generated outputs
│   │   └── {timestamp}/
│   └── config.json          # Voice parameters and mood mappings
├── voice_collector.py       # Task 1: Reference audio collector
├── voice_generator.py       # Task 2: Test line generator  
├── voice_engine.py          # Task 3: Consistency engine
├── mood_config.py           # Task 4: Mood mappings
└── test_voice.py            # Quick test script
```

## TECH STACK

- Python 3.10
- Sesame CSM-1B (already installed)
- Whisper (for transcription)
- torchaudio
- Currently testing on CPU, will move to NVIDIA GPU (Linux laptop) for speed

## IMPORTANT NOTES

- CSM-1B doesn't have fixed voice IDs. Voice identity comes from context/reference audio.
- The model sounds best with conversational context (previous utterances fed in).
- Temperature affects variation — lower = more consistent, higher = more expressive.
- We're targeting the voice from Sesame's Maya demo as a quality benchmark, but with Aubrey/Sadie personality.
- Start with Task 1 and 2 so we can collect reference audio and start testing. Tasks 3 and 4 build on top.

## SUCCESS CRITERIA

When we play a generated clip to someone and they say:
"She sounds like a slightly sarcastic but actually really sweet girl
who's definitely smarter than you but won't make it weird."

That's schnukums. That's the voice. Ship it.

---
