"""Expand the world concept to 172x314 tiles; design preview only."""
from pathlib import Path
import math, random, runpy, json
from PIL import Image, ImageDraw, ImageFont

OUT=Path(__file__).resolve().parent
runpy.run_path(str(OUT/'build_world_preview.py'))
random.seed(172314)
S=16;W=172;H=314
im=Image.new('RGB',(W*S,H*S),'#73963c');d=ImageDraw.Draw(im)
# Northern dry region, with a scrub transition toward the forest.
d.rounded_rectangle((44*S,12*S,164*S,126*S),radius=16*S,fill='#b6a365')
d.rounded_rectangle((48*S,20*S,160*S,116*S),radius=12*S,fill='#d5b47a')
for _ in range(160):
 x=random.randrange(54,154);y=random.randrange(26,110)
 d.arc((x*S,y*S,(x+5)*S,(y+2)*S),180,345,fill='#b98f5c',width=3)
for _ in range(55):
 x=random.randrange(50,162);y=random.randrange(120,140)
 d.ellipse((x*S,y*S,(x+1)*S,(y+1)*S),fill='#a99a65')
# Western coastline. Water and shore follow the same continuous contour.
for y in range(96,246):
 coast=int(24+5*math.sin(y/15)+2*math.sin(y/6))
 d.rectangle((0,y*S,(coast+12)*S,(y+1)*S),fill='#d7c48e')
 d.rectangle((0,y*S,coast*S,(y+1)*S),fill='#498b9a')
 d.rectangle((coast*S,y*S,(coast+1)*S,(y+1)*S),fill='#a5d2c4')
for _ in range(100):
 x=random.randrange(1,20);y=random.randrange(105,235)
 d.line((x*S,y*S,(x+2)*S,y*S),fill='#71a9ac',width=2)

# Forest sprites, using the same locally supplied art as the previous preview.
ASSETS=Path(r'D:\My_Windows_Files\Downloads\Ninja Adventure - Asset Pack\Ninja Adventure - Asset Pack')
sheet=Image.open(ASSETS/'Backgrounds/Tilesets/TilesetNature.png').convert('RGBA')
tree=sheet.crop((32,0,64,32))
roads=set()
def road(points,width=3,color='#b18c58'):
 for (ax,ay),(bx,by) in zip(points,points[1:]):
  assert ax==bx or ay==by
  for y in range(min(ay,by)-width//2,max(ay,by)+width//2+1):
   for x in range(min(ax,bx)-width//2,max(ax,bx)+width//2+1):
    roads.add((x,y));d.rectangle((x*S,y*S,(x+1)*S,(y+1)*S),fill=color)
road([(102,278),(126,278),(126,210),(104,210),(104,112),(104,72)],color='#ad915e')
road([(40,188),(104,188)])
road([(66,278),(58,278),(58,220),(40,220),(40,188)])
# Forest covers the central region but leaves clear corridors and glades.
for y in range(140,226,2):
 for x in range(60,160,2):
  if any((x+dx,y+dy) in roads for dx in range(-1,3) for dy in range(-1,3)):continue
  if (x-88)**2+(y-166)**2<70 or (x-136)**2+(y-197)**2<60:continue
  if random.random()<.89:im.paste(tree,(x*S,y*S),tree)
# Oasis and ruins provide a northward destination.
d=ImageDraw.Draw(im)
d.ellipse((116*S,46*S,140*S,62*S),fill='#b2b36e')
d.ellipse((121*S,50*S,135*S,58*S),fill='#548f8b')
for x,y in [(92,43),(96,43),(92,49),(100,49),(90,82),(95,84)]:
 d.rectangle((x*S,y*S,(x+2)*S,(y+5)*S),fill='#a38d68',outline='#7e725c',width=3)
# Pier and beach landmark.
d.rectangle((16*S,184*S,38*S,187*S),fill='#a47d4f')
for x in range(16,38):d.line((x*S,184*S,x*S,187*S),fill='#70593e',width=2)

# Keep the original M0-M4 composition at the southern end of the larger world.
south=Image.open(OUT/'world-overview.png').convert('RGB')
im.paste(south,(8*S,234*S))
# Rejoin the northward and coastal branches after the southern composition is pasted.
d=ImageDraw.Draw(im)
road([(102,278),(126,278),(126,210)],color='#ad915e')
road([(66,278),(58,278),(58,220)],color='#ad915e')
font=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',30)
for label,x,y in [('M5',108,174),('M6',44,158),('M7',105,65)]:
 cx=x*S;cy=y*S
 d.rounded_rectangle((cx-38,cy-24,cx+38,cy+24),radius=5,fill='#172e28',outline='#e9d79d',width=3)
 d.text((cx,cy),label,font=font,anchor='mm',fill='#f5e9c6')
im.save(OUT/'world-172x314.png')
im.resize((688,1256),Image.Resampling.NEAREST).save(OUT/'world-172x314-small.png')
meta={'width':W,'height':H,'previewOnly':True,'regions':{
 'M0':{'name':'Bến Cỏ','box':[12,258,32,24]},
 'M1':{'name':'Đồng Cỏ Ven Đường','box':[48,260,40,30]},
 'M2':{'name':'Rừng Qua Suối','box':[82,254,48,48]},
 'M3':{'name':'Trạm Gác Cũ','box':[86,234,32,24]},
 'M4':{'name':'Hang Đá','interior':True,'entrance':[111,294]},
 'M5':{'name':'Rừng Sâu','box':[60,140,100,86]},
 'M6':{'name':'Bờ Biển','box':[0,120,60,110]},
 'M7':{'name':'Sa Mạc','box':[48,20,112,96]}},
 'connections':[['M0','M1'],['M1','M2'],['M2','M3'],['M2','M4'],['M2','M5'],['M5','M6'],['M5','M7'],['M1','M6']]}
(OUT/'world-172x314.design.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Created 172x314 outdoor concept with eight region IDs; M4 interior remains separate.')
