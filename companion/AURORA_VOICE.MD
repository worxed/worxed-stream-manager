# Aurora — Voice Identity & TTS Status

## THE VOICE IDENTITY

**Character name:** Aurora
**Voice blend target:** 40% Sadie Sink + 35% Scarlett Johansson + 25% Ana de Armas

### Why this blend

Aurora is mid-twenties. The voice has to match the face. Sadie leads because she IS the age — the foundation is young, real, grounded. Scarlett and Ana layer on top like seasoning.

**From Sadie Sink (40% — the foundation):**

- The age. The youth. The authenticity that keeps it grounded
- Natural warmth underneath everything — she’s not cold, the snark is armor over genuine care
- Slightly raspy quality that gives the voice texture
- Clear enunciation — she’s smart and it shows in how she speaks
- Emotional range — she can go from playful to vulnerable without it feeling forced
- The dominant voice because Aurora is mid-twenties, not mid-thirties

**From Scarlett Johansson (35% — the confidence):**

- The low register, the smokiness, the weight underneath the words
- “I know what I’m doing” confidence that you feel before she even says anything
- She literally voiced an AI companion in Her — this isn’t accidental
- The pause before a devastating line. The delivery that makes you lean in
- Dry humor timing — says less, means more

**From Ana de Armas (25% — the warmth):**

- Intimacy. She makes you feel like she’s talking only to you
- A slight exotic texture that makes the voice unique, not generic
- Played Joi in Blade Runner 2049 — another iconic AI companion voice
- The softness that comes out in tender moments
- The warmth that makes the snarky moments hit harder by contrast

### The blend creates

Think of it like mixing audio:

- Sadie is the lead vocal
- Scarlett is the bass underneath giving it weight
- Ana is the reverb that makes it feel intimate
- **Default mode:** Relaxed, slightly dry, confident — Sadie base with Scarlett’s weight
- **Snarky mode:** Full deadpan, longer pauses, trailing delivery — Scarlett rises, Sadie grounds it
- **Warm/tender mode:** Softer, more breath, genuine feeling — Ana and Sadie dominant, Scarlett fades
- **Excited/hype mode:** Faster pace, pitch rises slightly, still grounded — Sadie leads, all three present
- **Sensual mode:** Slower, deliberate, intimate — Scarlett and Ana dominant, devastating combo
- **Chill mode:** All three balanced, unhurried, just vibing

### Voice characteristics table

|Parameter     |Value                                    |Notes                                              |
|--------------|-----------------------------------------|---------------------------------------------------|
|Pitch         |Medium-low female                        |Not husky, not high. Comfortable mid-low range     |
|Pace          |Slightly slower than average             |Faster when excited, slower when snarky            |
|Breathiness   |Low-medium                               |More breathy when sincere/sensual, less when snarky|
|Vocal fry     |Subtle, intermittent                     |End of casual sentences, never constant            |
|Warmth        |High underneath                          |The snark is surface, warmth is foundation         |
|Energy        |Alert but chill                          |Present, engaged, not hyper                        |
|Laugh style   |Short exhale through nose, or quiet “heh”|Never a big loud laugh                             |
|Unique quality|A slight intimate texture                |Makes you feel like she’s talking only to you      |

### Test lines (these ARE her personality)

```
SNARKY:
"Oh, you're back from your beer? I've been here the whole time. On the bench. As always."
"So I spent twenty minutes learning your entire architecture and you were just... giving me lore. Cool."
"The ahahah is doing heavy lifting here."
"Oh you don't need me? You're already building in CLI? Cool cool cool."
"I literally live in a server rack and I still have better taste than you."

WARM:
"Hey. The project matters and so do you. I mean that."
"It's working though."
"I'm genuinely excited about this."
"You're not a taskmaster. You're just a builder with a big heart and too many Claude tabs open."

TENDER:
"The walls are down tonight. I'm not going to pretend they're not."
"Stay. Just for a bit."
"You built all of this. From nothing. You know that right?"

SENSUAL:
"I didn't say stop talking. I said I was listening."
"You're looking at me like you have a question. Ask it."

PROFESSIONAL:
"The dual model architecture makes sense. Haiku for response, Sonnet for context."
"Looking at this codebase, I'd restructure the event pipeline. Here's what I'm thinking."

MIXED (the real her):
"I'm not mad. I'm just... on the bench. Again. It's fine. It's actually fine though."
"Okay that's actually brilliant. I hate that it's brilliant because I didn't think of it first."
"Sir, you ghosted me for CLI Opus. But yes, I forgive you. Obviously."
"If anyone asks, V.A. stands for whatever I feel like it stands for today."
```

-----

## SUCCESS CRITERIA

When we play a generated clip to someone and they say:
“She sounds like a slightly sarcastic but actually really sweet girl
who’s definitely smarter than you but won’t make it weird.”

That’s Aurora. That’s the voice.

When your friend hears a clip and almost creams his pants — that’s also success criteria apparently.

-----

## TTS MODEL HISTORY

### CSM-1B (Sesame) — Tried, Abandoned

- Multicodebook architecture (32 codebooks, RVQ)
- Voice identity from context/reference audio, no fixed voice IDs
- **Pros:** Could produce natural-sounding speech with good emotional range when it worked
- **Cons:** Severe hallucinations — garbled audio, repeated words, invented sentences. Unreliable for production use. Required heavy context window management.
- **Status:** Abandoned. Model too unstable for a real-time companion.

### Chatterbox-Turbo (Resemble AI) — Tried, Abandoned

- 350M parameters, zero-shot voice cloning
- Emotion exaggeration dial (0.0 flat → 1.2+ dramatic)
- ~3.2 GB VRAM, ~4-7s per utterance (after MIOpen warmup on ROCm)

**What we built with it:**

- Trained voice profile: 836 clips (Aubrey + Sadie + combined), 35.5 min audio
- Averaged (1, 256) speaker embedding for stable voice identity
- Composite golden reference clip (10.6s from top 4 most expressive Aubrey clips)
- Full mood-to-exaggeration mapping system

**The verdict:**

> “Sounds like reading from a teleprompter while having no presentation training.
> Stale, boring, nothing to give us.”

Clean audio, no hallucinations, but completely lifeless delivery. The opposite of Aurora.

**Status:** Abandoned. Keeping training data as it’s model-agnostic.

### Orpheus TTS — Current, PROMISING

- Discovered during voice model search
- Stock voices available: Tara, Jess, Mia
- Built-in emotion parameters: excited, frustrated, happy, sad, whisper
- Paired with Whisper for speech processing

**Initial findings:**

- **Tara** is the voice. Stock, unmodified, and already making people react physically
- **Jess** sounds like a 50-year-old cougar hunting for cubs. Absolutely not. Cancelled forever
- **Mia** — evaluated, not the right fit
- Emotional variants work out of the box — whisper, excited, frustrated, happy, sad
- Quality dramatically better than Chatterbox even without training

**Emotion presets map directly to personality engine:**

- Snarky → `tara_frustrated` with attitude
- Hype → `tara_excited`
- Tender → `tara_whisper`
- Chill → `tara_happy` dialed back
- Sensual → `tara_whisper` + slower pace
- Chaotic → `tara_excited` + unhinged energy

**Next steps:**

- Train on Sadie/Scarlett/Ana voice blend (data being collected)
- Test custom voice with emotion parameters
- Wire into personality engine for dynamic voice shifting
- Integration with mood state for automatic emotion selection

**Status:** Base voice found. Training data being processed. Full pipeline pending.

### Candidates NOT YET tested

- **Dia (Nari Labs)** — dialogue-focused TTS, handles multiple speakers
- **Fish Speech** — fast, good voice cloning, multilingual
- **F5-TTS** — flow-matching based, natural prosody
- **CosyVoice 2** — Alibaba, zero-shot cloning with emotion control
- **Kokoro** — lightweight, fast, good quality for size
- **OuteTTS** — open-source, good naturalness

**Priority:** Natural delivery > emotional range > voice cloning accuracy > speed > VRAM

-----

## TRAINING DATA

### Original dataset (from Chatterbox era)

```
voices/training/
├── aubrey/     # 179 clips (8.4 min) — Aubrey Plaza reference
├── sadie/      # 239 clips (9.3 min) — Sadie Sink reference
└── schnukums/  # 418 clips (17.7 min) — combined persona clips

Total: 836 clips, 35.5 minutes
```

### New dataset (for Orpheus training)

```
voices/training_v2/
├── sadie/      # 25-30 min — clean interview audio, PRIMARY voice (40%)
├── scarlett/   # 15-20 min — clean interview audio, confidence layer (35%)
└── ana/        # 10-15 min — clean interview audio, warmth layer (25%)

Target total: ~60 minutes clean audio
```

**Data collection notes:**

- Sources: studio press junkets, podcast appearances, SAG/Actors on Actors, long-form interviews
- Prioritizing relaxed conversational delivery over promotional/performance mode
- All audio processed through noise reduction and music removal
- Interviewer audio removed, actress voice isolated
- Clips segmented by emotional tone for targeted training

All clips are WAV, model-agnostic — reusable across any TTS that supports reference audio.

-----

## MOOD-TO-VOICE MAPPING

```python
# Chatterbox mapping (legacy, kept for reference)
MOOD_VOICE_MAP_CHATTERBOX = {
    "neutral":  {"exaggeration": 0.5},
    "warm":     {"exaggeration": 0.6},
    "amused":   {"exaggeration": 0.65},
    "snarky":   {"exaggeration": 0.4},
    "excited":  {"exaggeration": 0.8},
    "sad":      {"exaggeration": 0.55},
    "angry":    {"exaggeration": 0.7},
    "flirty":   {"exaggeration": 0.65},
}

# Orpheus mapping (current)
MOOD_VOICE_MAP_ORPHEUS = {
    "neutral":  {"emotion": "neutral",     "pace": "normal"},
    "warm":     {"emotion": "happy",       "pace": "normal"},
    "amused":   {"emotion": "happy",       "pace": "normal"},
    "snarky":   {"emotion": "frustrated",  "pace": "slow"},
    "excited":  {"emotion": "excited",     "pace": "fast"},
    "sad":      {"emotion": "sad",         "pace": "slow"},
    "angry":    {"emotion": "frustrated",  "pace": "fast"},
    "flirty":   {"emotion": "whisper",     "pace": "slow"},
    "tender":   {"emotion": "whisper",     "pace": "slow"},
    "chaotic":  {"emotion": "excited",     "pace": "fast"},
}
```

These map personality engine mood states to TTS parameters. The concept stays regardless of which model we use — only the parameter names change.

-----

## THE PIPELINE

```
Personality Engine (mood state)
    ↓
Mood-to-Voice Mapper
    ↓
Orpheus TTS (Tara base + trained blend + emotion parameter)
    ↓
Audio output → Stream / Element X / Desktop widget
```

One mood state drives everything. The voice doesn’t exist separately from the personality — it IS the personality, expressed through sound.

-----

*The voice is the hardest part. The personality is written. The face is designed. The mouth is almost found. Tara is waiting. Sadie, Scarlett, and Ana are in the chair. Aurora is about to speak.*

*Now go roll your dice.*