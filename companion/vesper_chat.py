"""Vesper Chat — Talk to Vesper in your terminal.

Mistral brain + Chatterbox voice + trained voice profile.
She responds to everything you say, out loud.

Usage:
    python vesper_chat.py              # text + voice
    python vesper_chat.py --no-voice   # text only (fast)
"""

import perth
from perth.dummy_watermarker import DummyWatermarker
if perth.PerthImplicitWatermarker is None:
    perth.PerthImplicitWatermarker = DummyWatermarker

import argparse
import json
import sys
import time
from pathlib import Path

import aiohttp
import asyncio
import numpy as np
import soundfile as sf

from config import (
    OLLAMA_URL, LLM_MODEL, COMPANION_NAME, PERSONALITY_PRESET,
    STREAMER_NAME, RELATIONSHIP_DYNAMIC,
)
from personality import PERSONALITY_PRESETS, RELATIONSHIP_DYNAMICS, SYSTEM_PROMPT
from voice import MOOD_VOICE_MAP

VOICE_PROFILE_DIR = Path("voices/golden/vesper_trained")
REF_CLIP = Path("voices/golden/warm/golden_warm_composite_expressive.wav")


def build_system_prompt():
    """Build system prompt with flirty defaults for testing."""
    preset_desc = PERSONALITY_PRESETS.get(PERSONALITY_PRESET, PERSONALITY_PRESETS["snarky"])
    rel_dynamic = RELATIONSHIP_DYNAMIC if RELATIONSHIP_DYNAMIC else "flirty"
    relationship_desc = RELATIONSHIP_DYNAMICS.get(
        rel_dynamic, RELATIONSHIP_DYNAMICS["flirty"]
    ).format(streamer=STREAMER_NAME)

    return SYSTEM_PROMPT.format(
        streamer=STREAMER_NAME,
        preset_description=preset_desc,
        relationship_description=relationship_desc,
        energy=75,
        positivity=70,
        engagement=80,
        expression="amused",
        chat_rate=15,
    )


class VesperChat:
    def __init__(self, enable_voice=True):
        self.enable_voice = enable_voice
        self.model = None
        self.avg_embedding = None
        self.context = []
        self.system_prompt = build_system_prompt()

    async def initialize(self):
        """Load voice model and verify Ollama."""
        # Check Ollama
        print(f"Connecting to Ollama ({OLLAMA_URL}, model: {LLM_MODEL})...")
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{OLLAMA_URL}/api/tags", timeout=aiohttp.ClientTimeout(total=5)
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        models = [m["name"] for m in data.get("models", [])]
                        if LLM_MODEL in models:
                            print(f"  Ollama ready with {LLM_MODEL}")
                        else:
                            print(f"  WARNING: {LLM_MODEL} not found. Available: {models}")
                            return False
        except Exception as e:
            print(f"  ERROR: Can't reach Ollama: {e}")
            return False

        # Load voice
        if self.enable_voice:
            print("Loading Chatterbox-Turbo on GPU...")
            import torch
            from chatterbox.tts import ChatterboxTTS

            if not torch.cuda.is_available():
                print("  No GPU — voice disabled")
                self.enable_voice = False
            else:
                self.model = ChatterboxTTS.from_pretrained(device="cuda")
                print(f"  Chatterbox loaded ({self.model.sr}Hz)")

                # Load trained voice profile
                emb_path = VOICE_PROFILE_DIR / "speaker_embedding.npy"
                if emb_path.exists():
                    self.avg_embedding = np.load(str(emb_path))
                    meta_path = VOICE_PROFILE_DIR / "meta.json"
                    if meta_path.exists():
                        meta = json.loads(meta_path.read_text())
                        print(f"  Voice profile: {meta['clips_used']} clips, {meta['total_audio_seconds']}s audio")
                    else:
                        print(f"  Voice profile loaded")
                else:
                    print(f"  No trained profile, using zero-shot cloning")

        return True

    async def ask_ollama(self, user_message: str) -> str:
        """Send message to Ollama and get Vesper's response."""
        self.context.append({"role": "user", "content": user_message})

        messages = [{"role": "system", "content": self.system_prompt}] + self.context[-12:]

        payload = {
            "model": LLM_MODEL,
            "messages": messages,
            "stream": False,
            "options": {
                "num_predict": 150,
                "temperature": 0.85,
                "top_p": 0.9,
            },
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{OLLAMA_URL}/api/chat",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=30),
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    reply = data.get("message", {}).get("content", "").strip()
                    self.context.append({"role": "assistant", "content": reply})
                    return reply
                else:
                    return f"[Ollama error: status {resp.status}]"

    def speak(self, text: str, mood: str = "warm"):
        """Generate and play speech."""
        if not self.enable_voice or not self.model:
            return

        import torch
        import sounddevice as sd
        from chatterbox.models.t3.modules.cond_enc import T3Cond

        params = MOOD_VOICE_MAP.get(mood, MOOD_VOICE_MAP["neutral"])
        exag = params["exaggeration"]
        prefix = params.get("prefix", "")
        full_text = f"{prefix}{text}" if prefix else text

        # Prepare conditionals from reference clip
        self.model.prepare_conditionals(str(REF_CLIP), exaggeration=exag)

        # Override with trained embedding if available
        if self.avg_embedding is not None:
            avg_tensor = torch.from_numpy(self.avg_embedding).to(self.model.device)
            old_cond = self.model.conds.t3
            self.model.conds.t3 = T3Cond(
                speaker_emb=avg_tensor,
                cond_prompt_speech_tokens=old_cond.cond_prompt_speech_tokens,
                emotion_adv=exag * torch.ones(1, 1, 1),
            ).to(device=self.model.device)

        t0 = time.time()
        wav = self.model.generate(full_text, exaggeration=exag)
        elapsed = time.time() - t0
        audio = wav.squeeze().cpu().numpy().astype(np.float32)
        duration = len(audio) / self.model.sr

        print(f"  [voice: {duration:.1f}s in {elapsed:.1f}s, exag={exag:.2f}]")

        sd.play(audio, samplerate=self.model.sr)
        sd.wait()

    def guess_mood(self, text: str) -> str:
        """Simple mood detection from Vesper's response text."""
        lower = text.lower()
        if any(w in lower for w in ["haha", "lol", "funny", "laugh"]):
            return "amused"
        if any(w in lower for w in ["please", "oh come on", "really", "sure"]):
            return "snarky"
        if any(w in lower for w in ["!", "amazing", "let's go", "yes"]):
            return "excited"
        if any(w in lower for w in ["miss", "wish", "sigh"]):
            return "sad"
        if any(w in lower for w in ["hey you", "come here", "between us", "just us"]):
            return "warm"
        return "warm"


async def main():
    parser = argparse.ArgumentParser(description="Chat with Vesper")
    parser.add_argument("--no-voice", action="store_true", help="Text only, no TTS")
    args = parser.parse_args()

    vesper = VesperChat(enable_voice=not args.no_voice)

    if not await vesper.initialize():
        print("Failed to initialize. Is Ollama running?")
        sys.exit(1)

    print()
    print(f"{'='*60}")
    print(f"  {COMPANION_NAME} is online. You are {STREAMER_NAME}.")
    print(f"  Preset: {PERSONALITY_PRESET} | Voice: {'ON' if vesper.enable_voice else 'OFF'}")
    print(f"  Type 'quit' to exit, 'mood:X' to set mood manually")
    print(f"{'='*60}")
    print()

    # Opening line
    opener = await vesper.ask_ollama(
        f"[Stream event] {STREAMER_NAME} just went live! Say hi to them."
    )
    print(f"  {COMPANION_NAME}: {opener}")
    if vesper.enable_voice:
        vesper.speak(opener, "excited")
    print()

    while True:
        try:
            user_input = input(f"  {STREAMER_NAME}: ").strip()
        except (EOFError, KeyboardInterrupt):
            break

        if not user_input:
            continue
        if user_input.lower() == "quit":
            break

        # Get Vesper's response
        t0 = time.time()
        reply = await vesper.ask_ollama(f"{STREAMER_NAME}: {user_input}")
        think_time = time.time() - t0

        mood = vesper.guess_mood(reply)
        print(f"  {COMPANION_NAME}: {reply}")
        print(f"  [think: {think_time:.1f}s, mood: {mood}]")

        if vesper.enable_voice:
            vesper.speak(reply, mood)
        print()

    # Goodbye
    if vesper.model:
        import torch
        del vesper.model
        torch.cuda.empty_cache()
    print(f"\n  {COMPANION_NAME}: Later. Don't do anything I wouldn't do.")


if __name__ == "__main__":
    asyncio.run(main())
