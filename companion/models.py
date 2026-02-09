"""Data models for the Schnukums companion engine."""

from dataclasses import dataclass, field
from enum import Enum
from time import time


class Expression(Enum):
    IDLE = "idle"
    HAPPY = "happy"
    EXCITED = "excited"
    SNARKY = "snarky"
    THINKING = "thinking"
    SURPRISED = "surprised"
    SAD = "sad"
    ANGRY = "angry"
    SLEEPY = "sleepy"
    LOVE = "love"
    LAUGHING = "laughing"
    CAT_FACE = "cat_face"


@dataclass
class Mood:
    energy: float = 50.0        # 0-100
    positivity: float = 60.0    # 0-100
    engagement: float = 30.0    # 0-100
    current_expression: Expression = Expression.IDLE

    def clamp(self) -> None:
        """Clamp all values to 0-100 range."""
        self.energy = max(0.0, min(100.0, self.energy))
        self.positivity = max(0.0, min(100.0, self.positivity))
        self.engagement = max(0.0, min(100.0, self.engagement))

    def to_dict(self) -> dict:
        return {
            "energy": round(self.energy, 1),
            "positivity": round(self.positivity, 1),
            "engagement": round(self.engagement, 1),
            "current_expression": self.current_expression.value,
        }


@dataclass
class StreamEvent:
    type: str               # chat-message, new-follower, new-subscriber, raid, alert
    username: str = ""
    message: str = ""
    amount: float = 0.0     # sub tier, raid viewer count, donation amount
    timestamp: float = field(default_factory=time)

    def to_dict(self) -> dict:
        return {
            "type": self.type,
            "username": self.username,
            "message": self.message,
            "amount": self.amount,
            "timestamp": self.timestamp,
        }


@dataclass
class CompanionState:
    mood: Mood = field(default_factory=Mood)
    last_event: StreamEvent | None = None
    is_speaking: bool = False
    current_response: str = ""
    started_at: float = field(default_factory=time)

    @property
    def uptime(self) -> float:
        return time() - self.started_at

    def to_dict(self) -> dict:
        return {
            "mood": self.mood.to_dict(),
            "last_event": self.last_event.to_dict() if self.last_event else None,
            "is_speaking": self.is_speaking,
            "current_response": self.current_response,
            "uptime": round(self.uptime, 1),
        }
