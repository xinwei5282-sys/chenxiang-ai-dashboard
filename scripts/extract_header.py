"""Full-width source header lights; never clip optical wings to a title box."""
from pathlib import Path
import sys,json
sys.path.insert(0,'/private/tmp/chenxiang-image-deps')
import cv2,numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'assets/extracted'
a=np.array(Image.open(ROOT/'assets/selected/reference.png').convert('RGB').crop((0,0,1671,97))).astype(float)
h,w=a.shape[:2];yy,xx=np.mgrid[:h,:w]
# Wide optical corridors cover every parallel diagonal and its surrounding
# bloom, including the faint outer tips. The reference is not cropped at wings.
u=xx-yy;v=(1670-xx)-yy
left=np.clip(np.minimum((u-408)/12,(511-u)/14),0,1)
right=np.clip(np.minimum((v-408)/12,(511-v)/14),0,1)
wing=np.maximum(left,right)*np.clip((96-yy)/4,0,1)
# Estimate the local scenic base across the strokes, with a broad support so
# solid luminous bars survive as well as their fine borders.
bg=cv2.GaussianBlur(a,(0,0),15)
signal=np.maximum(a[:,:,2]-bg[:,:,2],0)
signal=np.maximum(signal,(a[:,:,1]-bg[:,:,1])*.8)
light=np.clip(signal/125,0,1)*wing
# Source cyan selection excludes green/brown forest features. A light, diagonal
# averaging pass removes isolated scene noise while retaining aligned strokes.
blue=np.clip((a[:,:,2]-a[:,:,0]-20)/45,0,1)
light*=blue
smooth=np.zeros_like(light)
for shift in [-1,0,1]:
 l=np.roll(np.roll(light,shift,axis=0),shift,axis=1)
 q=np.roll(np.roll(light,shift,axis=0),-shift,axis=1)
 smooth+=np.where(xx<w/2,l,q)/3
light=np.maximum(light*.8,smooth)
# Keep the WHOLE horizontal source light band, including its side extensions.
for y in range(85,96):
 baseline=np.minimum(a[84,:,2],a[96,:,2])
 ridge=np.maximum(a[y,:,2]-baseline,0)/180
 ridge*=np.clip((a[y,:,2]-a[y,:,0]-10)/35,0,1)
 light[y]=np.maximum(light[y],np.clip(ridge,0,1))
light[light<.007]=0
# Colour stays cyan/white-blue, never a copy of forest RGB.
white=np.clip((a[:,:,0]-80)/125,0,1)
colour=np.dstack([35+200*white,160+90*white,np.full((h,w),255.)])
# Separate clean glass fill below the native HTML heading.
glass=Image.new('L',(w*4,h*4));d=ImageDraw.Draw(glass)
d.polygon([(437*4,0),(1234*4,0),(1137*4,90*4),(517*4,90*4)],fill=175)
basea=np.array(glass.resize((w,h),Image.Resampling.LANCZOS))/255
alpha=light+basea*(1-light)
rgb=(colour*light[:,:,None]+np.array([2.,20.,39.])*basea[:,:,None]*(1-light[:,:,None]))/np.maximum(alpha[:,:,None],1e-6)
rgb[alpha==0]=0
Image.fromarray(np.dstack([np.clip(rgb,0,255).astype('uint8'),np.clip(alpha*255,0,255).astype('uint8')])).save(out/'chrome/header-background.png')
mp=out/'chrome-manifest.json';meta=json.loads(mp.read_text());meta['items']['header-background.png']={'bbox':[0,0,1671,97],'notes':'Full-width source horizontal band, complete parallel optical wings and outer bloom. Cyan source light matte over plain navy glass; no forest RGB or text. Optical bounds are not clipped to the heading box.'};mp.write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
mp=out/'source-map.json';meta=json.loads(mp.read_text());meta['headerBackground']=[0,0,1671,97];mp.write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
print('Full-width header:',w,h)
