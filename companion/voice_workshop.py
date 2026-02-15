"""Vesper Astra Voice Workshop — interactive voice generation + tuning UI.

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

# Mood presets with human descriptions
MOOD_PRESETS = {
    "Neutral — Relaxed, slightly dry, present": {
        "key": "neutral", "temperature": 0.7, "topk": 50, "max_refs": 8},
    "Snarky — Full deadpan, pauses, devastating": {
        "key": "snarky", "temperature": 0.6, "topk": 40, "max_refs": 6},
    "Warm — Genuine, soft, caring": {
        "key": "warm", "temperature": 0.8, "topk": 50, "max_refs": 8},
    "Excited — Higher energy, still grounded": {
        "key": "excited", "temperature": 0.8, "topk": 55, "max_refs": 10},
    "Thinking — Deliberate, measured, hmm energy": {
        "key": "thinking", "temperature": 0.65, "topk": 45, "max_refs": 6},
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

# Human-readable ref source descriptions
REF_DESCRIPTIONS = {
    "aubrey": "Aubrey Plaza — dry, deadpan, subtle vocal fry",
    "sadie": "Sadie Sink — warm, clear, grounded",
    "both": "Both — blended Aubrey + Sadie",
}


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
                label = f"{'[Default] ' if i == default_idx else ''}{name}"
                result.append(label)
    return result


def get_device_index(device_name):
    """Get sounddevice index for a device name."""
    name = device_name.replace("[Default] ", "")
    devices = sd.query_devices()
    for i, d in enumerate(devices):
        if d['max_output_channels'] > 0 and d['name'] == name:
            return i
    return None


def make_slider_row(parent, label, description, var, from_, to_, format_fn,
                    on_change, fg="#e0e0e0", desc_fg="#888899"):
    """Create a labeled slider row with description and value display."""
    frame = ttk.Frame(parent)
    frame.pack(fill="x", pady=(0, 6))

    # Label + value on one line
    top = ttk.Frame(frame)
    top.pack(fill="x")
    ttk.Label(top, text=label, font=("Segoe UI", 10, "bold")).pack(side="left")
    val_label = ttk.Label(top, text=format_fn(var.get()), foreground="#6c63ff",
                           font=("Consolas", 10, "bold"))
    val_label.pack(side="right")

    # Description
    ttk.Label(frame, text=description, foreground=desc_fg,
              font=("Segoe UI", 8)).pack(anchor="w", pady=(0, 2))

    # Slider
    def _update(v):
        val_label.configure(text=format_fn(float(v)))
        if on_change:
            on_change(v)

    scale = ttk.Scale(frame, from_=from_, to=to_, variable=var,
                       orient="horizontal", command=_update)
    scale.pack(fill="x")

    return frame, val_label


class VoiceWorkshop:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Vesper Astra Voice Workshop")
        self.root.geometry("900x820")
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
        style.configure("Sub.TLabel", background="#1a1a2e", foreground="#888899",
                         font=("Segoe UI", 9))
        style.configure("Status.TLabel", background="#1a1a2e", foreground="#00cc88",
                         font=("Consolas", 10))
        style.configure("TButton", font=("Segoe UI", 10, "bold"), padding=(10, 5))
        style.configure("Generate.TButton", font=("Segoe UI", 12, "bold"), padding=(16, 8))
        style.configure("TCombobox", font=("Segoe UI", 9))
        style.configure("TScale", background="#1a1a2e")
        style.configure("TLabelframe", background="#1a1a2e", foreground="#8888cc",
                         font=("Segoe UI", 10, "bold"))
        style.configure("TLabelframe.Label", background="#1a1a2e", foreground="#8888cc")
        style.configure("TCheckbutton", background="#1a1a2e", foreground="#e0e0e0",
                         font=("Segoe UI", 10))

        # Scrollable main area
        canvas = tk.Canvas(self.root, bg="#1a1a2e", highlightthickness=0)
        scrollbar = ttk.Scrollbar(self.root, orient="vertical", command=canvas.yview)
        canvas.configure(yscrollcommand=scrollbar.set)
        scrollbar.pack(side="right", fill="y")
        canvas.pack(side="left", fill="both", expand=True)

        main = ttk.Frame(canvas, padding=16)
        canvas_window = canvas.create_window((0, 0), window=main, anchor="nw")

        def _on_frame_configure(e):
            canvas.configure(scrollregion=canvas.bbox("all"))
        main.bind("<Configure>", _on_frame_configure)

        def _on_canvas_configure(e):
            canvas.itemconfig(canvas_window, width=e.width)
        canvas.bind("<Configure>", _on_canvas_configure)

        # Mouse wheel scrolling
        def _on_mousewheel(e):
            canvas.yview_scroll(int(-1 * (e.delta / 120)), "units")
        canvas.bind_all("<MouseWheel>", _on_mousewheel)

        # ── Status Bar ──
        self.status_var = tk.StringVar(value="Loading voice model...")
        ttk.Label(main, textvariable=self.status_var, style="Status.TLabel").pack(
            anchor="w", pady=(0, 4))

        # ── Header ──
        ttk.Label(main, text="Vesper Astra Voice Workshop", style="Header.TLabel").pack(
            anchor="w", pady=(0, 2))
        ttk.Label(main, text="Type what she should say, tweak how she says it, hit Generate.",
                  style="Sub.TLabel").pack(anchor="w", pady=(0, 12))

        # ══════════════════════════════════════════════
        # ── Output Device ──
        # ══════════════════════════════════════════════
        dev_frame = ttk.LabelFrame(main, text="Speaker / Output Device", padding=8)
        dev_frame.pack(fill="x", pady=(0, 10))
        ttk.Label(dev_frame, text="Where to play the generated voice audio",
                  style="Sub.TLabel").pack(anchor="w", pady=(0, 4))
        self.output_devices = get_output_devices()
        self.device_var = tk.StringVar(
            value=self.output_devices[0] if self.output_devices else "")
        ttk.Combobox(dev_frame, textvariable=self.device_var,
                     values=self.output_devices, state="readonly", width=60
                     ).pack(fill="x")

        # ══════════════════════════════════════════════
        # ── Text Input ──
        # ══════════════════════════════════════════════
        text_frame = ttk.LabelFrame(main, text="What should she say?", padding=8)
        text_frame.pack(fill="x", pady=(0, 10))

        self.text_input = tk.Text(text_frame, height=3, bg="#16213e", fg="#e0e0e0",
                                   insertbackground="#e0e0e0", font=("Segoe UI", 11),
                                   wrap="word", bd=0, padx=8, pady=6)
        self.text_input.pack(fill="x")
        self.text_input.insert("1.0", SAMPLE_LINES[0])

        sample_frame = ttk.Frame(text_frame)
        sample_frame.pack(fill="x", pady=(6, 0))
        ttk.Label(sample_frame, text="Quick picks:").pack(side="left", padx=(0, 6))
        self.sample_var = tk.StringVar(value="")
        sample_combo = ttk.Combobox(
            sample_frame, textvariable=self.sample_var,
            values=[l[:70] + "..." if len(l) > 70 else l for l in SAMPLE_LINES],
            state="readonly", width=70)
        sample_combo.pack(side="left", fill="x", expand=True)
        sample_combo.bind("<<ComboboxSelected>>", self._on_sample_select)

        # ══════════════════════════════════════════════
        # ── Voice Identity ──
        # ══════════════════════════════════════════════
        identity_frame = ttk.LabelFrame(main, text="Voice Identity — Who does she sound like?",
                                         padding=8)
        identity_frame.pack(fill="x", pady=(0, 10))

        # Mood preset
        mood_row = ttk.Frame(identity_frame)
        mood_row.pack(fill="x", pady=(0, 8))
        ttk.Label(mood_row, text="Mood / Personality:", font=("Segoe UI", 10, "bold")
                  ).pack(side="left", padx=(0, 8))
        self.mood_var = tk.StringVar(value=list(MOOD_PRESETS.keys())[0])
        mood_combo = ttk.Combobox(mood_row, textvariable=self.mood_var,
                                   values=list(MOOD_PRESETS.keys()),
                                   state="readonly", width=45)
        mood_combo.pack(side="left", fill="x", expand=True)
        mood_combo.bind("<<ComboboxSelected>>", self._on_mood_change)
        ttk.Label(identity_frame,
                  text="Picks the best default settings for this personality. You can still tweak below.",
                  style="Sub.TLabel").pack(anchor="w", pady=(0, 8))

        # Reference voice source
        ref_row = ttk.Frame(identity_frame)
        ref_row.pack(fill="x", pady=(0, 4))
        ttk.Label(ref_row, text="Voice Source:", font=("Segoe UI", 10, "bold")
                  ).pack(side="left", padx=(0, 8))

        speakers = []
        for d in sorted(REFERENCE_DIR.iterdir()):
            if d.is_dir() and d.name != "rejected":
                speakers.append(d.name)
        ref_options = ["both"] + speakers
        ref_labels = [REF_DESCRIPTIONS.get(s, s) for s in ref_options]

        self.refs_var = tk.StringVar(value=ref_labels[0])
        self._ref_map = dict(zip(ref_labels, ref_options))
        ttk.Combobox(ref_row, textvariable=self.refs_var, values=ref_labels,
                     state="readonly", width=45).pack(side="left", fill="x", expand=True)
        ttk.Label(identity_frame,
                  text="Which real voice clips to use as reference. 'Both' blends for Vesper' 70/30 mix.",
                  style="Sub.TLabel").pack(anchor="w", pady=(0, 4))

        # Include golden
        golden_row = ttk.Frame(identity_frame)
        golden_row.pack(fill="x", pady=(4, 0))
        self.golden_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(golden_row, text="Use saved golden clips as extra context",
                         variable=self.golden_var).pack(side="left")
        ttk.Label(identity_frame,
                  text="Golden clips are your best previous outputs. Adds consistency but takes more memory.",
                  style="Sub.TLabel").pack(anchor="w")

        # ══════════════════════════════════════════════
        # ── Voice Tuning ──
        # ══════════════════════════════════════════════
        tuning_frame = ttk.LabelFrame(main, text="Voice Tuning — How does she say it?",
                                       padding=8)
        tuning_frame.pack(fill="x", pady=(0, 10))

        # Expressiveness (Temperature)
        self.temp_var = tk.DoubleVar(value=0.7)
        make_slider_row(
            tuning_frame,
            label="Expressiveness",
            description="Low = flat, robotic, consistent  |  High = lively, varied, emotional",
            var=self.temp_var, from_=0.3, to_=1.0,
            format_fn=lambda v: f"{float(v):.2f}  {'Monotone' if float(v) < 0.45 else 'Controlled' if float(v) < 0.6 else 'Natural' if float(v) < 0.75 else 'Expressive' if float(v) < 0.9 else 'Dramatic'}",
            on_change=None,
        )

        # Voice Variety (Top-K)
        self.topk_var = tk.IntVar(value=50)
        make_slider_row(
            tuning_frame,
            label="Voice Variety",
            description="Low = predictable, same-y  |  High = more natural variation between words",
            var=self.topk_var, from_=10, to_=100,
            format_fn=lambda v: f"{int(float(v))}  {'Narrow' if float(v) < 25 else 'Focused' if float(v) < 45 else 'Balanced' if float(v) < 65 else 'Wide' if float(v) < 85 else 'Very Wide'}",
            on_change=None,
        )

        # Max Duration
        self.maxlen_var = tk.IntVar(value=15000)
        make_slider_row(
            tuning_frame,
            label="Max Duration",
            description="How long she's allowed to speak. Longer = slower generation. Short text needs less.",
            var=self.maxlen_var, from_=3000, to_=30000,
            format_fn=lambda v: f"{int(float(v))/1000:.0f} seconds",
            on_change=None,
        )

        # Context Size (how many reference clips to use)
        self.ctx_var = tk.IntVar(value=5)
        make_slider_row(
            tuning_frame,
            label="Reference Depth",
            description="How many voice clips to use as context. More = closer to source but slower.",
            var=self.ctx_var, from_=1, to_=20,
            format_fn=lambda v: f"{int(float(v))} clips  {'Minimal' if float(v) < 3 else 'Light' if float(v) < 6 else 'Normal' if float(v) < 10 else 'Deep' if float(v) < 16 else 'Maximum'}",
            on_change=None,
        )

        # Speaker ID
        self.speaker_var = tk.IntVar(value=0)
        make_slider_row(
            tuning_frame,
            label="Speaker Slot",
            description="CSM internal speaker number. Usually 0. Try others for pitch/character shifts.",
            var=self.speaker_var, from_=0, to_=9,
            format_fn=lambda v: f"Speaker {int(float(v))}",
            on_change=None,
        )

        # ══════════════════════════════════════════════
        # ── Action Buttons ──
        # ══════════════════════════════════════════════
        action_frame = ttk.Frame(main)
        action_frame.pack(fill="x", pady=(4, 4))

        self.gen_btn = ttk.Button(action_frame, text="Loading model...",
                                   command=self._on_generate, style="Generate.TButton",
                                   state="disabled")
        self.gen_btn.pack(side="left", padx=(0, 8))

        self.play_btn = ttk.Button(action_frame, text="Replay Last",
                                    command=self._on_play, state="disabled")
        self.play_btn.pack(side="left", padx=(0, 16))

        self.stop_btn = ttk.Button(action_frame, text="Stop Audio",
                                    command=lambda: sd.stop())
        self.stop_btn.pack(side="left", padx=(0, 24))

        ttk.Button(action_frame, text="Save as Snarky",
                   command=lambda: self._on_promote("snarky")).pack(side="left", padx=3)
        ttk.Button(action_frame, text="Save as Warm",
                   command=lambda: self._on_promote("warm")).pack(side="left", padx=3)
        ttk.Button(action_frame, text="Save as Balanced",
                   command=lambda: self._on_promote("balanced")).pack(side="left", padx=3)

        # ══════════════════════════════════════════════
        # ── History ──
        # ══════════════════════════════════════════════
        history_frame = ttk.LabelFrame(main, text="Generation History — click to replay",
                                        padding=8)
        history_frame.pack(fill="both", expand=True, pady=(8, 0))

        self.history_list = tk.Listbox(history_frame, bg="#16213e", fg="#e0e0e0",
                                        font=("Consolas", 9), bd=0, selectmode="single",
                                        selectbackground="#6c63ff", height=8)
        self.history_list.pack(fill="both", expand=True)
        self.history_list.bind("<<ListboxSelect>>", self._on_history_select)
        self.history = []

        # Load model in background
        threading.Thread(target=self._load_model, daemon=True).start()

    def _load_model(self):
        try:
            self.root.after(0, lambda: self.status_var.set(
                "Loading voice model... (first time takes ~30s)"))
            from voice_generator import load_csm_generator
            self.generator = load_csm_generator()
            self.last_sr = self.generator.sample_rate
            self.root.after(0, self._model_ready)
        except Exception as e:
            err_msg = str(e)
            self.root.after(0, lambda: self.status_var.set(f"Model error: {err_msg}"))

    def _model_ready(self):
        self.status_var.set("Ready! Type something and hit Generate & Play.")
        self.gen_btn.configure(text="Generate & Play", state="normal")

    def _on_sample_select(self, event):
        idx = event.widget.current()
        if 0 <= idx < len(SAMPLE_LINES):
            self.text_input.delete("1.0", "end")
            self.text_input.insert("1.0", SAMPLE_LINES[idx])

    def _on_mood_change(self, event):
        mood_label = self.mood_var.get()
        preset = MOOD_PRESETS.get(mood_label, list(MOOD_PRESETS.values())[0])
        self.temp_var.set(preset["temperature"])
        self.topk_var.set(preset["topk"])
        self.ctx_var.set(preset.get("max_refs", 8))

    def _get_mood_key(self):
        mood_label = self.mood_var.get()
        preset = MOOD_PRESETS.get(mood_label, list(MOOD_PRESETS.values())[0])
        return preset["key"]

    def _get_refs_key(self):
        label = self.refs_var.get()
        return self._ref_map.get(label, "both")

    def _on_generate(self):
        if self.generating or self.generator is None:
            return
        self.generating = True
        self.gen_btn.configure(text="Generating... please wait", state="disabled")
        self.status_var.set("Generating audio — this takes 30-120 seconds on CPU...")
        threading.Thread(target=self._generate_worker, daemon=True).start()

    def _generate_worker(self):
        try:
            text = self.text_input.get("1.0", "end").strip()
            if not text:
                self.root.after(0, lambda: self.status_var.set("Type something first!"))
                return

            temp = self.temp_var.get()
            topk = int(self.topk_var.get())
            max_ms = int(self.maxlen_var.get())
            mood = self._get_mood_key()
            refs_choice = self._get_refs_key()
            use_golden = self.golden_var.get()
            max_refs = int(self.ctx_var.get())
            speaker_id = int(self.speaker_var.get())

            from voice_generator import (load_reference_clips, load_golden_clips,
                                          build_context, save_generation)

            refs = []
            if refs_choice == "both":
                for speaker_dir in REFERENCE_DIR.iterdir():
                    if speaker_dir.is_dir() and speaker_dir.name != "rejected":
                        refs.extend(load_reference_clips(speaker_dir.name))
            else:
                refs = load_reference_clips(refs_choice)

            # Limit reference clips
            if len(refs) > max_refs:
                import random
                refs = random.sample(refs, max_refs)

            golden = load_golden_clips(mood) if use_golden else []
            context = build_context(golden + refs)

            ref_sources = [r.source for r in (golden + refs)]

            self.root.after(0, lambda: self.status_var.set(
                f"Generating... ({len(context)} reference clips, "
                f"expressiveness {temp:.2f}, variety {topk})"))

            t0 = time.time()
            audio = self.generator.generate(
                text=text,
                speaker=speaker_id,
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

            path = save_generation(audio, text, mood, temp,
                                    self.generator.sample_rate, ref_sources)

            entry = {
                "audio": self.last_audio,
                "sr": self.last_sr,
                "text": text,
                "mood": mood,
                "temp": temp,
                "topk": topk,
                "speaker": speaker_id,
                "refs": refs_choice,
                "ctx_size": len(context),
                "duration": duration,
                "elapsed": elapsed,
                "path": str(path),
            }
            self.history.append(entry)

            dev_idx = get_device_index(self.device_var.get())
            sd.play(self.last_audio, samplerate=self.last_sr, device=dev_idx)

            def update_ui():
                self.status_var.set(
                    f"Done! {duration:.1f}s of audio generated in {elapsed:.0f}s "
                    f"| {len(context)} ref clips | {refs_choice}")
                self.play_btn.configure(state="normal")
                text_short = text[:45] + "..." if len(text) > 45 else text
                label = (f"#{self.generation_count}  {duration:.1f}s  [{mood}]  "
                         f"expr={temp:.2f}  var={topk}  "
                         f"\"{text_short}\"")
                self.history_list.insert("end", label)
                self.history_list.see("end")
                self.history_list.selection_clear(0, "end")
                self.history_list.selection_set("end")

            self.root.after(0, update_ui)

        except Exception as e:
            err_msg = str(e)
            self.root.after(0, lambda: self.status_var.set(f"Error: {err_msg}"))
        finally:
            self.generating = False
            self.root.after(0, lambda: self.gen_btn.configure(
                text="Generate & Play", state="normal"))

    def _on_play(self):
        if self.last_audio is None:
            return
        dev_idx = get_device_index(self.device_var.get())
        sd.play(self.last_audio, samplerate=self.last_sr, device=dev_idx)
        self.status_var.set("Replaying last generation...")

    def _on_history_select(self, event):
        sel = self.history_list.curselection()
        if not sel:
            return
        idx = sel[0]
        if idx < len(self.history):
            entry = self.history[idx]
            self.last_audio = entry["audio"]
            self.last_sr = entry["sr"]
            dev_idx = get_device_index(self.device_var.get())
            sd.play(self.last_audio, samplerate=self.last_sr, device=dev_idx)
            self.status_var.set(
                f"Replaying #{idx+1}: {entry['duration']:.1f}s [{entry['mood']}] "
                f"with {entry['refs']} refs")

    def _on_promote(self, category):
        if not self.history:
            self.status_var.set("Generate something first!")
            return
        sel = self.history_list.curselection()
        idx = sel[0] if sel else len(self.history) - 1
        entry = self.history[idx]

        from voice_generator import promote_to_golden
        promote_to_golden(entry["path"], category, entry["text"])
        self.status_var.set(
            f"Saved #{idx+1} as golden '{category}' clip! "
            f"It will be used as a voice anchor in future generations.")

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    VoiceWorkshop().run()
