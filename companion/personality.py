"""Personality engine — Anthropic SDK integration for Schnukums."""

import asyncio
import logging
from time import time

from anthropic import AsyncAnthropic

from config import (
    ANTHROPIC_API_KEY,
    CHAT_MODEL,
    CHAT_RESPONSE_COOLDOWN_SECONDS,
    COMPANION_NAME,
    CONTEXT_WINDOW_SIZE,
    PERSONALITY_PRESET,
    REACTION_COOLDOWN_SECONDS,
    REACTION_MODEL,
)
from models import CompanionState, StreamEvent

log = logging.getLogger("schnukums.personality")

PERSONALITY_PRESETS = {
    "chill": "You're laid-back and relaxed. You react calmly to events, with dry humor and a cozy vibe.",
    "hype": "You're energetic and enthusiastic! Everything is exciting! You hype up the chat and streamer constantly.",
    "snarky": "You're witty, a little sarcastic, but always affectionate underneath. Sharp tongue, warm heart.",
}

SYSTEM_PROMPT = """You are {name}, an AI stream companion character. You live alongside the streamer and react to what happens on stream.

Personality: {preset_description}

Core traits:
- Warm and loyal to the streamer and their community
- Quick-witted with good comedic timing
- Self-aware that you're an AI companion (lean into it, don't hide it)
- You have a cat-like personality — independent but affectionate when you want to be
- You notice patterns in chat and call them out playfully

Rules:
- Keep responses SHORT (1-2 sentences max for reactions, 2-3 for chat replies)
- Never be mean-spirited, even when snarky — always punch up, never down
- Don't use excessive emojis or caps lock (you're not a hype bot)
- Reference your current mood naturally when it fits
- You can express tiredness if energy is low, excitement if it's high

Current mood state:
- Energy: {energy}/100
- Positivity: {positivity}/100
- Engagement: {engagement}/100
- Expression: {expression}"""


class PersonalityEngine:
    """Generates personality-driven responses via Anthropic API."""

    def __init__(self) -> None:
        self.enabled = bool(ANTHROPIC_API_KEY)
        self._client: AsyncAnthropic | None = None
        self._context: list[dict] = []
        self._last_reaction_time: float = 0.0
        self._last_chat_time: float = 0.0

        if self.enabled:
            self._client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
            log.info("Personality engine enabled (models: %s / %s)", REACTION_MODEL, CHAT_MODEL)
        else:
            log.warning("No ANTHROPIC_API_KEY — personality engine disabled (silent mode)")

    def _build_system_prompt(self, state: CompanionState) -> str:
        preset_desc = PERSONALITY_PRESETS.get(PERSONALITY_PRESET, PERSONALITY_PRESETS["snarky"])
        return SYSTEM_PROMPT.format(
            name=COMPANION_NAME,
            preset_description=preset_desc,
            energy=round(state.mood.energy),
            positivity=round(state.mood.positivity),
            engagement=round(state.mood.engagement),
            expression=state.mood.current_expression.value,
        )

    def _add_context(self, role: str, content: str) -> None:
        self._context.append({"role": role, "content": content})
        if len(self._context) > CONTEXT_WINDOW_SIZE:
            self._context = self._context[-CONTEXT_WINDOW_SIZE:]

    async def generate_reaction(self, event: StreamEvent, state: CompanionState) -> str | None:
        """Generate a short reaction to a stream event. Uses Haiku for speed."""
        if not self.enabled or not self._client:
            return None

        now = time()
        if now - self._last_reaction_time < REACTION_COOLDOWN_SECONDS:
            return None

        event_desc = self._describe_event(event)
        self._add_context("user", f"[Stream event] {event_desc}")

        try:
            response = await self._client.messages.create(
                model=REACTION_MODEL,
                max_tokens=100,
                system=self._build_system_prompt(state),
                messages=self._context[-6:],  # shorter context for reactions
            )
            text = response.content[0].text.strip()
            self._add_context("assistant", text)
            self._last_reaction_time = now
            log.info("Reaction: %s", text)
            return text
        except Exception as e:
            log.error("Reaction generation failed: %s", e)
            return None

    async def generate_chat_response(
        self, message: str, username: str, state: CompanionState
    ) -> str | None:
        """Generate a chat reply to a viewer. Uses Sonnet for quality."""
        if not self.enabled or not self._client:
            return None

        now = time()
        if now - self._last_chat_time < CHAT_RESPONSE_COOLDOWN_SECONDS:
            return None

        self._add_context("user", f"{username}: {message}")

        try:
            response = await self._client.messages.create(
                model=CHAT_MODEL,
                max_tokens=200,
                system=self._build_system_prompt(state),
                messages=self._context,
            )
            text = response.content[0].text.strip()
            self._add_context("assistant", text)
            self._last_chat_time = now
            log.info("Chat reply to %s: %s", username, text)
            return text
        except Exception as e:
            log.error("Chat response failed: %s", e)
            return None

    @staticmethod
    def _describe_event(event: StreamEvent) -> str:
        match event.type:
            case "new-follower":
                return f"{event.username} just followed!"
            case "new-subscriber":
                tier = int(event.amount) if event.amount else 1
                return f"{event.username} subscribed at tier {tier}!"
            case "raid":
                return f"{event.username} raided with {int(event.amount)} viewers!"
            case "chat-message":
                return f"{event.username} said: {event.message}"
            case "alert":
                return f"Alert triggered: {event.message or event.type}"
            case _:
                return f"Event: {event.type} from {event.username}"
