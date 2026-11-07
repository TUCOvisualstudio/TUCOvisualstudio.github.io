"""
TUCO Post Studio - web media pipeline
=====================================

Turns the master clips in /videos into lightweight, web-ready files in /media:

  media/reel/reel-1600.mp4     hero background loop (no audio, desktop)
  media/reel/reel-960.mp4      hero background loop (no audio, mobile)
  media/reel/reel.mp4          full reel with sound (opens in the player)
  media/work/<slug>.mp4        full project film with sound (opens in the player)
  media/work/<slug>-p.mp4      8 s silent preview loop (plays on hover / in view)
  media/posters/<slug>.webp    still frame shown before any video loads
  media/strip/sNN.mp4          short loops for the moving film strip

Usage (from the repo root):
  python tools/encode_media.py                 encode whatever is missing
  python tools/encode_media.py --force         re-encode everything
  python tools/encode_media.py --only work     only one group (reel|work|preview|poster|strip)

To add a project: drop the master in /videos, add a line to PROJECTS below,
run the script, then copy one <li class="work-item"> block in index.html.
"""

import argparse
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "videos"
OUT = ROOT / "media"

FFMPEG = os.environ.get("FFMPEG", shutil.which("ffmpeg") or "ffmpeg")
FFPROBE = os.environ.get("FFPROBE", shutil.which("ffprobe") or "ffprobe")

# slug, master file, preview start (s), poster time (s)
PROJECTS = [
    ("audi",             "audi.mp4",         42.0, 57.5),
    ("don-julio",        "donjulio.mp4",      4.0,  6.0),
    ("adidas-metalbone", "17.mp4",            0.5,  8.5),
    ("molly-ferrill",    "mollyferrill.mp4", 72.0, 47.0),
    ("bbva",             "13.mp4",            7.0, 12.8),
    ("att",              "14.mp4",           14.0, 16.5),
    ("nfl",              "20.mp4",           10.0, 13.0),
    ("fiesta-americana", "16.mp4",           36.0, 44.0),
    ("pizza-hut",        "12.mp4",           13.0, 15.0),
    ("clorets",          "15.mp4",            0.5,  2.0),
]

REEL = "REEL.mp4"
REEL_POSTER_AT = 0.2
STRIP = ["4.mp4", "5.mp4", "6.mp4", "7.mp4", "8.mp4", "9.mp4", "10.mp4", "11.mp4"]

X264 = ["-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-movflags", "+faststart"]


def run(args, dst, force):
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists() and not force:
        print(f"  skip  {dst.relative_to(ROOT)}")
        return
    tmp = dst.with_name(dst.stem + ".tmp" + dst.suffix)
    cmd = [FFMPEG, "-hide_banner", "-loglevel", "error", "-y", *args, str(tmp)]
    subprocess.run(cmd, check=True)
    tmp.replace(dst)
    print(f"  ok    {dst.relative_to(ROOT)}  {dst.stat().st_size / 1e6:.1f} MB")


def loop(src, dst, width, crf, force, start=None, dur=None, fps=None, crop=None):
    args = []
    if start is not None:
        args += ["-ss", str(start)]
    args += ["-i", str(src)]
    if dur is not None:
        args += ["-t", str(dur)]
    vf = (f"crop={crop}," if crop else "") + f"scale={width}:-2:flags=lanczos"
    if fps:
        vf += f",fps={fps}"
    args += ["-map", "0:v:0", "-an", "-vf", vf, *X264, "-crf", str(crf), "-g", "48"]
    run(args, dst, force)


def probe_width(src):
    out = subprocess.run([FFPROBE, "-v", "error", "-select_streams", "v:0", "-show_entries",
                          "stream=width", "-of", "csv=p=0", str(src)], capture_output=True, text=True)
    try:
        return int(out.stdout.strip().splitlines()[0])
    except (ValueError, IndexError):
        return 0


def crop_of(src, start, dur=8):
    """Detect letterbox / pillarbox bars so previews and posters fill their frame."""
    out = subprocess.run([FFMPEG, "-hide_banner", "-ss", str(start), "-i", str(src), "-t", str(dur),
                          "-vf", "cropdetect=limit=24:round=2:reset=0", "-f", "null", "-"],
                         capture_output=True, text=True)
    found = [tuple(map(int, c.split(":"))) for c in re.findall(r"crop=(\d+:\d+:\d+:\d+)", out.stderr)]
    if not found:
        return None
    # reset=0 makes the window grow over time: the largest one is the true active picture.
    w, h, x, y = max(found, key=lambda c: c[0] * c[1])
    full_w = probe_width(src) or w
    if w * h < 0.5 * full_w * (full_w * 9 / 16):   # dark footage fooled the detector: keep full frame
        return None
    return f"{w}:{h}:{x}:{y}"


def full(src, dst, force):
    # 1080p masters are already web-friendly H.264: remux losslessly, move the index
    # to the front (instant start) and keep the first audio track.
    # Anything bigger (4K) is scaled down to 1080p.
    if probe_width(src) > 1920:
        args = ["-i", str(src), "-map", "0:v:0", "-map", "0:a:0?", "-vf", "scale=1920:-2:flags=lanczos",
                *X264, "-crf", "21", "-c:a", "aac", "-b:a", "160k"]
    else:
        args = ["-i", str(src), "-map", "0:v:0", "-map", "0:a:0?", "-c", "copy", "-movflags", "+faststart"]
    run(args, dst, force)


def poster(src, dst, at, force, width=1600, crop=None):
    vf = (f"crop={crop}," if crop else "") + f"scale={width}:-2:flags=lanczos"
    args = ["-ss", str(at), "-i", str(src), "-frames:v", "1",
            "-vf", vf, "-c:v", "libwebp", "-quality", "78"]
    run(args, dst, force)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--only", default="reel,work,preview,poster,strip")
    a = ap.parse_args()
    groups = set(a.only.split(","))

    if "reel" in groups:
        print("reel")
        src = SRC / REEL
        loop(src, OUT / "reel" / "reel-1600.mp4", 1600, 26, a.force)
        loop(src, OUT / "reel" / "reel-960.mp4", 960, 27, a.force)
        full(src, OUT / "reel" / "reel.mp4", a.force)
        poster(src, OUT / "posters" / "reel.webp", REEL_POSTER_AT, a.force)

    for slug, master, p_start, p_at in PROJECTS:
        src = SRC / master
        if not src.exists():
            print(f"  missing {src}", file=sys.stderr)
            continue
        if "work" in groups:
            full(src, OUT / "work" / f"{slug}.mp4", a.force)
        crop = crop_of(src, p_start) if ({"preview", "poster"} & groups) else None
        if crop:
            print(f"  crop  {slug}: {crop}")
        if "preview" in groups:
            loop(src, OUT / "work" / f"{slug}-p.mp4", 960, 27, a.force, start=p_start, dur=8, crop=crop)
        if "poster" in groups:
            poster(src, OUT / "posters" / f"{slug}.webp", p_at, a.force, width=1280, crop=crop)

    if "strip" in groups:
        print("strip")
        for i, name in enumerate(STRIP, 1):
            src = SRC / name
            if src.exists():
                loop(src, OUT / "strip" / f"s{i:02d}.mp4", 532, 27, a.force, fps=30)


if __name__ == "__main__":
    main()
