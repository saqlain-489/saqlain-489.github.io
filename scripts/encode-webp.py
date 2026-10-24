"""Encode PNG frames into one looping animated WebP, letting libwebp store only what changed between frames."""
import glob
import sys

from PIL import Image

frames_glob, out, fps, quality = sys.argv[1], sys.argv[2], float(sys.argv[3]), int(sys.argv[4])
kmax = int(sys.argv[5]) if len(sys.argv) > 5 else 24
paths = sorted(glob.glob(frames_glob))
frames = [Image.open(p).convert('RGBA') for p in paths]
frames[0].save(
    out,
    save_all=True,
    append_images=frames[1:],
    duration=round(1000 / fps),
    loop=0,
    quality=quality,
    method=6,
    minimize_size=False,
    allow_mixed=False,
    # A keyframe every second, so a region the encoder judged 'unchanged' can never stay stale for long.
    kmin=kmax // 2,
    kmax=kmax,
)
print(f'{len(frames)} frames -> {out}')
