"""Use the supplied waving IP, preserving its original RGB and transparency."""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'assets/selected/assistant-wave-source.png'
art = Image.open(ROOT / SOURCE).convert('RGBA')
# Ignore near-transparent canvas noise when measuring the supplied silhouette.
bounds = art.getchannel('A').point(lambda value: 255 if value > 24 else 0).getbbox()
left, top, right, bottom = bounds
crop = (max(0, left-2), max(0, top-2), min(art.width, right+2), min(art.height, bottom+2))
art = art.crop(crop)
art.save(ROOT / 'assets/extracted/assistant/assistant-character.png')
path = ROOT / 'assets/extracted/assistant-manifest.json'
meta = json.loads(path.read_text())
meta.update(characterSource=SOURCE, characterSourceBox=list(crop),
            characterSize=list(art.size), characterOffset=[61, 0],
            method='User-supplied waving IP PNG; only transparent canvas trimmed. Original RGB and alpha preserved. Scene and calligraphy retained separately.')
path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n')
print(f'Prepared {art.size}, source box {crop}')
