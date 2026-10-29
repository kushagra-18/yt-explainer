#!/usr/bin/env python3
"""Tile QA snapshots into labelled contact sheets: qa/sheet-N.jpg (4x3, 640x360 frames, time + layout + line)."""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

K = Path(sys.argv[1])
rows = [l.split("\t") for l in Path("qa/list.txt").read_text().splitlines() if l.strip()]
font = ImageFont.truetype(str(K / "assets/fonts/Palanquin-SemiBold.ttf"), 22)
for old in Path("qa").glob("sheet-*.jpg"):
    old.unlink()
W, H, PAD, C = 640, 360, 6, 4
sheets = []
for n in range(0, len(rows), 12):
    chunk = rows[n:n + 12]
    r = (len(chunk) + C - 1) // C
    cols = min(C, len(chunk))
    sheet = Image.new("RGB", (cols * W + (cols + 1) * PAD, r * H + (r + 1) * PAD), "black")
    for i, (f, label) in enumerate(chunk):
        im = Image.open(Path("qa/snaps") / f).convert("RGB").resize((W, H), Image.LANCZOS)
        d = ImageDraw.Draw(im, "RGBA")
        d.rectangle([0, 0, W, 34], fill=(0, 0, 0, 170))
        d.text((10, 3), f"{n + i + 1}. {label}", font=font, fill="white")
        sheet.paste(im, (PAD + (i % C) * (W + PAD), PAD + (i // C) * (H + PAD)))
    out = Path(f"qa/sheet-{n // 12 + 1}.jpg")
    sheet.save(out, quality=85)
    sheets.append(str(out))
print(f"{len(rows)} frames -> " + " ".join(sheets))
