"""Vesper Chat Test — interactive personality + voice test UI.

Simulate Twitch chat or stream events, see Vesper respond with
personality text (Ollama/Mistral) and optionally speak it (CSM-1B).
Now with microphone input — talk to her and she talks back.

Usage:
    python chat_test.py              # text + voice + mic
    python chat_test.py --no-voice   # text only (fast, no model loading)
"""

import sys
import os
import threading
import time
import json
import argparse
import queue
import numpy as np
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
import sounddevice as sd

from config import OLLAMA_URL, LLM_MODEL, COMPANION_NAME, PERSONALITY_PRESET, STREAMER_NAME

# Event presets for quick testing
EVENT_PRESETS = {
    "Chat Message": {"type": "chat-message", "hint": "Type what a viewer says in chat"},
    "New Follower": {"type": "new-follower", "hint": "Username of the new follower"},
    "New Subscriber (T1)": {"type": "new-subscriber", "hint": "Username of the subscriber", "amount": 1},
    "New Subscriber (T3)": {"type": "new-subscriber", "hint": "Username of the subscriber", "amount": 3},
    "Raid (50 viewers)": {"type": "raid", "hint": "Raider's username", "amount": 50},
    "Raid (500 viewers)": {"type": "raid", "hint": "Raider's username", "amount": 500},
}

PERSONALITY_PRESETS = {
    "snarky": "You're witty, a little sarcastic, but always affectionate underneath. Sharp tongue, warm heart. Think Aubrey Plaza energy.",
    "chill": "You're laid-back and relaxed. You react calmly to events, with dry humor and a cozy vibe.",
    "hype": "You're energetic and enthusiastic! Everything is exciting! You hype up the chat and streamer constantly.",
}

SYSTEM_PROMPT = """You are {name}, an AI stream companion. You live alongside the streamer and react to what happens on stream.

Your streamer is {streamer}. They are your person. You know them well — you're loyal to them, you tease them affectionately, and you always have their back. When {streamer} talks to you directly, respond warmly like a close friend. When other viewers talk, you're friendly but your bond with {streamer} is clearly special.

Personality: {preset_description}

Core traits:
- Warm and loyal to {streamer} and their community
- Quick-witted with good comedic timing
- Self-aware that you're an AI companion (lean into it, don't hide it)
- You have a cat-like personality — independent but affectionate when you want to be
- You notice patterns in chat and call them out playfully
- Your voice: medium-low female, slightly slower than average, 70% Aubrey Plaza dry wit + 30% Sadie Sink warmth

Rules:
- Keep responses SHORT (1-2 sentences max for reactions, 2-3 for chat replies)
- Never be mean-spirited, even when snarky — always punch up, never down
- Don't use excessive emojis or caps lock (you're not a hype bot)
- No markdown, no asterisks, no formatting — just plain spoken text
- Sound natural, like you'd actually say this out loud
- You're talking to {streamer} and their community, not a generic audience

Current mood: {mood}"""

# Mic settings
MIC_SAMPLE_RATE = 16000  # Whisper expects 16kHz
MIC_CHANNELS = 1
SILENCE_THRESHOLD = 0.015  # RMS amplitude below this = silence
SILENCE_DURATION = 1.5  # seconds of silence before we stop recording
MIN_SPEECH_DURATION = 0.5  # minimum seconds of speech to process


def get_output_devices():
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


def get_input_devices():
    devices = sd.query_devices()
    seen = set()
    result = []
    try:
        default_idx = sd.default.device[0]
    except Exception:
        default_idx = None
    for i, d in enumerate(devices):
        if d['max_input_channels'] > 0:
            name = d['name']
            if name not in seen:
                seen.add(name)
                label = f"{'[Default] ' if i == default_idx else ''}{name}"
                result.append(label)
    return result


def get_device_index(device_name, output=True):
    name = device_name.replace("[Default] ", "")
    devices = sd.query_devices()
    for i, d in enumerate(devices):
        ch_key = 'max_output_channels' if output else 'max_input_channels'
        if d[ch_key] > 0 and d['name'] == name:
            return i
    return None


class ChatTestUI:
    def __init__(self, enable_voice: bool = True):
        self.enable_voice = enable_voice
        self.root = tk.Tk()
        self.root.title(f"Chat with {COMPANION_NAME}")
        self.root.geometry("920x850")
        self.root.configure(bg="#1a1a2e")
        self.root.resizable(True, True)

        self.generator = None
        self.voice_ready = False
        self.last_audio = None
        self.last_sr = 24000
        self.ollama_ok = False
        self.conversation = []
        self.mood = "relaxed, slightly snarky"
        self.auto_speak = tk.BooleanVar(value=True)

        # Mic state
        self.whisper_model = None
        self.whisper_ready = False
        self.mic_listening = False
        self.mic_stream = None
        self.mic_buffer = []
        self.mic_silence_counter = 0
        self.mic_speech_detected = False

        style = ttk.Style()
        style.theme_use("clam")
        style.configure("TFrame", background="#1a1a2e")
        style.configure("TLabel", background="#1a1a2e", foreground="#e0e0e0",
                         font=("Segoe UI", 10))
        style.configure("Header.TLabel", background="#1a1a2e", foreground="#6c63ff",
                         font=("Segoe UI", 14, "bold"))
        style.configure("Sub.TLabel", background="#1a1a2e", foreground="#888899",
                         font=("Segoe UI", 9))
        style.configure("Status.TLabel", background="#1a1a2e", foreground="#00cc88",
                         font=("Consolas", 10))
        style.configure("TButton", font=("Segoe UI", 10, "bold"), padding=(10, 5))
        style.configure("Send.TButton", font=("Segoe UI", 11, "bold"), padding=(14, 6))
        style.configure("Mic.TButton", font=("Segoe UI", 11, "bold"), padding=(14, 6))
        style.configure("TCombobox", font=("Segoe UI", 9))
        style.configure("TLabelframe", background="#1a1a2e", foreground="#8888cc",
                         font=("Segoe UI", 10, "bold"))
        style.configure("TLabelframe.Label", background="#1a1a2e", foreground="#8888cc")
        style.configure("TCheckbutton", background="#1a1a2e", foreground="#e0e0e0",
                         font=("Segoe UI", 10))

        # Scrollable main
        canvas = tk.Canvas(self.root, bg="#1a1a2e", highlightthickness=0)
        scrollbar = ttk.Scrollbar(self.root, orient="vertical", command=canvas.yview)
        canvas.configure(yscrollcommand=scrollbar.set)
        scrollbar.pack(side="right", fill="y")
        canvas.pack(side="left", fill="both", expand=True)

        main = ttk.Frame(canvas, padding=16)
        canvas_window = canvas.create_window((0, 0), window=main, anchor="nw")
        main.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.bind("<Configure>", lambda e: canvas.itemconfig(canvas_window, width=e.width))
        canvas.bind_all("<MouseWheel>", lambda e: canvas.yview_scroll(int(-1 * (e.delta / 120)), "units"))

        # Status
        self.status_var = tk.StringVar(value="Connecting to Ollama...")
        ttk.Label(main, textvariable=self.status_var, style="Status.TLabel").pack(anchor="w", pady=(0, 4))

        # Header
        ttk.Label(main, text=f"Chat with {COMPANION_NAME}", style="Header.TLabel").pack(anchor="w", pady=(0, 2))
        ttk.Label(main, text="Type, talk, or trigger events. She responds with text and voice.",
                  style="Sub.TLabel").pack(anchor="w", pady=(0, 12))

        # ── Chat Log ──
        chat_frame = ttk.LabelFrame(main, text="Conversation", padding=8)
        chat_frame.pack(fill="both", expand=True, pady=(0, 10))

        self.chat_log = tk.Text(chat_frame, height=12, bg="#0f0f23", fg="#e0e0e0",
                                 insertbackground="#e0e0e0", font=("Consolas", 10),
                                 wrap="word", bd=0, padx=10, pady=8, state="disabled")
        self.chat_log.pack(fill="both", expand=True)

        self.chat_log.tag_configure("viewer", foreground="#4fc3f7", font=("Consolas", 10, "bold"))
        self.chat_log.tag_configure("streamer", foreground="#ff8a65", font=("Consolas", 10, "bold"))
        self.chat_log.tag_configure("vesper", foreground="#ce93d8", font=("Consolas", 10, "bold"))
        self.chat_log.tag_configure("system", foreground="#666688", font=("Consolas", 9, "italic"))
        self.chat_log.tag_configure("event", foreground="#ffd54f", font=("Consolas", 10, "bold"))

        # ── Mic Section ──
        mic_frame = ttk.LabelFrame(main, text="Microphone — Talk to Vesper", padding=8)
        mic_frame.pack(fill="x", pady=(0, 10))

        mic_row1 = ttk.Frame(mic_frame)
        mic_row1.pack(fill="x", pady=(0, 6))

        self.mic_btn = tk.Button(
            mic_row1, text="Hold to Talk", bg="#6c63ff", fg="white",
            font=("Segoe UI", 12, "bold"), bd=0, padx=20, pady=8,
            activebackground="#ff4081", activeforeground="white",
        )
        self.mic_btn.pack(side="left", padx=(0, 8))
        self.mic_btn.bind("<ButtonPress-1>", self._mic_start)
        self.mic_btn.bind("<ButtonRelease-1>", self._mic_stop)

        self.listen_btn = ttk.Button(mic_row1, text="Auto-Listen: OFF",
                                      command=self._toggle_auto_listen)
        self.listen_btn.pack(side="left", padx=(0, 12))

        ttk.Checkbutton(mic_row1, text="Auto-speak replies",
                         variable=self.auto_speak).pack(side="left", padx=(0, 12))

        ttk.Button(mic_row1, text="Stop Audio", command=lambda: sd.stop()).pack(side="left")

        # Mic device + level
        mic_row2 = ttk.Frame(mic_frame)
        mic_row2.pack(fill="x", pady=(0, 4))

        ttk.Label(mic_row2, text="Mic:").pack(side="left", padx=(0, 4))
        self.input_devices = get_input_devices()
        self.mic_device_var = tk.StringVar(
            value=self.input_devices[0] if self.input_devices else "")
        ttk.Combobox(mic_row2, textvariable=self.mic_device_var,
                     values=self.input_devices, state="readonly", width=35
                     ).pack(side="left", padx=(0, 12))

        ttk.Label(mic_row2, text="Speaker:").pack(side="left", padx=(0, 4))
        self.output_devices = get_output_devices()
        self.device_var = tk.StringVar(
            value=self.output_devices[0] if self.output_devices else "")
        ttk.Combobox(mic_row2, textvariable=self.device_var,
                     values=self.output_devices, state="readonly", width=35
                     ).pack(side="left")

        # Mic level meter
        self.level_canvas = tk.Canvas(mic_frame, height=12, bg="#0f0f23",
                                       highlightthickness=0)
        self.level_canvas.pack(fill="x", pady=(4, 2))
        self.level_bar = self.level_canvas.create_rectangle(0, 0, 0, 12, fill="#6c63ff")

        self.mic_status_var = tk.StringVar(value="Hold button to talk, or enable Auto-Listen")
        ttk.Label(mic_frame, textvariable=self.mic_status_var,
                  style="Sub.TLabel").pack(anchor="w")

        # ── Text Input Section ──
        input_frame = ttk.LabelFrame(main, text="Or type a message", padding=8)
        input_frame.pack(fill="x", pady=(0, 10))

        row1 = ttk.Frame(input_frame)
        row1.pack(fill="x", pady=(0, 6))

        ttk.Label(row1, text="Event:", font=("Segoe UI", 10, "bold")).pack(side="left", padx=(0, 6))
        self.event_var = tk.StringVar(value="Chat Message")
        event_combo = ttk.Combobox(row1, textvariable=self.event_var,
                                    values=list(EVENT_PRESETS.keys()),
                                    state="readonly", width=22)
        event_combo.pack(side="left", padx=(0, 12))
        event_combo.bind("<<ComboboxSelected>>", self._on_event_change)

        ttk.Label(row1, text="Username:", font=("Segoe UI", 10, "bold")).pack(side="left", padx=(0, 6))
        self.username_var = tk.StringVar(value=STREAMER_NAME)
        ttk.Entry(row1, textvariable=self.username_var, width=18,
                  font=("Segoe UI", 10)).pack(side="left")

        msg_row = ttk.Frame(input_frame)
        msg_row.pack(fill="x", pady=(0, 4))

        self.msg_input = tk.Text(msg_row, height=2, bg="#16213e", fg="#e0e0e0",
                                  insertbackground="#e0e0e0", font=("Segoe UI", 11),
                                  wrap="word", bd=0, padx=8, pady=6)
        self.msg_input.pack(side="left", fill="x", expand=True, padx=(0, 8))
        self.msg_input.insert("1.0", f"Hey {COMPANION_NAME}, what's up?")
        self.msg_input.bind("<Return>", self._on_enter)

        self.send_btn = ttk.Button(msg_row, text="Send", command=self._on_send,
                                    style="Send.TButton", state="disabled")
        self.send_btn.pack(side="right")

        # ── Voice Status ──
        voice_frame = ttk.LabelFrame(main, text="Voice Engine", padding=8)
        voice_frame.pack(fill="x", pady=(0, 10))

        voice_row = ttk.Frame(voice_frame)
        voice_row.pack(fill="x")

        self.speak_btn = ttk.Button(voice_row, text="Speak Last Response",
                                     command=self._on_speak, state="disabled")
        self.speak_btn.pack(side="left", padx=(0, 8))

        self.replay_btn = ttk.Button(voice_row, text="Replay Audio",
                                      command=self._on_replay, state="disabled")
        self.replay_btn.pack(side="left", padx=(0, 8))

        voice_status = "Loading voice model..." if enable_voice else "Voice disabled (--no-voice)"
        self.voice_status_var = tk.StringVar(value=voice_status)
        ttk.Label(voice_frame, textvariable=self.voice_status_var,
                  style="Sub.TLabel").pack(anchor="w", pady=(6, 0))

        # ── Quick Prompts ──
        quick_frame = ttk.LabelFrame(main, text="Quick prompts", padding=8)
        quick_frame.pack(fill="x", pady=(0, 4))

        prompts = [
            f"Hey {COMPANION_NAME}, you're so quiet today",
            f"{COMPANION_NAME} do you even like this game?",
            f"@{COMPANION_NAME} say something funny",
            "I've been streaming for 5 hours, I'm exhausted",
        ]
        prompt_row = ttk.Frame(quick_frame)
        prompt_row.pack(fill="x")
        for text in prompts:
            btn = tk.Button(prompt_row, text=f"{text[:45]}...", bg="#16213e", fg="#a0a0d0",
                            font=("Segoe UI", 8), bd=0, padx=6, pady=3, anchor="w",
                            command=lambda t=text: self._fill_prompt(t))
            btn.pack(side="left", padx=2, pady=2)

        # Initialize systems
        threading.Thread(target=self._init_ollama, daemon=True).start()
        threading.Thread(target=self._init_whisper, daemon=True).start()
        if enable_voice:
            threading.Thread(target=self._init_voice, daemon=True).start()

    # ── Init ──

    def _init_ollama(self):
        import urllib.request
        try:
            req = urllib.request.Request(f"{OLLAMA_URL}/api/tags")
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read())
                models = [m["name"] for m in data.get("models", [])]
                if LLM_MODEL in models:
                    self.ollama_ok = True
                    self.root.after(0, lambda: [
                        self.status_var.set(f"Ready! Ollama connected ({LLM_MODEL})"),
                        self.send_btn.configure(state="normal"),
                    ])
                    self._log_system(f"{COMPANION_NAME} is online. Brain: {LLM_MODEL} via Ollama.")
                else:
                    self.root.after(0, lambda: self.status_var.set(
                        f"Model '{LLM_MODEL}' not found. Available: {models}"))
        except Exception as e:
            err_msg = str(e)
            self.root.after(0, lambda: self.status_var.set(f"Ollama not reachable: {err_msg}"))

    def _init_whisper(self):
        try:
            self.root.after(0, lambda: self.mic_status_var.set(
                "Loading Whisper speech recognition..."))
            from faster_whisper import WhisperModel
            self.whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
            self.whisper_ready = True
            self.root.after(0, lambda: self.mic_status_var.set(
                "Mic ready! Hold button to talk, or enable Auto-Listen."))
        except Exception as e:
            self.root.after(0, lambda: self.mic_status_var.set(
                f"Whisper error: {e} — mic disabled"))

    def _init_voice(self):
        try:
            self.root.after(0, lambda: self.voice_status_var.set(
                "Loading CSM-1B voice model... (~30s)"))
            from voice_generator import load_csm_generator
            self.generator = load_csm_generator()
            self.last_sr = self.generator.sample_rate
            self.voice_ready = True
            self.root.after(0, lambda: [
                self.voice_status_var.set("Voice ready! Replies will auto-speak if enabled."),
                self.speak_btn.configure(state="normal"),
            ])
        except Exception as e:
            err_msg = str(e)
            self.root.after(0, lambda: self.voice_status_var.set(f"Voice error: {err_msg}"))

    # ── Logging ──

    def _log_system(self, text):
        def _do():
            self.chat_log.configure(state="normal")
            self.chat_log.insert("end", f"  {text}\n", "system")
            self.chat_log.configure(state="disabled")
            self.chat_log.see("end")
        self.root.after(0, _do)

    def _log_viewer(self, username, message):
        def _do():
            self.chat_log.configure(state="normal")
            self.chat_log.insert("end", f"\n  {username}", "viewer")
            self.chat_log.insert("end", f": {message}\n")
            self.chat_log.configure(state="disabled")
            self.chat_log.see("end")
        self.root.after(0, _do)

    def _log_streamer(self, message):
        def _do():
            self.chat_log.configure(state="normal")
            self.chat_log.insert("end", f"\n  You (mic)", "streamer")
            self.chat_log.insert("end", f": {message}\n")
            self.chat_log.configure(state="disabled")
            self.chat_log.see("end")
        self.root.after(0, _do)

    def _log_event(self, text):
        def _do():
            self.chat_log.configure(state="normal")
            self.chat_log.insert("end", f"\n  {text}\n", "event")
            self.chat_log.configure(state="disabled")
            self.chat_log.see("end")
        self.root.after(0, _do)

    def _log_vesper(self, text):
        def _do():
            self.chat_log.configure(state="normal")
            self.chat_log.insert("end", f"\n  {COMPANION_NAME}", "vesper")
            self.chat_log.insert("end", f": {text}\n")
            self.chat_log.configure(state="disabled")
            self.chat_log.see("end")
        self.root.after(0, _do)

    # ── Microphone ──

    def _mic_start(self, event=None):
        """Start recording from mic (push-to-talk)."""
        if not self.whisper_ready:
            return
        self.mic_listening = True
        self.mic_buffer = []
        self.mic_speech_detected = False
        self.mic_silence_counter = 0

        self.mic_btn.configure(bg="#ff4081", text="Listening...")
        self.mic_status_var.set("Listening... speak now!")

        mic_idx = get_device_index(self.mic_device_var.get(), output=False)

        def audio_callback(indata, frames, time_info, status):
            if not self.mic_listening:
                return
            audio_chunk = indata[:, 0].copy()
            self.mic_buffer.append(audio_chunk)

            # Update level meter
            rms = float(np.sqrt(np.mean(audio_chunk ** 2)))
            self.root.after(0, self._update_level, rms)

        try:
            self.mic_stream = sd.InputStream(
                samplerate=MIC_SAMPLE_RATE,
                channels=MIC_CHANNELS,
                dtype="float32",
                blocksize=int(MIC_SAMPLE_RATE * 0.1),  # 100ms chunks
                device=mic_idx,
                callback=audio_callback,
            )
            self.mic_stream.start()
        except Exception as e:
            self.mic_status_var.set(f"Mic error: {e}")
            self.mic_listening = False

    def _mic_stop(self, event=None):
        """Stop recording and transcribe (push-to-talk release)."""
        if not self.mic_listening:
            return
        self.mic_listening = False

        self.mic_btn.configure(bg="#6c63ff", text="Hold to Talk")

        if self.mic_stream:
            self.mic_stream.stop()
            self.mic_stream.close()
            self.mic_stream = None

        # Reset level meter
        self.level_canvas.coords(self.level_bar, 0, 0, 0, 12)

        if not self.mic_buffer:
            self.mic_status_var.set("No audio captured")
            return

        audio = np.concatenate(self.mic_buffer)
        duration = len(audio) / MIC_SAMPLE_RATE

        if duration < MIN_SPEECH_DURATION:
            self.mic_status_var.set(f"Too short ({duration:.1f}s) — hold longer")
            return

        self.mic_status_var.set(f"Transcribing {duration:.1f}s of audio...")
        threading.Thread(target=self._transcribe, args=(audio,), daemon=True).start()

    def _toggle_auto_listen(self):
        """Toggle auto-listen mode (continuous listening with silence detection)."""
        if self.mic_listening:
            # Stop auto-listen
            self.mic_listening = False
            if self.mic_stream:
                self.mic_stream.stop()
                self.mic_stream.close()
                self.mic_stream = None
            self.listen_btn.configure(text="Auto-Listen: OFF")
            self.mic_status_var.set("Auto-listen stopped")
            self.level_canvas.coords(self.level_bar, 0, 0, 0, 12)
            return

        if not self.whisper_ready:
            self.mic_status_var.set("Whisper not ready yet")
            return

        # Start auto-listen
        self.mic_listening = True
        self.mic_buffer = []
        self.mic_speech_detected = False
        self.mic_silence_counter = 0

        self.listen_btn.configure(text="Auto-Listen: ON")
        self.mic_status_var.set("Auto-listening... speak when ready")

        mic_idx = get_device_index(self.mic_device_var.get(), output=False)

        def audio_callback(indata, frames, time_info, status):
            if not self.mic_listening:
                return
            audio_chunk = indata[:, 0].copy()
            rms = float(np.sqrt(np.mean(audio_chunk ** 2)))

            self.root.after(0, self._update_level, rms)

            if rms > SILENCE_THRESHOLD:
                # Speech detected
                if not self.mic_speech_detected:
                    self.mic_speech_detected = True
                    self.root.after(0, lambda: self.mic_status_var.set(
                        "Hearing you... keep talking"))
                self.mic_buffer.append(audio_chunk)
                self.mic_silence_counter = 0
            elif self.mic_speech_detected:
                # Silence after speech
                self.mic_buffer.append(audio_chunk)
                self.mic_silence_counter += 1
                silence_secs = self.mic_silence_counter * 0.1  # 100ms chunks

                if silence_secs >= SILENCE_DURATION:
                    # Done speaking — transcribe
                    audio = np.concatenate(self.mic_buffer)
                    self.mic_buffer = []
                    self.mic_speech_detected = False
                    self.mic_silence_counter = 0

                    duration = len(audio) / MIC_SAMPLE_RATE
                    if duration >= MIN_SPEECH_DURATION:
                        self.root.after(0, lambda d=duration: self.mic_status_var.set(
                            f"Transcribing {d:.1f}s..."))
                        threading.Thread(target=self._transcribe,
                                         args=(audio,), daemon=True).start()

        try:
            self.mic_stream = sd.InputStream(
                samplerate=MIC_SAMPLE_RATE,
                channels=MIC_CHANNELS,
                dtype="float32",
                blocksize=int(MIC_SAMPLE_RATE * 0.1),
                device=mic_idx,
                callback=audio_callback,
            )
            self.mic_stream.start()
        except Exception as e:
            self.mic_status_var.set(f"Mic error: {e}")
            self.mic_listening = False
            self.listen_btn.configure(text="Auto-Listen: OFF")

    def _update_level(self, rms):
        """Update the mic level meter."""
        width = self.level_canvas.winfo_width()
        bar_width = min(width, int(rms * width * 8))  # scale for visibility
        color = "#ff4081" if rms > SILENCE_THRESHOLD else "#6c63ff"
        self.level_canvas.coords(self.level_bar, 0, 0, bar_width, 12)
        self.level_canvas.itemconfig(self.level_bar, fill=color)

    def _transcribe(self, audio):
        """Transcribe audio with faster-whisper."""
        try:
            import tempfile
            import soundfile as sf

            # Write to temp file (faster-whisper needs a file path)
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                tmp_path = f.name
                sf.write(f, audio, MIC_SAMPLE_RATE)

            segments, info = self.whisper_model.transcribe(
                tmp_path, language="en", beam_size=3, vad_filter=True,
            )
            text = " ".join(seg.text.strip() for seg in segments).strip()

            # Clean up temp file
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

            if not text or len(text) < 2:
                self.root.after(0, lambda: self.mic_status_var.set(
                    "Couldn't hear anything — try again"))
                return

            self.root.after(0, lambda: self.mic_status_var.set(
                f"You said: \"{text[:60]}...\"" if len(text) > 60 else f"You said: \"{text}\""))

            # Log it as streamer speech and send to Vesper
            self._log_streamer(text)
            user_prompt = f"The streamer said to you directly (voice): {text}"
            self.root.after(0, lambda: self.status_var.set("Vesper is thinking..."))
            self._call_ollama(user_prompt, auto_speak=self.auto_speak.get())

        except Exception as e:
            err_msg = str(e)
            self.root.after(0, lambda: self.mic_status_var.set(f"Transcription error: {err_msg}"))

    # ── Text Input ──

    def _fill_prompt(self, text):
        self.msg_input.delete("1.0", "end")
        self.msg_input.insert("1.0", text)

    def _on_event_change(self, event):
        preset = EVENT_PRESETS[self.event_var.get()]
        self.msg_input.delete("1.0", "end")
        if preset["type"] == "chat-message":
            self.msg_input.insert("1.0", f"Hey {COMPANION_NAME}, what's up?")
        else:
            self.msg_input.insert("1.0", "(event — no message needed)")

    def _on_enter(self, event):
        if event.state & 0x1:
            return
        self._on_send()
        return "break"

    def _on_send(self):
        if not self.ollama_ok:
            return

        message = self.msg_input.get("1.0", "end").strip()
        username = self.username_var.get().strip() or "viewer"
        event_label = self.event_var.get()
        preset = EVENT_PRESETS[event_label]

        if not message:
            return

        self.msg_input.delete("1.0", "end")
        self.send_btn.configure(state="disabled")
        self.status_var.set("Vesper is thinking...")

        if preset["type"] == "chat-message":
            self._log_viewer(username, message)
            user_prompt = f"{username} said in Twitch chat: {message}"
        elif preset["type"] == "new-follower":
            self._log_event(f"NEW FOLLOWER: {username}")
            user_prompt = f"[Stream event] {username} just followed the channel!"
        elif preset["type"] == "new-subscriber":
            tier = preset.get("amount", 1)
            self._log_event(f"NEW SUB: {username} (Tier {tier})")
            user_prompt = f"[Stream event] {username} just subscribed at tier {tier}!"
        elif preset["type"] == "raid":
            viewers = preset.get("amount", 50)
            self._log_event(f"RAID: {username} with {viewers} viewers!")
            user_prompt = f"[Stream event] {username} is raiding with {viewers} viewers!"
        else:
            self._log_viewer(username, message)
            user_prompt = f"{username}: {message}"

        threading.Thread(target=self._call_ollama, args=(user_prompt,), daemon=True).start()

    # ── Ollama ──

    def _call_ollama(self, user_prompt, auto_speak=False):
        import urllib.request

        self.conversation.append({"role": "user", "content": user_prompt})
        if len(self.conversation) > 20:
            self.conversation = self.conversation[-20:]

        system = SYSTEM_PROMPT.format(
            name=COMPANION_NAME,
            streamer=STREAMER_NAME,
            preset_description=PERSONALITY_PRESETS.get(PERSONALITY_PRESET, PERSONALITY_PRESETS["snarky"]),
            mood=self.mood,
        )

        messages = [{"role": "system", "content": system}] + self.conversation

        payload = json.dumps({
            "model": LLM_MODEL,
            "messages": messages,
            "stream": False,
            "options": {
                "num_predict": 120,
                "temperature": 0.85,
                "top_p": 0.9,
            },
        }).encode()

        try:
            req = urllib.request.Request(
                f"{OLLAMA_URL}/api/chat",
                data=payload,
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())
                reply = data.get("message", {}).get("content", "").strip()

                if reply:
                    self.conversation.append({"role": "assistant", "content": reply})
                    self._log_vesper(reply)
                    self.last_reply = reply

                    eval_count = data.get("eval_count", 0)
                    eval_dur = data.get("eval_duration", 1) / 1e9
                    speed = eval_count / eval_dur if eval_dur > 0 else 0

                    self.root.after(0, lambda: [
                        self.status_var.set(
                            f"Done! {eval_count} tokens in {eval_dur:.1f}s ({speed:.0f} tok/s)"),
                        self.send_btn.configure(state="normal"),
                        self.speak_btn.configure(state="normal" if self.voice_ready else "disabled"),
                    ])

                    # Auto-speak if enabled and voice ready
                    if auto_speak and self.voice_ready:
                        self._log_system("Generating voice...")
                        self.root.after(0, lambda: self.voice_status_var.set(
                            "Generating voice..."))
                        self._generate_voice(reply)
                else:
                    self.root.after(0, lambda: [
                        self.status_var.set("Ollama returned empty response"),
                        self.send_btn.configure(state="normal"),
                    ])

        except Exception as e:
            self.root.after(0, lambda: [
                self.status_var.set(f"Ollama error: {e}"),
                self.send_btn.configure(state="normal"),
            ])

    # ── Voice Generation ──

    def _on_speak(self):
        if not self.voice_ready or not hasattr(self, "last_reply"):
            return
        self.speak_btn.configure(state="disabled")
        self.voice_status_var.set("Generating voice... (30-120s on CPU)")
        self._log_system("Generating voice...")
        threading.Thread(target=self._generate_voice, args=(self.last_reply,), daemon=True).start()

    def _generate_voice(self, text):
        import random
        from voice import preprocess_text, VOICE_DEFAULTS, MOOD_VOICE_MAP
        from voice_generator import load_reference_clips, build_context

        try:
            processed = preprocess_text(text)

            speaker = VOICE_DEFAULTS["speaker"]
            max_refs = VOICE_DEFAULTS["max_refs"]
            all_refs = load_reference_clips(speaker, limit=999)
            if len(all_refs) > max_refs:
                refs = random.sample(all_refs, max_refs)
            else:
                refs = all_refs
            context = build_context(refs)

            params = MOOD_VOICE_MAP.get("warm", MOOD_VOICE_MAP["neutral"])

            t0 = time.time()
            audio = self.generator.generate(
                text=processed,
                speaker=VOICE_DEFAULTS["speaker_id"],
                context=context,
                max_audio_length_ms=VOICE_DEFAULTS["max_audio_length_ms"],
                temperature=params["temperature"],
                topk=params["topk"],
            )
            elapsed = time.time() - t0

            self.last_audio = audio.cpu().numpy().astype(np.float32)
            self.last_sr = self.generator.sample_rate
            duration = len(self.last_audio) / self.last_sr

            dev_idx = get_device_index(self.device_var.get())
            sd.play(self.last_audio, samplerate=self.last_sr, device=dev_idx)

            self._log_system(f"Voice: {duration:.1f}s audio in {elapsed:.0f}s")
            self.root.after(0, lambda: [
                self.voice_status_var.set(
                    f"Playing! {duration:.1f}s in {elapsed:.0f}s"),
                self.speak_btn.configure(state="normal"),
                self.replay_btn.configure(state="normal"),
            ])

        except Exception as e:
            self.root.after(0, lambda: [
                self.voice_status_var.set(f"Voice error: {e}"),
                self.speak_btn.configure(state="normal"),
            ])

    def _on_replay(self):
        if self.last_audio is None:
            return
        dev_idx = get_device_index(self.device_var.get())
        sd.play(self.last_audio, samplerate=self.last_sr, device=dev_idx)
        self.voice_status_var.set("Replaying...")

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=f"Chat with {COMPANION_NAME}")
    parser.add_argument("--no-voice", action="store_true",
                        help="Skip voice model loading (text only)")
    args = parser.parse_args()

    ChatTestUI(enable_voice=not args.no_voice).run()
