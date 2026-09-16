"""Original-pixel character matte and locally repaired background (not source layers)."""
from pathlib import Path
import sys,json
sys.path.insert(0, '/private/tmp/chenxiang-image-deps')
import cv2
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/extracted/assistant'; OUT.mkdir(parents=True,exist_ok=True)
src=Image.open(ROOT/'assets/selected/reference.png').convert('RGB').crop((1245,250,1643,592))
# Outline measured on the 3x source preview, retaining all original face/clothing pixels.
points=[(563,25),(548,18),(541,28),(536,36),(539,16),(550,10),(566,5),(585,6),(604,15),(615,28),(620,38),(615,46),(607,51),(610,39),(603,26),(604,40),(593,64),(602,80),(625,99),(647,121),(655,139),(674,127),(693,132),(709,147),(720,171),(724,199),(727,218),(735,236),(732,246),(723,254),(709,254),(698,265),(691,282),(701,289),(703,307),(694,331),(679,343),(661,349),(653,350),(644,360),(636,373),(603,385),(594,391),(596,412),(620,423),(647,438),(658,454),(666,482),(680,524),(696,550),(704,567),(708,602),(725,633),(733,635),(750,685),(730,694),(730,707),(738,733),(743,752),(740,774),(730,793),(717,805),(707,805),(706,799),(699,804),(692,799),(694,789),(701,779),(704,760),(700,749),(703,772),(695,779),(689,775),(687,756),(686,731),(681,713),(676,712),(678,735),(683,808),(687,853),(697,895),(692,916),(683,927),(662,937),(663,954),(685,970),(715,983),(722,999),(722,1012),(681,1015),(644,1016),(617,1015),(585,1013),(582,998),(587,980),(593,968),(591,937),(573,938),(561,930),(558,915),(559,895),(555,854),(549,813),(544,803),(536,844),(538,903),(535,920),(532,936),(505,939),(503,955),(500,981),(503,1003),(502,1013),(465,1018),(419,1018),(391,1014),(392,996),(402,978),(419,961),(431,950),(431,936),(410,928),(401,917),(402,901),(414,883),(421,849),(426,807),(431,770),(419,759),(415,746),(420,713),(420,685),(421,663),(432,639),(433,628),(450,636),(453,600),(456,568),(436,579),(421,572),(395,571),(369,562),(350,554),(330,548),(316,535),(301,523),(291,509),(287,495),(284,478),(273,475),(247,472),(231,465),(212,455),(202,447),(196,441),(192,434),(198,433),(192,428),(191,422),(198,417),(208,416),(222,419),(241,423),(257,423),(251,414),(244,407),(241,399),(244,393),(250,392),(261,401),(271,409),(283,419),(294,429),(301,442),(312,443),(320,443),(334,450),(355,460),(368,465),(381,460),(398,454),(417,439),(436,425),(467,419),(487,414),(494,403),(497,389),(518,396),(517,383),(496,373),(481,365),(478,355),(468,364),(466,354),(453,350),(446,339),(422,326),(409,307),(400,287),(401,267),(410,258),(409,246),(395,235),(386,223),(381,210),(393,216),(409,216),(419,209),(398,213),(400,195),(410,177),(417,166),(415,151),(412,139),(413,122),(424,100),(426,113),(437,114),(454,105),(474,91),(498,78),(522,71),(543,68),(563,72),(570,59),(578,44),(579,31),(568,24)]
mask3=Image.new('L',(1194,1026));ImageDraw.Draw(mask3).polygon(points,fill=255)
alpha=np.array(mask3.resize(src.size,Image.Resampling.LANCZOS))
rgb=np.array(src)
# Small boundary refinement only; the hand-drawn contour protects dark hair and fingers.
binary=(alpha>100).astype('uint8')
gc=np.where(binary,cv2.GC_PR_FGD,cv2.GC_PR_BGD).astype('uint8')
gc[cv2.erode(binary,np.ones((5,5),np.uint8))>0]=cv2.GC_FGD
gc[cv2.dilate(binary,np.ones((5,5),np.uint8))==0]=cv2.GC_BGD
cv2.grabCut(rgb,gc,None,np.zeros((1,65)),np.zeros((1,65)),3,cv2.GC_INIT_WITH_MASK)
refined=np.isin(gc,[cv2.GC_FGD,cv2.GC_PR_FGD]).astype('uint8')*255
# Original manual antialiasing where segmentation agrees, gentle subpixel edge elsewhere.
soft=cv2.GaussianBlur(refined,(3,3),.45)
alpha=np.where((refined>0)==(alpha>100),alpha,soft).astype('uint8')
full=Image.fromarray(np.dstack([rgb,alpha]))
bbox=full.getbbox(); full.crop(bbox).save(OUT/'assistant-character.png')
repair=cv2.dilate((alpha>8).astype('uint8'),np.ones((5,5),np.uint8))*255
# Fill the occluded region from clean horizontal boundary colours; avoid
# Telea carrying residual skin/shoe colours across a large missing region.
repair=cv2.dilate(repair,np.ones((13,13),np.uint8))
patch=rgb.astype(np.float32).copy()
for y in range(rgb.shape[0]):
 xs=np.flatnonzero(repair[y])
 if not len(xs):continue
 l,r=int(xs[0]),int(xs[-1]);lo=max(0,l-6);hi=min(rgb.shape[1],r+7)
 lc=np.median(rgb[max(0,y-3):min(342,y+4),lo:max(lo+1,l)],axis=(0,1))
 rc=np.median(rgb[max(0,y-3):min(342,y+4),min(r+1,397):hi],axis=(0,1))
 for x in range(l,r+1):patch[y,x]=lc+(rc-lc)*(x-l)/max(1,r-l)
patch=cv2.GaussianBlur(patch,(0,0),5)
blend=cv2.GaussianBlur(repair.astype(np.float32)/255,(0,0),2)[...,None]
bg=np.clip(rgb*(1-blend)+patch*blend,0,255).astype('uint8')
Image.fromarray(bg).save(OUT/'assistant-background.png')
Image.fromarray(bg).save(OUT/'assistant-scene.png')
meta={'source':'assets/selected/reference.png','backgroundBox':[1245,250,398,342],'characterOffset':list(bbox[:2]),'characterSize':[bbox[2]-bbox[0],bbox[3]-bbox[1]],'method':'Original RGB with manually measured matte and GrabCut boundary refinement. Character-occluded background locally inpainted; not recovered original layers.'}
(ROOT/'assets/extracted/assistant-manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
checker=Image.new('RGBA',src.size,(45,49,57,255));d=ImageDraw.Draw(checker)
for y in range(0,src.height,12):
 for x in range(0,src.width,12):
  if (x//12+y//12)%2==0:d.rectangle((x,y,x+11,y+11),fill=(75,80,90,255))
checker.alpha_composite(full)
composite=Image.fromarray(bg).convert('RGBA');composite.alpha_composite(full)
sheet=Image.new('RGB',(398*3,342));sheet.paste(checker,(0,0));sheet.paste(Image.fromarray(bg),(398,0));sheet.paste(composite,(796,0));sheet.save(ROOT/'audit/assistant-extracted-contact.png')
print(json.dumps(meta,ensure_ascii=False))

# Keep the latest separated halo/calligraphy outputs when rebuilding the character.
import runpy
runpy.run_path(str(ROOT/"scripts/extract_assistant_decor.py"),run_name="__main__")

runpy.run_path(str(ROOT/"scripts/restore_assistant_scene.py"),run_name="__main__")
