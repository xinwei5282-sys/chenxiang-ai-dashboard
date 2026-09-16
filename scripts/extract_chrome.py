from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'assets/selected/reference.png'
OUT = ROOT / 'assets/extracted/chrome'
AUDIT = ROOT / 'audit/chrome-extracted-contact.png'
OUT.mkdir(parents=True, exist_ok=True)

im = Image.open(SRC).convert('RGB')
a = np.asarray(im).astype(np.float32)

def crop(box):
    x, y, w, h = box
    return a[y:y+h, x:x+w].copy()

def rgba(rgb, alpha):
    out = np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), np.clip(alpha, 0, 255).astype(np.uint8)])
    return Image.fromarray(out, 'RGBA')

def blue_edge(p):
    r,g,b = p[...,0], p[...,1], p[...,2]
    return (b > r*1.18) & (g > r*1.04) & (b > 70) & ((b-r) > 28)

def save(name, box, data):
    p = OUT / name
    data.save(p)
    return p

# Status bar: preserve the two cyan-blue luminous outlines and pointed ends.
x,y,w,h = 597,748,479,60
p = crop((x,y,w,h)); source_p = p.copy(); e = blue_edge(p)
yy,xx = np.mgrid[:h,:w]
poly = Image.new('1',(w,h)); ImageDraw.Draw(poly).polygon([(29,4),(450,4),(474,30),(450,56),(29,56),(5,30)],fill=1)
poly = np.asarray(poly,dtype=bool)
inner = poly & ~((yy <= 10) | (yy >= 50) | (xx < 35) | (xx > 444))
edge = poly & ~inner
alpha = np.zeros((h,w), np.float32); alpha[edge] = 255
# Rebuild the glass from narrow, text-free margins; no source text survives.
for j in range(h):
    samples = p[j, 36:45]
    col = np.median(samples, axis=0)
    target=col*.72+np.array([2,16,43])*.28
    fade=np.clip(np.minimum.reduce([xx[j]-35,444-xx[j],np.full(w,j-10),np.full(w,50-j)])/4,0,1)
    p[j]=p[j]*(1-fade[:,None])+target*fade[:,None]
alpha[inner] = 255
# Preserve the narrow source chevrons outside the main polygon.
chev = e & ~poly & (((xx < 29) & (yy >= 18) & (yy <= 42)) | ((xx > 450) & (yy >= 18) & (yy <= 42)))
alpha[chev] = 255
save('status-background.png', (x,y,w,h), rgba(p, alpha))

# Header is independently re-cut from source; do not restore synthetic glass.
import runpy
runpy.run_path(str(ROOT/'scripts/extract_header.py'),run_name='__main__')

# Footer: retain trapezoid double outline, top blue glow and glass fill; clear all labels/icons.
x,y,w,h = 340,850,992,91
p = crop((x,y,w,h)); e = blue_edge(p)
yy,xx = np.mgrid[:h,:w]
trap = Image.new('1',(w,h)); ImageDraw.Draw(trap).polygon([(130,2),(860,2),(991,90),(0,90)],fill=1)
trap = np.asarray(trap,dtype=bool)
left = np.maximum(0, 130 - (yy-2)*130/88).astype(int)
right = np.minimum(w-1, 860 + (yy-2)*131/88).astype(int)
fill = trap & (xx >= left) & (xx <= right)
keep = e & fill & ((yy < 10) | (xx < left+10) | (xx > right-10))
alpha = np.where(fill, 172, 0).astype(np.float32)
alpha[keep] = 255
for j in range(h):
    # sample clean dark glass from the extreme lower corners
    c = np.median(np.vstack([p[j, :30], p[j, -30:]]), axis=0)
    target = fill[j] & ~keep[j]
    p[j, target] = c * .62 + np.array([2,18,48])*.38
save('footer-background.png', (x,y,w,h), rgba(p, alpha))

# Contact sheet on a neutral checkerboard for visual QA.
items = [Image.open(OUT/n).convert('RGBA') for n in ('status-background.png','header-background.png','footer-background.png')]
scale = 2
sizes = [(i.width*scale, i.height*scale) for i in items]
W = max(s[0] for s in sizes); H = sum(s[1] for s in sizes) + 24*2
sheet = Image.new('RGBA',(W,H),(35,35,40,255)); d=ImageDraw.Draw(sheet)
cy=24
for i in items:
    q=i.resize((i.width*scale,i.height*scale),Image.Resampling.NEAREST)
    bg=Image.new('RGBA',q.size,(0,0,0,0)); bd=ImageDraw.Draw(bg)
    for j in range(0,q.height,16):
        for k in range(0,q.width,16):
            bd.rectangle((k,j,k+16,j+16),fill=((235,235,235,255) if ((k//16+j//16)%2==0) else (190,190,190,255)))
    sheet.alpha_composite(bg,(0,cy)); sheet.alpha_composite(q,(0,cy)); cy += q.height+24
sheet.convert('RGB').save(AUDIT)

manifest = {'source': 'assets/selected/reference.png', 'coordinateConvention':'x,y,width,height', 'items': {
 'status-background.png': {'bbox':[597,748,479,60], 'notes':'source cyan outline; text removed; interior reconstructed'},
 'header-background.png': {'bbox':[0,0,1671,97], 'notes':'Full-width original horizontal light band and complete optical wings, clean translucent glass; no landscape texture'},
 'footer-background.png': {'bbox':[340,850,992,91], 'notes':'source trapezoid outline/top glow; labels and icons removed'}
}, 'alpha': 'outside contours transparent; interior glass semi-transparent; source PNG cannot restore underlying alpha losslessly'}
(ROOT/'assets/extracted/chrome-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
