"""Preserve the selected source scene; remove UI without replacing its tree."""
from pathlib import Path
import sys,json
sys.path.insert(0,'/private/tmp/chenxiang-image-deps')
import cv2
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/extracted/scene';OUT.mkdir(exist_ok=True)
source=np.array(Image.open(ROOT/'assets/selected/reference.png').convert('RGB'))
h,w=source.shape[:2]
# Never replace the visible source tree/globe/pedestal/orbits/icon artwork.
# Only UI-covered areas use clean scenery fill; hidden pixels are unavailable.
fill=np.array(Image.open(ROOT/'assets/layers/01-forest-background.png').convert('RGB').resize((w,h),Image.Resampling.LANCZOS))
# Feather only the transition into UI-covered outer areas. The visible
# central source platform, tree and icons are retained without resampling.
yy,xx=np.mgrid[:h,:w]
# Correct the pale fog/cliff patch explicitly marked by the user (reference
# coordinates about x1177..1440,y199..517). This adjusts only the replacement
# scenery, never the source tree, icons, tracks or assistant asset.
seam=np.clip(np.minimum.reduce([(xx-1158)/55,(1465-xx)/60,(yy-184)/45,(550-yy)/55]),0,1)
seam=seam*seam*(3-2*seam)
# Replace the mismatched mist patch with nearby clean forest texture, then
# feather into surrounding scenery. No rectangular darkening overlay.
donor=Image.fromarray(fill).crop((1375,540,1671,906)).resize((307,366),Image.Resampling.LANCZOS)
texture=fill.copy();texture[184:550,1158:1465]=np.array(donor)
fill=np.clip(fill*(1-seam[:,:,None])+texture*seam[:,:,None],0,255).astype('uint8')
weight=np.clip(np.minimum.reduce([(xx-421)/48,(1237-xx)/48,(yy-194)/35,(850-yy)/85]),0,1)
weight=weight*weight*(3-2*weight)
surface=Image.new('L',(w,h));d=ImageDraw.Draw(surface)
d.polygon([(620,746),(1052,746),(1080,779),(1052,811),(620,811),(592,779)],fill=255)
status=np.array(surface.filter(ImageFilter.GaussianBlur(5))).astype(float)/255
status[np.array(surface)>0]=1
weight*=1-status
mask=1-weight
scene=np.clip(source*weight[:,:,None]+fill*(1-weight[:,:,None]),0,255).astype('uint8')
boxes=[]
# Inpaint only white glyph strokes, preserving original label beds and icons.
regions=[(750,201,919,246),(578,390,725,434),(763,328,909,370),
         (969,390,1089,434),(1061,545,1203,591),(769,668,907,714),(475,546,617,591)]
textmask=np.zeros((h,w),np.uint8)
for x0,y0,x1,y1 in regions:
 p=source[y0:y1,x0:x1].astype(float)
 lettering=(p[:,:,0]>75)&(p[:,:,1]>80)&(p[:,:,0]>.58*p[:,:,2])
 textmask[y0:y1,x0:x1]=cv2.dilate(lettering.astype('uint8')*255,np.ones((7,7),np.uint8))
repaired=cv2.inpaint(scene,textmask,5,cv2.INPAINT_NS)
soft=cv2.GaussianBlur(repaired,(0,0),2)
scene[textmask>0]=soft[textmask>0]
Image.fromarray(scene).save(OUT/'full-scene.png',optimize=True)
protected=np.zeros((h,w),bool);protected[247:745,432:1234]=True
protected &= (textmask==0)&(mask==0)
assert np.array_equal(scene[protected],source[protected])
Image.fromarray(textmask).save(ROOT/'audit/scene-removed-text-mask.png')
meta={'size':[w,h],'file':'scene/full-scene.png','source':'assets/selected/reference.png',
      'method':'Original source pixels retained for tree, globe, pedestal, tracks and six icons. Node lettering beds locally repaired from clean neighbouring colours.',
      'preservedCentralPixels':int(protected.sum()),'fillBoundary':'UI-covered scenery uses a reconstructed clean background; hidden pixels cannot be recovered from a flattened PNG.',
      'forestSeamCorrection':{'box':[1158,184,307,366],'method':'Nearby clean forest texture replaces the mismatched fog patch with feathered edges; original central pixels unchanged.'},
      'textRemovalRegions':regions,'sceneryFillBoxes':boxes}
(ROOT/'assets/extracted/scene-manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(meta,ensure_ascii=False))
