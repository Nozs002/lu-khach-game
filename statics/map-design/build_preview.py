"""Compose a review mockup from local Ninja Adventure sprites; no runtime data."""
from pathlib import Path
import random
import re
import argparse
from PIL import Image, ImageDraw, ImageFont

parser = argparse.ArgumentParser()
parser.add_argument('--assets', type=Path, default=Path(r'D:\My_Windows_Files\Downloads\Ninja Adventure - Asset Pack\Ninja Adventure - Asset Pack'))
parser.add_argument('--runtime', action='store_true', help='Export the M0 background without sample players')
args = parser.parse_args()
ROOT = args.assets
OUT = Path(__file__).resolve().parent
REPO = OUT.parent.parent
random.seed(17)

def crop(sheet, box):
    return Image.open(ROOT / 'Backgrounds/Tilesets' / (sheet + '.png')).convert('RGBA').crop(box)

assets = {
    'grass': crop('TilesetFloor', (176, 192, 192, 208)),
    'grass_detail': crop('TilesetFloor', (192, 192, 208, 208)),
    'path': crop('TilesetFloor', (256, 128, 272, 144)),
    'inn': crop('TilesetHouse', (0, 0, 64, 48)),
    'forge': crop('TilesetHouse', (192, 0, 256, 48)),
    'shop': crop('TilesetHouse', (256, 0, 304, 48)),
    'fountain': crop('TilesetHouse', (48, 240, 80, 272)),
    'tree': crop('TilesetNature', (0, 0, 32, 32)),
    'flower': crop('TilesetNature', (16, 176, 32, 192)),
    'bench': crop('TilesetElement', (176, 16, 224, 32)),
    'board': crop('TilesetElement', (0, 80, 16, 112)),
    'crate': crop('TilesetElement', (0, 0, 16, 16)),
}

doc = (REPO / 'docs/map-m0-village.md').read_text(encoding='utf-8')
rows = re.findall(r'^\d{2} ([#.A-Z=b]+)$', doc, re.M)
assert len(rows) == 24 and all(len(r) == 32 for r in rows)
world = Image.new('RGBA', (512, 384), '#759e32')

def put(sprite, x, y, size=None):
    if size:
        sprite = sprite.resize(size, Image.Resampling.NEAREST)
    world.alpha_composite(sprite, (int(x), int(y)))

for y, row in enumerate(rows):
    for x, cell in enumerate(row):
        put(assets['grass_detail' if random.random() < .16 else 'grass'], x*16, y*16)
        if cell in '=PG':
            put(assets['path'], x*16, y*16)

# Pale plaza paving is a procedural placeholder until a stone tile is selected.
d = ImageDraw.Draw(world)
for y in range(10, 17):
    for x in range(11, 22):
        color = random.choice(['#c9c5a6', '#d2ccb0', '#c3c2a3'])
        d.rectangle((x*16, y*16, x*16+15, y*16+15), fill=color)
        d.line((x*16, y*16+15, x*16+15, y*16+15), fill='#aaa98d')
        d.line((x*16+15, y*16, x*16+15, y*16+15), fill='#b4b397')

# Buildings use resized sprites to show the proposed footprint, pending tile assembly.
put(assets['inn'], 3*16, 2*16, (128, 80))
put(assets['forge'], 21*16, 2*16, (128, 80))
put(assets['shop'], 2*16, 10*16, (96, 80))
put(assets['crate'], 2*16, 15*16)
put(assets['crate'], 3*16, 15*16)
put(assets['fountain'], 18*16, 12*16, (48, 48))
put(assets['board'], 25*16, 10*16)

# Continuous perimeter fence; trees decorate the blocking boundary.
d = ImageDraw.Draw(world)
for y in [0, 23]:
    d.rectangle((0, y*16+6, 511, y*16+9), fill='#805534')
    d.rectangle((0, y*16+10, 511, y*16+12), fill='#c78c4a')
    for x in range(32):
        d.rectangle((x*16+6, y*16+2, x*16+10, y*16+15), fill='#a9753c')
for x in [0, 31]:
    for y in range(1, 23):
        if x == 31 and 19 <= y <= 21:
            continue
        d.rectangle((x*16+6, y*16, x*16+9, y*16+15), fill='#805534')
        d.rectangle((x*16+3, y*16+5, x*16+12, y*16+9), fill='#b77e41')
for x, y in [(1,1),(12,1),(17,1),(29,1),(1,7),(29,7),(1,17),(29,15),(12,21),(20,21),(4,18),(6,20),(3,21)]:
    put(assets['tree'], x*16-8, y*16-16)
for x,y in [(8,18),(5,21)]:
    put(assets['bench'],x*16,y*16,(32,12))
for x,y in [(2,18),(2,20),(7,21),(10,21),(4,16),(27,9),(28,9),(16,2),(17,2),(11,19)]:
    put(assets['flower'],x*16,y*16)

def person(name,x,y):
    sheet=Image.open(ROOT/'Actor/Character'/name/'SpriteSheet.png').convert('RGBA')
    put(sheet.crop((0,0,16,16)),x*16,y*16)

for name,x,y in [('Master',7,7),('ManGreen',20,7),('ManGreen',8,11),('Master',14,10),('Master',23,12),('ManGreen',28,18)]:
    person(name,x,y)

if args.runtime:
    target = REPO / 'source/client/public/assets/maps/m0-village.png'
    target.parent.mkdir(parents=True, exist_ok=True)
    world.save(target)
    print(target)
    raise SystemExit(0)

for x,y in [(13,12),(15,14)]:
    person('Boy',x,y)

fontroot=Path('C:/Windows/Fonts')
def font(size,bold=False):
    return ImageFont.truetype(str(fontroot/('arialbd.ttf' if bold else 'arial.ttf')),size)

board=Image.new('RGB',(1664,1470),'#142b2b')
bd=ImageDraw.Draw(board)
bd.text((64,34),'BẾN CỎ',font=font(44,True),fill='#f0e8ca')
bd.text((66,91),'M0 / MAP NGHỈ     •     Ban ngày, sáng và yên bình',font=font(23),fill='#acc5ab')
board.paste(world.convert('RGB').resize((1536,1152),Image.Resampling.NEAREST),(64,145))
marks=[('1',6,3),('2',24,3),('3',4,11),('4',19,13),('5',25,10),('6',7,19),('7',29,20)]
for label,x,y in marks:
    cx=64+x*48+24;cy=145+y*48-6
    bd.ellipse((cx-17,cy-17,cx+17,cy+17),fill='#173c3b',outline='#f0dc9d',width=2)
    bd.text((cx,cy),label,font=font(20,True),anchor='mm',fill='#fff3cc')
bd.text((64,1322),'1  Quán trọ     2  Lò rèn     3  Tạp hóa     4  Đài phun nước',font=font(25),fill='#f0e8ca')
bd.text((64,1360),'5  Bảng tin     6  Cụm nghỉ     7  Lối ra đồng cỏ',font=font(25),fill='#f0e8ca')
bd.text((64,1420),'Bản ghép asset để review • 32 × 24 ô • Chưa phải ảnh chụp game • Ninja Adventure / Pixel-boy & AAA',font=font(20),fill='#acc5ab')
board.save(OUT/'ben-co-preview.png')
world.resize((1536,1152),Image.Resampling.NEAREST).save(OUT/'ben-co-map.png')

cards=Image.new('RGB',(1400,780),'#142b2b');cd=ImageDraw.Draw(cards)
cd.text((40,24),'BẾN CỎ / ASSET ĐỀ XUẤT',font=font(32,True),fill='#f0e8ca')
selection=[('inn','Quán trọ','TilesetHouse'),('forge','Lò rèn','TilesetHouse'),('shop','Tạp hóa','TilesetHouse'),('fountain','Đài phun nước','TilesetHouse'),('tree','Cây xanh','TilesetNature'),('flower','Hoa ven đường','TilesetNature'),('bench','Ghế nghỉ','TilesetElement'),('board','Bảng tin (tạm)','TilesetElement')]
for i,(key,title,sheet) in enumerate(selection):
    x=40+(i%4)*340;y=90+(i//4)*330
    cd.rounded_rectangle((x,y,x+320,y+310),radius=12,fill='#28413b')
    im=assets[key];scale=min(4,240//im.width,185//im.height)
    im=im.resize((im.width*scale,im.height*scale),Image.Resampling.NEAREST)
    cards.paste(im,(x+(320-im.width)//2,y+20+(190-im.height)//2),im)
    cd.text((x+16,y+224),title,font=font(24,True),fill='#f0e8ca')
    cd.text((x+16,y+264),sheet+'.png',font=font(18),fill='#acc5ab')
cards.save(OUT/'ben-co-assets.png')
print('Created ben-co-preview.png, ben-co-map.png, ben-co-assets.png')
