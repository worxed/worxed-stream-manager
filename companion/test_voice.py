"""Quick test: generate a WAV clip with Sesame CSM on CPU and play it."""

import sys
import os
import time
import json
import argparse

os.environ["NO_TORCH_COMPILE"] = "1"

# Add CSM repo to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "csm"))

import torch
import numpy as np
import sounddevice as sd
import soundfile as sf
from huggingface_hub import hf_hub_download

# --- CLI args ---
parser = argparse.ArgumentParser(description="Schnukums voice test")
parser.add_argument("--list-devices", action="store_true", help="List audio output devices and exit")
parser.add_argument("--device", type=int, default=None, help="Output device ID (from --list-devices)")
parser.add_argument("--text", type=str, default="Hey chat, it's your girl Schnukums. I see you lurking.", help="Text to speak")
parser.add_argument("--speaker", type=int, default=0, help="Speaker ID (0-9)")
parser.add_argument("--no-play", action="store_true", help="Save WAV only, don't play audio")
args = parser.parse_args()

# --- List devices mode ---
if args.list_devices:
    print("Available audio OUTPUT devices:")
    print("-" * 60)
    devices = sd.query_devices()
    for i, d in enumerate(devices):
        if d["max_output_channels"] > 0:
            default = " (DEFAULT)" if i == sd.default.device[1] else ""
            print(f"  [{i:2d}] {d['name']}{default}")
    print()
    print(f"Use: python test_voice.py --device <ID>")
    sys.exit(0)

print(f"PyTorch: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"Device: cpu")
if args.device is not None:
    dev_info = sd.query_devices(args.device)
    print(f"Audio output: [{args.device}] {dev_info['name']}")
else:
    print(f"Audio output: system default")
print()

# --- Manual model loading (works with any huggingface_hub version) ---

print("Downloading Sesame CSM-1B model weights...")
t0 = time.time()

from models import Model, ModelArgs
import generator as gen_module
from generator import Generator

# Patch tokenizer to use ungated mirror (meta-llama/Llama-3.2-1B is gated)
_orig_load_tokenizer = gen_module.load_llama3_tokenizer
def _load_tokenizer_ungated():
    from transformers import AutoTokenizer
    from tokenizers.processors import TemplateProcessing
    tokenizer = AutoTokenizer.from_pretrained("unsloth/Llama-3.2-1B")
    bos, eos = tokenizer.bos_token, tokenizer.eos_token
    tokenizer._tokenizer.post_processor = TemplateProcessing(
        single=f"{bos}:0 $A:0 {eos}:0",
        pair=f"{bos}:0 $A:0 {eos}:0 {bos}:1 $B:1 {eos}:1",
        special_tokens=[(bos, tokenizer.bos_token_id), (eos, tokenizer.eos_token_id)],
    )
    return tokenizer
gen_module.load_llama3_tokenizer = _load_tokenizer_ungated
print("Using ungated tokenizer mirror (unsloth/Llama-3.2-1B)")

# Download config and weights
config_path = hf_hub_download("sesame/csm-1b", "config.json")
weights_path = hf_hub_download("sesame/csm-1b", "model.safetensors")

print(f"Downloaded in {time.time() - t0:.1f}s")

# Load config (filter to only ModelArgs fields)
with open(config_path) as f:
    raw = json.load(f)
import dataclasses
valid_fields = {f.name for f in dataclasses.fields(ModelArgs)}
config = ModelArgs(**{k: v for k, v in raw.items() if k in valid_fields})

# Build model on CPU with float32 (bfloat16 can be problematic on CPU)
print("Loading model onto CPU (float32)...")
t1 = time.time()
model = Model(config)

from safetensors.torch import load_file
state_dict = load_file(weights_path)
model.load_state_dict(state_dict)
model.to(device="cpu", dtype=torch.float32)

generator = Generator(model)
print(f"Model loaded in {time.time() - t1:.1f}s")
print(f"Sample rate: {generator.sample_rate} Hz")
print()

# --- Generate ---

print(f'Generating: "{args.text}"')
print("(CPU inference — this will take a few minutes, go grab a drink...)")
print()

t2 = time.time()
audio = generator.generate(
    text=args.text,
    speaker=args.speaker,
    context=[],
    max_audio_length_ms=10_000,
)
elapsed = time.time() - t2

# Convert to numpy
audio_np = audio.cpu().numpy().astype(np.float32)
duration = len(audio_np) / generator.sample_rate
print(f"Generated in {elapsed:.1f}s ({duration:.1f}s of audio)")

# Save WAV using soundfile (no torchcodec needed)
out_path = os.path.join(os.path.dirname(__file__), "schnukums_test.wav")
sf.write(out_path, audio_np, generator.sample_rate)
print(f"Saved to: {out_path}")

# Play through selected device
if not args.no_play:
    print(f"Playing audio...")
    sd.play(audio_np, samplerate=generator.sample_rate, device=args.device)
    sd.wait()
    print("Done!")
else:
    print("Done! Open the WAV file to hear Schnukums.")
