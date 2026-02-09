"""Voice Consistency Engine — maintains Schnukums' voice across a session.

Architecture:
    Golden Reference Clips (2-3 clips that ARE her voice)
        | always included as base context
    Recent Generation Buffer (last 3-4 outputs)
        | appended as conversation context
    New Text Input + Mood Tag
        |
    CSM-1B Generator
        |
    New Audio Output -> fed back into buffer

Usage:
    from voice_engine import VoiceSession

    session = VoiceSession()
    audio = session.speak("Hey chat, I see you lurking.", mood="snarky")
    audio = session.speak("That's actually really cool.", mood="warm")
    # Each call feeds previous outputs as context for consistency
"""

import json
import time
from collections import deque
from pathlib import Path

import torch
import numpy as np
import soundfile as sf

VOICES_DIR = Path(__file__).parent / "voices"
GOLDEN_DIR = VOICES_DIR / "golden"


class VoiceSession:
    """Maintains voice consistency across a generation session.

    Loads golden reference clips at startup, then maintains a rolling
    buffer of recent outputs. Every generation gets:
        context = golden_refs + recent_buffer
    """

    def __init__(self, generator=None, max_golden: int = 3, max_recent: int = 4):
        self._generator = generator
        self._golden: list = []
        self._recent: deque = deque(maxlen=max_recent)
        self._max_golden = max_golden
        self._sample_rate = 24000
        self._generation_count = 0

        # Load golden refs on init
        self._load_golden_refs()

    @property
    def sample_rate(self) -> int:
        if self._generator:
            return self._generator.sample_rate
        return self._sample_rate

    def set_generator(self, generator):
        """Set the CSM generator (can be set after init)."""
        self._generator = generator
        self._sample_rate = generator.sample_rate

    def _load_golden_refs(self):
        """Load golden reference clips from disk."""
        from generator import Segment

        self._golden = []

        if not GOLDEN_DIR.exists():
            return

        for category_dir in sorted(GOLDEN_DIR.iterdir()):
            if not category_dir.is_dir():
                continue
            for meta_path in sorted(category_dir.glob("*.json")):
                meta = json.loads(meta_path.read_text())
                wav_path = category_dir / meta["wav_file"]
                if not wav_path.exists():
                    continue

                audio_np, sr = sf.read(str(wav_path), dtype="float32")
                if audio_np.ndim > 1:
                    audio_np = audio_np.mean(axis=1)
                audio = torch.from_numpy(audio_np)
                if sr != 24000:
                    import torchaudio
                    audio = torchaudio.functional.resample(audio.unsqueeze(0), sr, 24000).squeeze(0)

                self._golden.append(Segment(
                    speaker=0,
                    text=meta["text"],
                    audio=audio,
                ))

                if len(self._golden) >= self._max_golden:
                    break

            if len(self._golden) >= self._max_golden:
                break

        if self._golden:
            print(f"Loaded {len(self._golden)} golden reference clips")

    def get_mood_context(self, mood: str = "balanced") -> list:
        """Get golden refs biased toward a specific mood."""
        from generator import Segment

        # If we have mood-specific golden clips, prefer those
        mood_golden = []
        general_golden = []

        mood_dir = GOLDEN_DIR / mood
        balanced_dir = GOLDEN_DIR / "balanced"

        for category_dir in [mood_dir, balanced_dir]:
            if not category_dir.exists():
                continue
            for meta_path in sorted(category_dir.glob("*.json")):
                meta = json.loads(meta_path.read_text())
                wav_path = category_dir / meta["wav_file"]
                if not wav_path.exists():
                    continue

                audio_np, sr = sf.read(str(wav_path), dtype="float32")
                if audio_np.ndim > 1:
                    audio_np = audio_np.mean(axis=1)
                audio = torch.from_numpy(audio_np)
                if sr != 24000:
                    import torchaudio
                    audio = torchaudio.functional.resample(audio.unsqueeze(0), sr, 24000).squeeze(0)

                seg = Segment(speaker=0, text=meta["text"], audio=audio)

                if category_dir.name == mood:
                    mood_golden.append(seg)
                else:
                    general_golden.append(seg)

        # Prefer mood-specific, fill with general
        result = mood_golden[:2] + general_golden[:1]
        return result[:self._max_golden] if result else self._golden[:self._max_golden]

    def speak(self, text: str, mood: str = "neutral",
              temperature: float | None = None, topk: int | None = None) -> torch.Tensor:
        """Generate speech with full context pipeline.

        Args:
            text: What to say
            mood: Mood tag (affects temperature and context selection)
            temperature: Override temperature (None = use mood default)
            topk: Override topk (None = use mood default)

        Returns:
            Audio tensor (1D, sample_rate = self.sample_rate)
        """
        if self._generator is None:
            raise RuntimeError("No generator set. Call set_generator() first.")

        from mood_config import VOICE_MOODS
        from generator import Segment

        mood_params = VOICE_MOODS.get(mood, VOICE_MOODS["neutral"])
        temp = temperature if temperature is not None else mood_params["temperature"]
        tk = topk if topk is not None else mood_params["topk"]

        # Build context: golden refs + recent outputs
        golden_context = self.get_mood_context(mood_params.get("context_bias", "balanced"))
        recent_context = list(self._recent)
        full_context = golden_context + recent_context

        # Generate
        t0 = time.time()
        audio = self._generator.generate(
            text=text,
            speaker=0,
            context=full_context,
            max_audio_length_ms=10000,
            temperature=temp,
            topk=tk,
        )
        elapsed = time.time() - t0
        duration = audio.shape[0] / self.sample_rate

        self._generation_count += 1
        print(f"[voice #{self._generation_count}] {duration:.1f}s in {elapsed:.1f}s "
              f"(mood={mood}, T={temp}, context={len(full_context)} segs)")

        # Add to rolling buffer
        self._recent.append(Segment(
            speaker=0,
            text=text,
            audio=audio,
        ))

        return audio

    def save_output(self, audio: torch.Tensor, text: str, mood: str = "neutral") -> Path:
        """Save a generated clip to the generated/ directory."""
        import numpy as np
        import soundfile as sf

        timestamp = time.strftime("%Y%m%d_%H%M%S")
        session_dir = VOICES_DIR / "generated" / f"session_{timestamp}"
        session_dir.mkdir(parents=True, exist_ok=True)

        idx = self._generation_count
        clip_name = f"voice_{idx:03d}_{mood}"
        wav_path = session_dir / f"{clip_name}.wav"
        meta_path = session_dir / f"{clip_name}.json"

        audio_np = audio.cpu().numpy().astype(np.float32)
        sf.write(str(wav_path), audio_np, self.sample_rate)

        meta = {
            "text": text,
            "mood": mood,
            "wav_file": wav_path.name,
            "duration": len(audio_np) / self.sample_rate,
            "generation_number": idx,
            "context_size": len(self._golden) + len(self._recent) - 1,
            "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "sample_rate": self.sample_rate,
        }
        meta_path.write_text(json.dumps(meta, indent=2))

        return wav_path

    @property
    def context_size(self) -> int:
        return len(self._golden) + len(self._recent)

    @property
    def generation_count(self) -> int:
        return self._generation_count

    def clear_recent(self):
        """Clear the recent context buffer (keeps golden refs)."""
        self._recent.clear()
        print("Recent context cleared (golden refs preserved)")
