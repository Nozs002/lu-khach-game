"""Initialize the ground ID matrix once; rebuild its atlas/preview on later runs."""
from pathlib import Path
import argparse, json, math, random
from collections import Counter
from PIL import Image, ImageDraw, ImageEnhance

ROOT=Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser()
parser.add_argument('--initialize',action='store_true',help='Explicitly regenerate the initial matrix, replacing manual edits')
parser.add_argument('--assets',type=Path,default=Path(r'D:\My_Windows_Files\Downloads\Ninja Adventure - Asset Pack\Ninja Adventure - Asset Pack'))
args=parser.parse_args()
path=ROOT/'source/common/maps/world-ground.json'
W,H=172,314
if not path.exists() or args.initialize:
    grid=[[1]*W for _ in range(H)]
    def rect(x,y,w,h,tile):
        for yy in range(y,y+h):
            for xx in range(x,x+w):grid[yy][xx]=tile
    def ellipse(cx,cy,rx,ry,tile):
        for y in range(max(0,cy-ry),min(H,cy+ry+1)):
            for x in range(max(0,cx-rx),min(W,cx+rx+1)):
                if ((x-cx)/rx)**2+((y-cy)/ry)**2<=1:grid[y][x]=tile
    rect(44,12,120,114,7)
    rect(48,20,112,96,6)
    rect(60,140,100,86,2)
    rect(82,254,48,48,2)
    for y in range(96,246):
        coast=int(24+5*math.sin(y/15)+2*math.sin(y/6))
        for x in range(coast+12):grid[y][x]=9 if x<coast-4 else 8 if x<coast else 10 if x<coast+2 else 5
    ellipse(128,54,12,8,1);ellipse(128,54,7,4,8)
    ellipse(31,247,16,7,10);ellipse(31,247,14,5,8)
    rect(90,239,23,16,4)
    def road(points,width=3,tile=3):
        for (ax,ay),(bx,by) in zip(points,points[1:]):
            assert ax==bx or ay==by
            rect(min(ax,bx)-width//2,min(ay,by)-width//2,abs(ax-bx)+width,abs(ay-by)+width,tile)
    road([(43,278),(65,278),(102,278),(102,250)])
    road([(58,278),(58,268),(63,268)])
    road([(65,278),(65,287),(80,287),(80,278)])
    road([(85,278),(85,258),(102,258)])
    road([(102,278),(102,294),(110,294)])
    road([(102,278),(126,278),(126,210),(104,210),(104,112),(104,72)])
    road([(40,188),(104,188)])
    road([(66,278),(58,278),(58,220),(40,220),(40,188)])
    # Stream remains water even at the future bridge: bridge belongs to objects.
    for y in range(261,293):
        x=92+(2 if 271<=y<280 else 1 if y>=280 else 0)
        for xx in range(x-2,x+3):grid[y][xx]=10 if abs(xx-x)==2 else 8
    # Preserve M0's underlying floor without importing its objects or collision.
    village=json.loads((ROOT/'source/common/maps/m0-layout.json').read_text(encoding='utf-8'))
    for y,row in enumerate(village['matrix']):
        for x,code in enumerate(row):
            floor=village['tileTypes'][str(code)]['ground']
            grid[258+y][12+x]={'grass':1,'dirt':3,'stone':4}[floor]
    data={'id':'overworld','revision':1,'width':W,'height':H,'tileSize':24,'tileset':'world-ground','layers':{'ground':grid}}
    text=json.dumps({k:v for k,v in data.items() if k!='layers'},ensure_ascii=False,indent=2)
    path.write_text(text[:-2]+',\n  "layers": {\n    "ground": [\n'+',\n'.join('      ['+', '.join(map(str,r))+']' for r in grid)+'\n    ]\n  }\n}\n',encoding='utf-8')

data=json.loads(path.read_text(encoding='utf-8'))
grid=data['layers']['ground'];W,H=data['width'],data['height']
floor=Image.open(args.assets/'Backgrounds/Tilesets/TilesetFloor.png').convert('RGBA')
grass=floor.crop((176,192,192,208));dirt=floor.crop((256,128,272,144))
tiles={1:grass,2:ImageEnhance.Brightness(grass).enhance(.78),3:dirt}
names={0:'Trống',1:'Cỏ',2:'Nền rừng',3:'Đường đất',4:'Đá lát',5:'Cát bờ biển',6:'Cát sa mạc',7:'Đất khô chuyển tiếp',8:'Nước',9:'Nước sâu',10:'Nước nông'}
colors={4:('#c9c5a6','#aaa98d'),5:('#dfcc97','#c5b17f'),6:('#d6b57b','#ba945f'),7:('#b6a365','#9c905b'),8:('#518f99','#80b6b8'),9:('#397a8c','#5b98a7'),10:('#99c2b0','#b6d2b8')}
for id,(base,detail) in colors.items():
    im=Image.new('RGBA',(16,16),base);d=ImageDraw.Draw(im)
    if id==4:
        d.line((0,15,15,15),fill=detail);d.line((15,0,15,15),fill=detail)
    elif id>=8:
        d.line((2,5,7,5),fill=detail);d.line((9,12,13,12),fill=detail)
    else:
        random.seed(id)
        for _ in range(6):
            x,y=random.randrange(16),random.randrange(16);d.point((x,y),fill=detail)
    tiles[id]=im
assert (W,H)==(172,314) and len(grid)==H and all(len(r)==W for r in grid)
assert all(type(t) is int and t in names and t!=0 for r in grid for t in r)
atlas=Image.new('RGBA',(16*len(names),16))
for id,im in tiles.items():atlas.alpha_composite(im,(id*16,0))
dest=ROOT/'source/client/public/assets/maps'
atlas.save(dest/'world-ground-tiles.png')
catalog={'id':'world-ground','image':'/assets/maps/world-ground-tiles.png','sourceTileSize':16,'columns':len(names),'tiles':{str(id):{'name':name,'sourceX':id*16,'sourceY':0} for id,name in names.items()}}
(ROOT/'source/common/maps/world-ground-tileset.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
preview=Image.new('RGB',(W*8,H*8))
small={id:im.resize((8,8),Image.Resampling.NEAREST).convert('RGB') for id,im in tiles.items()}
for y,row in enumerate(grid):
    for x,id in enumerate(row):preview.paste(small[id],(x*8,y*8))
preview.save(ROOT/'statics/map-design/world-ground-preview.png')
print(f'Validated {W}x{H} = {W*H} ground cells; tile counts: {dict(sorted(Counter(t for r in grid for t in r).items()))}')
