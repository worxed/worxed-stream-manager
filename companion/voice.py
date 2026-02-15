"""Voice engine — Chatterbox-Turbo TTS for Vesper.

Loads the model once, uses golden clips for voice cloning,
supports emotion exaggeration mapped from mood state,
and runs generation in a thread executor so it doesn't block
the async event loop.

Chatterbox-Turbo features:
- Zero-shot voice cloning from a reference clip
- Emotion exaggeration dial (0.0 flat → 1.0+ dramatic)
- Sub-200ms streaming (when streaming mode is used)
- 350M parameters, ~3 GB VRAM
"""

import asyncio
import io
import json
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

log = logging.getLogger("vesper.voice")

# Import guards
try:
    import torch
    import numpy as np
    import soundfile as sf
    TORCH_AVAILABLE = True

    # Patch perth watermarker — native extension requires pkg_resources
    # which was removed in setuptools 82+. DummyWatermarker is a no-op
    # (rounds to 5 decimal places) and doesn't affect audio quality.
    import perth
    if perth.PerthImplicitWatermarker is None:
        from perth.dummy_watermarker import DummyWatermarker
        perth.PerthImplicitWatermarker = DummyWatermarker
except ImportError:
    TORCH_AVAILABLE = False

VOICES_DIR = Path(__file__).parent / "voices"
GOLDEN_DIR = VOICES_DIR / "golden"
OUTPUT_DIR = VOICES_DIR / "live"

# Mood → Chatterbox emotion exaggeration + optional tags
# exaggeration: 0.0 = flat/deadpan, 0.5 = natural, 1.0+ = dramatic
MOOD_VOICE_MAP = {
    "neutral":  {"exaggeration": 0.5, "prefix": ""},
    "snarky":   {"exaggeration": 0.4, "prefix": ""},
    "warm":     {"exaggeration": 0.6, "prefix": ""},
    "excited":  {"exaggeration": 0.85, "prefix": ""},
    "thinking": {"exaggeration": 0.3, "prefix": ""},
    "happy":    {"exaggeration": 0.7, "prefix": ""},
    "sad":      {"exaggeration": 0.4, "prefix": "[sigh] "},
    "amused":   {"exaggeration": 0.6, "prefix": "[chuckle] "},
}

# Which golden clip to use as voice reference
DEFAULT_GOLDEN = "warm"


class VoiceEngine:
    """Text-to-speech engine using Chatterbox-Turbo with voice cloning."""

    def __init__(self) -> None:
        self._model = None
        self._available = False
        self._sample_rate = 24000
        self._golden_path: Path | None = None
        self._executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="voice")
        self._generating = False
        self._generation_count = 0

    def is_available(self) -> bool:
        return self._available

    async def initialize(self) -> None:
        """Load Chatterbox model and find golden reference clip."""
        if not TORCH_AVAILABLE:
            log.info("PyTorch not installed — voice engine disabled")
            return

        if not torch.cuda.is_available():
            log.warning("No GPU available — voice engine disabled (Chatterbox needs GPU)")
            return

        # Find the best golden clip for voice reference
        self._golden_path = self._find_golden_clip()
        if not self._golden_path:
            log.warning("No golden voice clips found in %s — voice disabled", GOLDEN_DIR)
            return

        log.info("Loading Chatterbox-Turbo on GPU (first time downloads ~1GB)...")
        loop = asyncio.get_event_loop()
        try:
            await loop.run_in_executor(self._executor, self._load_model)
            if self._model:
                self._available = True
                self._sample_rate = self._model.sr
                log.info("Voice engine ready (Chatterbox-Turbo, %d Hz)", self._sample_rate)
                log.info("Using golden clip: %s", self._golden_path.name)
        except Exception as e:
            log.error("Voice engine failed to load: %s", e)

    def _find_golden_clip(self) -> Path | None:
        """Find the most recent golden WAV clip."""
        mood_dir = GOLDEN_DIR / DEFAULT_GOLDEN
        if not mood_dir.exists():
            # Fall back to any golden clip
            for d in GOLDEN_DIR.iterdir():
                if d.is_dir():
                    wavs = sorted(d.glob("*.wav"), key=lambda p: p.stat().st_mtime, reverse=True)
                    if wavs:
                        return wavs[0]
            return None

        wavs = sorted(mood_dir.glob("*.wav"), key=lambda p: p.stat().st_mtime, reverse=True)
        return wavs[0] if wavs else None

    def _load_model(self) -> None:
        """Load Chatterbox-Turbo model on GPU (runs in thread)."""
        from chatterbox.tts import ChatterboxTTS
        self._model = ChatterboxTTS.from_pretrained(device="cuda")
        log.info("Chatterbox loaded on %s", self._model.device)

    def _generate_sync(self, text: str, mood: str) -> tuple | None:
        """Synchronous generation (runs in thread executor).

        Returns (audio_numpy, sample_rate, duration, elapsed) or None.
        """
        if not self._model or not self._golden_path:
            return None

        # Get mood parameters
        params = MOOD_VOICE_MAP.get(mood, MOOD_VOICE_MAP["neutral"])
        exaggeration = params["exaggeration"]
        prefix = params["prefix"]

        # Prepend emotion tag if present
        full_text = f"{prefix}{text}" if prefix else text

        t0 = time.time()
        try:
            wav = self._model.generate(
                full_text,
                audio_prompt_path=str(self._golden_path),
                exaggeration=exaggeration,
            )
        except Exception as e:
            log.error("Voice generation failed: %s", e)
            return None

        elapsed = time.time() - t0
        audio_np = wav.squeeze().cpu().numpy().astype(np.float32)
        duration = len(audio_np) / self._sample_rate
        self._generation_count += 1

        log.info(
            "Voice #%d: %.1fs audio in %.1fs (mood=%s, exag=%.2f)",
            self._generation_count, duration, elapsed, mood, exaggeration,
        )

        # Save to live output directory
        self._save_live(audio_np, text, mood, exaggeration, duration)

        return audio_np, self._sample_rate, duration, elapsed

    def _save_live(self, audio_np, text: str, mood: str, exaggeration: float, duration: float) -> Path | None:
        """Save generated audio to the live/ directory."""
        try:
            OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            wav_path = OUTPUT_DIR / f"live_{self._generation_count:03d}_{timestamp}.wav"
            meta_path = wav_path.with_suffix(".json")

            sf.write(str(wav_path), audio_np, self._sample_rate)
            meta = {
                "text": text,
                "mood": mood,
                "exaggeration": exaggeration,
                "duration": duration,
                "wav_file": wav_path.name,
                "engine": "chatterbox-turbo",
                "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            }
            meta_path.write_text(json.dumps(meta, indent=2))
            return wav_path
        except Exception as e:
            log.warning("Failed to save live audio: %s", e)
            return None

    async def synthesize(self, text: str, mood: str = "neutral") -> dict | None:
        """Generate speech from text. Returns dict with audio info or None.

        Runs Chatterbox in a thread executor so it doesn't block the async loop.
        Only one generation at a time (queued).
        """
        if not self._available:
            return None

        if self._generating:
            log.debug("Voice engine busy — skipping: %.40s...", text)
            return None

        self._generating = True
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                self._executor, self._generate_sync, text, mood
            )
            if result is None:
                return None

            audio_np, sr, duration, elapsed = result
            return {
                "audio": audio_np,
                "sample_rate": sr,
                "duration": duration,
                "generation_time": elapsed,
                "text": text,
                "mood": mood,
            }
        finally:
            self._generating = False

    async def synthesize_to_wav(self, text: str, mood: str = "neutral") -> bytes | None:
        """Generate speech and return WAV bytes (for streaming/overlay)."""
        result = await self.synthesize(text, mood)
        if result is None:
            return None

        buf = io.BytesIO()
        sf.write(buf, result["audio"], result["sample_rate"], format="WAV")
        buf.seek(0)
        return buf.read()

    async def shutdown(self) -> None:
        """Shut down the executor and free GPU memory."""
        self._executor.shutdown(wait=False)
        if self._model is not None:
            del self._model
            self._model = None
            if TORCH_AVAILABLE and torch.cuda.is_available():
                torch.cuda.empty_cache()
        log.info("Voice engine shut down")
