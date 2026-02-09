"""Configuration loader for the Schnukums companion engine."""

import os
from dotenv import load_dotenv

load_dotenv()


# Connection
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:4001")
COMPANION_PORT = int(os.getenv("COMPANION_PORT", "4003"))

# Anthropic
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# Personality
COMPANION_NAME = os.getenv("COMPANION_NAME", "Schnukums")
PERSONALITY_PRESET = os.getenv("PERSONALITY_PRESET", "snarky")  # chill, hype, snarky

# Rate limiting
REACTION_COOLDOWN_SECONDS = float(os.getenv("REACTION_COOLDOWN_SECONDS", "5.0"))
CHAT_RESPONSE_COOLDOWN_SECONDS = float(os.getenv("CHAT_RESPONSE_COOLDOWN_SECONDS", "10.0"))
CONTEXT_WINDOW_SIZE = int(os.getenv("CONTEXT_WINDOW_SIZE", "20"))

# Mood
MOOD_DECAY_INTERVAL_SECONDS = float(os.getenv("MOOD_DECAY_INTERVAL_SECONDS", "30.0"))
MOOD_DECAY_RATE = float(os.getenv("MOOD_DECAY_RATE", "2.0"))  # points per interval

# Models
REACTION_MODEL = os.getenv("REACTION_MODEL", "claude-haiku-4-5-20251001")
CHAT_MODEL = os.getenv("CHAT_MODEL", "claude-sonnet-4-5-20250929")
