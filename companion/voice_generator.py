"""Voice Prompt Generator — generate test lines with reference context.

Usage:
    # Generate all test lines with default settings
    python voice_generator.py --generate

    # Generate a specific line with temperature sweep
    python voice_generator.py --text "Oh you're back?" --mood snarky --sweep

    # Generate using specific reference speaker context
    python voice_generator.py --text "Hey chat" --refs aubrey --mood warm

    # Launch A/B comparison UI
    python voice_generator.py --compare

    # Promote a generated clip to golden reference
    python voice_generator.py --promote path/to/clip.wav --category snarky
"""

import sys
import os
import json
import argparse
import time
import shutil
from pathlib import Path
from dataclasses import dataclass

os.environ["NO_TORCH_COMPILE"] = "1"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "csm"))

VOICES_DIR = Path(__file__).parent / "voices"
REFERENCE_DIR = VOICES_DIR / "reference"
GOLDEN_DIR = VOICES_DIR / "golden"
GENERATED_DIR = VOICES_DIR / "generated"


@dataclass
class ReferenceClip:
    """A loaded reference clip ready for CSM context."""
    speaker_id: int
    text: str
    audio: "torch.Tensor"
    source: str
    mood: str = "balanced"


def load_csm_generator():
    """Load CSM-1B model (cached after first call)."""
    import torch
    import dataclasses as dc
    from huggingface_hub import hf_hub_download
    from models import Model, ModelArgs
    import generator as gen_module
    from generator import Generator
    from safetensors.torch import load_file
    from transformers import AutoTokenizer
    from tokenizers.processors import TemplateProcessing

    # Patch tokenizer
    def _load_tokenizer_ungated():
        tokenizer = AutoTokenizer.from_pretrained("unsloth/Llama-3.2-1B")
        bos, eos = tokenizer.bos_token, tokenizer.eos_token
        tokenizer._tokenizer.post_processor = TemplateProcessing(
            single=f"{bos}:0 $A:0 {eos}:0",
            pair=f"{bos}:0 $A:0 {eos}:0 {bos}:1 $B:1 {eos}:1",
            special_tokens=[(bos, tokenizer.bos_token_id), (eos, tokenizer.eos_token_id)],
        )
        return tokenizer

    gen_module.load_llama3_tokenizer = _load_tokenizer_ungated

    print("Loading CSM-1B model...")
    config_path = hf_hub_download("sesame/csm-1b", "config.json")
    weights_path = hf_hub_download("sesame/csm-1b", "model.safetensors")

    with open(config_path) as f:
        raw = json.load(f)
    valid_fields = {f.name for f in dc.fields(ModelArgs)}
    config = ModelArgs(**{k: v for k, v in raw.items() if k in valid_fields})

    model = Model(config)
    state_dict = load_file(weights_path)
    model.load_state_dict(state_dict)

    if torch.cuda.is_available():
        device = "cuda"
        dtype = torch.bfloat16
        print(f"Using GPU: {torch.cuda.get_device_name(0)}")
    else:
        device = "cpu"
        dtype = torch.float32
        print("No GPU available, using CPU (will be slow)")

    model.to(device=device, dtype=dtype)

    generator = Generator(model)
    print(f"Model ready on {device} (sample rate: {generator.sample_rate} Hz)")
    return generator


def load_reference_clips(speaker: str | None = None, limit: int = 3) -> list[ReferenceClip]:
    """Load reference clips from the reference directory."""
    import torch
    import numpy as np
    import soundfile as sf

    clips = []
    search_dirs = []

    if speaker:
        search_dirs = [REFERENCE_DIR / speaker]
    else:
        search_dirs = [d for d in REFERENCE_DIR.iterdir() if d.is_dir()]

    for ref_dir in search_dirs:
        for meta_path in sorted(ref_dir.glob("*.json")):
            meta = json.loads(meta_path.read_text())
            wav_path = ref_dir / meta["wav_file"]
            if not wav_path.exists():
                continue

            audio_np, sr = sf.read(str(wav_path), dtype="float32")
            if audio_np.ndim > 1:
                audio_np = audio_np.mean(axis=1)
            audio = torch.from_numpy(audio_np)
            if sr != 24000:
                import torchaudio
                audio = torchaudio.functional.resample(audio.unsqueeze(0), sr, 24000).squeeze(0)

            clips.append(ReferenceClip(
                speaker_id=0,
                text=meta["text"],
                audio=audio,
                source=meta.get("speaker", "unknown"),
            ))

    # Return most recent clips up to limit
    return clips[-limit:]


def load_golden_clips(mood_bias: str = "balanced", limit: int = 3) -> list[ReferenceClip]:
    """Load golden reference clips, biased by mood."""
    import torch
    import numpy as np
    import soundfile as sf

    clips = []
    search_dirs = []

    if mood_bias == "balanced":
        search_dirs = [d for d in GOLDEN_DIR.iterdir() if d.is_dir()]
    else:
        target_dir = GOLDEN_DIR / mood_bias
        if target_dir.exists():
            search_dirs = [target_dir]
        # Also include balanced
        balanced_dir = GOLDEN_DIR / "balanced"
        if balanced_dir.exists():
            search_dirs.append(balanced_dir)

    for golden_dir in search_dirs:
        for meta_path in sorted(golden_dir.glob("*.json")):
            meta = json.loads(meta_path.read_text())
            wav_path = golden_dir / meta["wav_file"]
            if not wav_path.exists():
                continue

            audio_np, sr = sf.read(str(wav_path), dtype="float32")
            if audio_np.ndim > 1:
                audio_np = audio_np.mean(axis=1)
            audio = torch.from_numpy(audio_np)
            if sr != 24000:
                import torchaudio
                audio = torchaudio.functional.resample(audio.unsqueeze(0), sr, 24000).squeeze(0)

            clips.append(ReferenceClip(
                speaker_id=0,
                text=meta["text"],
                audio=audio,
                source="golden",
                mood=meta.get("mood", "balanced"),
            ))

    return clips[:limit]


def build_context(refs: list[ReferenceClip]) -> list:
    """Convert ReferenceClips to CSM Segment objects."""
    from generator import Segment

    segments = []
    for ref in refs:
        segments.append(Segment(
            speaker=ref.speaker_id,
            text=ref.text,
            audio=ref.audio,
        ))
    return segments


def generate_line(generator, text: str, context: list, speaker_id: int = 0,
                  temperature: float = 0.7, topk: int = 50,
                  max_audio_length_ms: int = 20000):
    """Generate a single line with CSM."""
    import torch

    t0 = time.time()
    audio = generator.generate(
        text=text,
        speaker=speaker_id,
        context=context,
        max_audio_length_ms=max_audio_length_ms,
        temperature=temperature,
        topk=topk,
    )
    elapsed = time.time() - t0
    duration = audio.shape[0] / generator.sample_rate

    return audio, elapsed, duration


def save_generation(audio, text: str, mood: str, temperature: float,
                    sample_rate: int, refs_used: list[str]) -> Path:
    """Save a generated clip with metadata."""
    import soundfile as sf
    import numpy as np

    timestamp = time.strftime("%Y%m%d_%H%M%S")
    run_dir = GENERATED_DIR / timestamp
    run_dir.mkdir(parents=True, exist_ok=True)

    # Find next index in this run
    existing = list(run_dir.glob("*.wav"))
    idx = len(existing)

    clip_name = f"gen_{idx:03d}_t{temperature:.2f}"
    wav_path = run_dir / f"{clip_name}.wav"
    meta_path = run_dir / f"{clip_name}.json"

    audio_np = audio.cpu().numpy().astype(np.float32)
    sf.write(str(wav_path), audio_np, sample_rate)

    meta = {
        "text": text,
        "mood": mood,
        "temperature": temperature,
        "sample_rate": sample_rate,
        "duration": len(audio_np) / sample_rate,
        "wav_file": wav_path.name,
        "refs_used": refs_used,
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    }
    meta_path.write_text(json.dumps(meta, indent=2))

    return wav_path


def promote_to_golden(wav_path: str, category: str, text: str | None = None):
    """Promote a generated clip to golden reference."""
    src = Path(wav_path)
    if not src.exists():
        print(f"File not found: {src}")
        return

    # Try to load metadata
    meta_path = src.with_suffix(".json")
    if meta_path.exists():
        meta = json.loads(meta_path.read_text())
        if text is None:
            text = meta.get("text", "")
    elif text is None:
        print("No metadata found — provide --text for the golden clip")
        return

    dest_dir = GOLDEN_DIR / category
    dest_dir.mkdir(parents=True, exist_ok=True)

    timestamp = time.strftime("%Y%m%d_%H%M%S")
    dest_name = f"golden_{category}_{timestamp}"
    dest_wav = dest_dir / f"{dest_name}.wav"
    dest_meta = dest_dir / f"{dest_name}.json"

    shutil.copy2(src, dest_wav)

    golden_meta = {
        "text": text,
        "mood": category,
        "wav_file": dest_wav.name,
        "source": str(src),
        "promoted_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "sample_rate": 24000,
    }
    dest_meta.write_text(json.dumps(golden_meta, indent=2))

    # Update voices/config.json
    config_path = VOICES_DIR / "config.json"
    config = json.loads(config_path.read_text())
    config["golden_clips"].append({
        "file": str(dest_wav.relative_to(VOICES_DIR)),
        "category": category,
        "text": text,
    })
    config_path.write_text(json.dumps(config, indent=2))

    print(f"Promoted to golden/{category}/{dest_name}")


def cmd_generate(args):
    """Generate test lines."""
    from mood_config import VOICE_MOODS, TEST_LINES

    generator = load_csm_generator()

    # Load context
    golden = [] if args.no_golden else load_golden_clips(args.mood or "balanced")
    refs = load_reference_clips(args.refs) if args.refs else []
    all_context = build_context(golden + refs)

    mood_params = VOICE_MOODS.get(args.mood or "neutral", VOICE_MOODS["neutral"])

    if args.text:
        lines = [args.text]
    else:
        # Generate all test lines for the mood
        lines = TEST_LINES.get(args.mood or "mixed", TEST_LINES["mixed"])

    ref_sources = [r.source for r in (golden + refs)]

    for line in lines:
        if args.sweep:
            # Temperature sweep: generate same line at multiple temperatures
            temps = [0.5, 0.6, 0.7, 0.8, 0.9]
            print(f'\nSweep: "{line}"')
            for temp in temps:
                print(f"  T={temp:.1f} ... ", end="", flush=True)
                audio, elapsed, duration = generate_line(
                    generator, line, all_context,
                    temperature=temp, topk=mood_params["topk"],
                )
                path = save_generation(audio, line, args.mood or "neutral", temp,
                                        generator.sample_rate, ref_sources)
                print(f"{duration:.1f}s audio in {elapsed:.1f}s -> {path.name}")
        else:
            temp = mood_params["temperature"]
            print(f'\nGenerating: "{line}" (T={temp}, mood={args.mood or "neutral"})')
            print("  Working... ", end="", flush=True)
            audio, elapsed, duration = generate_line(
                generator, line, all_context,
                temperature=temp, topk=mood_params["topk"],
            )
            path = save_generation(audio, line, args.mood or "neutral", temp,
                                    generator.sample_rate, ref_sources)
            print(f"{duration:.1f}s audio in {elapsed:.1f}s -> {path}")


def cmd_compare(args):
    """Launch A/B comparison UI."""
    # Fix tkinter for venv
    if sys.platform == "win32":
        _tcl_dir = os.path.join(sys.base_prefix, "tcl")
        if os.path.isdir(_tcl_dir):
            for d in os.listdir(_tcl_dir):
                if d.startswith("tcl8"):
                    os.environ.setdefault("TCL_LIBRARY", os.path.join(_tcl_dir, d))
                elif d.startswith("tk8"):
                    os.environ.setdefault("TK_LIBRARY", os.path.join(_tcl_dir, d))

    import tkinter as tk
    from tkinter import ttk
    import numpy as np
    import sounddevice as sd
    import soundfile as sf

    # Find all generated clips
    all_clips = []
    for run_dir in sorted(GENERATED_DIR.iterdir()):
        if not run_dir.is_dir():
            continue
        for meta_path in sorted(run_dir.glob("*.json")):
            meta = json.loads(meta_path.read_text())
            wav_path = run_dir / meta["wav_file"]
            if wav_path.exists():
                meta["_wav_path"] = str(wav_path)
                meta["_run"] = run_dir.name
                all_clips.append(meta)

    if not all_clips:
        print("No generated clips found. Run --generate first.")
        return

    class CompareUI:
        def __init__(self):
            self.root = tk.Tk()
            self.root.title("Vesper Astra Voice Compare")
            self.root.geometry("750x550")
            self.root.configure(bg="#1a1a2e")

            self.clips = all_clips
            self.current = 0

            style = ttk.Style()
            style.theme_use("clam")
            style.configure("TFrame", background="#1a1a2e")
            style.configure("TLabel", background="#1a1a2e", foreground="#e0e0e0", font=("Segoe UI", 10))
            style.configure("Header.TLabel", background="#1a1a2e", foreground="#6c63ff", font=("Segoe UI", 14, "bold"))
            style.configure("TButton", font=("Segoe UI", 10, "bold"), padding=(12, 6))
            style.configure("TCombobox", font=("Segoe UI", 9))

            main = ttk.Frame(self.root, padding=20)
            main.pack(fill="both", expand=True)

            ttk.Label(main, text="A/B Voice Comparison", style="Header.TLabel").pack(pady=(0, 12))

            # Output device selector
            dev_frame = ttk.Frame(main)
            dev_frame.pack(fill="x", pady=(0, 10))
            ttk.Label(dev_frame, text="Output Device:").pack(side="left", padx=(0, 8))
            self.output_devices = self._get_output_devices()
            self.device_var = tk.StringVar(value=self.output_devices[0] if self.output_devices else "")
            dev_combo = ttk.Combobox(dev_frame, textvariable=self.device_var,
                                      values=self.output_devices, state="readonly", width=55)
            dev_combo.pack(side="left", fill="x", expand=True)

            self.info_var = tk.StringVar(value="")
            ttk.Label(main, textvariable=self.info_var, wraplength=700).pack(fill="x", pady=(0, 8))

            self.text_var = tk.StringVar(value="")
            ttk.Label(main, textvariable=self.text_var, wraplength=700,
                       font=("Segoe UI", 11, "italic"), foreground="#a0a0d0").pack(fill="x", pady=(0, 16))

            # Navigation + Play
            btn_frame = ttk.Frame(main)
            btn_frame.pack(fill="x", pady=(0, 12))

            ttk.Button(btn_frame, text="<< Prev", command=self.prev_clip).pack(side="left", padx=4)
            ttk.Button(btn_frame, text="Play", command=self.play_clip).pack(side="left", padx=4)
            ttk.Button(btn_frame, text="Next >>", command=self.next_clip).pack(side="left", padx=4)

            ttk.Frame(btn_frame, width=30).pack(side="left")

            ttk.Button(btn_frame, text="Promote (snarky)",
                        command=lambda: self.promote("snarky")).pack(side="left", padx=3)
            ttk.Button(btn_frame, text="Promote (warm)",
                        command=lambda: self.promote("warm")).pack(side="left", padx=3)
            ttk.Button(btn_frame, text="Promote (balanced)",
                        command=lambda: self.promote("balanced")).pack(side="left", padx=3)

            self.status_var = tk.StringVar(value=f"{len(all_clips)} clips loaded")
            ttk.Label(main, textvariable=self.status_var, foreground="#00cc88",
                       font=("Consolas", 10)).pack(anchor="w", pady=(8, 0))

            self._show_clip()

        def _get_output_devices(self):
            """Get deduplicated output device names."""
            devices = sd.query_devices()
            seen = set()
            result = []
            default_idx = sd.default.device[1] if hasattr(sd.default, 'device') else None
            for i, d in enumerate(devices):
                if d['max_output_channels'] > 0:
                    name = d['name']
                    if name not in seen:
                        seen.add(name)
                        label = f"{'* ' if i == default_idx else ''}{name}"
                        result.append(label)
            return result

        def _get_selected_device_idx(self):
            """Get sounddevice index for selected output device."""
            name = self.device_var.get().lstrip("* ")
            devices = sd.query_devices()
            for i, d in enumerate(devices):
                if d['max_output_channels'] > 0 and d['name'] == name:
                    return i
            return None

        def _show_clip(self):
            clip = self.clips[self.current]
            self.info_var.set(
                f"[{self.current + 1}/{len(self.clips)}]  "
                f"Run: {clip['_run']}  |  Mood: {clip.get('mood', '?')}  |  "
                f"Temp: {clip.get('temperature', '?')}  |  "
                f"Duration: {clip.get('duration', 0):.1f}s"
            )
            self.text_var.set(f'"{clip["text"]}"')

        def play_clip(self):
            clip = self.clips[self.current]
            audio, sr = sf.read(clip["_wav_path"])
            dev_idx = self._get_selected_device_idx()
            sd.play(audio.astype(np.float32), samplerate=sr, device=dev_idx)
            self.status_var.set("Playing...")
            self.root.after(int(len(audio) / sr * 1000) + 200,
                            lambda: self.status_var.set("Done"))

        def prev_clip(self):
            self.current = max(0, self.current - 1)
            self._show_clip()

        def next_clip(self):
            self.current = min(len(self.clips) - 1, self.current + 1)
            self._show_clip()

        def promote(self, category):
            clip = self.clips[self.current]
            promote_to_golden(clip["_wav_path"], category, clip["text"])
            self.status_var.set(f"Promoted to golden/{category}!")

        def run(self):
            self.root.mainloop()

    CompareUI().run()


def main():
    parser = argparse.ArgumentParser(description="Vesper Astra Voice Prompt Generator")
    parser.add_argument("--generate", action="store_true", help="Generate test lines")
    parser.add_argument("--text", type=str, help="Specific text to generate")
    parser.add_argument("--mood", type=str, choices=["neutral", "snarky", "warm", "excited", "thinking"],
                        help="Mood for generation parameters")
    parser.add_argument("--refs", type=str, help="Reference speaker to use (aubrey/sadie)")
    parser.add_argument("--sweep", action="store_true", help="Generate at multiple temperatures")
    parser.add_argument("--no-golden", action="store_true", help="Skip golden clips (isolate ref voice only)")
    parser.add_argument("--compare", action="store_true", help="Launch A/B comparison UI")
    parser.add_argument("--promote", type=str, help="Promote a WAV file to golden reference")
    parser.add_argument("--category", type=str, choices=["snarky", "warm", "balanced"],
                        help="Category for golden promotion")
    args = parser.parse_args()

    if args.promote:
        if not args.category:
            parser.error("--category is required with --promote")
        promote_to_golden(args.promote, args.category, args.text)
    elif args.compare:
        cmd_compare(args)
    elif args.generate or args.text:
        cmd_generate(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
