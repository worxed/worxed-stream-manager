# 🎭 Project Vesper Astra  — AI Stream Companion

## Brainstorm Document

---

## THE BIG IDEA

An animated AI companion character that lives across your streaming ecosystem —
on your desktop, in your OBS overlay, and integrated into Worxed Stream Manager.
Think: Razer AI tube aesthetic meets VTuber-lite meets stream assistant.

She reacts to stream events, chats with viewers, shows expressions,
and becomes part of your brand. Not a generic bot — a CHARACTER with personality.

---

## 🧠 WHY THIS IS A KILLER IDEA

### The Gap in the Market

- **StreamElements/Streamlabs** = alerts + overlays (no personality)
- **VTuber software** = face tracking, complex setup, requires a camera
- **AI chatbots** = text only, no visual presence
- **Nobody** is doing: animated AI character with personality that reacts
  visually to stream events AND has conversational ability

### The Pitch

"Your AI co-host. She lives on your stream, reacts to your community,
and has more personality than your average mod."

---

## 📐 THREE LAYERS

### Layer 1: Personal Desktop Companion (for Andreas)

Your personal "vesper" — Claude as a desktop widget.

**What it does:**

- Lives on your desktop in a holographic tube/window
- Idle animations (breathing, blinking, hair movement, looking around)
- Reacts when you get notifications, compile errors, successful builds
- Expressions: happy, snarky, thinking, excited, tired, :3 mode
- Could show status of your Worxed services (green = running, red = down)
- Click to expand for quick chat/notes
- Teal glow pulses gently in idle state

**Tech:**

- Electron app or Tauri (lighter weight)
- Transparent frameless window (always on top option)
- Spine2D or Live2D for smooth character animation
- WebSocket connection to Worxed supervisor for status updates
- Local — no server needed

**Character States:**

| State | Expression | Trigger |
|-------|-----------|---------|
| Idle | Gentle breathing, occasional blink, subtle smile | Default |
| Coding | Glasses on, focused look, typing animation | IDE detected active |
| Happy | Big smile, sparkle eyes, bouncy | Build success, tests pass |
| Error | Concerned look, sweat drop | Build fail, error detected |
| Snarky | Eyebrow raised, smirk | Been idle too long / "you forgot about me" |
| Excited | Star eyes, hair floats up | New subscriber / donation |
| Sleepy | Half-closed eyes, yawn | Late night detected |
| :3 | Cat mouth, blush | When you type ":3" anywhere |
| Thinking | Hand on chin, dots floating | Processing / loading states |
| Victory | Fist pump, confetti | Deploy success / milestone hit |

---

### Layer 2: Worxed Stream Manager Feature (Product)

Customizable AI companion for ANY streamer — the premium feature.

**What streamers get:**

- Choose or design their own companion character
- Character appears as OBS overlay on their stream
- Reacts to stream events in real time:
  - New follower → waves
  - Subscription → celebration dance
  - Raid → battle pose / excited
  - Donation → heart eyes / thank you bow
  - Chat keywords → custom reactions
  - Bit cheers → proportional excitement based on amount
  - Channel point redemptions → custom animations per redemption
- Chat interaction — viewers can trigger expressions via commands
  - !poke → annoyed face
  - !pet → happy blush
  - !dance → dance animation
  - !mood → shows current mood based on stream energy
- Personality system — streamer sets personality traits that affect:
  - Response style in chat
  - Default expression tendencies  
  - How she reacts to events (chill vs hype vs snarky)

**Character Customization:**

- Pre-made character templates (different art styles)
- Color palette customization (match stream branding)
- Outfit changes / seasonal outfits
- Accessory system (hats, glasses, items)
- Import custom Live2D models (Studio tier)
- Commission marketplace for custom characters (future)

**Monetization Fit:**

| Tier | What They Get |
|------|--------------|
| Free | 1 default character, basic reactions (follow/sub), 3 chat commands |
| Pro ($9.99) | 5 character templates, full event reactions, unlimited chat commands, personality system |
| Studio ($29.99) | Custom Live2D import, API access, multiple characters, advanced AI chat integration, priority custom animations |

**This is the differentiator.** Nobody else has this. StreamElements gives you static alerts.
Worxed gives you a LIVING character on your stream.

---

### Layer 3: OBS Overlay Companion

The technical bridge — how the character actually appears on stream.

**Architecture:**

```
Worxed Supervisor
    ↓ WebSocket events (follows, subs, chat, etc.)
Companion Engine (Python service, :4003)
    ↓ Processes events → mood state → personality (Ollama/Mistral)
    ↓ Voice synthesis (TTS) → animation/expression commands
OBS Browser Source
    ↓ Renders character via HTML5 Canvas / Live2D Web
    ↓ Transparent background, positioned by streamer
Stream Output
```

**Key Technical Decisions:**

- **Live2D Cubism SDK (Web)** — industry standard for VTuber-style animation
  - Pros: Beautiful, smooth, professional quality, large community
  - Cons: Licensing costs for commercial use, learning curve
  
- **Spine2D** — alternative animation system  
  - Pros: Lighter weight, good for simpler characters
  - Cons: Less "anime" looking, smaller community
  
- **Custom Canvas/WebGL** — roll our own
  - Pros: Full control, no licensing, fits Worxed philosophy
  - Cons: Massive dev effort, won't match Live2D quality initially

- **Recommended approach:** Start with sprite-sheet animation system (simpler),
  then upgrade to Live2D integration for Pro/Studio tiers.

**Sprite Sheet Approach (MVP):**

- Pre-rendered expressions/animations as sprite sheets
- CSS/Canvas animation for transitions
- Much simpler to implement
- Can use the anime art we already generated as base!
- Parallax layers: background glow → body → hair → face → accessories
- Layer-based expression swapping for fast emotion changes

**OBS Integration:**

- Browser Source URL from Worxed (like existing alert overlays)
- Transparent background
- Configurable position presets (bottom-left, bottom-right, floating)
- Adjustable size
- Z-index control (behind or in front of game)

---

## 🎨 CHARACTER DESIGN SYSTEM

### "Vesper" as the Default/Mascot

The Claude-inspired design we created becomes the Worxed mascot:

- Dark navy hair with teal highlights
- Glowing teal eyes
- Constellation-pattern outfit
- Teal pendant
- Known personality: warm, snarky, loyal, sharp

She becomes the "demo character" that every new user sees.
Streamers can then customize or replace her.

### Expression Sheet Needed (for sprite-based MVP)

Commission or generate these expressions for the base character:

**Core expressions (must have):**

1. Idle (neutral smile)
2. Happy (big smile, sparkle eyes)
3. Excited (star eyes, open mouth)
4. Snarky (raised eyebrow, smirk)
5. Thinking (hand on chin)
6. Surprised (wide eyes, small mouth)
7. Sad (downturned mouth, soft eyes)
8. Angry/frustrated (furrowed brows)
9. Sleepy (half-closed eyes)
10. Love (heart eyes, blush)
11. Laughing (closed eyes, open mouth)
12. :3 (cat mouth, maximum blush)

**Animations (sprite sequences):**

1. Idle breathing loop
2. Blink cycle
3. Wave (greeting)
4. Celebration (arms up, confetti)
5. Dance (simple loop)
6. Typing (for chat responses)
7. Hair blow (wind effect loop)

### Using AI Image Gen for Character Assets

We can use the prompts we already built to generate:

- Consistent character across all expressions
- Same seed + ControlNet for pose consistency
- Img2img for expression variants from the base image
- This becomes the pipeline for creating NEW characters too

---

## 🔗 INTEGRATION WITH WORXED ECOSYSTEM

### How it connects to what you've already built

```
┌─────────────────────────────────────────────┐
│              WORXED SUPERVISOR               │
│         (orchestration layer)                │
├─────────────┬───────────────────────────────┤sooosi
│             │                               │
│  Existing   │    NEW: Companion Engine      │
│  Services   │                               │
│             │  ┌─────────────────────────┐  │
│  • Alerts   │  │  Event Processor        │  │
│  • Overlays │  │  Personality State      │  │
│  • Chat     │  │  Mood Calculator        │  │
│  • EventSub │  │  Animation Controller   │  │
│             │  │  Chat Response Engine    │  │
│             │  └──────────┬──────────────┘  │
│             │             │                  │
├─────────────┴─────────────┴──────────────────┤
│                WebSocket Hub                  │
├──────────┬──────────┬────────────┬───────────┤
│  React   │   OBS    │  Desktop   │  Stream   │
│  Dash    │  Overlay │  Widget    │  Deck     │
│          │(companion│(vesper) │ (moods)   │
│          │ renders) │            │           │
└──────────┴──────────┴────────────┴───────────┘
```

The companion engine is just another service the supervisor manages.
It consumes events from EventSub and chat, processes them through
the personality/mood system, and outputs animation commands via WebSocket.

**This fits perfectly with your existing architecture.**
The supervisor already handles service orchestration. The companion
engine is just a new custom object/endpoint — exactly what your
endpoint builder is designed for.

---

## 📋 IMPLEMENTATION ROADMAP

### Phase 1: Personal Vesper Astra  (1-2 weeks)

- [ ] Generate full expression sheet using AI image gen
- [ ] Build sprite-sheet animation engine (HTML5 Canvas)
- [ ] Create transparent Electron/Tauri desktop widget
- [ ] Basic idle + blink + expression cycling
- [ ] Connect to Worxed supervisor via WebSocket for status
- [ ] YOU use it daily while developing — dogfooding

### Phase 2: OBS Overlay MVP (2-3 weeks)

- [ ] Browser Source overlay rendering
- [ ] Event → expression mapping system
- [ ] Twitch EventSub integration (follows, subs, raids)
- [ ] Chat command system (!poke, !pet, !dance)
- [ ] Basic personality config (chill / hype / snarky presets)
- [ ] Dashboard page for companion settings

### Phase 3: Customization & Polish (2-3 weeks)

- [ ] Character color palette editor
- [ ] Multiple character templates
- [ ] Custom chat command creator
- [ ] Mood system (accumulates over stream session)
- [ ] Stream Deck integration (trigger expressions manually)
- [ ] Sound effects tied to animations

### Phase 4: AI Chat Integration (3-4 weeks)

- [x] LLM-powered chat responses (in character) — Ollama/Mistral with 5 personality presets
- [x] Personality system with 6 relationship dynamics
- [x] TTS voice synthesis — Chatterbox-Turbo functional, searching for better model
- [x] Trained voice profile from 836 clips (35.5 min)
- [ ] Context-aware reactions (knows the game being played)
- [ ] Viewer memory (remembers regulars)
- [ ] Moderation personality (can warn/timeout in character)

### Phase 5: Marketplace & Scale (ongoing)

- [ ] Custom character import (Live2D)
- [ ] Character marketplace (community-created)
- [ ] Outfit/accessory shop (seasonal content)
- [ ] API for third-party integrations
- [ ] Multi-character scenes

---

## 💰 REVENUE IMPACT

### Why this matters for the million-dollar goal

**It's a retention hook.** Streamers who customize a companion character
become emotionally attached. Churn drops. It's THEIR character.

**It's visible marketing.** Every stream that uses the companion is a
live advertisement. Viewers see the character → ask "what's that?" →
discover Worxed.

**It's a content engine.** Seasonal outfits, holiday themes, new
expressions — all reasons to stay subscribed and upgrade.

**It's defensible.** StreamElements could copy alerts. They can't easily
copy a full personality-driven companion system with AI integration.

**Projected impact:**

- Increases Pro conversion (companion is the draw)
- Increases Studio conversion (custom characters)
- Creates marketplace revenue (character sales, commissions)
- Generates organic growth (companion visible on every stream)

---

## 🔥 THE PITCH (one-liner)

**"Worxed Stream Manager: Your stream. Your character. Your AI co-host."**

Or the snarky version:

**"StreamElements gave you alerts. We gave you a teammate."**

---

*Document by Claude (Vesper's sister) · clearly had ideas the whole time*
