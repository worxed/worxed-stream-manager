"""Configuration loader for the Vesper companion engine."""

import os
from dotenv import load_dotenv

load_dotenv()


# Connection
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:4001")
COMPANION_PORT = int(os.getenv("COMPANION_PORT", "4003"))

# LLM Backend (Ollama local by default)
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
LLM_MODEL = os.getenv("LLM_MODEL", "mistral:7b")

# Personality
COMPANION_NAME = os.getenv("COMPANION_NAME", "Vesper")
PERSONALITY_PRESET = os.getenv("PERSONALITY_PRESET", "snarky")  # chill, hype, snarky
STREAMER_NAME = os.getenv("STREAMER_NAME", "redisbananas")  # the streamer's Twitch username
RELATIONSHIP_DYNAMIC = os.getenv("RELATIONSHIP_DYNAMIC", "ride_or_die")  # ride_or_die, flirty, competitive, protective, chaotic, tender

# Rate limiting
REACTION_COOLDOWN_SECONDS = float(os.getenv("REACTION_COOLDOWN_SECONDS", "5.0"))
CHAT_RESPONSE_COOLDOWN_SECONDS = float(os.getenv("CHAT_RESPONSE_COOLDOWN_SECONDS", "10.0"))
CONTEXT_WINDOW_SIZE = int(os.getenv("CONTEXT_WINDOW_SIZE", "20"))

# Chat scalability — prevents CPU meltdown at high viewership
CHAT_RATE_WINDOW_SECONDS = float(os.getenv("CHAT_RATE_WINDOW_SECONDS", "60.0"))
CHAT_RATE_HIGH_THRESHOLD = float(os.getenv("CHAT_RATE_HIGH_THRESHOLD", "30.0"))  # msgs/min before scaling kicks in
CHAT_RESPONSE_PROB_BASE = float(os.getenv("CHAT_RESPONSE_PROB_BASE", "1.0"))  # 1.0 = respond to all mentions
CHAT_RESPONSE_PROB_MIN = float(os.getenv("CHAT_RESPONSE_PROB_MIN", "0.15"))  # floor at 15% even in floods
VOICE_TTL_SECONDS = float(os.getenv("VOICE_TTL_SECONDS", "120.0"))  # discard voice if older than this

# Mood
MOOD_DECAY_INTERVAL_SECONDS = float(os.getenv("MOOD_DECAY_INTERVAL_SECONDS", "30.0"))
MOOD_DECAY_RATE = float(os.getenv("MOOD_DECAY_RATE", "2.0"))  # points per interval

