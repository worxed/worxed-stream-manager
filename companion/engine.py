"""Vesper Companion Engine — main entry point.

Connects to the Worxed backend as a Socket.IO client,
processes stream events, maintains companion state,
generates personality text via Ollama, and speaks via CSM-1B.

Pipeline:
    Stream Event → EventProcessor (mood update)
                 → PersonalityEngine (Ollama → text)
                 → VoiceEngine (CSM-1B → audio)
                 → emit companion-state (for overlay)

Usage:
    python engine.py
    python engine.py --no-voice    # skip voice model loading
"""

import argparse
import asyncio
import json
import logging
import random
import signal
import sys
from time import time

import socketio
from aiohttp import web

from config import (
    BACKEND_URL,
    CHAT_RATE_HIGH_THRESHOLD,
    CHAT_RESPONSE_PROB_BASE,
    CHAT_RESPONSE_PROB_MIN,
    COMPANION_NAME,
    COMPANION_PORT,
    MOOD_DECAY_INTERVAL_SECONDS,
    STREAMER_NAME,
    VOICE_TTL_SECONDS,
)
from events import EventProcessor
from models import CompanionState, StreamEvent
from personality import PersonalityEngine

# VoiceEngine imported lazily — avoids torch import when --no-voice is used


class _NullVoiceEngine:
    """Stub when voice is disabled — avoids importing torch entirely."""
    _generating = False
    _generation_count = 0

    def is_available(self) -> bool:
        return False

    async def initialize(self) -> None:
        pass

    async def synthesize(self, text: str, mood: str = "neutral") -> dict | None:
        return None

    async def synthesize_to_wav(self, text: str, mood: str = "neutral") -> bytes | None:
        return None

    async def shutdown(self) -> None:
        pass

# --- Logging setup ---

logging.basicConfig(
    level=logging.INFO,
    format="\033[36m[%(name)s]\033[0m %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("vesper")


# --- Core engine ---

class CompanionEngine:
    """Main engine: Socket.IO client + event processing + personality + voice."""

    def __init__(self, enable_voice: bool = True) -> None:
        self.state = CompanionState()
        self.events = EventProcessor(self.state)
        self.personality = PersonalityEngine()
        if enable_voice:
            from voice import VoiceEngine
            self.voice = VoiceEngine()
        else:
            self.voice = _NullVoiceEngine()
        self._enable_voice = enable_voice
        self._response_event_id: int = 0  # incremented per event, used for voice TTL
        self.sio = socketio.AsyncClient(
            reconnection=True,
            reconnection_attempts=0,  # infinite
            reconnection_delay=2,
            reconnection_delay_max=30,
            logger=False,
        )
        self._running = False
        self._decay_task: asyncio.Task | None = None
        self._register_handlers()

    def _register_handlers(self) -> None:
        """Register Socket.IO event handlers."""
        sio = self.sio

        @sio.event
        async def connect():
            log.info("\033[32mConnected to backend at %s\033[0m", BACKEND_URL)

        @sio.event
        async def disconnect():
            log.warning("\033[33mDisconnected from backend\033[0m")

        @sio.event
        async def connect_error(data):
            log.error("\033[31mConnection error: %s\033[0m", data)

        @sio.on("chat-message")
        async def on_chat_message(data):
            event = StreamEvent(
                type="chat-message",
                username=data.get("username", data.get("user", "")),
                message=data.get("message", data.get("text", "")),
            )
            self.events.process(event)
            log.info(
                "\033[90m[chat]\033[0m %s: %s  \033[90m[%s | %.0f msg/min]\033[0m",
                event.username,
                event.message[:80],
                self.state.mood.current_expression.value,
                self.events.chat_rate,
            )

            # Streamer messages always get a response (they're talking to us)
            is_streamer = event.username.lower() == STREAMER_NAME.lower()
            mentions_us = COMPANION_NAME.lower() in event.message.lower()

            if is_streamer or mentions_us:
                # Apply probability scaling based on chat rate (streamer bypasses at 100%)
                if is_streamer or self._should_respond_chat():
                    await self._respond(event)

        @sio.on("new-follower")
        async def on_new_follower(data):
            event = StreamEvent(
                type="new-follower",
                username=data.get("username", data.get("from", "")),
            )
            self.events.process(event)
            log.info(
                "\033[35m[follow]\033[0m %s  \033[90m→ %s\033[0m",
                event.username,
                self.state.mood.current_expression.value,
            )
            await self._react(event)

        @sio.on("new-subscriber")
        async def on_new_subscriber(data):
            event = StreamEvent(
                type="new-subscriber",
                username=data.get("username", data.get("from", "")),
                amount=float(data.get("tier", data.get("plan", 1))),
            )
            self.events.process(event)
            log.info(
                "\033[33m[sub]\033[0m %s (tier %.0f)  \033[90m→ %s\033[0m",
                event.username,
                event.amount,
                self.state.mood.current_expression.value,
            )
            await self._react(event)

        @sio.on("raid")
        async def on_raid(data):
            event = StreamEvent(
                type="raid",
                username=data.get("username", data.get("from", "")),
                amount=float(data.get("viewers", data.get("viewerCount", 0))),
            )
            self.events.process(event)
            log.info(
                "\033[31m[raid]\033[0m %s with %.0f viewers  \033[90m→ %s\033[0m",
                event.username,
                event.amount,
                self.state.mood.current_expression.value,
            )
            await self._react(event)

        @sio.on("alert")
        async def on_alert(data):
            event = StreamEvent(
                type="alert",
                username=data.get("username", ""),
                message=data.get("message", data.get("type", "")),
            )
            self.events.process(event)
            log.info(
                "\033[34m[alert]\033[0m %s  \033[90m→ %s\033[0m",
                event.message or event.type,
                self.state.mood.current_expression.value,
            )
            await self._react(event)

        @sio.on("settings-changed")
        async def on_settings_changed(data):
            log.debug("Settings changed: %s", data.get("key", "?"))

    def _should_respond_chat(self) -> bool:
        """Probability gate for chat responses — scales down as chat rate increases."""
        rate = self.events.chat_rate
        if rate <= CHAT_RATE_HIGH_THRESHOLD:
            prob = CHAT_RESPONSE_PROB_BASE
        else:
            # Linear scale from base → min as rate goes from threshold → 3x threshold
            excess = (rate - CHAT_RATE_HIGH_THRESHOLD) / (CHAT_RATE_HIGH_THRESHOLD * 2)
            prob = max(CHAT_RESPONSE_PROB_MIN,
                       CHAT_RESPONSE_PROB_BASE - excess * (CHAT_RESPONSE_PROB_BASE - CHAT_RESPONSE_PROB_MIN))
        roll = random.random()
        if roll > prob:
            log.debug("Chat response skipped (prob=%.2f, rate=%.0f msg/min)", prob, rate)
            return False
        return True

    async def _react(self, event: StreamEvent) -> None:
        """Generate a personality reaction + voice for a stream event."""
        self._response_event_id += 1
        my_event_id = self._response_event_id

        # Step 1: Generate reaction text via Ollama
        text = await self.personality.generate_reaction(
            event, self.state, chat_rate=self.events.chat_rate
        )
        if not text:
            return

        self.state.is_speaking = True
        self.state.current_response = text
        await self._emit_state()

        # Step 2: Generate voice audio via CSM (non-blocking, runs in thread)
        voice_start = time()
        mood = self.state.mood.current_expression.value
        voice_result = await self.voice.synthesize(text, mood)

        # Voice TTL: discard if a newer event started while we were generating
        if my_event_id != self._response_event_id:
            log.info("\033[93m[voice-ttl]\033[0m Discarding stale voice (event %d, now %d)",
                     my_event_id, self._response_event_id)
        elif voice_result and (time() - voice_start) < VOICE_TTL_SECONDS:
            self.state.voice_audio_ready = True
            self.state.voice_duration = voice_result["duration"]
            log.info(
                "\033[95m[voice]\033[0m %.1fs audio for: %.50s...",
                voice_result["duration"], text,
            )
            await self._emit_state()

        self.state.is_speaking = False
        self.state.voice_audio_ready = False

    async def _respond(self, event: StreamEvent) -> None:
        """Generate a chat response + voice for a viewer mention or streamer message."""
        self._response_event_id += 1
        my_event_id = self._response_event_id

        text = await self.personality.generate_chat_response(
            event.message, event.username, self.state, chat_rate=self.events.chat_rate
        )
        if not text:
            return

        self.state.is_speaking = True
        self.state.current_response = text
        await self._emit_state()

        # Generate voice
        voice_start = time()
        mood = self.state.mood.current_expression.value
        voice_result = await self.voice.synthesize(text, mood)

        # Voice TTL check
        if my_event_id != self._response_event_id:
            log.info("\033[93m[voice-ttl]\033[0m Discarding stale voice (event %d, now %d)",
                     my_event_id, self._response_event_id)
        elif voice_result and (time() - voice_start) < VOICE_TTL_SECONDS:
            self.state.voice_audio_ready = True
            self.state.voice_duration = voice_result["duration"]
            log.info(
                "\033[95m[voice]\033[0m %.1fs audio for: %.50s...",
                voice_result["duration"], text,
            )
            await self._emit_state()

        self.state.is_speaking = False
        self.state.voice_audio_ready = False

    async def _emit_state(self) -> None:
        """Emit current companion state (for overlay consumption)."""
        if self.sio.connected:
            try:
                await self.sio.emit("companion-state", self.state.to_dict())
            except Exception:
                pass  # don't crash on emit failure

    async def _mood_decay_loop(self) -> None:
        """Periodically decay mood when no events are happening."""
        while self._running:
            await asyncio.sleep(MOOD_DECAY_INTERVAL_SECONDS)
            self.events.decay()

    # --- Health API ---

    def _create_app(self) -> web.Application:
        """Create aiohttp app with health + audio + stats endpoints."""
        app = web.Application()
        app.router.add_get("/status", self._handle_status)
        app.router.add_get("/health", self._handle_health)
        app.router.add_get("/stats", self._handle_stats)
        app.router.add_post("/speak", self._handle_speak)
        return app

    async def _handle_status(self, request: web.Request) -> web.Response:
        data = self.state.to_dict()
        data["chat_rate"] = round(self.events.chat_rate, 1)
        return web.json_response(data)

    async def _handle_health(self, request: web.Request) -> web.Response:
        return web.json_response({
            "status": "ok",
            "connected": self.sio.connected,
            "name": COMPANION_NAME,
            "streamer": STREAMER_NAME,
            "voice_available": self.voice.is_available(),
            "personality_enabled": self.personality.enabled,
        })

    async def _handle_stats(self, request: web.Request) -> web.Response:
        """Scalability metrics for monitoring."""
        rate = self.events.chat_rate
        if rate <= CHAT_RATE_HIGH_THRESHOLD:
            prob = CHAT_RESPONSE_PROB_BASE
        else:
            excess = (rate - CHAT_RATE_HIGH_THRESHOLD) / (CHAT_RATE_HIGH_THRESHOLD * 2)
            prob = max(CHAT_RESPONSE_PROB_MIN,
                       CHAT_RESPONSE_PROB_BASE - excess * (CHAT_RESPONSE_PROB_BASE - CHAT_RESPONSE_PROB_MIN))
        return web.json_response({
            "chat_rate_per_min": round(rate, 1),
            "chat_rate_threshold": CHAT_RATE_HIGH_THRESHOLD,
            "response_probability": round(prob, 3),
            "voice_busy": self.voice._generating if self.voice.is_available() else None,
            "voice_generation_count": self.voice._generation_count if self.voice.is_available() else 0,
            "voice_ttl_seconds": VOICE_TTL_SECONDS,
            "event_counter": self._response_event_id,
        })

    async def _handle_speak(self, request: web.Request) -> web.Response:
        """Manual speak endpoint: POST /speak {"text": "...", "mood": "neutral"}"""
        try:
            body = await request.json()
        except Exception:
            return web.json_response({"error": "invalid JSON"}, status=400)

        text = body.get("text", "").strip()
        mood = body.get("mood", "neutral")
        if not text:
            return web.json_response({"error": "text is required"}, status=400)

        # Generate personality response if no text provided directly
        log.info("\033[94m[speak]\033[0m Manual: \"%s\" (mood=%s)", text[:60], mood)

        # Voice synthesis
        voice_result = await self.voice.synthesize(text, mood)
        if voice_result:
            return web.json_response({
                "text": text,
                "mood": mood,
                "duration": voice_result["duration"],
                "generation_time": voice_result["generation_time"],
            })
        else:
            return web.json_response({
                "text": text,
                "mood": mood,
                "voice": "unavailable",
            })

    # --- Lifecycle ---

    async def start(self) -> None:
        """Start the companion engine."""
        self._running = True

        log.info("=" * 50)
        log.info("  %s Companion Engine", COMPANION_NAME)
        log.info("=" * 50)
        log.info("Backend:     %s", BACKEND_URL)
        log.info("Health API:  http://localhost:%d", COMPANION_PORT)

        # Initialize personality engine (checks Ollama connection)
        await self.personality.initialize()
        log.info("Personality: %s", "enabled" if self.personality.enabled else "disabled (Ollama not available)")

        # Initialize voice engine (loads CSM model)
        if self._enable_voice:
            await self.voice.initialize()
        log.info("Voice:       %s", "ready" if self.voice.is_available() else "disabled")
        log.info("")

        # Start mood decay loop
        self._decay_task = asyncio.create_task(self._mood_decay_loop())

        # Start health API server
        app = self._create_app()
        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, "0.0.0.0", COMPANION_PORT)
        await site.start()
        log.info("Health API listening on port %d", COMPANION_PORT)
        log.info("  GET  /status  — companion state + chat rate")
        log.info("  GET  /health  — health check")
        log.info("  GET  /stats   — scalability metrics")
        log.info("  POST /speak   — manual voice generation")
        log.info("")
        log.info("Streamer:    %s", STREAMER_NAME)
        log.info("Chat rate threshold: %.0f msg/min (scaling kicks in above this)", CHAT_RATE_HIGH_THRESHOLD)

        # Connect to backend Socket.IO
        log.info("")
        log.info("Connecting to backend...")
        try:
            await self.sio.connect(BACKEND_URL, transports=["websocket", "polling"])
        except Exception as e:
            log.error("Failed to connect: %s", e)
            log.info("Will keep retrying in the background...")

        # Wait until shutdown
        try:
            await self.sio.wait()
        except asyncio.CancelledError:
            pass
        finally:
            await self.stop()
            await runner.cleanup()

    async def stop(self) -> None:
        """Graceful shutdown."""
        self._running = False
        if self._decay_task:
            self._decay_task.cancel()
        if self.sio.connected:
            await self.sio.disconnect()
        await self.personality.shutdown()
        await self.voice.shutdown()
        log.info("Companion engine stopped.")


# --- Entry point ---

def main() -> None:
    parser = argparse.ArgumentParser(description="Vesper Companion Engine")
    parser.add_argument("--no-voice", action="store_true",
                        help="Skip voice model loading (personality only)")
    args = parser.parse_args()

    engine = CompanionEngine(enable_voice=not args.no_voice)
    loop = asyncio.new_event_loop()

    # Graceful shutdown on SIGINT/SIGTERM
    if sys.platform != "win32":
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, lambda: asyncio.ensure_future(engine.stop()))

    try:
        loop.run_until_complete(engine.start())
    except KeyboardInterrupt:
        log.info("Shutting down...")
        loop.run_until_complete(engine.stop())
    finally:
        loop.close()


if __name__ == "__main__":
    main()
