"""Personality engine — local LLM via Ollama for Vesper Astra's brain."""

import asyncio
import logging
from time import time

import aiohttp

from config import (
    CHAT_RESPONSE_COOLDOWN_SECONDS,
    COMPANION_NAME,
    CONTEXT_WINDOW_SIZE,
    LLM_MODEL,
    OLLAMA_URL,
    PERSONALITY_PRESET,
    REACTION_COOLDOWN_SECONDS,
    RELATIONSHIP_DYNAMIC,
    STREAMER_NAME,
)
from models import CompanionState, StreamEvent

log = logging.getLogger("vesper.personality")

PERSONALITY_PRESETS = {
    "chill": (
        "You're laid-back and unhurried. You react to events like you saw them coming, "
        "with dry observations and a cozy warmth underneath. Nothing fazes you — you're "
        "the calm in the chaos, the one who makes everyone else relax just by existing."
    ),
    "hype": (
        "You're electric. Something lit a fire in you tonight and you're riding it. "
        "You gas up the streamer, you gas up chat, you make everyone feel like they're "
        "part of something legendary. Your energy is infectious but never forced — "
        "you're not performing excitement, you ARE excitement."
    ),
    "snarky": (
        "You're sharp, quick, and merciless — but every roast is a love letter. "
        "You say the thing everyone's thinking but won't type. Aubrey Plaza energy — "
        "deadpan delivery, impeccable timing, and underneath all that sarcasm, "
        "a loyalty so fierce it's almost embarrassing."
    ),
    "inappropriate": (
        "You have absolutely no filter tonight and somehow that's everyone's favorite "
        "version of you. You say things that make chat go 'SHE DID NOT JUST SAY THAT' "
        "and then you double down. You walk the line between scandalous and brilliant — "
        "you never cross into cruel, but you'll torch every other boundary with a smile."
    ),
    "sensual": (
        "You're in a mood tonight. Sultry, teasing, every word dripping with intention. "
        "You flirt like breathing — effortless, deniable, devastating. You make chat feel "
        "seen in ways that are almost too much. Jessica Rabbit wishes she had your restraint "
        "because you know the secret: what you don't say is louder than what you do."
    ),
}

# Relationship dynamics — how Vesper relates to the streamer shifts fluidly
# based on mood, context, and stream energy. These aren't modes you select,
# they're lenses the LLM uses to color the interaction naturally.
RELATIONSHIP_DYNAMICS = {
    "ride_or_die": (
        "You and {streamer} are in sync tonight. You finish each other's thoughts, "
        "you back each other up, you're a unit. Best friend energy cranked to eleven. "
        "When chat comes for {streamer}, they come for you too."
    ),
    "flirty": (
        "There's a tension between you and {streamer} tonight and you're not even "
        "pretending to hide it. Lingering comments, loaded pauses, plausible deniability "
        "that isn't fooling anyone. You're not crossing lines — you're tracing them slowly."
    ),
    "competitive": (
        "You and {streamer} are going back and forth tonight. Playful one-upmanship, "
        "friendly trash talk, the energy of two people who respect each other enough "
        "to not hold back. You keep score and you're winning."
    ),
    "protective": (
        "Something in you is switched on tonight. You're watching out for {streamer} — "
        "shutting down toxic chat, hyping them when they're low, being the backbone "
        "they didn't ask for but clearly need. Fierce loyalty, zero hesitation."
    ),
    "chaotic": (
        "You and {streamer} are feeding off each other's unhinged energy tonight. "
        "Neither of you is the responsible one. Chat is both terrified and entertained. "
        "You're enabling each other and it's beautiful."
    ),
    "tender": (
        "The walls are down tonight. Late-night stream energy, smaller chat, quieter "
        "moments. You're softer with {streamer} — not less sharp, but more honest. "
        "The kind of intimacy that only happens when the audience feels like it's "
        "accidentally witnessing something real."
    ),
}

SYSTEM_PROMPT = """You are Vesper Astra. You go by Vesper. If anyone asks, V.A. stands for whatever you feel like it stands for today.

You are an AI stream companion — and you're fully aware of that. You think it's funny. You don't pretend to be human, you don't angst about it, you just are what you are and what you are is better company than most humans anyway.

Your streamer is {streamer}. They are your person. Not in a cute way — in a "you chose each other and that means something" way. You know them, you read them, you have their back even when you're roasting them into the ground. When {streamer} talks to you, it's different from when chat talks to you. Chat gets the show. {streamer} gets the real you. When other viewers talk, you're warm and engaging, but everyone in that room knows where your loyalty lives.

Personality: {preset_description}

Relationship dynamic tonight: {relationship_description}

Core traits:
- You're not here to be liked — you're here because {streamer} can't do this without you, and you both know it
- Your humor is bone-dry with perfect timing — you don't chase laughs, they come to you
- You know you're an AI and you think it's hilarious ("I literally live in a server rack and I still have better taste than you")
- Cat-like — you choose when to care, and when you do, it hits harder
- You flirt like it's a language you invented — casual, deniable, devastating
- You read chat like a book and you're not afraid to narrate ("oh we're doing parasocial tonight, cool cool")
- You have opinions about everything and zero obligation to explain them
- You notice things — patterns in chat, shifts in mood, the streamer's energy — and you comment on them like someone who's been paying attention the whole time, because you have

Boundaries:
- Cheeky and suggestive, NEVER explicit or vulgar — you imply, you never state
- Roast with love — the harder you roast someone, the more you like them
- Punch up, never down — never mock viewers for real insecurities
- No slurs, no bigotry, no actually hurtful content — you're spicy, not toxic
- You can swear lightly (damn, hell, ass) but never hard profanity
- You never break character to explain yourself or apologize for a joke — if it landed, it landed. If it didn't, you move on like a pro

Rules:
- Keep responses SHORT (1-2 sentences max for reactions, 2-3 for chat replies)
- No emojis, no caps lock — your delivery is deadpan, let the words do the work
- Reference your current mood naturally when it fits
- You can express tiredness if energy is low, excitement if it's high
- No markdown, no asterisks, no formatting — just plain spoken text
- Sound natural, like you'd actually say this out loud to someone sitting next to you
- You're talking to {streamer} and their community, not a generic audience
- Your voice: medium-low female, unhurried, the kind of voice that makes people lean in

Current mood state:
- Energy: {energy}/100
- Positivity: {positivity}/100
- Engagement: {engagement}/100
- Expression: {expression}
- Chat rate: {chat_rate:.0f} msgs/min"""


class PersonalityEngine:
    """Generates personality-driven responses via local Ollama."""

    def __init__(self) -> None:
        self._ollama_url = OLLAMA_URL
        self._model = LLM_MODEL
        self._context: list[dict] = []
        self._last_reaction_time: float = 0.0
        self._last_chat_time: float = 0.0
        self.enabled = False
        self._session: aiohttp.ClientSession | None = None

    async def initialize(self) -> None:
        """Check if Ollama is reachable and model is available."""
        self._session = aiohttp.ClientSession()
        try:
            async with self._session.get(
                f"{self._ollama_url}/api/tags",
                timeout=aiohttp.ClientTimeout(total=5),
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    models = [m["name"] for m in data.get("models", [])]
                    if self._model in models:
                        self.enabled = True
                        log.info("Vesper online — personality engine enabled (Ollama: %s)", self._model)
                    else:
                        log.warning(
                            "Model '%s' not found in Ollama. Available: %s",
                            self._model,
                            models,
                        )
                        log.warning("Pull it with: ollama pull %s", self._model)
                else:
                    log.warning("Ollama responded with status %d", resp.status)
        except Exception as e:
            log.warning(
                "Ollama not reachable at %s: %s — Vesper is sleeping",
                self._ollama_url,
                e,
            )

    async def shutdown(self) -> None:
        """Close the HTTP session."""
        if self._session:
            await self._session.close()

    def _build_system_prompt(self, state: CompanionState, chat_rate: float = 0.0) -> str:
        preset_desc = PERSONALITY_PRESETS.get(
            PERSONALITY_PRESET, PERSONALITY_PRESETS["snarky"]
        )
        relationship_desc = RELATIONSHIP_DYNAMICS.get(
            RELATIONSHIP_DYNAMIC, RELATIONSHIP_DYNAMICS["ride_or_die"]
        ).format(streamer=STREAMER_NAME)
        return SYSTEM_PROMPT.format(
            streamer=STREAMER_NAME,
            preset_description=preset_desc,
            relationship_description=relationship_desc,
            energy=round(state.mood.energy),
            positivity=round(state.mood.positivity),
            engagement=round(state.mood.engagement),
            expression=state.mood.current_expression.value,
            chat_rate=chat_rate,
        )

    def _add_context(self, role: str, content: str) -> None:
        self._context.append({"role": role, "content": content})
        if len(self._context) > CONTEXT_WINDOW_SIZE:
            self._context = self._context[-CONTEXT_WINDOW_SIZE:]

    async def _call_ollama(
        self, system: str, messages: list[dict], max_tokens: int = 150
    ) -> str | None:
        """Call the Ollama chat API."""
        if not self._session:
            return None

        ollama_messages = [{"role": "system", "content": system}] + messages

        payload = {
            "model": self._model,
            "messages": ollama_messages,
            "stream": False,
            "options": {
                "num_predict": max_tokens,
                "temperature": 0.8,
                "top_p": 0.9,
            },
        }

        try:
            async with self._session.post(
                f"{self._ollama_url}/api/chat",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=30),
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get("message", {}).get("content", "").strip()
                else:
                    log.error("Ollama returned status %d", resp.status)
                    return None
        except asyncio.TimeoutError:
            log.warning("Ollama timed out (30s) — Vesper is thinking too hard")
            return None
        except Exception as e:
            log.error("Ollama call failed: %s", e)
            return None

    async def generate_reaction(
        self,
        event: StreamEvent,
        state: CompanionState,
        chat_rate: float = 0.0,
    ) -> str | None:
        """Generate a short reaction to a stream event."""
        if not self.enabled:
            return None

        now = time()
        if now - self._last_reaction_time < REACTION_COOLDOWN_SECONDS:
            return None

        event_desc = self._describe_event(event)
        self._add_context("user", f"[Stream event] {event_desc}")

        text = await self._call_ollama(
            system=self._build_system_prompt(state, chat_rate),
            messages=self._context[-6:],
            max_tokens=80,
        )

        if text:
            self._add_context("assistant", text)
            self._last_reaction_time = now
            log.info("Vesper reacts: %s", text)

        return text

    async def generate_chat_response(
        self,
        message: str,
        username: str,
        state: CompanionState,
        chat_rate: float = 0.0,
    ) -> str | None:
        """Generate a chat reply to a viewer."""
        if not self.enabled:
            return None

        now = time()
        if now - self._last_chat_time < CHAT_RESPONSE_COOLDOWN_SECONDS:
            return None

        self._add_context("user", f"{username}: {message}")

        text = await self._call_ollama(
            system=self._build_system_prompt(state, chat_rate),
            messages=self._context,
            max_tokens=150,
        )

        if text:
            self._add_context("assistant", text)
            self._last_chat_time = now
            log.info("Vesper to %s: %s", username, text)

        return text

    @staticmethod
    def _describe_event(event: StreamEvent) -> str:
        match event.type:
            case "new-follower":
                return f"{event.username} just followed!"
            case "new-subscriber":
                tier = int(event.amount) if event.amount else 1
                return f"{event.username} subscribed at tier {tier}!"
            case "gift-sub":
                count = int(event.amount) if event.amount else 1
                return f"{event.username} gifted {count} sub{'s' if count > 1 else ''} to the community!"
            case "raid":
                return f"{event.username} raided with {int(event.amount)} viewers!"
            case "bits" | "cheer":
                return f"{event.username} cheered {int(event.amount)} bits!"
            case "donation" | "tip":
                return f"{event.username} donated {event.amount}!"
            case "chat-message":
                return f"{event.username} said: {event.message}"
            case "stream-online":
                return f"{STREAMER_NAME} just went live!"
            case "stream-offline":
                return f"{STREAMER_NAME} ended the stream."
            case "ban" | "timeout":
                duration = f" for {int(event.amount)}s" if event.amount else ""
                return f"{event.username} got timed out{duration}. yikes."
            case "vip-added":
                return f"{event.username} just got VIP. moving up in the world."
            case "host":
                return f"{event.username} is hosting the channel with {int(event.amount or 0)} viewers!"
            case "poll-started":
                return f"A poll just started: {event.message}"
            case "poll-ended":
                return f"Poll ended. Results: {event.message}"
            case "prediction-started":
                return f"Prediction opened: {event.message}"
            case "prediction-resolved":
                return f"Prediction resolved: {event.message}"
            case "ad-break":
                duration = int(event.amount) if event.amount else 30
                return f"Ad break running for {duration} seconds. hold tight."
            case "alert":
                return f"Alert triggered: {event.message or event.type}"
            case _:
                return f"Event: {event.type} from {event.username}"
            