"""Schnukums Voice Test — UI for device selection and generation."""

import sys
import os
import threading
import time
import json

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


# ── Audio device helpers ──

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


# ── UI ──

class SchnukumsUI:
    def __init__(self):
        self.generator = None
        self.model_ready = False

        self.root = tk.Tk()
        self.root.title("Schnukums Voice Test")
        self.root.geometry("640x560")
        self.root.configure(bg="#1a1a2e")
        self.root.resizable(False, False)

        self._build_styles()
        self._build_ui()

        # Start model loading in background
        threading.Thread(target=self._load_model, daemon=True).start()

    def _build_styles(self):
        style = ttk.Style()
        style.theme_use("clam")

        bg = "#1a1a2e"
        fg = "#e0e0e0"
        accent = "#6c63ff"
        field_bg = "#16213e"

        style.configure("TFrame", background=bg)
        style.configure("TLabel", background=bg, foreground=fg, font=("Segoe UI", 10))
        style.configure("Header.TLabel", background=bg, foreground=accent, font=("Segoe UI", 16, "bold"))
        style.configure("Status.TLabel", background="#16213e", foreground="#00cc88",
                         font=("Consolas", 11), padding=(10, 8))
        style.configure("TButton", background=accent, foreground="#ffffff",
                         font=("Segoe UI", 11, "bold"), borderwidth=0, padding=(16, 8))
        style.map("TButton",
                   background=[("active", "#5a52d5"), ("disabled", "#333355")],
                   foreground=[("disabled", "#666688")])
        style.configure("TCombobox", fieldbackground=field_bg, background=field_bg,
                         foreground=fg, selectbackground=accent, borderwidth=1)
        style.configure("TSpinbox", fieldbackground=field_bg, background=field_bg,
                         foreground=fg, borderwidth=1)

    def _build_ui(self):
        fg = "#e0e0e0"
        field_bg = "#16213e"

        main = ttk.Frame(self.root, padding=20)
        main.pack(fill="both", expand=True)

        # Header
        ttk.Label(main, text="Schnukums Voice Test", style="Header.TLabel").pack(pady=(0, 16))

        # Status bar (prominent, at the top)
        self.status_var = tk.StringVar(value="Loading model... please wait")
        status_label = ttk.Label(main, textvariable=self.status_var, style="Status.TLabel",
                                  wraplength=580, anchor="w")
        status_label.pack(fill="x", pady=(0, 12))

        # Output device
        ttk.Label(main, text="Output Device:").pack(anchor="w")
        self.output_devices = get_output_devices()
        self.output_var = tk.StringVar()
        output_combo = ttk.Combobox(main, textvariable=self.output_var, state="readonly", width=70)
        output_combo["values"] = [f"[{d[0]}] {d[1]}" for d in self.output_devices]
        for i, (dev_id, name) in enumerate(self.output_devices):
            if "*DEFAULT*" in name:
                output_combo.current(i)
                break
        else:
            if self.output_devices:
                output_combo.current(0)
        output_combo.pack(fill="x", pady=(2, 10))

        # Input device (for future use)
        ttk.Label(main, text="Input Device (future mic input):").pack(anchor="w")
        self.input_devices = get_input_devices()
        self.input_var = tk.StringVar()
        input_combo = ttk.Combobox(main, textvariable=self.input_var, state="readonly", width=70)
        input_combo["values"] = [f"[{d[0]}] {d[1]}" for d in self.input_devices]
        for i, (dev_id, name) in enumerate(self.input_devices):
            if "*DEFAULT*" in name:
                input_combo.current(i)
                break
        else:
            if self.input_devices:
                input_combo.current(0)
        input_combo.pack(fill="x", pady=(2, 10))

        # Text input
        ttk.Label(main, text="Text to speak:").pack(anchor="w")
        self.text_entry = tk.Text(main, height=3, width=70, bg=field_bg, fg=fg,
                                   insertbackground=fg, font=("Segoe UI", 10),
                                   relief="flat", padx=8, pady=6, wrap="word")
        self.text_entry.insert("1.0", "Hey chat, it's your girl Schnukums. I see you lurking.")
        self.text_entry.pack(fill="x", pady=(2, 10))

        # Speaker ID
        speaker_frame = ttk.Frame(main)
        speaker_frame.pack(fill="x", pady=(0, 16))
        ttk.Label(speaker_frame, text="Speaker ID:").pack(side="left")
        self.speaker_var = tk.IntVar(value=0)
        speaker_spin = ttk.Spinbox(speaker_frame, from_=0, to=9, width=5,
                                    textvariable=self.speaker_var)
        speaker_spin.pack(side="left", padx=(8, 0))
        ttk.Label(speaker_frame, text="(different IDs = different voices)",
                  foreground="#666688").pack(side="left", padx=(12, 0))

        # Generate button — DISABLED until model loads
        self.gen_btn = ttk.Button(main, text="Loading model...", command=self._on_generate,
                                   state="disabled")
        self.gen_btn.pack(pady=(0, 12))

    def _set_status(self, msg, color=None):
        """Thread-safe status update."""
        def _update():
            self.status_var.set(msg)
        self.root.after(0, _update)

    def _get_selected_output_id(self):
        idx = 0
        for i, val in enumerate([f"[{d[0]}] {d[1]}" for d in self.output_devices]):
            if val == self.output_var.get():
                idx = i
                break
        return self.output_devices[idx][0]

    # ── Model loading (background thread) ──

    def _load_model(self):
        self._set_status("Importing PyTorch...")

        try:
            import torch
            from huggingface_hub import hf_hub_download
            from models import Model, ModelArgs
            import generator as gen_module
            from generator import Generator
            import dataclasses
            from safetensors.torch import load_file
            from transformers import AutoTokenizer
            from tokenizers.processors import TemplateProcessing

            # Patch tokenizer to use ungated mirror
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

            self._set_status("Downloading CSM-1B model weights...")
            config_path = hf_hub_download("sesame/csm-1b", "config.json")
            weights_path = hf_hub_download("sesame/csm-1b", "model.safetensors")

            self._set_status("Building model on CPU (float32)...")
            with open(config_path) as f:
                raw = json.load(f)
            valid_fields = {f.name for f in dataclasses.fields(ModelArgs)}
            config = ModelArgs(**{k: v for k, v in raw.items() if k in valid_fields})

            model = Model(config)
            state_dict = load_file(weights_path)
            model.load_state_dict(state_dict)
            model.to(device="cpu", dtype=torch.float32)

            self._set_status("Loading tokenizer and audio codec...")
            self.generator = Generator(model)
            self.model_ready = True

            self._set_status(f"Ready! Model loaded (sample rate: {self.generator.sample_rate} Hz)")
            self.root.after(0, lambda: self.gen_btn.configure(state="normal",
                                                                text="Generate & Play"))

        except Exception as e:
            self._set_status(f"ERROR: {e}")

    # ── Generate (background thread) ──

    def _on_generate(self):
        if not self.model_ready:
            self._set_status("Model still loading, please wait...")
            return

        text = self.text_entry.get("1.0", "end").strip()
        if not text:
            self._set_status("Enter some text first!")
            return

        self.gen_btn.configure(state="disabled", text="Generating...")
        output_id = self._get_selected_output_id()
        speaker = self.speaker_var.get()

        threading.Thread(
            target=self._generate_worker,
            args=(text, speaker, output_id),
            daemon=True,
        ).start()

    def _generate_worker(self, text, speaker_id, output_device_id):
        import torch

        self._set_status(f"Generating speech on CPU... (this takes 30-60s)")
        t0 = time.time()

        try:
            audio = self.generator.generate(
                text=text,
                speaker=speaker_id,
                context=[],
                max_audio_length_ms=10_000,
            )
            elapsed = time.time() - t0
            audio_np = audio.cpu().numpy().astype(np.float32)
            duration = len(audio_np) / self.generator.sample_rate

            # Save WAV
            out_path = os.path.join(os.path.dirname(__file__), "schnukums_test.wav")
            sf.write(out_path, audio_np, self.generator.sample_rate)

            self._set_status(f"Playing {duration:.1f}s of audio (generated in {elapsed:.1f}s)...")

            sd.play(audio_np, samplerate=self.generator.sample_rate, device=output_device_id)
            sd.wait()

            self._set_status(
                f"Done! {duration:.1f}s audio in {elapsed:.1f}s. Saved: schnukums_test.wav"
            )

        except Exception as e:
            self._set_status(f"ERROR: {e}")

        # Re-enable button
        self.root.after(0, lambda: self.gen_btn.configure(state="normal",
                                                            text="Generate & Play"))

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    SchnukumsUI().run()
