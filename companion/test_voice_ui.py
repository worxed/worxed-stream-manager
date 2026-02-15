"""Vesper Astra Voice Lab — Chatterbox-Turbo TTS testing UI.

Select a voice reference clip, adjust mood/exaggeration, type text,
and generate + play speech. Zero-shot voice cloning from any WAV.
"""

import os
import sys
import threading
import time
from pathlib import Path

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
from tkinter import ttk, filedialog
import numpy as np
import sounddevice as sd
import soundfile as sf

VOICES_DIR = Path(__file__).parent / "voices"
GOLDEN_DIR = VOICES_DIR / "golden"
TRAINING_DIR = VOICES_DIR / "training"
LIVE_DIR = VOICES_DIR / "live"


def get_output_devices():
    devices = sd.query_devices()
    result = []
    seen = set()
    for i, d in enumerate(devices):
        if d["max_output_channels"] > 0:
            name = d["name"]
            if name not in seen:
                seen.add(name)
                default = " *DEFAULT*" if i == sd.default.device[1] else ""
                result.append((i, f"{name}{default}"))
    return result


def get_input_devices():
    devices = sd.query_devices()
    result = []
    seen = set()
    for i, d in enumerate(devices):
        if d["max_input_channels"] > 0:
            name = d["name"]
            if name not in seen:
                seen.add(name)
                default = " *DEFAULT*" if i == sd.default.device[0] else ""
                result.append((i, f"{name}{default}"))
    return result


def find_voice_references():
    """Scan golden/ and training/ dirs for available WAV references."""
    refs = []

    # Golden clips first (preferred)
    if GOLDEN_DIR.exists():
        for mood_dir in sorted(GOLDEN_DIR.iterdir()):
            if mood_dir.is_dir():
                for wav in sorted(mood_dir.glob("*.wav"), key=lambda p: p.stat().st_mtime, reverse=True):
                    info = sf.info(str(wav))
                    label = f"[golden/{mood_dir.name}] {wav.name} ({info.duration:.1f}s)"
                    refs.append((label, str(wav)))

    # Training clips by speaker
    if TRAINING_DIR.exists():
        for speaker_dir in sorted(TRAINING_DIR.iterdir()):
            if speaker_dir.is_dir():
                wavs = sorted(speaker_dir.glob("*.wav"), key=lambda p: p.stat().st_mtime, reverse=True)
                # Just show first 10 per speaker to keep dropdown manageable
                for wav in wavs[:10]:
                    info = sf.info(str(wav))
                    label = f"[train/{speaker_dir.name}] {wav.name} ({info.duration:.1f}s)"
                    refs.append((label, str(wav)))

    return refs


MOOD_PRESETS = {
    "neutral":  0.5,
    "warm":     0.6,
    "happy":    0.7,
    "excited":  0.85,
    "snarky":   0.4,
    "thinking": 0.3,
    "sad":      0.4,
    "amused":   0.6,
}


class VesperVoiceLab:
    def __init__(self):
        self.model = None
        self.model_ready = False
        self.generation_count = 0

        self.root = tk.Tk()
        self.root.title("Vesper Astra — Voice Lab")
        self.root.geometry("700x720")
        self.root.configure(bg="#1a1a2e")
        self.root.resizable(True, True)

        self._build_styles()
        self._build_ui()

        # Load model in background
        threading.Thread(target=self._load_model, daemon=True).start()

    def _build_styles(self):
        style = ttk.Style()
        style.theme_use("clam")

        bg = "#1a1a2e"
        fg = "#e0e0e0"
        accent = "#6c63ff"
        teal = "#00cc88"
        field_bg = "#16213e"

        style.configure("TFrame", background=bg)
        style.configure("TLabel", background=bg, foreground=fg, font=("Segoe UI", 10))
        style.configure("Header.TLabel", background=bg, foreground=accent, font=("Segoe UI", 16, "bold"))
        style.configure("Sub.TLabel", background=bg, foreground="#888899", font=("Segoe UI", 9))
        style.configure("Status.TLabel", background="#16213e", foreground=teal,
                         font=("Consolas", 10), padding=(10, 8))
        style.configure("TButton", background=accent, foreground="#ffffff",
                         font=("Segoe UI", 11, "bold"), borderwidth=0, padding=(16, 8))
        style.map("TButton",
                   background=[("active", "#5a52d5"), ("disabled", "#333355")],
                   foreground=[("disabled", "#666688")])
        style.configure("Small.TButton", font=("Segoe UI", 9), padding=(8, 4))
        style.configure("TCombobox", fieldbackground=field_bg, background=field_bg,
                         foreground=fg, selectbackground=accent, borderwidth=1)
        style.configure("TScale", background=bg, troughcolor=field_bg)
        style.configure("TLabelframe", background=bg, foreground=fg)
        style.configure("TLabelframe.Label", background=bg, foreground=accent, font=("Segoe UI", 10, "bold"))

    def _build_ui(self):
        fg = "#e0e0e0"
        field_bg = "#16213e"

        main = ttk.Frame(self.root, padding=20)
        main.pack(fill="both", expand=True)

        # Header
        ttk.Label(main, text="Vesper Astra — Voice Lab", style="Header.TLabel").pack(pady=(0, 4))
        ttk.Label(main, text="Chatterbox-Turbo | Zero-shot voice cloning | ROCm GPU",
                  style="Sub.TLabel").pack(pady=(0, 12))

        # Status bar
        self.status_var = tk.StringVar(value="Loading Chatterbox-Turbo on GPU...")
        ttk.Label(main, textvariable=self.status_var, style="Status.TLabel",
                  wraplength=640, anchor="w").pack(fill="x", pady=(0, 12))

        # ── Voice Reference ──
        ref_frame = ttk.LabelFrame(main, text="Voice Reference", padding=8)
        ref_frame.pack(fill="x", pady=(0, 8))

        self.voice_refs = find_voice_references()
        self.ref_var = tk.StringVar()
        ref_combo = ttk.Combobox(ref_frame, textvariable=self.ref_var, state="readonly", width=80)
        ref_combo["values"] = [r[0] for r in self.voice_refs]
        # Default to composite expressive if available, else first golden
        for i, (label, _) in enumerate(self.voice_refs):
            if "composite_expressive" in label:
                ref_combo.current(i)
                break
        else:
            if self.voice_refs:
                ref_combo.current(0)
        ref_combo.pack(fill="x", pady=(0, 4))

        # Browse custom WAV
        browse_row = ttk.Frame(ref_frame)
        browse_row.pack(fill="x")
        ttk.Button(browse_row, text="Browse WAV...", style="Small.TButton",
                   command=self._browse_wav).pack(side="left")
        self.custom_wav_label = ttk.Label(browse_row, text="", style="Sub.TLabel")
        self.custom_wav_label.pack(side="left", padx=(8, 0))

        # ── Mood & Exaggeration ──
        mood_frame = ttk.LabelFrame(main, text="Mood & Expression", padding=8)
        mood_frame.pack(fill="x", pady=(0, 8))

        mood_row = ttk.Frame(mood_frame)
        mood_row.pack(fill="x", pady=(0, 4))

        ttk.Label(mood_row, text="Mood preset:").pack(side="left")
        self.mood_var = tk.StringVar(value="warm")
        mood_combo = ttk.Combobox(mood_row, textvariable=self.mood_var, state="readonly", width=12,
                                   values=list(MOOD_PRESETS.keys()))
        mood_combo.pack(side="left", padx=(8, 16))
        mood_combo.bind("<<ComboboxSelected>>", self._on_mood_change)

        ttk.Label(mood_row, text="Exaggeration:").pack(side="left")
        self.exag_var = tk.DoubleVar(value=0.6)
        self.exag_scale = tk.Scale(mood_frame, from_=0.0, to=1.2, resolution=0.05,
                                    orient="horizontal", variable=self.exag_var,
                                    bg="#1a1a2e", fg="#e0e0e0", troughcolor="#16213e",
                                    highlightthickness=0, length=300)
        self.exag_scale.pack(fill="x")

        exag_labels = ttk.Frame(mood_frame)
        exag_labels.pack(fill="x")
        ttk.Label(exag_labels, text="0.0 deadpan", style="Sub.TLabel").pack(side="left")
        ttk.Label(exag_labels, text="1.0+ dramatic", style="Sub.TLabel").pack(side="right")

        # ── Audio Devices ──
        device_frame = ttk.LabelFrame(main, text="Audio Devices", padding=8)
        device_frame.pack(fill="x", pady=(0, 8))

        ttk.Label(device_frame, text="Output:").pack(anchor="w")
        self.output_devices = get_output_devices()
        self.output_var = tk.StringVar()
        output_combo = ttk.Combobox(device_frame, textvariable=self.output_var, state="readonly", width=70)
        output_combo["values"] = [f"[{d[0]}] {d[1]}" for d in self.output_devices]
        for i, (dev_id, name) in enumerate(self.output_devices):
            if "*DEFAULT*" in name:
                output_combo.current(i)
                break
        else:
            if self.output_devices:
                output_combo.current(0)
        output_combo.pack(fill="x", pady=(2, 6))

        ttk.Label(device_frame, text="Input (future mic):").pack(anchor="w")
        self.input_devices = get_input_devices()
        self.input_var = tk.StringVar()
        input_combo = ttk.Combobox(device_frame, textvariable=self.input_var, state="readonly", width=70)
        input_combo["values"] = [f"[{d[0]}] {d[1]}" for d in self.input_devices]
        for i, (dev_id, name) in enumerate(self.input_devices):
            if "*DEFAULT*" in name:
                input_combo.current(i)
                break
        else:
            if self.input_devices:
                input_combo.current(0)
        input_combo.pack(fill="x", pady=(2, 0))

        # ── Text Input ──
        ttk.Label(main, text="Text to speak:").pack(anchor="w", pady=(8, 0))
        self.text_entry = tk.Text(main, height=3, width=70, bg=field_bg, fg=fg,
                                   insertbackground=fg, font=("Segoe UI", 10),
                                   relief="flat", padx=8, pady=6, wrap="word")
        self.text_entry.insert("1.0", "Hey chat, it's your girl Vesper. I see you lurking.")
        self.text_entry.pack(fill="x", pady=(2, 12))

        # ── Buttons ──
        btn_row = ttk.Frame(main)
        btn_row.pack(fill="x")
        self.gen_btn = ttk.Button(btn_row, text="Loading model...", command=self._on_generate,
                                   state="disabled")
        self.gen_btn.pack(side="left", padx=(0, 8))

        self.play_btn = ttk.Button(btn_row, text="Replay Last", style="Small.TButton",
                                    command=self._on_replay, state="disabled")
        self.play_btn.pack(side="left")

        self.last_audio = None
        self.last_sr = None

    def _on_mood_change(self, event=None):
        mood = self.mood_var.get()
        if mood in MOOD_PRESETS:
            self.exag_var.set(MOOD_PRESETS[mood])

    def _browse_wav(self):
        path = filedialog.askopenfilename(
            title="Select voice reference WAV",
            filetypes=[("WAV files", "*.wav"), ("All files", "*.*")],
            initialdir=str(VOICES_DIR),
        )
        if path:
            info = sf.info(path)
            label = f"[custom] {Path(path).name} ({info.duration:.1f}s)"
            self.voice_refs.append((label, path))
            # Update combobox and select new entry
            combo = self.root.nametowidget(str(self.ref_var))  # won't work this way
            # Just update the label
            self.custom_wav_label.configure(text=f"Custom: {Path(path).name}")
            self.ref_var.set(label)
            # Add to the combobox values
            for widget in self.root.winfo_children():
                self._update_ref_combo(widget, label)

    def _update_ref_combo(self, parent, new_label):
        """Recursively find the ref combobox and add the new label."""
        for child in parent.winfo_children():
            if isinstance(child, ttk.Combobox):
                vals = list(child["values"])
                if len(vals) > 0 and vals[0].startswith("[golden") or vals[0].startswith("[train"):
                    vals.append(new_label)
                    child["values"] = vals
                    child.set(new_label)
                    return True
            if self._update_ref_combo(child, new_label):
                return True
        return False

    def _get_selected_ref_path(self):
        selected = self.ref_var.get()
        for label, path in self.voice_refs:
            if label == selected:
                return path
        # Fallback
        if self.voice_refs:
            return self.voice_refs[0][1]
        return None

    def _get_selected_output_id(self):
        idx = 0
        for i, val in enumerate([f"[{d[0]}] {d[1]}" for d in self.output_devices]):
            if val == self.output_var.get():
                idx = i
                break
        return self.output_devices[idx][0]

    def _set_status(self, msg):
        def _update():
            self.status_var.set(msg)
        self.root.after(0, _update)

    # ── Model loading ──

    def _load_model(self):
        self._set_status("Patching perth watermarker...")
        try:
            import perth
            if perth.PerthImplicitWatermarker is None:
                from perth.dummy_watermarker import DummyWatermarker
                perth.PerthImplicitWatermarker = DummyWatermarker

            self._set_status("Importing PyTorch + Chatterbox...")
            import torch
            if not torch.cuda.is_available():
                self._set_status("ERROR: No GPU detected. Chatterbox needs CUDA/ROCm.")
                return

            gpu_name = torch.cuda.get_device_name(0)
            vram = torch.cuda.get_device_properties(0).total_memory / 1024**3
            self._set_status(f"Loading Chatterbox-Turbo on {gpu_name} ({vram:.0f}GB)...")

            from chatterbox.tts import ChatterboxTTS
            self.model = ChatterboxTTS.from_pretrained(device="cuda")
            self.model_ready = True

            self._set_status(f"Ready! Chatterbox-Turbo on {gpu_name} | {self.model.sr}Hz | {vram:.0f}GB VRAM")
            self.root.after(0, lambda: self.gen_btn.configure(state="normal", text="Generate & Play"))

        except Exception as e:
            err_msg = str(e)
            self._set_status(f"ERROR: {err_msg}")

    # ── Generation ──

    def _on_generate(self):
        if not self.model_ready:
            self._set_status("Model still loading...")
            return

        text = self.text_entry.get("1.0", "end").strip()
        if not text:
            self._set_status("Enter some text first!")
            return

        ref_path = self._get_selected_ref_path()
        if not ref_path:
            self._set_status("No voice reference selected!")
            return

        exag = self.exag_var.get()
        output_id = self._get_selected_output_id()

        self.gen_btn.configure(state="disabled", text="Generating...")
        self.play_btn.configure(state="disabled")

        threading.Thread(
            target=self._generate_worker,
            args=(text, ref_path, exag, output_id),
            daemon=True,
        ).start()

    def _generate_worker(self, text, ref_path, exaggeration, output_device_id):
        import torch

        ref_name = Path(ref_path).name
        self._set_status(f"Generating... ref={ref_name}, exag={exaggeration:.2f}")
        t0 = time.time()

        try:
            wav = self.model.generate(
                text,
                audio_prompt_path=ref_path,
                exaggeration=exaggeration,
            )
            elapsed = time.time() - t0
            audio_np = wav.squeeze().cpu().numpy().astype(np.float32)
            duration = len(audio_np) / self.model.sr
            self.generation_count += 1

            # Save WAV
            LIVE_DIR.mkdir(parents=True, exist_ok=True)
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            out_path = LIVE_DIR / f"lab_{self.generation_count:03d}_{timestamp}.wav"
            sf.write(str(out_path), audio_np, self.model.sr)

            # Store for replay
            self.last_audio = audio_np
            self.last_sr = self.model.sr

            self._set_status(f"Playing {duration:.1f}s audio (gen in {elapsed:.1f}s) | Saved: {out_path.name}")

            sd.play(audio_np, samplerate=self.model.sr, device=output_device_id)
            sd.wait()

            self._set_status(
                f"#{self.generation_count}: {duration:.1f}s in {elapsed:.1f}s | "
                f"exag={exaggeration:.2f} | {out_path.name}"
            )

        except Exception as e:
            err_msg = str(e)
            self._set_status(f"ERROR: {err_msg}")

        self.root.after(0, lambda: self.gen_btn.configure(state="normal", text="Generate & Play"))
        self.root.after(0, lambda: self.play_btn.configure(state="normal"))

    def _on_replay(self):
        if self.last_audio is None:
            self._set_status("Nothing to replay yet!")
            return

        output_id = self._get_selected_output_id()
        self._set_status("Replaying last generation...")

        def _play():
            sd.play(self.last_audio, samplerate=self.last_sr, device=output_id)
            sd.wait()
            self._set_status("Replay done.")

        threading.Thread(target=_play, daemon=True).start()

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    VesperVoiceLab().run()
