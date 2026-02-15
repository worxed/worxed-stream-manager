"""Voice Reference Collector — extract dialogue clips for CSM-1B context.

Usage:
    # From YouTube (extracts dialogue segments)
    python voice_collector.py --url "https://youtube.com/watch?v=..." --speaker aubrey

    # From local audio/video file
    python voice_collector.py --file interview.mp4 --speaker sadie

    # List collected references
    python voice_collector.py --list

What it does:
    1. Downloads audio from YouTube (or reads local file)
    2. Transcribes with Whisper to find dialogue segments
    3. Splits into clean clips with text + audio pairs
    4. Saves as CSM-ready reference files in voices/reference/{speaker}/
"""

import sys
import os
import json
import argparse
import time
import shutil
from pathlib import Path

os.environ["NO_TORCH_COMPILE"] = "1"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "csm"))


def _ensure_ffmpeg():
    """Add ffmpeg to PATH if installed via winget but shell not restarted."""
    if shutil.which("ffmpeg"):
        return
    # Winget installs to this path on Windows
    winget_base = Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "WinGet" / "Packages"
    if winget_base.exists():
        for pkg_dir in winget_base.iterdir():
            if "FFmpeg" in pkg_dir.name:
                for bin_dir in pkg_dir.rglob("bin"):
                    if (bin_dir / "ffmpeg.exe").exists():
                        os.environ["PATH"] = str(bin_dir) + os.pathsep + os.environ.get("PATH", "")
                        return


_ensure_ffmpeg()

VOICES_DIR = Path(__file__).parent / "voices"
REFERENCE_DIR = VOICES_DIR / "reference"


def download_audio(url: str, output_dir: Path) -> Path:
    """Download audio from YouTube URL using yt-dlp."""
    import yt_dlp

    output_path = output_dir / "download_%(id)s.%(ext)s"
    ydl_opts = {
        "format": "bestaudio/best",
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "wav",
            "preferredquality": "192",
        }],
        "outtmpl": str(output_path),
        "quiet": True,
        "no_warnings": True,
    }

    print(f"Downloading audio from: {url}")
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        video_id = info["id"]
        title = info.get("title", "unknown")

    # Find the downloaded file
    for f in output_dir.glob(f"download_{video_id}.*"):
        print(f"Downloaded: {title} -> {f.name}")
        return f

    raise FileNotFoundError("Download completed but output file not found")


def transcribe_audio(audio_path: Path) -> list[dict]:
    """Transcribe audio using faster-whisper and return segments."""
    from faster_whisper import WhisperModel

    print(f"Transcribing: {audio_path.name}")
    print("Loading Whisper model (first time downloads ~1GB)...")

    model = WhisperModel("base.en", device="cpu", compute_type="int8")
    segments, info = model.transcribe(str(audio_path), word_timestamps=True)

    results = []
    for seg in segments:
        results.append({
            "start": seg.start,
            "end": seg.end,
            "text": seg.text.strip(),
            "words": [{"word": w.word, "start": w.start, "end": w.end} for w in seg.words] if seg.words else [],
        })

    print(f"Found {len(results)} segments ({info.language}, {info.duration:.1f}s total)")
    return results


def extract_clips(audio_path: Path, segments: list[dict], speaker: str,
                   min_duration: float = 1.5, max_duration: float = 15.0,
                   target_sample_rate: int = 24000) -> list[dict]:
    """Extract clean dialogue clips from transcribed segments."""
    import torch
    import numpy as np
    import soundfile as sf

    print(f"Extracting clips (min {min_duration}s, max {max_duration}s)...")

    # Use soundfile instead of torchaudio (avoids torchcodec dependency)
    audio_np, sr = sf.read(str(audio_path), dtype="float32")
    # Convert to mono if stereo
    if audio_np.ndim > 1:
        audio_np = audio_np.mean(axis=1)
    # Resample to CSM target rate if needed
    if sr != target_sample_rate:
        import torchaudio
        waveform = torch.from_numpy(audio_np).unsqueeze(0)
        waveform = torchaudio.functional.resample(waveform, sr, target_sample_rate)
        waveform = waveform.squeeze(0)
    else:
        waveform = torch.from_numpy(audio_np)

    output_dir = REFERENCE_DIR / speaker
    output_dir.mkdir(parents=True, exist_ok=True)

    clips = []
    clip_idx = 0

    for seg in segments:
        duration = seg["end"] - seg["start"]
        text = seg["text"]

        # Filter: skip too short, too long, or non-speech
        if duration < min_duration or duration > max_duration:
            continue
        if len(text.split()) < 3:
            continue

        # Extract audio segment
        start_sample = int(seg["start"] * target_sample_rate)
        end_sample = int(seg["end"] * target_sample_rate)
        clip_audio = waveform[start_sample:end_sample]

        # Skip very quiet segments (likely silence/noise)
        if clip_audio.abs().max() < 0.01:
            continue

        # Normalize audio level
        peak = clip_audio.abs().max()
        if peak > 0:
            clip_audio = clip_audio * (0.9 / peak)

        # Save clip
        timestamp = int(time.time())
        clip_name = f"{speaker}_{timestamp}_{clip_idx:03d}"
        wav_path = output_dir / f"{clip_name}.wav"
        meta_path = output_dir / f"{clip_name}.json"

        sf.write(str(wav_path), clip_audio.numpy(), target_sample_rate)

        meta = {
            "speaker": speaker,
            "text": text,
            "duration": duration,
            "sample_rate": target_sample_rate,
            "source_file": audio_path.name,
            "source_start": seg["start"],
            "source_end": seg["end"],
            "wav_file": wav_path.name,
        }
        meta_path.write_text(json.dumps(meta, indent=2))

        clips.append(meta)
        clip_idx += 1

    print(f"Extracted {len(clips)} clips to {output_dir}")
    return clips


def list_references():
    """List all collected reference clips."""
    print("\nCollected voice references:")
    print("=" * 60)

    for speaker_dir in sorted(REFERENCE_DIR.iterdir()):
        if not speaker_dir.is_dir():
            continue

        json_files = list(speaker_dir.glob("*.json"))
        if not json_files:
            print(f"\n  {speaker_dir.name}/  (empty)")
            continue

        total_duration = 0.0
        print(f"\n  {speaker_dir.name}/  ({len(json_files)} clips)")
        print(f"  {'-' * 50}")

        for jf in sorted(json_files):
            meta = json.loads(jf.read_text())
            dur = meta.get("duration", 0)
            total_duration += dur
            text_preview = meta["text"][:60] + "..." if len(meta["text"]) > 60 else meta["text"]
            print(f"    [{dur:.1f}s] {text_preview}")

        print(f"  Total: {total_duration:.1f}s")

    print()


def main():
    parser = argparse.ArgumentParser(description="Vesper Astra Voice Reference Collector")
    parser.add_argument("--url", type=str, help="YouTube URL to download")
    parser.add_argument("--file", type=str, help="Local audio/video file path")
    parser.add_argument("--speaker", type=str, choices=["aubrey", "sadie", "other"],
                        help="Speaker name for organizing clips")
    parser.add_argument("--list", action="store_true", help="List collected references")
    parser.add_argument("--min-duration", type=float, default=1.5, help="Min clip duration (s)")
    parser.add_argument("--max-duration", type=float, default=15.0, help="Max clip duration (s)")
    args = parser.parse_args()

    if args.list:
        list_references()
        return

    if not args.speaker:
        parser.error("--speaker is required when collecting references")

    if args.url:
        # Download from YouTube
        tmp_dir = VOICES_DIR / "tmp"
        tmp_dir.mkdir(exist_ok=True)
        audio_path = download_audio(args.url, tmp_dir)
    elif args.file:
        audio_path = Path(args.file)
        if not audio_path.exists():
            print(f"File not found: {audio_path}")
            sys.exit(1)
    else:
        parser.error("Either --url or --file is required")

    # Transcribe
    segments = transcribe_audio(audio_path)

    # Extract clips
    clips = extract_clips(
        audio_path, segments, args.speaker,
        min_duration=args.min_duration,
        max_duration=args.max_duration,
    )

    # Update config
    config_path = VOICES_DIR / "config.json"
    config = json.loads(config_path.read_text())

    source_entry = {
        "file": str(audio_path.name),
        "clips": len(clips),
        "total_duration": sum(c["duration"] for c in clips),
        "collected_at": time.strftime("%Y-%m-%d %H:%M"),
    }

    if args.speaker in config["reference_sources"]:
        config["reference_sources"][args.speaker].append(source_entry)
    else:
        config["reference_sources"][args.speaker] = [source_entry]

    config_path.write_text(json.dumps(config, indent=2))
    print(f"\nUpdated {config_path}")
    print(f"Run 'python voice_collector.py --list' to see all references")


if __name__ == "__main__":
    main()
