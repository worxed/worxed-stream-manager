"""A/B test: compare golden clips and exaggeration levels."""
import perth
from perth.dummy_watermarker import DummyWatermarker
perth.PerthImplicitWatermarker = DummyWatermarker

import torch, time, os, numpy as np, soundfile as sf
from chatterbox.tts import ChatterboxTTS

print("Loading model...")
model = ChatterboxTTS.from_pretrained(device="cuda")
print(f"Model loaded! SR={model.sr}")
os.makedirs("voices/live/ab_test", exist_ok=True)

text = "Oh please, like I was worried about you. I was just reorganizing my server rack while you were gone."

configs = [
    ("old_golden_exag05", "voices/golden/warm/golden_warm_20260212_010323.wav", 0.5),
    ("old_golden_exag07", "voices/golden/warm/golden_warm_20260212_010323.wav", 0.7),
    ("composite_exag05",  "voices/golden/warm/golden_warm_composite_expressive.wav", 0.5),
    ("composite_exag07",  "voices/golden/warm/golden_warm_composite_expressive.wav", 0.7),
    ("composite_exag085", "voices/golden/warm/golden_warm_composite_expressive.wav", 0.85),
]

for name, golden, exag in configs:
    print(f"GEN: {name} (exag={exag})")
    t0 = time.time()
    wav = model.generate(text, audio_prompt_path=golden, exaggeration=exag)
    elapsed = time.time() - t0
    audio = wav.squeeze().cpu().numpy()
    duration = len(audio) / model.sr
    out = f"voices/live/ab_test/{name}.wav"
    sf.write(out, audio, model.sr)
    print(f"  OK: {duration:.1f}s in {elapsed:.1f}s")

del model
torch.cuda.empty_cache()
print("ALL DONE")
