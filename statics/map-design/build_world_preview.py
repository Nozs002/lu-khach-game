"""Concept world overview, not runtime map or collision data."""
from pathlib import Path
import random
from PIL import Image, ImageDraw, ImageFont

random.seed(31)
ROOT=Path(__file__).resolve().parents[2]
ASSETS=Path(r'D:\My_Windows_Files\Downloads\Ninja Adventure - Asset Pack\Ninja Adventure - Asset Pack')
OUT=Path(__file__).resolve().parent
S=16; W=112; H=72
world=Image.new('RGBA',(W*S,H*S),'#789f39')
def crop(sheet,box):return Image.open(ASSETS/'Backgrounds/Tilesets'/f'{sheet}.png').convert('RGBA').crop(box)
grass=crop('TilesetFloor',(176,192,192,208));dirt=crop('TilesetFloor',(256,128,272,144))
tree=crop('TilesetNature',(0,0,32,32));pine=crop('TilesetNature',(32,0,64,32))
rock=crop('TilesetNature',(240,96,272,128))
def paste(im,x,y):world.alpha_composite(im,(int(x*S),int(y*S)))
for y in range(H):
 for x in range(W):paste(grass,x,y)
d=ImageDraw.Draw(world)
# Scenic margins are not extra playable regions.
for x,y,rx,ry in [(23,13,16,7),(37,12,12,5),(14,16,9,5)]:
 d.ellipse(((x-rx)*S,(y-ry)*S,(x+rx)*S,(y+ry)*S),fill='#4e8783',outline='#b2bc73',width=12)
 d.arc(((x-rx+2)*S,(y-ry+2)*S,(x+rx-2)*S,(y+ry-2)*S),15,120,fill='#83bab0',width=3)

paths=set()
def road(points,width=3):
 for (ax,ay),(bx,by) in zip(points,points[1:]):
  assert ax==bx or ay==by
  for y in range(min(ay,by)-width//2,max(ay,by)+width//2+1):
   for x in range(min(ax,bx)-width//2,max(ax,bx)+width//2+1):
    if 0<=x<W and 0<=y<H:paths.add((x,y))
road([(35,44),(57,44),(77,44),(94,44),(94,16)])
road([(50,44),(50,34),(55,34)])
road([(57,44),(57,53),(72,53),(72,44)])
road([(77,44),(77,24),(94,24)])
road([(94,44),(94,60),(102,60)])
for x,y in paths:paste(dirt,x,y)

# Stream through the forest; the bridge and a northern bypass both work visually.
d=ImageDraw.Draw(world)
d.line([(84*S,27*S),(84*S,35*S),(86*S,40*S),(85*S,50*S),(85*S,58*S)],fill='#b2bc73',width=6*S)
d.line([(84*S,27*S),(84*S,35*S),(86*S,40*S),(85*S,50*S),(85*S,58*S)],fill='#4e979a',width=4*S)
for y in range(42,47):
 d.rectangle((82*S,y*S,89*S,y*S+12),fill='#ba8b52',outline='#795537',width=2)
d.line((82*S,42*S,89*S,42*S),fill='#e4bf79',width=4)
d.line((82*S,47*S,89*S,47*S),fill='#e4bf79',width=4)

# Forest clusters leave the roads and the bypass legible.
for y in range(4,68,2):
 for x in range(2,109,2):
  forest=x>=73 and y>=20
  border=x<4 or x>106 or y>65
  woods=(x>=49 and y<26) or (x<43 and y>54)
  if not (forest or border or woods):continue
  if 81<=x<=105 and 4<=y<=22:continue
  if 81<=x<=88 and 26<=y<=59:continue
  if 99<=x<=105 and 56<=y<=63:continue
  if any((x+dx,y+dy) in paths for dx in range(-1,3) for dy in range(-1,3)):continue
  if random.random() < (.88 if forest else .65):paste(pine if forest else tree,x,y)

# Existing village is an art reference; its border opening meets the main road.
village=Image.open(ROOT/'source/client/public/assets/maps/m0-village.png').convert('RGBA')
world.alpha_composite(village,(4*S,24*S))

# Mill landmark north of the meadow road.
d=ImageDraw.Draw(world)
d.rectangle((53*S,30*S,57*S,35*S),fill='#bd995d',outline='#735437',width=3)
d.polygon([(52*S,30*S),(55*S,27*S),(58*S,30*S)],fill='#bd6944')
d.line((53*S,29*S,57*S,33*S),fill='#e3d8a8',width=9)
d.line((57*S,29*S,53*S,33*S),fill='#e3d8a8',width=9)
# Stopped merchant cart south of the junction.
d.rectangle((61*S,49*S,65*S,51*S),fill='#a77945',outline='#674931',width=3)
for cx in [62,64]:d.ellipse((cx*S,51*S,cx*S+10,51*S+10),fill='#3d3b2c')

# Abandoned outpost: broken boundary, yard and watchtower.
d.rectangle((82*S,5*S,105*S,21*S),fill='#a7a17c')
d.rectangle((86*S,10*S,101*S,20*S),fill='#bab38c')
for x in list(range(82,91))+list(range(98,106)):
 paste(rock,x,20)
for y in range(5,20,2):paste(rock,82,y);paste(rock,104,y)
for x in range(82,104,2):paste(rock,x,4)
d.rectangle((91*S,6*S,97*S,12*S),fill='#777b6c',outline='#434b42',width=4)
d.polygon([(90*S,6*S),(94*S,3*S),(98*S,6*S)],fill='#6a5141')
d.rectangle((93*S,9*S,95*S,12*S),fill='#3a4238')
for x,y in [(84,16),(100,15),(102,8)]:paste(rock,x,y)

# Cave entrance, not a continuous outdoor room.
for x,y in [(99,57),(101,56),(103,57)]:paste(rock,x,y)
d=ImageDraw.Draw(world)
d.ellipse((101*S,58*S,105*S,62*S),fill='#706e5b')
d.ellipse((102*S,59*S,104*S,62*S),fill='#252e2a')

# Landmark numbers stay identifiable at overview scale; names live in the legend.
font=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',24)
for label,x,y in [('M0',19,36),('M1',58,41),('M2',95,38),('M3',94,17),('M4',103,64)]:
 cx=x*S;cy=y*S
 d.rounded_rectangle((cx-31,cy-18,cx+31,cy+18),radius=5,fill='#172e28',outline='#e9d79d',width=2)
 d.text((cx,cy),label,font=font,anchor='mm',fill='#f5e9c6')
world.convert('RGB').save(OUT/'world-overview.png')

# Separate cave interior sketch.
cave=Image.new('RGB',(512,384),'#252e2a');cd=ImageDraw.Draw(cave)
rooms=[(32,136,152,248),(176,104,288,216),(328,56,472,184),(328,248,472,352)]
for box in rooms:cd.rounded_rectangle(box,radius=20,fill='#8a876e',outline='#b0a889',width=7)
for a,b in [((136,184),(208,160)),((256,160),(352,112)),((256,184),(352,288)),((400,144),(400,288))]:
 cd.line((a,b),fill='#b0a889',width=39);cd.line((a,b),fill='#8a876e',width=25)
cd.rectangle((0,176,56,208),fill='#ba9c69')
cd.ellipse((388,91,420,123),fill='#656e5c',outline='#bec09a',width=3)
cave.save(OUT/'cave-overview.png')
print('Created world-overview.png (112 × 72 outdoor concept) and cave-overview.png (separate interior).')
