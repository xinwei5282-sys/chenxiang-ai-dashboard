"""Separate transparent halo artwork and original calligraphy from the reference."""
from pathlib import Path
import json
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/extracted/assistant'
src=np.array(Image.open(ROOT/'assets/selected/reference.png').convert('RGB').crop((1245,250,1643,592))).astype(float)
h,w=src.shape[:2]
# Restore only the measured blue rings and their soft light. The source forest,
# character, calligraphy and panel perimeter are deliberately excluded.
scale=4
yy,xx=np.mgrid[:h*scale,:w*scale].astype(float);xx=(xx+.5)/scale;yy=(yy+.5)/scale
strength=np.zeros_like(xx)
for cx,cy,rx,ry,opacity in [(172,192,144,155,.53),(171,205,123,132,.15),(169,213,101,99,.48),(169,213,98.5,96.5,.22)]:
 radius=np.sqrt(((xx-cx)/rx)**2+((yy-cy)/ry)**2)
 distance=np.abs(radius-1)*min(rx,ry)
 # Left and upper arcs are brighter in the reference, with a softer lower fade.
 directional=np.clip(.91-(xx-cx)/650-(yy-cy)/450,.28,1)
 edge_fade=np.clip((311-xx)/63,0,1)*np.clip((340-yy)/62,0,1)
 core=np.exp(-(distance/.38)**2)*opacity*directional*edge_fade
 glow=np.exp(-(distance/2.7)**2)*opacity*.09*directional*edge_fade
 strength=1-(1-strength)*(1-np.clip(core+glow,0,1))
# A restrained radial light wash, with no opaque rectangular backing.
wash=np.exp(-(((xx-164)/116)**2+((yy-193)/144)**2)*1.5)*.075
strength=1-(1-strength)*(1-wash)
rgba=np.zeros((h*scale,w*scale,4),np.uint8);rgba[:,:,:3]=[30,150,213];rgba[:,:,3]=np.clip(strength*255,0,255)
halo=Image.fromarray(rgba).resize((w,h),Image.Resampling.LANCZOS)
halo.save(OUT/'assistant-background.png')
# Colour matte inside the two original calligraphy columns and the red seal.
y,x=np.mgrid[:h,:w];r,g,b=src[:,:,0],src[:,:,1],src[:,:,2]
gold=(x>=307)&(x<=374)&(y>=36)&(y<=258)&(r>g*.99)&(r>b*1.15)
seal=(x>=312)&(x<=330)&(y>=267)&(y<=295)&(r>g*1.6)&(r>b*1.5)
a=np.zeros((h,w));a[gold]=np.clip((r[gold]-b[gold]-6)/61,0,1);a[seal]=np.clip((r[seal]-np.maximum(g[seal],b[seal])-4)/65,0,1)
a[a<.035]=0
# Decontaminate antialiased edges from the navy source background.
bg=np.array([3,25,40]);colour=np.clip((src-bg*(1-a[:,:,None]))/np.maximum(a[:,:,None],.001),0,255)
text=Image.fromarray(np.dstack([colour.astype('uint8'),(a*255).astype('uint8')]))
bounds=text.getbbox();box=(bounds[0]-2,bounds[1]-2,bounds[2]+2,bounds[3]+2)
text.crop(box).save(OUT/'assistant-calligraphy.png')
meta=json.loads((ROOT/'assets/extracted/assistant-manifest.json').read_text())
meta.update({'background':'Transparent halo only; outer ring 288x310 at centre (172,192); right and lower arcs fade to match reference. No forest, person, frame or text.','calligraphyOffset':list(box[:2]),'calligraphySize':[box[2]-box[0],box[3]-box[1]],'calligraphy':'Original gold lettering and red seal with colour matte and edge decontamination.'})
(ROOT/'assets/extracted/assistant-manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
sheet=Image.new('RGB',(796,342),(12,25,39))
for offset,art in [(0,halo),(398,text)]:
 checker=Image.new('RGBA',(398,342),(20,34,49,255));d=ImageDraw.Draw(checker)
 for j in range(0,342,12):
  for i in range(0,398,12):
   if (i//12+j//12)%2==0:d.rectangle((i,j,i+11,j+11),fill=(35,49,64,255))
 checker.alpha_composite(art);sheet.paste(checker,(offset,0))
sheet.save(ROOT/'audit/assistant-halo-calligraphy.png')
print(json.dumps({'offset':box[:2],'size':[box[2]-box[0],box[3]-box[1]]}))
