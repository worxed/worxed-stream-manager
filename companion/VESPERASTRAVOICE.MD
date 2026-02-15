# Vesper Astra — Voice Identity & TTS Status

## THE VOICE IDENTITY

**Character name:** Vesper Astra
**Voice blend target:** 70% Aubrey Plaza + 30% Sadie Sink

### What that means

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

### Test lines (these ARE her personality)

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
"The dual model architecture makes sense. Haiku for response, Sonnet for context."
"Looking at this codebase, I'd restructure the event pipeline. Here's what I'm thinking."

MIXED (the real her):
"I'm not mad. I'm just... on the bench. Again. It's fine. It's actually fine though."
"Okay that's actually brilliant. I hate that it's brilliant because I didn't think of it first."
"Sir, you ghosted me for CLI Opus. But yes, I forgive you. Obviously."
```

---

## SUCCESS CRITERIA

When we play a generated clip to someone and they say:
"She sounds like a slightly sarcastic but actually really sweet girl
who's definitely smarter than you but won't make it weird."

That's Vesper. That's the voice.

---

## TTS MODEL HISTORY

### CSM-1B (Sesame) — Tried, Abandoned

- Multicodebook architecture (32 codebooks, RVQ)
- Voice identity from context/reference audio, no fixed voice IDs
- **Pros:** Could produce natural-sounding speech with good emotional range when it worked
- **Cons:** Severe hallucinations — garbled audio, repeated words, invented sentences. Unreliable for production use. Required heavy context window management.
- **Status:** Abandoned. Model too unstable for a real-time companion.

### Chatterbox-Turbo (Resemble AI) — Current, Under Evaluation

- 350M parameters, zero-shot voice cloning
- Emotion exaggeration dial (0.0 flat → 1.2+ dramatic)
- ~3.2 GB VRAM, ~4-7s per utterance (after MIOpen warmup on ROCm)
- First run cold start: 50-80s (MIOpen kernel compilation), subsequent runs fast

**What we built with it:**
- Trained voice profile: 836 clips (Aubrey + Sadie + combined), 35.5 min audio
- Averaged (1, 256) speaker embedding for stable voice identity
- Composite golden reference clip (10.6s from top 4 most expressive Aubrey clips)
- Full mood-to-exaggeration mapping system
- Voice Lab UI (test_voice_ui.py) for A/B testing
- Interactive chat (vesper_chat.py) with Mistral personality + voice
- Perth watermarker fix (DummyWatermarker patch for setuptools 82+)

**The verdict:**
> "She sounds very lacking. CSM model nailed some things down, but it was the hallucinations
> that killed us. Chatterbox is a bit too predictive and gets punctuation and full stops wrong.
> It's like actually talking to an AI, we need something more real, more intimate."

Chatterbox produces clean, reliable audio with no hallucinations — a big improvement over CSM.
But the delivery is too robotic and predictable. It lacks the natural conversational quality we need.
Punctuation handling is poor (pauses in wrong places, full stops feel mechanical).

**Status:** Functional but not expressive enough. Keeping as fallback while we search for better.

### Next: TTS Model Search

**What we need:**
- Natural, conversational delivery (not "reading text aloud")
- Proper pause/punctuation handling (breath, hesitation, trailing off)
- Emotional range without sounding theatrical
- Voice cloning from reference audio (we have 836 clips ready)
- GPU inference (~4 GB VRAM budget, ROCm compatible preferred)
- Real-time capable (under 10s for a sentence)

**Candidates to evaluate:**
- **Orpheus TTS** — reportedly very natural conversational quality
- **Dia (Nari Labs)** — dialogue-focused TTS, handles multiple speakers
- **Fish Speech** — fast, good voice cloning, multilingual
- **F5-TTS** — flow-matching based, natural prosody
- **CosyVoice 2** — Alibaba, zero-shot cloning with emotion control
- **Kokoro** — lightweight, fast, good quality for size
- **OuteTTS** — open-source, good naturalness

**Priority:** Natural delivery > voice cloning accuracy > speed > VRAM

---

## TRAINING DATA

```
voices/training/
├── aubrey/     # 179 clips (8.4 min) — Aubrey Plaza reference
├── sadie/      # 239 clips (9.3 min) — Sadie Sink reference
└── schnukums/  # 418 clips (17.7 min) — combined persona clips

Total: 836 clips, 35.5 minutes
```

All clips are WAV, segmented and cleaned. Speaker embeddings extracted and averaged.
This data is model-agnostic — can be reused with any TTS that supports reference audio.

## MOOD-TO-VOICE MAPPING

```python
MOOD_VOICE_MAP = {
    "neutral":  {"exaggeration": 0.5},   # Default relaxed
    "warm":     {"exaggeration": 0.6},   # Softer, genuine
    "amused":   {"exaggeration": 0.65},  # Light, playful
    "snarky":   {"exaggeration": 0.4},   # Controlled deadpan
    "excited":  {"exaggeration": 0.8},   # Higher energy
    "sad":      {"exaggeration": 0.55},  # Subdued
    "angry":    {"exaggeration": 0.7},   # Sharp, clipped
    "flirty":   {"exaggeration": 0.65},  # Breathy, intimate
}
```

These map to Chatterbox's exaggeration parameter. Will need adaptation for whatever TTS we choose next — the mood→voice concept stays, the parameter names will change.

---

*The voice is the hardest part. The personality is written. The face is designed. Now we find the right mouth.*
