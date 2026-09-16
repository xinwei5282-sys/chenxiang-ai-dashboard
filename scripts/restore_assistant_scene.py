"""Re-matte source halo contours independently of the repaired scenery."""
from pathlib import Path
import sys,json
sys.path.insert(0,'/private/tmp/chenxiang-image-deps')
import cv2,numpy as np
from PIL import Image,ImageDraw,ImageFilter
ROOT=Path(__file__).resolve().parents[1];r=ROOT/'assets/extracted'
a=np.array(Image.open(ROOT/'assets/selected/reference.png').convert('RGB').crop((1245,250,1643,592))).astype(float)
h,w=a.shape[:2]
# Source character matte identifies occluded profile samples, never matte them
# from an inpainted background. Foreground image remains untouched.
occ=np.zeros((h,w),bool)
person=np.array(Image.open(r/'assistant/assistant-character.png'))[:,:,3]
occ[:person.shape[0],61:61+person.shape[1]]=person>10
score=1.5*a[:,:,2]-.8*a[:,:,1]-.7*a[:,:,0]
scale=4;yy,xx=np.mgrid[:h*scale,:w*scale].astype(float);xx=(xx+.5)/scale;yy=(yy+.5)/scale
alpha=np.zeros_like(xx)
# Ellipses fitted to the visible original cyan ridges. Only measured visible
# arc intervals are kept, avoiding invented complete circles on the right.
arcs=[(192.35,176.,148.69,155.,126,248,.75),(192.,176.,169.,180.,156,235,.30),(189.,213.,108.,102.,-65,69,.38),(189.,213.,104.,98.,-64,65,.17),(183.,211.,115.,102.,194,246,.16)]
for cx,cy,rx,ry,start,end,limit in arcs:
 theta=np.arange(start,end+.25,.25);rad=np.deg2rad(theta)
 px=cx+rx*np.cos(rad);py=cy+ry*np.sin(rad)
 nx=np.cos(rad)/rx;ny=np.sin(rad)/ry;norm=np.hypot(nx,ny);nx/=norm;ny/=norm
 def sample(dist):
  ix=np.clip(np.rint(px+nx*dist).astype(int),0,w-1);iy=np.clip(np.rint(py+ny*dist).astype(int),0,h-1)
  return score[iy,ix],occ[iy,ix]
 peaks=np.max([sample(d)[0] for d in [-1.5,-.75,0,.75,1.5]],axis=0)
 ambient=np.median([sample(d)[0] for d in [-7,-5,5,7]],axis=0)
 values=np.clip((peaks-ambient)/170,0,limit)
 valid=~sample(0)[1]
 # Reject tree edges with little cyan signal; interpolate only along this arc.
 valid &= (values>.025)&(peaks>35)
 if valid.sum()>4:
  values=np.interp(theta,theta[valid],values[valid])
 else:values[:]=limit*.3
 values=cv2.GaussianBlur(values[None,:],(0,0),5).ravel()
 angular=np.rad2deg(np.arctan2((yy-cy)/ry,(xx-cx)/rx))
 if start>0:angular=np.where(angular<0,angular+360,angular)
 dist=np.abs(np.sqrt(((xx-cx)/rx)**2+((yy-cy)/ry)**2)-1)*min(rx,ry)
 strength=np.interp(angular,theta,values)
 fade=np.clip((angular-start)/7,0,1)*np.clip((end-angular)/7,0,1)
 # Antialiased ridge and faint native-like edge bloom, no forest pixels.
 ridge=np.exp(-(dist/.58)**2)+.075*np.exp(-(dist/2.0)**2)
 arc=np.clip(strength*fade*ridge,0,1)
 alpha=1-(1-alpha)*(1-arc)
# Retain the measured upper translucent facet as a clean blue plane. Its
# low-opacity matte is rebuilt because the flattened reference hides it behind
# the IP; no repaired RGB/cloud from the previous scene is reused.
plane=Image.new('L',(w*scale,h*scale));d=ImageDraw.Draw(plane)
d.polygon([(int(x*scale),int(y*scale)) for x,y in [(92,4),(292,4),(246,119),(184,191),(86,112)]],fill=255)
plane=np.array(plane.filter(ImageFilter.GaussianBlur(.65*scale)))/255
plane_strength=plane*.065*np.clip((190-yy)/95,0,1)
alpha=1-(1-alpha)*(1-plane_strength)
rgba=np.zeros((h*scale,w*scale,4),np.uint8);rgba[:,:,:3]=[28,152,219];rgba[:,:,3]=np.clip(alpha*255,0,255)
matte=Image.fromarray(rgba[:,:,3]).resize((w,h),Image.Resampling.LANCZOS)
light=Image.new('RGBA',(w,h),(28,152,219,0));light.putalpha(matte)
light.save(r/'assistant/assistant-background.png')
# Retain the existing source platform/contact glow exactly, with its alpha
# transition. This is independent from the re-cut halo.
platform=np.array(Image.open(ROOT/'assets/selected/assistant-platform-source.png'))
out=np.array(light);out[329:]=platform
Image.fromarray(out).save(r/'assistant/assistant-scene.png')
meta=json.loads((r/'assistant-manifest.json').read_text())
meta['background']='Transparent source-position halo arcs and upper geometric facet; clean cyan matte, no floor/forest/gray cloud. Same halo as the main scene.'
meta['scene']='Halo re-matted from original reference contours and measured cyan stroke strength; source arc positions retained, occluded/noisy stroke samples interpolated. Upper translucent facet matte locally reconstructed. No repaired scene RGB, forest or gray cloud. Platform rows 329 onward preserved; character and lettering unchanged.'
(r/'assistant-manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
# Artifact for inspecting both transparent-edge cleanliness and dark-page use.
sheet=Image.new('RGB',(796,342))
for pos,checker in [(0,True),(398,False)]:
 bg=Image.new('RGBA',(w,h),'#081d30');d=ImageDraw.Draw(bg)
 if checker:
  for y in range(0,h,12):
   for x in range(0,w,12):
    if (x//12+y//12)%2:d.rectangle((x,y,x+11,y+11),fill='#26394a')
 bg.alpha_composite(Image.fromarray(out));sheet.paste(bg,(pos,0))
sheet.save(ROOT/'audit/assistant-halo-recut.png')
