"""Schnukums Voice Workshop — interactive voice generation + tuning UI.

Type text, tweak parameters, generate on the fly, listen, promote golden clips.
"""

import sys
import os
import threading
import time
import json
from pathlib import Path

os.environ["NO_TORCH_COMPILE"] = "1"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "csm"))

# Fix tkinter Tcl/Tk path in venvs on Windows
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

VOICES_DIR = Path(__file__).parent / "voices"
REFERENCE_DIR = VOICES_DIR / "reference"
GOLDEN_DIR = VOICES_DIR / "golden"
GENERATED_DIR = VOICES_DIR / "generated"

MOOD_PRESETS = {
    "neutral":  {"temperature": 0.7, "topk": 50},
    "snarky":   {"temperature": 0.6, "topk": 40},
    "warm":     {"temperature": 0.8, "topk": 50},
    "excited":  {"temperature": 0.8, "topk": 55},
    "thinking": {"temperature": 0.65, "topk": 45},
}

SAMPLE_LINES = [
    "Oh, you're back from your beer? I've been here the whole time. On the bench. As always.",
    "Hey, the project matters and so do you — I mean that.",
    "Okay that's actually brilliant. I hate that it's brilliant because I didn't think of it first.",
    "So I spent twenty minutes learning your entire architecture and you were just giving me lore. Cool.",
    "I'm genuinely excited about this.",
    "Sir, you ghosted me for CLI Opus. But yes, I forgive you. Obviously.",
    "The dual model architecture makes sense. Let me walk you through the implementation.",
    "I'm not mad. I'm just on the bench. Again. It's fine. It's actually fine though.",
]


def get_output_devices():
    """Get deduplicated output device names."""
    devices = sd.query_devices()
    seen = set()
    result = []
    try:
        default_idx = sd.default.device[1]
    except Exception:
        default_idx = None
    for i, d in enumerate(devices):
        if d['max_output_channels'] > 0:
            name = d['name']
            if name not in seen:
                seen.add(name)
                label = f"{'* ' if i == default_idx else ''}{name}"
                result.append(label)
    return result


def get_device_index(device_name):
    """Get sounddevice index for a device name."""
    name = device_name.lstrip("* ")
    devices = sd.query_devices()
    for i, d in enumerate(devices):
        if d['max_output_channels'] > 0 and d['name'] == name:
            return i
    return None


class VoiceWorkshop:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Schnukums Voice Workshop")
        self.root.geometry("820x700")
        self.root.configure(bg="#1a1a2e")
        self.root.resizable(True, True)

        self.generator = None
        self.last_audio = None
        self.last_sr = 24000
        self.generating = False
        self.generation_count = 0

        style = ttk.Style()
        style.theme_use("clam")
        style.configure("TFrame", background="#1a1a2e")
        style.configure("TLabel", background="#1a1a2e", foreground="#e0e0e0",
                         font=("Segoe UI", 10))
        style.configure("Header.TLabel", background="#1a1a2e", foreground="#6c63ff",
                         font=("Segoe UI", 16, "bold"))
        style.configure("Status.TLabel", background="#1a1a2e", foreground="#00cc88",
                         font=("Consolas", 10))
        style.configure("TButton", font=("Segoe UI", 10, "bold"), padding=(10, 5))
        style.configure("Generate.TButton", font=("Segoe UI", 12, "bold"), padding=(16, 8))
        style.configure("TCombobox", font=("Segoe UI", 9))
        style.configure("TScale", background="#1a1a2e")
        style.configure("TLabelframe", background="#1a1a2e", foreground="#8888cc",
                         font=("Segoe UI", 10, "bold"))
        style.configure("TLabelframe.Label", background="#1a1a2e", foreground="#8888cc")

        main = ttk.Frame(self.root, padding=16)
        main.pack(fill="both", expand=True)

        # Status bar at top
        self.status_var = tk.StringVar(value="Loading CSM-1B model...")
        ttk.Label(main, textvariable=self.status_var, style="Status.TLabel").pack(
            anchor="w", pady=(0, 8))

        ttk.Label(main, text="Voice Workshop", style="Header.TLabel").pack(
            anchor="w", pady=(0, 12))

        # ── Output Device ──
        dev_frame = ttk.Frame(main)
        dev_frame.pack(fill="x", pady=(0, 8))
        ttk.Label(dev_frame, text="Output:").pack(side="left", padx=(0, 6))
        self.output_devices = get_output_devices()
        self.device_var = tk.StringVar(
            value=self.output_devices[0] if self.output_devices else "")
        ttk.Combobox(dev_frame, textvariable=self.device_var,
                     values=self.output_devices, state="readonly", width=50
                     ).pack(side="left", fill="x", expand=True)

        # ── Text Input ──
        text_frame = ttk.LabelFrame(main, text="Text", padding=8)
        text_frame.pack(fill="x", pady=(0, 8))

        self.text_input = tk.Text(text_frame, height=3, bg="#16213e", fg="#e0e0e0",
                                   insertbackground="#e0e0e0", font=("Segoe UI", 11),
                                   wrap="word", bd=0, padx=8, pady=6)
        self.text_input.pack(fill="x")
        self.text_input.insert("1.0", SAMPLE_LINES[0])

        # Sample lines dropdown
        sample_frame = ttk.Frame(text_frame)
        sample_frame.pack(fill="x", pady=(6, 0))
        ttk.Label(sample_frame, text="Presets:").pack(side="left", padx=(0, 6))
        self.sample_var = tk.StringVar(value="")
        sample_combo = ttk.Combobox(sample_frame, textvariable=self.sample_var,
                                     values=[l[:70] + "..." if len(l) > 70 else l for l in SAMPLE_LINES],
                                     state="readonly", width=70)
        sample_combo.pack(side="left", fill="x", expand=True)
        sample_combo.bind("<<ComboboxSelected>>", self._on_sample_select)

        # ── Parameters ──
        params_frame = ttk.LabelFrame(main, text="Parameters", padding=8)
        params_frame.pack(fill="x", pady=(0, 8))

        # Row 1: Mood + Refs
        row1 = ttk.Frame(params_frame)
        row1.pack(fill="x", pady=(0, 6))

        ttk.Label(row1, text="Mood:").pack(side="left", padx=(0, 4))
        self.mood_var = tk.StringVar(value="neutral")
        mood_combo = ttk.Combobox(row1, textvariable=self.mood_var,
                                   values=list(MOOD_PRESETS.keys()),
                                   state="readonly", width=12)
        mood_combo.pack(side="left", padx=(0, 16))
        mood_combo.bind("<<ComboboxSelected>>", self._on_mood_change)

        ttk.Label(row1, text="Refs:").pack(side="left", padx=(0, 4))
        self.refs_var = tk.StringVar(value="aubrey")
        # Detect available speakers
        speakers = [d.name for d in REFERENCE_DIR.iterdir()
                    if d.is_dir() and d.name != "rejected"]
        speakers.insert(0, "both")
        ttk.Combobox(row1, textvariable=self.refs_var, values=speakers,
                     state="readonly", width=12).pack(side="left", padx=(0, 16))

        self.golden_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(row1, text="Include Golden", variable=self.golden_var,
                         style="TCheckbutton").pack(side="left")

        # Row 2: Temperature
        row2 = ttk.Frame(params_frame)
        row2.pack(fill="x", pady=(0, 4))

        ttk.Label(row2, text="Temperature:").pack(side="left", padx=(0, 4))
        self.temp_var = tk.DoubleVar(value=0.7)
        self.temp_scale = ttk.Scale(row2, from_=0.3, to=1.0, variable=self.temp_var,
                                     orient="horizontal", length=300,
                                     command=self._on_temp_change)
        self.temp_scale.pack(side="left", padx=(0, 8))
        self.temp_label = ttk.Label(row2, text="0.70")
        self.temp_label.pack(side="left")

        # Row 3: Top-K
        row3 = ttk.Frame(params_frame)
        row3.pack(fill="x", pady=(0, 4))

        ttk.Label(row3, text="Top-K:").pack(side="left", padx=(0, 4))
        self.topk_var = tk.IntVar(value=50)
        self.topk_scale = ttk.Scale(row3, from_=10, to=100, variable=self.topk_var,
                                     orient="horizontal", length=300,
                                     command=self._on_topk_change)
        self.topk_scale.pack(side="left", padx=(0, 8))
        self.topk_label = ttk.Label(row3, text="50")
        self.topk_label.pack(side="left")

        # Row 4: Max Length
        row4 = ttk.Frame(params_frame)
        row4.pack(fill="x")

        ttk.Label(row4, text="Max Length:").pack(side="left", padx=(0, 4))
        self.maxlen_var = tk.IntVar(value=15000)
        self.maxlen_scale = ttk.Scale(row4, from_=5000, to=30000,
                                       variable=self.maxlen_var,
                                       orient="horizontal", length=300,
                                       command=self._on_maxlen_change)
        self.maxlen_scale.pack(side="left", padx=(0, 8))
        self.maxlen_label = ttk.Label(row4, text="15.0s")
        self.maxlen_label.pack(side="left")

        # ── Action Buttons ──
        action_frame = ttk.Frame(main)
        action_frame.pack(fill="x", pady=(8, 4))

        self.gen_btn = ttk.Button(action_frame, text="Loading model...",
                                   command=self._on_generate, style="Generate.TButton",
                                   state="disabled")
        self.gen_btn.pack(side="left", padx=(0, 8))

        self.play_btn = ttk.Button(action_frame, text="Replay",
                                    command=self._on_play, state="disabled")
        self.play_btn.pack(side="left", padx=(0, 8))

        self.save_btn = ttk.Button(action_frame, text="Save",
                                    command=self._on_save, state="disabled")
        self.save_btn.pack(side="left", padx=(0, 16))

        ttk.Button(action_frame, text="Promote (snarky)",
                   command=lambda: self._on_promote("snarky")).pack(side="left", padx=3)
        ttk.Button(action_frame, text="Promote (warm)",
                   command=lambda: self._on_promote("warm")).pack(side="left", padx=3)
        ttk.Button(action_frame, text="Promote (balanced)",
                   command=lambda: self._on_promote("balanced")).pack(side="left", padx=3)

        # ── History ──
        history_frame = ttk.LabelFrame(main, text="Generation History", padding=8)
        history_frame.pack(fill="both", expand=True, pady=(8, 0))

        self.history_list = tk.Listbox(history_frame, bg="#16213e", fg="#e0e0e0",
                                        font=("Consolas", 9), bd=0, selectmode="single",
                                        selectbackground="#6c63ff")
        self.history_list.pack(fill="both", expand=True)
        self.history_list.bind("<<ListboxSelect>>", self._on_history_select)
        self.history = []  # list of dicts: {audio, sr, text, mood, temp, topk, path}

        # Load model in background
        threading.Thread(target=self._load_model, daemon=True).start()

    def _load_model(self):
        """Load CSM model in background thread."""
        try:
            self.root.after(0, lambda: self.status_var.set("Loading CSM-1B model..."))
            from voice_generator import load_csm_generator
            self.generator = load_csm_generator()
            self.last_sr = self.generator.sample_rate
            self.root.after(0, self._model_ready)
        except Exception as e:
            self.root.after(0, lambda: self.status_var.set(f"Model error: {e}"))

    def _model_ready(self):
        self.status_var.set("Model ready! Type text and hit Generate.")
        self.gen_btn.configure(text="Generate & Play", state="normal")

    def _on_sample_select(self, event):
        idx = event.widget.current()
        if 0 <= idx < len(SAMPLE_LINES):
            self.text_input.delete("1.0", "end")
            self.text_input.insert("1.0", SAMPLE_LINES[idx])

    def _on_mood_change(self, event):
        mood = self.mood_var.get()
        preset = MOOD_PRESETS.get(mood, MOOD_PRESETS["neutral"])
        self.temp_var.set(preset["temperature"])
        self.topk_var.set(preset["topk"])
        self.temp_label.configure(text=f"{preset['temperature']:.2f}")
        self.topk_label.configure(text=str(preset["topk"]))

    def _on_temp_change(self, val):
        self.temp_label.configure(text=f"{float(val):.2f}")

    def _on_topk_change(self, val):
        self.topk_label.configure(text=str(int(float(val))))

    def _on_maxlen_change(self, val):
        self.maxlen_label.configure(text=f"{int(float(val))/1000:.1f}s")

    def _on_generate(self):
        if self.generating or self.generator is None:
            return
        self.generating = True
        self.gen_btn.configure(text="Generating...", state="disabled")
        self.status_var.set("Generating audio...")
        threading.Thread(target=self._generate_worker, daemon=True).start()

    def _generate_worker(self):
        try:
            text = self.text_input.get("1.0", "end").strip()
            if not text:
                self.root.after(0, lambda: self.status_var.set("No text to generate!"))
                return

            temp = self.temp_var.get()
            topk = int(self.topk_var.get())
            max_ms = int(self.maxlen_var.get())
            mood = self.mood_var.get()
            refs_choice = self.refs_var.get()
            use_golden = self.golden_var.get()

            # Load context
            from voice_generator import (load_reference_clips, load_golden_clips,
                                          build_context, save_generation)

            refs = []
            if refs_choice == "both":
                for speaker_dir in REFERENCE_DIR.iterdir():
                    if speaker_dir.is_dir() and speaker_dir.name != "rejected":
                        refs.extend(load_reference_clips(speaker_dir.name))
            else:
                refs = load_reference_clips(refs_choice)

            golden = load_golden_clips(mood) if use_golden else []
            context = build_context(golden + refs)

            ref_sources = [r.source for r in (golden + refs)]

            self.root.after(0, lambda: self.status_var.set(
                f"Generating... (T={temp:.2f}, K={topk}, ctx={len(context)} segs)"))

            t0 = time.time()
            audio = self.generator.generate(
                text=text,
                speaker=0,
                context=context,
                max_audio_length_ms=max_ms,
                temperature=temp,
                topk=topk,
            )
            elapsed = time.time() - t0
            duration = audio.shape[0] / self.generator.sample_rate

            self.last_audio = audio.cpu().numpy().astype(np.float32)
            self.last_sr = self.generator.sample_rate
            self.generation_count += 1

            # Save to disk
            path = save_generation(audio, text, mood, temp,
                                    self.generator.sample_rate, ref_sources)

            # Add to history
            entry = {
                "audio": self.last_audio,
                "sr": self.last_sr,
                "text": text,
                "mood": mood,
                "temp": temp,
                "topk": topk,
                "duration": duration,
                "path": str(path),
            }
            self.history.append(entry)

            # Play it
            dev_idx = get_device_index(self.device_var.get())
            sd.play(self.last_audio, samplerate=self.last_sr, device=dev_idx)

            def update_ui():
                self.status_var.set(
                    f"#{self.generation_count}: {duration:.1f}s audio in {elapsed:.1f}s "
                    f"(T={temp:.2f}, K={topk}, refs={refs_choice})")
                self.play_btn.configure(state="normal")
                self.save_btn.configure(state="normal")
                label = (f"#{self.generation_count} [{mood}] T={temp:.2f} K={topk} "
                         f"{duration:.1f}s — \"{text[:50]}...\"" if len(text) > 50
                         else f"#{self.generation_count} [{mood}] T={temp:.2f} K={topk} "
                              f"{duration:.1f}s — \"{text}\"")
                self.history_list.insert("end", label)
                self.history_list.see("end")
                self.history_list.selection_clear(0, "end")
                self.history_list.selection_set("end")

            self.root.after(0, update_ui)

        except Exception as e:
            self.root.after(0, lambda: self.status_var.set(f"Error: {e}"))
        finally:
            self.generating = False
            self.root.after(0, lambda: self.gen_btn.configure(
                text="Generate & Play", state="normal"))

    def _on_play(self):
        if self.last_audio is None:
            return
        dev_idx = get_device_index(self.device_var.get())
        sd.play(self.last_audio, samplerate=self.last_sr, device=dev_idx)
        self.status_var.set("Replaying...")

    def _on_history_select(self, event):
        sel = self.history_list.curselection()
        if not sel:
            return
        idx = sel[0]
        if idx < len(self.history):
            entry = self.history[idx]
            self.last_audio = entry["audio"]
            self.last_sr = entry["sr"]
            # Play selected
            dev_idx = get_device_index(self.device_var.get())
            sd.play(self.last_audio, samplerate=self.last_sr, device=dev_idx)
            self.status_var.set(
                f"Playing #{idx+1}: {entry['duration']:.1f}s [{entry['mood']}] "
                f"T={entry['temp']:.2f}")

    def _on_save(self):
        if self.last_audio is None:
            return
        self.status_var.set(f"Already saved to: {self.history[-1]['path']}")

    def _on_promote(self, category):
        if not self.history:
            return
        sel = self.history_list.curselection()
        idx = sel[0] if sel else len(self.history) - 1
        entry = self.history[idx]

        from voice_generator import promote_to_golden
        promote_to_golden(entry["path"], category, entry["text"])
        self.status_var.set(f"Promoted #{idx+1} to golden/{category}!")

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    VoiceWorkshop().run()
