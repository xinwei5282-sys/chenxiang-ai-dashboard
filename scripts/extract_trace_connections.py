#!/usr/bin/env python3
"""Extract reference orbit light; fill only the source caption occlusions.
Upper source coordinates stay on the 1671x941 canvas. The original lower arc
is translated upward 63px without changing its curve, landing below the icon center.
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
source=Image.open(ROOT/'assets/selected/orbit-reference.png').convert('RGB')
rgb=np.array(source).astype(float)
baseline=np.array(source.filter(ImageFilter.GaussianBlur(9))).astype(float)
y,x=np.mgrid[:source.height,:source.width]
# Fit against visible source ridge samples: (778,300), (749,305), (735,310),
# (593,375), (574,395), (554,420), (543,440), (555,600), (577,620), (593,630).
cx,cy,rx,ry=835.,505.25345,308.76835,207.90089
norm=np.sqrt(((x-cx)/rx)**2+((y-cy)/ry)**2)
normal=np.maximum(np.sqrt(((x-cx)/rx**2)**2+((y-cy)/ry**2)**2),.001)
d=(norm-1)*np.maximum(norm,.001)/normal
# Capture the main arc and its inward parallel track, including source flares.
band=np.exp(-(d/11)**4)+.8*np.exp(-((d+13)/6)**4)
band=np.clip(band,0,1)
residual=np.maximum(rgb-baseline,0)
blue=np.clip((rgb[:,:,2]-rgb[:,:,0]-20)/45,0,1)
white=np.clip((np.min(rgb,axis=2)-175)/45,0,1)
strength=np.max(residual,axis=2)
a=np.clip(strength/80,0,1)*band*np.maximum(blue,white)*np.clip((rgb[:,:,1]-55)/100,0,1)
color=rgb/np.maximum(rgb[:,:,2:3],1)*255
# Old caption beds are not part of the light layer.
old_boxes=[(576,384,725,438),(740,324,931,374),(947,389,1100,440),(466,541,620,594),(1057,541,1207,594),(753,665,918,718)]
covered=np.zeros_like(a)
for l,t,r,b in old_boxes:covered[t:b,l:r]=1
# Reconstruct missing arcs in those small rectangles with measured geometry.
# Their shape follows the original fitted orbit, not the icon centers.
core=np.exp(-(d/1.05)**2)
halo=.22*np.exp(-(d/4.8)**2)
inner=.28*np.exp(-((d+13)/.8)**2)
repair=np.clip(core*.83+halo+inner,0,1)
# Under the platform, source building edges contaminate a light-only cutout.
# Use the measured continuous arcs there; keep the actual source flares above.
covered=np.maximum(covered,np.clip((y-640)/35,0,1))
covered=np.array(Image.fromarray(np.uint8(covered*255)).filter(ImageFilter.GaussianBlur(2)))/255
repair_color=np.zeros_like(color)+[68,182,255]
a=a*(1-covered)+repair*covered
color=color*(1-covered[:,:,None])+repair_color*covered[:,:,None]
# Latest user direction: restore the previous lower arc and translate it up.
# Preserve the prior curve, parallel line and source flares; do not redraw
# diagonal branches. The previous lower edge (~713) moves to 650, 20px below the icon center.
shift=63
lower_a=a*np.clip((y-589)/7,0,1)
shifted_a=np.zeros_like(a)
shifted_color=np.zeros_like(color)
shifted_a[:-shift]=lower_a[shift:]
shifted_color[:-shift]=color[shift:]
a*=np.clip((510-y)/8,0,1)
combined=a+shifted_a*(1-a)
color=(color*a[:,:,None]*(1-shifted_a[:,:,None])+shifted_color*shifted_a[:,:,None])/np.maximum(combined[:,:,None],.001)
a=combined
# Existing icon PNGs provide the full original circular artwork.
for xx,yy,rr in [(650,354,44),(835,296,46),(1021,354,44),(1125,503,44),(834,630,47),(544,503,44)]:
 a*=np.clip((np.hypot(x-xx,y-yy)-(rr+3))/5,0,1)
# Fade under live labels, with no opaque bed or hard clipped light ends.
mask=Image.new('L',source.size,255);draw=ImageDraw.Draw(mask)
for xx,top in [(650,384),(835,324),(1021,389),(1125,541),(834,665),(544,541)]:
 draw.rounded_rectangle((xx-87,top,xx+87,top+54),radius=5,fill=0)
a*=np.array(mask.filter(ImageFilter.GaussianBlur(3)))/255
rgba=np.dstack([np.clip(color,0,255).astype('uint8'),np.uint8(np.clip(a,0,1)*255)])
Image.fromarray(rgba).save(ROOT/'assets/extracted/scene/trace-connections.png')
# Aligned transparent overlay for inspecting source geometry, not a new scene.
bg=Image.new('RGBA',source.size,'#061c30');bg.alpha_composite(Image.fromarray(rgba));bg.convert('RGB').save(ROOT/'audit/source-orbit-extraction.png')
print('Original lower arc moved down 20px from prior version; lower edge now about 650px.')
