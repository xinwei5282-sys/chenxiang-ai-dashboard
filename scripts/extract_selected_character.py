"""Extract the supplied front view with an explicit silhouette; preserve source RGB."""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'assets/selected/assistant-character-reference.png'
src = Image.open(ROOT / SOURCE).convert('RGB')
# Source-image coordinates, following the front figure including hair and fingers.
outline = [(252,57),(259,51),(271,49),(282,50),(289,55),(293,65),
 (294,80),(301,92),(313,105),(325,118),(331,132),(333,148),
 (349,146),(362,153),(374,165),(380,181),(385,196),(397,204),
 (390,211),(377,214),(385,218),(373,226),(382,234),(385,247),
 (381,263),(371,277),(358,285),(355,300),(339,307),(351,320),
 (369,331),(388,346),(397,364),(404,391),(413,427),(423,467),
 (431,501),(438,515),(441,541),(425,551),(424,565),(429,579),
 (429,594),(425,613),(419,627),(412,637),(406,637),(404,631),
 (412,615),(413,601),(408,614),(402,616),(400,609),(406,588),
 (399,583),(395,602),(393,640),(392,698),(390,755),(384,790),
 (375,809),(373,821),(377,835),(389,855),(396,871),(397,887),
 (385,893),(362,894),(338,891),(315,882),(311,871),(314,850),
 (319,836),(318,821),(311,813),(306,799),(301,764),(297,708),
 (287,632),(280,618),(273,638),(267,690),(260,747),(255,784),
 (248,810),(242,817),(241,831),(249,848),(250,863),(240,875),
 (220,887),(197,892),(171,891),(168,885),(171,866),(178,850),
 (187,835),(193,821),(191,812),(179,798),(173,780),(170,751),
 (170,699),(173,645),(177,614),(179,595),(177,580),(171,588),
 (172,605),(167,617),(162,613),(157,601),(160,618),(166,630),
 (165,636),(158,634),(149,624),(145,611),(144,593),(147,571),
 (148,550),(128,545),(125,538),(129,518),(133,505),(137,477),
 (145,438),(155,399),(168,365),(180,346),(198,333),(226,320),
 (241,314),(241,304),(228,299),(215,291),(207,280),(195,271),
 (188,258),(183,245),(183,232),(190,226),(183,220),(174,220),
 (168,214),(165,205),(175,209),(186,200),(195,188),(207,167),
 (191,166),(181,157),(177,145),(177,129),(183,112),(182,128),
 (190,132),(202,125),(220,113),(240,104),(260,102),(258,89),
 (263,76),(269,66),(268,59),(261,56)]
scale = 3
mask = Image.new('L', (src.width * scale, src.height * scale))
ImageDraw.Draw(mask).polygon([(x * scale, y * scale) for x, y in outline], fill=255)
mask = mask.resize(src.size, Image.Resampling.LANCZOS)
binary = (np.array(mask) > 127).astype('uint8')
gc = np.where(binary, cv2.GC_PR_FGD, cv2.GC_PR_BGD).astype('uint8')
gc[cv2.erode(binary, np.ones((45, 45), np.uint8)) > 0] = cv2.GC_FGD
gc[cv2.dilate(binary, np.ones((17, 17), np.uint8)) == 0] = cv2.GC_BGD
# The cream soles resemble the studio backdrop: seed them explicitly.
shoe_seed = Image.new('L', src.size)
shoe_draw = ImageDraw.Draw(shoe_seed)
shoe_draw.polygon([(197,829),(219,829),(240,844),(246,861),(243,876),
                   (216,886),(174,887),(174,874),(183,852)], fill=255)
shoe_draw.polygon([(330,832),(349,832),(368,841),(383,862),(393,877),
                   (393,887),(374,889),(350,887),(316,878),(316,867),(324,849)], fill=255)
gc[np.array(shoe_seed) > 0] = cv2.GC_FGD
cv2.grabCut(np.array(src), gc, None, np.zeros((1,65)), np.zeros((1,65)), 5, cv2.GC_INIT_WITH_MASK)
matte = np.isin(gc, [cv2.GC_FGD, cv2.GC_PR_FGD]).astype('uint8') * 255
mask = Image.fromarray(cv2.GaussianBlur(matte, (3,3), .45))
rgba = src.convert('RGBA')
rgba.putalpha(mask)
bbox = mask.getbbox()
art = rgba.crop(bbox)
art.save(ROOT / 'assets/extracted/assistant/assistant-character.png')
meta_path = ROOT / 'assets/extracted/assistant-manifest.json'
meta = json.loads(meta_path.read_text())
meta.update(characterSource=SOURCE, characterSourceBox=list(bbox),
            characterSize=list(art.size), characterOffset=[93, 0],
            method='Front view from supplied character sheet; original RGB with manually measured silhouette, GrabCut edge refinement and protected shoe soles. Scene and calligraphy retained separately.')
meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n')
preview = Image.new('RGBA', art.size, '#07334b')
preview.alpha_composite(art)
(ROOT / 'audit').mkdir(exist_ok=True)
preview.convert('RGB').save(ROOT / 'audit/selected-character-cutout.jpg')
print(f'Extracted {art.size}, source box {bbox}')
