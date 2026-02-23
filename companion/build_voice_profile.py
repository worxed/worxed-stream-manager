"""Build averaged speaker embedding from all training clips.

This creates a 'trained' voice profile by extracting speaker embeddings
from every clip and averaging them. The result is a more stable voice
identity than any single reference clip can provide.
"""

import perth
from perth.dummy_watermarker import DummyWatermarker
if perth.PerthImplicitWatermarker is None:
    perth.PerthImplicitWatermarker = DummyWatermarker

import json
import sys
import time
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf
import torch

from chatterbox.tts import ChatterboxTTS
from chatterbox.models.s3gen import S3GEN_SR
from chatterbox.models.s3tokenizer import S3_SR
from chatterbox.models.t3.modules.cond_enc import T3Cond


def main():
    print("Loading Chatterbox model...")
    model = ChatterboxTTS.from_pretrained(device="cuda")
    print(f"Model loaded! SR={model.sr}")

    # Collect clips from all speakers
    training_root = Path("voices/training")
    wavs = []
    for speaker_dir in sorted(training_root.iterdir()):
        if speaker_dir.is_dir():
            speaker_wavs = sorted(speaker_dir.glob("*.wav"))
            print(f"  {speaker_dir.name}: {len(speaker_wavs)} clips")
            wavs.extend(speaker_wavs)
    print(f"Found {len(wavs)} total training clips")

    # --- Extract speaker embeddings from all clips ---
    embeddings = []
    durations = []
    failed = 0
    t0 = time.time()

    for i, wav_path in enumerate(wavs):
        try:
            audio, sr = sf.read(str(wav_path))
            if len(audio.shape) > 1:
                audio = audio.mean(axis=1)
            dur = len(audio) / sr
            if dur < 1.0:
                continue

            # Resample to 16kHz for the voice encoder (must be float32)
            if sr != S3_SR:
                audio_16k = librosa.resample(audio.astype(np.float32), orig_sr=sr, target_sr=S3_SR)
            else:
                audio_16k = audio.astype(np.float32)

            # Truncate to 6s max (encoder condition length)
            audio_16k = audio_16k[: 6 * S3_SR]

            emb = model.ve.embeds_from_wavs([audio_16k], sample_rate=S3_SR)
            embeddings.append(emb)
            durations.append(dur)

            if (i + 1) % 50 == 0:
                print(f"  Processed {i + 1}/{len(wavs)} clips...")

        except Exception as e:
            failed += 1
            if failed <= 3:
                print(f"  Failed on {wav_path.name}: {e}")
            continue

    elapsed = time.time() - t0
    print(f"Extracted {len(embeddings)} embeddings in {elapsed:.1f}s ({failed} failed)")

    if not embeddings:
        print("ERROR: No embeddings extracted!")
        sys.exit(1)

    # --- Average all embeddings ---
    all_embs = np.concatenate(embeddings, axis=0)
    avg_emb = all_embs.mean(axis=0, keepdims=True)
    print(f"Averaged embedding shape: {avg_emb.shape}")
    print(f"Total audio used: {sum(durations):.0f}s ({sum(durations) / 60:.1f} min)")

    # --- Save the voice profile ---
    out_dir = Path("voices/golden/vesper_trained")
    out_dir.mkdir(parents=True, exist_ok=True)
    np.save(str(out_dir / "speaker_embedding.npy"), avg_emb)

    meta = {
        "clips_used": len(embeddings),
        "total_audio_seconds": round(sum(durations), 1),
        "embedding_shape": list(avg_emb.shape),
        "source": "voices/training/* (all speakers)",
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "model": "chatterbox-turbo",
    }
    (out_dir / "meta.json").write_text(json.dumps(meta, indent=2))
    print(f"Saved voice profile to {out_dir}/")

    # --- Test: generate with the averaged embedding ---
    print()
    print("=== Testing averaged embedding ===")

    # Use composite for acoustic conditioning, override speaker embedding
    ref_path = "voices/golden/warm/golden_warm_composite_expressive.wav"
    model.prepare_conditionals(ref_path, exaggeration=0.7)

    # Override with averaged embedding
    avg_tensor = torch.from_numpy(avg_emb).to(model.device)
    old_cond = model.conds.t3
    model.conds.t3 = T3Cond(
        speaker_emb=avg_tensor,
        cond_prompt_speech_tokens=old_cond.cond_prompt_speech_tokens,
        emotion_adv=old_cond.emotion_adv,
    ).to(device=model.device)

    text = "Oh please, like I was worried about you. I was just reorganizing my server rack while you were gone."

    for exag in [0.5, 0.7, 0.85]:
        model.conds.t3 = T3Cond(
            speaker_emb=avg_tensor,
            cond_prompt_speech_tokens=old_cond.cond_prompt_speech_tokens,
            emotion_adv=exag * torch.ones(1, 1, 1),
        ).to(device=model.device)

        print(f"Generating with averaged embedding (exag={exag})...")
        t0 = time.time()
        wav = model.generate(text, exaggeration=exag)
        elapsed = time.time() - t0
        audio_np = wav.squeeze().cpu().numpy()
        duration = len(audio_np) / model.sr

        out_dir_live = Path("voices/live/ab_test")
        out_dir_live.mkdir(parents=True, exist_ok=True)
        out = out_dir_live / f"trained_avg_exag{str(exag).replace('.', '')}.wav"
        sf.write(str(out), audio_np, model.sr)
        print(f"  {duration:.1f}s audio in {elapsed:.1f}s -> {out.name}")

    del model
    torch.cuda.empty_cache()
    print()
    print("DONE! Compare trained_avg_* files against the zero-shot ones in voices/live/ab_test/")


if __name__ == "__main__":
    main()
