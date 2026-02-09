"""Event processor — maps stream events to companion reactions."""

import logging
import random
from time import time

from models import CompanionState, Expression, Mood, StreamEvent
from config import MOOD_DECAY_RATE

log = logging.getLogger("schnukums.events")


# Expression mappings for each event type
EVENT_EXPRESSIONS: dict[str, list[Expression]] = {
    "new-follower": [Expression.HAPPY, Expression.EXCITED, Expression.LOVE],
    "new-subscriber": [Expression.EXCITED, Expression.HAPPY, Expression.LOVE],
    "raid": [Expression.EXCITED, Expression.SURPRISED, Expression.HAPPY],
    "chat-message": [
        Expression.HAPPY,
        Expression.SNARKY,
        Expression.LAUGHING,
        Expression.CAT_FACE,
        Expression.THINKING,
    ],
    "alert": [Expression.SURPRISED, Expression.EXCITED, Expression.HAPPY],
}


class EventProcessor:
    """Processes stream events and updates companion state."""

    def __init__(self, state: CompanionState) -> None:
        self.state = state
        self._last_decay = time()

    def process(self, event: StreamEvent) -> CompanionState:
        """Process a stream event and update companion state."""
        self.state.last_event = event
        handler = getattr(self, f"_handle_{event.type.replace('-', '_')}", None)
        if handler:
            handler(event)
        else:
            log.debug("No handler for event type: %s", event.type)
        self.state.mood.clamp()
        return self.state

    def decay(self) -> None:
        """Apply mood decay — energy and engagement slowly decrease without events."""
        now = time()
        elapsed = now - self._last_decay
        if elapsed < 1.0:
            return
        self._last_decay = now

        # Decay proportional to elapsed time (rate is per-interval, normalized here)
        decay = MOOD_DECAY_RATE * (elapsed / 30.0)
        self.state.mood.energy = max(10.0, self.state.mood.energy - decay)
        self.state.mood.engagement = max(5.0, self.state.mood.engagement - decay * 0.5)

        # If very low engagement, get sleepy
        if self.state.mood.engagement < 15.0 and self.state.mood.energy < 25.0:
            self.state.mood.current_expression = Expression.SLEEPY
        elif self.state.mood.engagement < 20.0:
            self.state.mood.current_expression = Expression.IDLE

        self.state.mood.clamp()

    # --- Event handlers ---

    def _handle_chat_message(self, event: StreamEvent) -> None:
        mood = self.state.mood
        mood.engagement = min(100.0, mood.engagement + 3.0)
        mood.energy = min(100.0, mood.energy + 1.0)

        # Only change expression sometimes (don't react to every message)
        if random.random() < 0.3:
            mood.current_expression = random.choice(EVENT_EXPRESSIONS["chat-message"])

    def _handle_new_follower(self, event: StreamEvent) -> None:
        mood = self.state.mood
        mood.positivity = min(100.0, mood.positivity + 8.0)
        mood.engagement = min(100.0, mood.engagement + 10.0)
        mood.energy = min(100.0, mood.energy + 5.0)
        mood.current_expression = random.choice(EVENT_EXPRESSIONS["new-follower"])
        log.info("New follower: %s → %s", event.username, mood.current_expression.value)

    def _handle_new_subscriber(self, event: StreamEvent) -> None:
        mood = self.state.mood
        # Scale excitement by tier (amount: 1=tier1, 2=tier2, 3=tier3)
        tier_multiplier = max(1.0, event.amount)
        mood.positivity = min(100.0, mood.positivity + 12.0 * tier_multiplier)
        mood.engagement = min(100.0, mood.engagement + 15.0 * tier_multiplier)
        mood.energy = min(100.0, mood.energy + 10.0 * tier_multiplier)
        mood.current_expression = Expression.EXCITED if tier_multiplier >= 2 else random.choice(
            EVENT_EXPRESSIONS["new-subscriber"]
        )
        log.info(
            "New subscriber: %s (tier %.0f) → %s",
            event.username,
            tier_multiplier,
            mood.current_expression.value,
        )

    def _handle_raid(self, event: StreamEvent) -> None:
        mood = self.state.mood
        # Scale by viewer count (amount = viewer count)
        viewers = max(1.0, event.amount)
        scale = min(3.0, viewers / 10.0)  # cap at 3x for 30+ viewers
        mood.positivity = min(100.0, mood.positivity + 15.0 * scale)
        mood.engagement = min(100.0, mood.engagement + 20.0 * scale)
        mood.energy = min(100.0, mood.energy + 15.0 * scale)
        mood.current_expression = Expression.EXCITED
        log.info("Raid from %s with %.0f viewers → EXCITED", event.username, viewers)

    def _handle_alert(self, event: StreamEvent) -> None:
        mood = self.state.mood
        mood.engagement = min(100.0, mood.engagement + 8.0)
        mood.energy = min(100.0, mood.energy + 5.0)
        mood.current_expression = random.choice(EVENT_EXPRESSIONS["alert"])
        log.info("Alert: %s → %s", event.type, mood.current_expression.value)
