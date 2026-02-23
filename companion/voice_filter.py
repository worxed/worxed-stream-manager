"""Voice Filter — automatically remove male voices from reference clips.

Uses pitch (F0) analysis to separate male/female voice clips.
Male voices: 85-170 Hz, Female voices: 165-255 Hz.

Usage:
    # Filter aubrey clips (moves male voices to rejected/)
    python voice_filter.py --speaker aubrey

    # Preview only (don't move files)
    python voice_filter.py --speaker aubrey --dry-run

    # Custom threshold
    python voice_filter.py --speaker aubrey --threshold 160

    # Filter all speakers
    python voice_filter.py --all
"""

import sys
import os
import json
import argparse
import shutil
from pathlib import Path

os.environ["NO_TORCH_COMPILE"] = "1"

VOICES_DIR = Path(__file__).parent / "voices"
REFERENCE_DIR = VOICES_DIR / "reference"


def analyze_pitch(wav_path: str, sr: int = 24000) -> dict:
    """Analyze fundamental frequency of an audio clip."""
    import librosa
    import numpy as np

    y, file_sr = librosa.load(wav_path, sr=sr)

    # Extract F0 using pyin (probabilistic YIN) — good for speech
    f0, voiced_flag, voiced_probs = librosa.pyin(
        y, fmin=60, fmax=400, sr=sr
    )

    # Only consider voiced frames
    voiced_f0 = f0[voiced_flag]

    if len(voiced_f0) == 0:
        return {"mean_f0": 0, "median_f0": 0, "voiced_ratio": 0, "classification": "silence"}

    mean_f0 = float(np.mean(voiced_f0))
    median_f0 = float(np.median(voiced_f0))
    voiced_ratio = float(np.sum(voiced_flag) / len(voiced_flag))

    return {
        "mean_f0": mean_f0,
        "median_f0": median_f0,
        "voiced_ratio": voiced_ratio,
    }


def classify_voice(pitch_info: dict, threshold: float = 165.0) -> str:
    """Classify a clip as male, female, or ambiguous based on pitch."""
    median = pitch_info["median_f0"]

    if median == 0:
        return "silence"
    elif median < threshold:
        return "male"
    elif median < threshold + 15:
        return "ambiguous"
    else:
        return "female"


def filter_speaker(speaker: str, threshold: float = 165.0, dry_run: bool = False):
    """Filter clips for a speaker, moving male voices to rejected/."""
    speaker_dir = REFERENCE_DIR / speaker
    if not speaker_dir.exists():
        print(f"Speaker directory not found: {speaker_dir}")
        return

    rejected_dir = speaker_dir / "rejected"
    if not dry_run:
        rejected_dir.mkdir(exist_ok=True)

    json_files = sorted(speaker_dir.glob("*.json"))
    if not json_files:
        print(f"No clips found for {speaker}")
        return

    print(f"\nAnalyzing {len(json_files)} clips for '{speaker}' (threshold: {threshold} Hz)")
    print("=" * 70)

    stats = {"female": 0, "male": 0, "ambiguous": 0, "silence": 0}
    results = []

    for i, meta_path in enumerate(json_files):
        meta = json.loads(meta_path.read_text())
        wav_path = speaker_dir / meta["wav_file"]

        if not wav_path.exists():
            continue

        pitch_info = analyze_pitch(str(wav_path))
        classification = classify_voice(pitch_info, threshold)
        stats[classification] += 1

        text_preview = meta["text"][:50] + "..." if len(meta["text"]) > 50 else meta["text"]
        marker = {"female": "+", "male": "X", "ambiguous": "?", "silence": "-"}[classification]

        results.append({
            "meta_path": meta_path,
            "wav_path": wav_path,
            "classification": classification,
            "pitch": pitch_info,
            "text": meta["text"],
        })

        # Progress every 20 clips
        if (i + 1) % 20 == 0 or i == len(json_files) - 1:
            print(f"  [{i+1}/{len(json_files)}] Analyzed... "
                  f"(F:{stats['female']} M:{stats['male']} ?:{stats['ambiguous']})")

    print(f"\n  Results:")
    print(f"    Female (kept):     {stats['female']}")
    print(f"    Male (rejected):   {stats['male']}")
    print(f"    Ambiguous:         {stats['ambiguous']}")
    print(f"    Silence:           {stats['silence']}")

    # Show some examples of rejected clips
    rejected = [r for r in results if r["classification"] == "male"]
    if rejected:
        print(f"\n  Sample rejected clips (male voice):")
        for r in rejected[:5]:
            print(f"    [{r['pitch']['median_f0']:.0f} Hz] \"{r['text'][:60]}...\"")

    ambiguous = [r for r in results if r["classification"] == "ambiguous"]
    if ambiguous:
        print(f"\n  Ambiguous clips ({threshold}-{threshold+15} Hz range):")
        for r in ambiguous[:5]:
            print(f"    [{r['pitch']['median_f0']:.0f} Hz] \"{r['text'][:60]}...\"")

    if dry_run:
        print(f"\n  DRY RUN — no files moved. Run without --dry-run to filter.")
        return stats

    # Move rejected files
    moved = 0
    for r in results:
        if r["classification"] == "male":
            meta_path = r["meta_path"]
            wav_path = r["wav_path"]

            shutil.move(str(wav_path), str(rejected_dir / wav_path.name))
            shutil.move(str(meta_path), str(rejected_dir / meta_path.name))
            moved += 1

    print(f"\n  Moved {moved} male voice clips to {rejected_dir}")
    print(f"  Kept {stats['female'] + stats['ambiguous']} clips")

    return stats


def main():
    parser = argparse.ArgumentParser(description="Voice Reference Filter — remove male voices")
    parser.add_argument("--speaker", type=str, help="Speaker to filter (aubrey/sadie)")
    parser.add_argument("--all", action="store_true", help="Filter all speakers")
    parser.add_argument("--threshold", type=float, default=165.0,
                        help="F0 threshold in Hz (below = male, default 165)")
    parser.add_argument("--dry-run", action="store_true", help="Preview only, don't move files")
    args = parser.parse_args()

    if args.all:
        for speaker_dir in sorted(REFERENCE_DIR.iterdir()):
            if speaker_dir.is_dir() and speaker_dir.name != "rejected":
                filter_speaker(speaker_dir.name, args.threshold, args.dry_run)
    elif args.speaker:
        filter_speaker(args.speaker, args.threshold, args.dry_run)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
