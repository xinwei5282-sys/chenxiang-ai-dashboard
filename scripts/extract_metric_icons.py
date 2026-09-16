"""Crop the four original KPI icons with their blue rings; preserve RGB pixels."""
from pathlib import Path
import json
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/extracted/metrics';OUT.mkdir(exist_ok=True)
source=Image.open(ROOT/'assets/selected/reference.png').convert('RGB')
centres={'archive':(108,147),'batch':(502,147),'nodes':(919,147),'ai':(1330,147)}
items={};sheet=Image.new('RGBA',(480,120),(17,33,48,255))
for index,(name,(cx,cy)) in enumerate(centres.items()):
 box=(cx-40,cy-40,cx+40,cy+40)
 rgb=np.array(source.crop(box));y,x=np.mgrid[:80,:80];d=np.hypot(x-40,y-40)
 a=np.clip((39-d)/5,0,1)
 rgba=np.dstack([rgb,np.round(a*255).astype('uint8')]);image=Image.fromarray(rgba);image.save(OUT/f'{name}.png')
 sheet.alpha_composite(image,(index*120+20,20));items[name]={'bbox':[cx-40,cy-40,80,80],'alpha':'34px intact radius with 5px soft padding','sourceRGB':'unchanged'}
sheet.save(ROOT/'audit/metric-icons-source.png')
(ROOT/'assets/extracted/metrics-manifest.json').write_text(json.dumps({'source':'assets/selected/reference.png','items':items},ensure_ascii=False,indent=2)+'\n')
