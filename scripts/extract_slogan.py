"""Original handwritten slogan and underline, isolated from the composite PNG."""
from pathlib import Path
import json
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
box=(1421,19,1643,63)
rgb=np.array(Image.open(ROOT/'assets/selected/reference.png').convert('RGB').crop(box)).astype(float)
y,x=np.mgrid[:rgb.shape[0],:rgb.shape[1]]
ink=np.min(rgb,axis=2)
alpha=np.clip((ink-44)/170,0,1)
alpha[y<16-x*.075]=0
alpha[alpha<.045]=0
navy=np.array([8,28,42])
colour=np.clip((rgb-navy*(1-alpha[:,:,None]))/np.maximum(alpha[:,:,None],.001),0,255)
rgba=np.dstack([colour.astype('uint8'),(alpha*255).astype('uint8')])
im=Image.fromarray(rgba);im.save(ROOT/'assets/extracted/chrome/slogan.png')
meta={'source':'assets/selected/reference.png','bbox':[1421,19,222,44],'file':'chrome/slogan.png','method':'Original handwritten lettering and underline; luminance matte, navy edge decontamination; no font replacement.'}
(ROOT/'assets/extracted/slogan-manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
preview=Image.new('RGBA',im.size,(25,39,53,255));d=ImageDraw.Draw(preview)
for j in range(0,44,8):
 for i in range(0,222,8):
  if (i//8+j//8)%2:d.rectangle((i,j,i+7,j+7),fill=(50,64,78,255))
preview.alpha_composite(im);preview.resize((888,176)).save(ROOT/'audit/slogan-cutout-4x.png')
