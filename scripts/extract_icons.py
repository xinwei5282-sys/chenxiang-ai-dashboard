#!/usr/bin/env python3
"""Extract the ten standalone icons from the selected reference atlas.

All coordinates are reference-image pixels. Trace circles retain original subject pixels and visible reference arcs; only
caption-obscured lower crescents are reconstructed from source colors and arcs.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE_MAP = ROOT / "assets/extracted/source-map.json"
SOURCE = ROOT / "assets/selected/reference.png"
OUT_DIR = ROOT / "assets/extracted/icons"
MANIFEST = ROOT / "assets/extracted/icons-manifest.json"
CONTACT = ROOT / "audit/icons-extracted-contact.png"


TRACE_GEOMETRY = {
    'trace-nursery': (650,354,44,385),
    'trace-base': (835,296,46,322),
    'trace-raw': (1021,354,44,385),
    'trace-factory': (1125,503,44,537),
    'trace-product': (834,630,47,663),
    'trace-transport': (544,503,44,537),
}

# Source subject contours only; none includes an old circle or lower shadow bed.
SUBJECT_CONTOURS = {
    'trace-base': [(25,39),(33,29),(44,22),(60,20),(77,23),(92,33),(96,46),(86,57),(72,62),(70,73),(88,78),(91,85),(29,86),(29,78),(51,71),(52,62),(38,58),(29,49)],
    'trace-nursery': [(29,44),(39,43),(49,46),(46,35),(54,38),(60,47),(65,39),(79,36),(74,45),(64,53),(69,49),(79,48),(89,51),(82,56),(72,58),(64,55),(61,64),(75,63),(83,68),(89,74),(80,79),(65,83),(49,81),(31,76),(35,70),(43,66),(53,65),(56,57),(51,53),(43,54),(34,49)],
    'trace-raw': [(29,63),(39,54),(54,46),(67,35),(75,39),(78,43),(78,52),(85,48),(91,52),(94,60),(91,66),(62,83),(54,84),(47,79),(45,74),(37,77),(31,74),(28,69)],
    'trace-factory': [(35,76),(38,76),(38,57),(40,57),(40,36),(43,36),(44,57),(50,56),(54,54),(57,56),(57,43),(63,41),(63,31),(66,31),(66,39),(81,36),(82,39),(67,42),(73,47),(74,60),(81,60),(81,75),(86,76),(86,80),(35,80)],
    'trace-product': [(25,56),(28,46),(33,40),(40,35),(48,32),(58,30),(68,32),(77,35),(86,40),(92,47),(94,57),(92,65),(86,73),(78,80),(68,84),(57,86),(45,83),(35,77),(28,69)],
    'trace-transport': [(27,38),(65,38),(68,46),(77,46),(86,59),(87,73),(80,75),(78,81),(68,83),(63,76),(49,76),(46,82),(35,82),(31,76),(27,74)],
}

def complete_trace(atlas, name):
    """Retain reference artwork; reconstruct only the caption-obscured crescent."""
    cx,cy,radius,text_top=TRACE_GEOMETRY[name]
    box=[cx-60,cy-60,120,120]
    source=np.array(atlas.crop((box[0],box[1],box[0]+120,box[1]+120)).convert('RGB')).astype(float)
    yy,xx=np.mgrid[:120,:120]
    distance=np.hypot(xx-60,yy-60)
    # Interior colors come from the clear left side of the accepted base icon.
    # The lower arc uses the actual upper arc reflected across the center;
    # this retains its narrow bright core and uneven source highlights.
    bx,by,_,_=TRACE_GEOMETRY['trace-base']
    base=np.array(atlas.crop((bx-60,by-60,bx+60,by+60)).convert('RGB')).astype(float)
    sample_radius=np.clip(np.rint(distance*46/radius).astype(int),32,43)
    lower=base[60,60-sample_radius].copy()
    mirrored=source[np.clip(120-yy,0,119),xx]
    arc=np.clip((distance-(radius-8))/4,0,1)
    lower=lower*(1-arc[:,:,None])+mirrored*arc[:,:,None]
    boundary=text_top-box[1]
    blend=np.clip((yy-(boundary-8))/6,0,1)
    blend=blend*blend*(3-2*blend)
    # Protect the original subject even when it extends into the repair band.
    mask=Image.new('L',(480,480),0)
    ImageDraw.Draw(mask).polygon([(x*4,y*4) for x,y in SUBJECT_CONTOURS[name]],fill=255)
    subject=np.array(mask.resize((120,120),Image.Resampling.LANCZOS))/255.
    subject[yy>=boundary-1]=0
    blend*=1-subject
    rgb=source*(1-blend[:,:,None])+lower*blend[:,:,None]
    interior=np.clip(radius+1-distance,0,1)
    glow=.36*np.exp(-((distance-radius)/4.6)**2)
    glow[distance>radius+12]=0
    alpha=interior+(1-interior)*glow
    premult=rgb*interior[:,:,None]+np.array([39,165,255])*((1-interior)*glow)[:,:,None]
    rgb=premult/np.maximum(alpha[:,:,None],.001)
    rgba=np.dstack([np.clip(rgb,0,255).astype('uint8'),np.round(alpha*255).astype('uint8')])
    rgba[[0,-1],:,3]=0;rgba[:,[0,-1],3]=0
    return rgba,box


def rounded_alpha(w: int, h: int) -> np.ndarray:
    # AI tiles occupy their supplied boxes.  A rounded mask removes the
    # surrounding atlas while retaining the original tile pixels unchanged.
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, h - 1), radius=9, fill=255)
    return np.asarray(mask, dtype=np.uint8)


def extract(atlas: Image.Image, name: str, box: list[int], kind: str) -> dict:
    x, y, w, h = box
    rgba = np.array(atlas.crop((x, y, x + w, y + h)).convert("RGBA"), copy=True)
    if kind == "trace":
        rgba,box=complete_trace(atlas,name)
        x,y,w,h=box
    else:
        rgba[:, :, 3] = rounded_alpha(w, h)
    path = OUT_DIR / f"{name}.png"
    Image.fromarray(rgba, "RGBA").save(path, optimize=True)
    return {
        "source": {"x": x, "y": y, "width": w, "height": h},
        "output": {"path": str(path.relative_to(ROOT)), "width": w, "height": h, "mode": "RGBA"},
        "alpha": "Original reference subject and visible circle preserved; caption-obscured lower crescent restored with sampled source interior and reflected source arc; outer glow feathered" if kind == "trace" else "rounded rectangle (9px radius), original pixels retained",
    }


def make_contact_sheet(names: list[str]) -> None:
    tile_w, tile_h, pad, label_h = 150, 130, 16, 24
    cols = 5
    rows = (len(names) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (tile_w + pad) + pad, rows * (tile_h + label_h + pad) + pad), "#1b1b1b")
    draw = ImageDraw.Draw(sheet)
    for i, name in enumerate(names):
        col, row = i % cols, i // cols
        ox = pad + col * (tile_w + pad)
        oy = pad + row * (tile_h + label_h + pad)
        for yy in range(0, tile_h, 16):
            for xx in range(0, tile_w, 16):
                color = "#eeeeee" if ((xx // 16 + yy // 16) % 2 == 0) else "#888888"
                draw.rectangle((ox + xx, oy + yy, ox + min(xx + 16, tile_w) - 1, oy + min(yy + 16, tile_h) - 1), fill=color)
        icon = Image.open(OUT_DIR / f"{name}.png").convert("RGBA")
        icon.thumbnail((tile_w - 12, tile_h - 12), Image.Resampling.NEAREST)
        sheet.alpha_composite(icon, (ox + (tile_w - icon.width) // 2, oy + (tile_h - icon.height) // 2)) if sheet.mode == "RGBA" else sheet.paste(icon, (ox + (tile_w - icon.width) // 2, oy + (tile_h - icon.height) // 2), icon)
        draw.text((ox, oy + tile_h + 3), name, fill="white")
    CONTACT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(CONTACT)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--trace-only', action='store_true', help='Regenerate only the six trace circles')
    args = parser.parse_args()
    data = json.loads(SOURCE_MAP.read_text())
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    atlas = Image.open(SOURCE).convert("RGBA")
    icons = json.loads(MANIFEST.read_text())["icons"] if args.trace_only and MANIFEST.exists() else {}
    for name, box in data["icons"].items():
        if args.trace_only and not name.startswith("trace-"):
            continue
        kind = "trace" if name.startswith("trace-") else "ai"
        icons[name] = extract(atlas, name, box, kind)
    names = list(data["icons"])
    make_contact_sheet(names)
    manifest = {"reference": "assets/selected/reference.png", "sourceSize": list(atlas.size), "icons": icons, "contactSheet": str(CONTACT.relative_to(ROOT))}
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
