#!/usr/bin/env python3
"""Extract clean glass panels from the selected reference image.

The glass fill is reconstructed; the cyan perimeter and title accents are
retained from source pixels. This intentionally does not claim recovery of
the source alpha channel.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets/selected/reference.png"
MAP = ROOT / "assets/extracted/source-map.json"
OUT = ROOT / "assets/extracted/panels"
CONTACT = ROOT / "audit/panels-extracted-contact.png"

HEADER_H = {"capabilities": 47, "alerts": 47, "assistant": 47, "products": 42}

def polygon_mask(w, h, cut=6):
    # Match the clipped outer corners visible in the reference panels.
    p = [(cut, 0), (w-cut, 0), (w, cut), (w, h-cut),
         (w-cut, h), (cut, h), (0, h-cut), (0, cut)]
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).polygon(p, fill=255)
    return np.asarray(m) > 0

def extract(src, name, box):
    x, y, w, h = box
    crop = np.asarray(src.crop((x, y, x+w, y+h)).convert("RGB"), dtype=np.int16)
    cut = 6
    poly = polygon_mask(w, h, cut)
    r, g, b = crop[..., 0], crop[..., 1], crop[..., 2]
    bright = (r + g + b) / 3
    cyan = b - r
    # Source border/glow pixels are blue-cyan and occur near the polygon edge.
    # Preserve a narrow source-pixel perimeter. This deliberately keeps dark
    # blue antialiasing pixels too; color thresholds erase the fine rim.
    # Erode with zero padding rather than np.roll: roll wraps opposite
    # borders together and incorrectly removes straight perimeter runs.
    padded = np.pad(poly, 2, mode="constant", constant_values=False)
    eroded = np.ones_like(poly, dtype=bool)
    for dy in range(5):
        for dx in range(5):
            eroded &= padded[dy:dy+h, dx:dx+w]
    edge = poly & ~eroded
    preserve = edge
    if name == "brand-story":
        yy, xx = np.indices((h, w))
        # The source crop grazes scenery; retain only a 2px outer rim.
        preserve = edge
    # Keep title separator and left cyan accent, where applicable.
    hh = HEADER_H.get(name)
    if hh:
        band = np.indices((h, w))[0] == hh
        preserve |= poly & band
        stripe = (np.indices((h, w))[1] >= 13) & (np.indices((h, w))[1] <= 19) & (np.indices((h, w))[0] >= 13) & (np.indices((h, w))[0] <= hh-12)
        preserve |= poly & stripe & (cyan > 8) & (bright > 45)
    # Reconstructed glass, with source pixels composited only where preserved.
    out = np.zeros((h, w, 4), dtype=np.uint8)
    out[poly, :3] = (5, 30, 52)
    out[poly, 3] = 190
    out[preserve, :3] = np.clip(crop[preserve], 0, 255).astype(np.uint8)
    out[preserve, 3] = np.clip(150 + (bright[preserve] * 0.9), 175, 255).astype(np.uint8)
    return Image.fromarray(out, "RGBA"), int(preserve.sum())

def main():
    spec = json.loads(MAP.read_text())
    src = Image.open(SRC).convert("RGB")
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {
        "source": "../selected/reference.png",
        "sourceSize": list(src.size),
        "coordinateConvention": "x,y,width,height; reference pixels",
        "alphaNote": "Interior glass fill is reconstructed as uniform deep-blue alpha ~0.75; source alpha is not claimed recovered.",
        "borderNote": "Cyan perimeter, clipped corners, glow pixels and title accents are retained from source RGB pixels.",
        "panels": {}
    }
    for name, box in spec["panels"].items():
        img, kept = extract(src, name, box)
        path = OUT / f"{name}.png"
        img.save(path)
        manifest["panels"][name] = {"bbox": box, "file": str(path.relative_to(ROOT)), "size": box[2:4], "preservedSourcePixels": kept, "fill": "reconstructed"}
    MAP.parent.mkdir(parents=True, exist_ok=True)
    (MAP.parent / "panels-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    # Checkerboard contact sheet for visual QA only.
    thumbs = []
    for name in spec["panels"]:
        im = Image.open(OUT / f"{name}.png")
        scale = min(1.0, 420 / im.width)
        im = im.resize((round(im.width*scale), round(im.height*scale)), Image.Resampling.NEAREST)
        bg = Image.new("RGB", im.size, (35, 35, 35)); d = ImageDraw.Draw(bg)
        for yy in range(0, im.height, 12):
            for xx in range(0, im.width, 12):
                if (xx//12 + yy//12) % 2 == 0: d.rectangle((xx, yy, xx+11, yy+11), fill=(70,70,70))
        bg.paste(im, mask=im.getchannel("A")); thumbs.append((name, bg))
    cellw = 430
    cellh = max(im.height for _, im in thumbs) + 30
    sheet = Image.new("RGB", (cellw*3, cellh*3), (20,20,20)); d = ImageDraw.Draw(sheet)
    for i, (name, im) in enumerate(thumbs):
        x, yy = (i%3)*cellw, (i//3)*cellh
        sheet.paste(im, (x+5, yy+22)); d.text((x+8, yy+4), name, fill="white")
    CONTACT.parent.mkdir(parents=True, exist_ok=True); sheet.save(CONTACT)

if __name__ == "__main__": main()
