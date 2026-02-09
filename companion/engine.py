"""Schnukums Companion Engine — main entry point.

Connects to the Worxed backend as a Socket.IO client,
processes stream events, and maintains companion state.

Usage:
    python engine.py
"""

import asyncio
import json
import logging
import signal
import sys

import socketio
from aiohttp import web

from config import BACKEND_URL, COMPANION_NAME, COMPANION_PORT, MOOD_DECAY_INTERVAL_SECONDS
from events import EventProcessor
from models import CompanionState, StreamEvent
from personality import PersonalityEngine
from voice import VoiceEngine

# --- Logging setup ---

logging.basicConfig(
    level=logging.INFO,
    format="\033[36m[%(name)s]\033[0m %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("schnukums")


# --- Core engine ---

class CompanionEngine:
    """Main engine: Socket.IO client + event processing + health API."""

    def __init__(self) -> None:
        self.state = CompanionState()
        self.events = EventProcessor(self.state)
        self.personality = PersonalityEngine()
        self.voice = VoiceEngine()
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
                "\033[90m[chat]\033[0m %s: %s  \033[90m[%s]\033[0m",
                event.username,
                event.message[:80],
                self.state.mood.current_expression.value,
            )

            # Generate chat response if the message mentions the companion
            if COMPANION_NAME.lower() in event.message.lower():
                response = await self.personality.generate_chat_response(
                    event.message, event.username, self.state
                )
                if response:
                    self.state.is_speaking = True
                    self.state.current_response = response
                    # Emit state so any connected overlay can display it
                    await self._emit_state()
                    self.state.is_speaking = False

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

    async def _react(self, event: StreamEvent) -> None:
        """Generate a personality reaction to an event."""
        response = await self.personality.generate_reaction(event, self.state)
        if response:
            self.state.is_speaking = True
            self.state.current_response = response
            await self._emit_state()
            self.state.is_speaking = False

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
        """Create aiohttp app with health endpoint."""
        app = web.Application()
        app.router.add_get("/status", self._handle_status)
        app.router.add_get("/health", self._handle_health)
        return app

    async def _handle_status(self, request: web.Request) -> web.Response:
        return web.json_response(self.state.to_dict())

    async def _handle_health(self, request: web.Request) -> web.Response:
        return web.json_response({
            "status": "ok",
            "connected": self.sio.connected,
            "name": COMPANION_NAME,
            "voice_available": self.voice.is_available(),
            "personality_enabled": self.personality.enabled,
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
        log.info("Personality: %s", "enabled" if self.personality.enabled else "disabled (no API key)")
        log.info("Voice:       %s", "available" if self.voice.is_available() else "disabled (scaffold)")
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

        # Connect to backend Socket.IO
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
        log.info("Companion engine stopped.")


# --- Entry point ---

def main() -> None:
    engine = CompanionEngine()
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
