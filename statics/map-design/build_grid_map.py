"""Build the M0 tile atlas and layers from the shared logical grid."""
from pathlib import Path
import argparse
import json
from PIL import Image, ImageDraw

parser = argparse.ArgumentParser()
parser.add_argument('--assets', type=Path, default=Path(r'D:\My_Windows_Files\Downloads\Ninja Adventure - Asset Pack\Ninja Adventure - Asset Pack'))
args = parser.parse_args()
REPO = Path(__file__).resolve().parents[2]
layout = json.loads((REPO/'source/common/maps/m0-layout.json').read_text(encoding='utf-8'))
matrix = layout['matrix']
types = layout['tileTypes']
W,H = layout['width'],layout['height']
assert len(matrix)==H and all(len(r)==W for r in matrix)
assert all(type(n) is int and str(n) in types for row in matrix for n in row)
tiles=[]
def tile(im):
    tiles.append(im.convert('RGBA'))
    return len(tiles)-1
def source(sheet,box):
    return Image.open(args.assets/'Backgrounds/Tilesets'/f'{sheet}.png').convert('RGBA').crop(box)
grass=tile(source('TilesetFloor',(176,192,192,208)))
dirt=tile(source('TilesetFloor',(256,128,272,144)))
stone_im=Image.new('RGBA',(16,16),'#c9c5a6')
d=ImageDraw.Draw(stone_im);d.line((0,15,15,15),fill='#aaa98d');d.line((15,0,15,15),fill='#b4b397')
stone=tile(stone_im)
fence_im=Image.new('RGBA',(16,16));d=ImageDraw.Draw(fence_im)
d.rectangle((0,5,15,7),fill='#805534');d.rectangle((0,9,15,11),fill='#c78c4a');d.rectangle((6,2,9,15),fill='#a9753c')
fence=tile(fence_im)
ground_ids={'grass':grass,'dirt':dirt,'stone':stone}
ground=[[ground_ids[types[str(code)]['ground']] for code in row] for row in matrix]
collision=[[0 if types[str(code)]['walkable'] else 1 for code in row] for row in matrix]

objects=[]
def stamp(im,x,y,width,height,kind):
    # Every sprite is split into grid cells before packing; no baked map background.
    im=im.resize((width*16,height*16),Image.Resampling.NEAREST)
    cells=[]
    for ty in range(height):
        cells.append([tile(im.crop((tx*16,ty*16,(tx+1)*16,(ty+1)*16))) for tx in range(width)])
    objects.append({'x':x,'y':y,'tiles':cells,'kind':kind})

# Find connected footprints by numeric code. No building positions are hardcoded.
structures={
    3: ('TilesetHouse',(0,0,64,48),'inn'),
    9: ('TilesetHouse',(192,0,256,48),'forge'),
    10: ('TilesetHouse',(256,0,304,48),'shop'),
    5: ('TilesetHouse',(48,240,80,272),'fountain'),
}
visited=set()
for y,row in enumerate(matrix):
    for x,code in enumerate(row):
        if code not in structures or (x,y) in visited:
            continue
        component={(x,y)};pending=[(x,y)]
        while pending:
            cx,cy=pending.pop()
            for nx,ny in [(cx-1,cy),(cx+1,cy),(cx,cy-1),(cx,cy+1)]:
                if 0<=nx<W and 0<=ny<H and matrix[ny][nx]==code and (nx,ny) not in component:
                    component.add((nx,ny));pending.append((nx,ny))
        visited.update(component)
        left=min(p[0] for p in component);top=min(p[1] for p in component)
        width=max(p[0] for p in component)-left+1;height=max(p[1] for p in component)-top+1
        if len(component)!=width*height:
            raise ValueError(f'Code {code} at ({left},{top}) must form a rectangular footprint')
        sheet,box,kind=structures[code]
        stamp(source(sheet,box),left,top,width,height,kind)

for y,row in enumerate(matrix):
    for x,code in enumerate(row):
        if code in (1,18):
            objects.append({'x':x,'y':y,'tiles':[[fence]],'kind':'boundary'})
        elif code==4:
            stamp(source('TilesetNature',(0,0,32,32)),x,y-1,2,2,'tree')
        elif code==11:
            stamp(source('TilesetElement',(176,16,224,32)),x,y,1,1,'bench')
        elif code==12:
            stamp(source('TilesetElement',(0,80,16,112)),x,y-1,1,2,'board')
        elif code in (6,13,14,15):
            name='Master' if code in (6,13) else 'ManGreen'
            im=Image.open(args.assets/'Actor/Character'/name/'SpriteSheet.png').convert('RGBA').crop((0,0,16,16))
            stamp(im,x,y,1,1,'npc')

# Preferred spawn cells first, then all empty spawnable cells, both in row order.
spawns=[{'x':x,'y':y} for code in (7,0) for y,row in enumerate(matrix) for x,value in enumerate(row) if value==code and types[str(value)]['spawn'] and types[str(value)]['walkable']]
for obj in objects:
    assert 0<=obj['x'] and 0<=obj['y'] and obj['x']+len(obj['tiles'][0])<=W and obj['y']+len(obj['tiles'])<=H, f"Object outside map: {obj['kind']}"
assert spawns, 'Map needs at least one spawn cell'
cols=16
atlas=Image.new('RGBA',(cols*16,((len(tiles)+cols-1)//cols)*16))
for i,im in enumerate(tiles):atlas.alpha_composite(im,((i%cols)*16,(i//cols)*16))
dest=REPO/'source/client/public/assets/maps';dest.mkdir(exist_ok=True)
atlas.save(dest/'m0-tiles.png')
data={k:layout[k] for k in ['id','name','tileSize','width','height']}
data.update({'matrix':matrix,'tileTypes':types,'atlas':'/assets/maps/m0-tiles.png','atlasColumns':cols,'sourceTileSize':16,'ground':ground,'collision':collision,'objects':objects,'spawns':spawns})
(REPO/'source/client/src/data/m0.generated.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
server=REPO/'source/server/src/main/resources/maps/m0-spawns.generated.json'
server.parent.mkdir(parents=True,exist_ok=True)
server.write_text(json.dumps({'tileSize':layout['tileSize'],'spawns':spawns},indent=2)+'\n',encoding='utf-8')


# Render a grid preview from exactly the same layers the client consumes.
preview=Image.new('RGBA',(W*24,H*24))
def draw_cell(index,x,y):
    preview.alpha_composite(tiles[index].resize((24,24),Image.Resampling.NEAREST),(x*24,y*24))
for y,row in enumerate(ground):
    for x,index in enumerate(row):draw_cell(index,x,y)
for obj in objects:
    for dy,row in enumerate(obj['tiles']):
        for dx,index in enumerate(row):draw_cell(index,obj['x']+dx,obj['y']+dy)
d=ImageDraw.Draw(preview)
for x in range(W+1):d.line((x*24,0,x*24,H*24),fill='#34413170')
for y in range(H+1):d.line((0,y*24,W*24,y*24),fill='#34413170')
preview.resize((1536,1152),Image.Resampling.NEAREST).save(REPO/'statics/map-design/ben-co-grid-preview.png')
print(f'Generated {W}x{H} numeric map, {len(tiles)} tiles, {len(objects)} objects, {len(spawns)} spawn cells.')
