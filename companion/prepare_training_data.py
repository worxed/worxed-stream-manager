"""Prepare voice training data for GPT-SoVITS from existing reference clips.

Converts the Aubrey/Sadie reference clips (wav + json) into the format
GPT-SoVITS expects for training:
  - Speaker directories with wav files
  - .lab annotation files (transcripts)
  - A master .list file with paths + transcripts

Usage:
    python prepare_training_data.py                     # all speakers
    python prepare_training_data.py --speaker sadie     # just sadie
    python prepare_training_data.py --speaker aubrey    # just aubrey
    python prepare_training_data.py --mix vesper     # merge both as "vesper"

Output goes to: voices/training/<speaker>/
"""

import argparse
import json
import shutil
import sys
from pathlib import Path

REFERENCE_DIR = Path(__file__).parent / "voices" / "reference"
TRAINING_DIR = Path(__file__).parent / "voices" / "training"


def load_clips(speaker: str) -> list[dict]:
    """Load all clip metadata for a speaker."""
    speaker_dir = REFERENCE_DIR / speaker
    if not speaker_dir.exists():
        print(f"Error: No reference clips found at {speaker_dir}")
        return []

    clips = []
    for json_path in sorted(speaker_dir.glob("*.json")):
        wav_path = json_path.with_suffix(".wav")
        if not wav_path.exists():
            continue

        with open(json_path) as f:
            meta = json.load(f)

        clips.append({
            "json_path": json_path,
            "wav_path": wav_path,
            "text": meta.get("text", "").strip(),
            "duration": meta.get("duration", 0),
            "speaker": meta.get("speaker", speaker),
        })

    return clips


def prepare_speaker(speaker: str, output_name: str | None = None) -> int:
    """Prepare training data for one speaker."""
    clips = load_clips(speaker)
    if not clips:
        return 0

    out_name = output_name or speaker
    out_dir = TRAINING_DIR / out_name
    out_dir.mkdir(parents=True, exist_ok=True)

    count = 0
    skipped = 0
    list_lines = []

    for clip in clips:
        text = clip["text"]
        if not text or len(text) < 3:
            skipped += 1
            continue

        # Skip very short clips (< 1s) or very long (> 20s)
        if clip["duration"] < 1.0 or clip["duration"] > 20.0:
            skipped += 1
            continue

        wav_name = clip["wav_path"].name
        out_wav = out_dir / wav_name
        out_lab = out_dir / clip["wav_path"].stem + ".lab" if False else out_dir / (clip["wav_path"].stem + ".lab")

        # Copy wav
        if not out_wav.exists():
            shutil.copy2(clip["wav_path"], out_wav)

        # Write transcript .lab file
        out_lab.write_text(text, encoding="utf-8")

        # Add to master list (format: wav_path|speaker|language|text)
        list_lines.append(f"{out_wav.as_posix()}|{out_name}|en|{text}")
        count += 1

    # Write master list file
    list_path = TRAINING_DIR / f"{out_name}.list"
    list_path.write_text("\n".join(list_lines) + "\n", encoding="utf-8")

    print(f"  {out_name}: {count} clips prepared, {skipped} skipped")
    print(f"  Output: {out_dir}")
    print(f"  List:   {list_path}")

    return count


def prepare_mix(output_name: str = "vesper") -> int:
    """Merge all speakers into one training set."""
    out_dir = TRAINING_DIR / output_name
    out_dir.mkdir(parents=True, exist_ok=True)

    all_lines = []
    total = 0

    for speaker_dir in sorted(REFERENCE_DIR.iterdir()):
        if not speaker_dir.is_dir():
            continue

        speaker = speaker_dir.name
        clips = load_clips(speaker)

        for clip in clips:
            text = clip["text"]
            if not text or len(text) < 3:
                continue
            if clip["duration"] < 1.0 or clip["duration"] > 20.0:
                continue

            wav_name = f"{speaker}_{clip['wav_path'].name}"
            out_wav = out_dir / wav_name
            out_lab = out_dir / (Path(wav_name).stem + ".lab")

            if not out_wav.exists():
                shutil.copy2(clip["wav_path"], out_wav)

            out_lab.write_text(text, encoding="utf-8")
            all_lines.append(f"{out_wav.as_posix()}|{output_name}|en|{text}")
            total += 1

    list_path = TRAINING_DIR / f"{output_name}.list"
    list_path.write_text("\n".join(all_lines) + "\n", encoding="utf-8")

    print(f"  {output_name} (mixed): {total} clips prepared")
    print(f"  Output: {out_dir}")
    print(f"  List:   {list_path}")

    return total


def main():
    parser = argparse.ArgumentParser(description="Prepare voice training data for GPT-SoVITS")
    parser.add_argument("--speaker", type=str, help="Prepare only this speaker (sadie, aubrey)")
    parser.add_argument("--mix", type=str, nargs="?", const="vesper",
                        help="Merge all speakers into one set (default name: vesper)")
    args = parser.parse_args()

    print("=== Voice Training Data Preparation ===")
    print(f"Source:  {REFERENCE_DIR}")
    print(f"Output:  {TRAINING_DIR}")
    print()

    if args.mix:
        prepare_mix(args.mix)
    elif args.speaker:
        prepare_speaker(args.speaker)
    else:
        # Prepare all speakers individually
        for speaker_dir in sorted(REFERENCE_DIR.iterdir()):
            if speaker_dir.is_dir():
                prepare_speaker(speaker_dir.name)

    # Also generate a combined list
    all_lists = list(TRAINING_DIR.glob("*.list"))
    if len(all_lists) > 1:
        combined = []
        for lp in all_lists:
            if lp.stem != "all":
                combined.extend(lp.read_text(encoding="utf-8").strip().split("\n"))
        all_path = TRAINING_DIR / "all.list"
        all_path.write_text("\n".join(combined) + "\n", encoding="utf-8")
        print(f"\n  Combined list: {all_path} ({len(combined)} total clips)")

    print("\nDone! Training data ready for GPT-SoVITS.")


if __name__ == "__main__":
    main()
