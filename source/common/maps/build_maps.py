"""Rebuild the three 52 x 24 maps from the existing, unmodified sprite sheets.

Run from any directory with Python 3 + Pillow. Scene coordinates are tile units.
Collision data and artwork are produced together, so bridges remain walkable.
"""
import json
import math
import random
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
W, H, SCALE = 52, 24, 16


def mask():
    return Image.new('1', (W * SCALE, H * SCALE))


def ellipse(im, box, fill=1):
    ImageDraw.Draw(im).ellipse(tuple(round(v * SCALE) for v in box), fill=fill)


def line(im, points, width):
    d = ImageDraw.Draw(im)
    pts = [(round(x * SCALE), round(y * SCALE)) for x, y in points]
    d.line(pts, fill=1, width=round(width * SCALE), joint='curve')
    for x, y in points:
        r = width / 2
        ellipse(im, (x-r, y-r, x+r, y+r))


def cells(im):
    return {(x, y) for y in range(H) for x in range(W) if im.getpixel((x*SCALE+8, y*SCALE+8))}


def sprite(atlas, x, y, w=16, h=16):
    return {'atlas': atlas, 'rect': [x, y, w, h]}


def build(number):
    rng = random.Random(7100 + number)
    water, road = mask(), mask()
    bridges = []
    if number == 1:
        name = 'Đồng cỏ song hồ'
        for box in [(10, 2.5, 17, 7.5), (10, 9, 19, 13), (31, 11, 48, 21)]:
            ellipse(water, box)
        line(water, [(14,6),(14,10)], 2)
        ellipse(water, (37, 14, 43, 18), 0)
        line(road, [(0,11.5),(6,11),(11,8),(18,8),(23,10),(26,9),(33,8),(36,3),(43,2),(47,3)], 1.8)
        line(road, [(3,24),(4,21),(8,19),(15,18),(21,19),(25.5,17),(26,13),(25,10)], 1.8)
        line(road, [(40,14.5),(40,10),(44,9),(49,10)], 2)
        for box in [(5,13,14,17), (27,18,35,22), (44,8,50,12)]: ellipse(road, box)
        bridges = [(12,7,5,2,'horizontal'), (39,11,2,4,'vertical')]
        trees = [(20,3,'pine'),(20,15,'pine'),(3,15,'pine'),(44,5,'pine'),(49,15,'pine'),(39,14,'round')]
        rocks = [(6.5,7.5,1),(47,18,1)]
    elif number == 2:
        name = 'Hồ Ngọc giữa núi'
        ellipse(water, (11,6,38,18))
        ellipse(water, (15,5.5,28,13))
        ellipse(water, (22,9,29,14), 0)
        ellipse(water, (9,3,14,6))
        ellipse(water, (38,14,44,18))
        line(water, [(39,0),(38,2),(37,3),(36,4),(35,6),(35,8)], 1.8)
        line(road, [(0,11.5),(7,11.5),(10,7),(14,5),(20,5),(24,4),(29,5),(31,7),(36,7),(39,9),(40,12),(38,14),(34,16),(28,19),(25.5,20),(26,24)], 1.7)
        line(road, [(10,7),(9,11),(10,14),(14,17),(18,19),(25.5,20)], 1.7)
        line(road, [(39,9),(44,10),(52,11.5)], 1.7)
        for box in [(3,4,9,9),(5,18,14,22),(30,18,40,22),(40,4,47,9),(44,13,50,17)]: ellipse(road, box)
        bridges = [(33,6,4,2,'horizontal'),(19,15,2,3,'vertical')]
        trees = [(25,9,'round'),(28,1,'pink'),(49,7,'gold'),(22,19,'round'),(2,18,'pink'),(48,16,'round')]
        rocks = [(32,1,3),(16,2,2),(46,3,2),(2,13,3),(45,20,3),(23,10,2)]
    else:
        name = 'Suối Ba Cầu'
        line(water, [(1,5),(4,6),(4,8),(10,9),(14,11),(18,11),(20,14),(25,14),(30,12),(33,13),(35,16),(38,16),(40,13),(45,11),(46,8),(48,7)], 2.4)
        for box in [(18,3,24,8),(5,16,12,21),(46,2,50,5),(41,18,44,21)]: ellipse(water, box)
        line(road, [(12,0),(11,3),(8,4),(8,6),(9,8),(9,11),(8,13),(3,16),(3,20),(7,22),(15,22),(17,18),(20,17),(26,17),(26,11),(25,10),(21,10),(20,8)], 1.5)
        line(road, [(25,11),(26,7),(28,6),(29,3),(34,2),(37,4)], 1.5)
        line(road, [(47,2),(44,4),(42,7),(41,11)], 1.5)
        line(road, [(32,24),(33,21),(35,19),(40,18),(40,15),(44,15),(48,17),(49,21),(45,22),(39,22)], 1.6)
        for box in [(31,5,39,9),(21,18,31,22)]: ellipse(road, box)
        bridges = [(8,7,2,4,'vertical'),(25,12,3,3,'vertical'),(39,12,2,5,'vertical')]
        trees = [(16,4,'round'),(29,7,'round'),(43,5,'round'),(49,8,'pine'),(16,11,'round'),(32,15,'round'),(2,10,'white'),(50,12,'pink'),(19,21,'pink'),(37,21,'round')]
        rocks = [(4,2,1),(38,1,2),(13,14,3),(48,21,2),(10,19,1),(49,13,1)]

    wet, paths = cells(water), cells(road)
    # Keep every portal and its interior landing clear. The 12 columns to the
    # right of the map belong to the host UI, never to navigation coordinates.
    corridors = {(x,y) for x in [0,1,2,49,50,51] for y in [11,12]}
    corridors |= {(x,y) for x in [25,26] for y in [0,1,2,21,22,23]}
    safe = {(x,y) for y in range(2,6) for x in range(2,9)}
    wet -= corridors | safe
    paths |= corridors
    palette, terrain, decorations = [], [], []

    def tile_index(t):
        if t not in palette: palette.append(t)
        return palette.index(t)

    def auto(area, x, y, atlas, base_y):
        l, r = (x-1,y) in area, (x+1,y) in area
        u, b = (x,y-1) in area, (x,y+1) in area
        sx = 0 if not l else 32 if not r else 16
        sy = base_y if not u else base_y+32 if not b else base_y+16
        return sprite(atlas, sx, sy)

    for y in range(H):
        for x in range(W):
            if (x,y) in wet: t = auto(wet,x,y,'water',96)
            elif (x,y) in paths: t = auto(paths,x,y,'floor',112)
            else: t = sprite('floor', rng.choice([0,16,32,48,64]),192)
            terrain.append(tile_index(t))
    blocked = set(wet)

    def put(t, x, y, w, h, rotation=0):
        decoration = {'sprite': t, 'x': x, 'y': y, 'width': w, 'height': h}
        if rotation: decoration['rotation'] = rotation
        decorations.append(decoration)

    # Reuse the brown rock faces and grass fringe for the raised valley rim.
    if number == 2:
        for x in range(W):
            for y in [1 + round(1.1*math.sin(x*.32)), 21 + round(math.sin(x*.27))]:
                if any((x, yy) in safe|corridors|paths|wet for yy in [y,y+1]): continue
                put(sprite('nature',208,108,16,20),x,y,1,.9)
                put(sprite('floor',16,192,16,5),x,y-.1,1,.32)
                blocked.add((x,y))

    # Surface ripples come from the original water sheet.
    for x,y in sorted(wet):
        if all((x+dx,y+dy) in wet for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)]) and (x*7+y*13)%5==0:
            put(sprite('water',176,64),x,y,1,1)

    for x,y,w,h,direction in bridges:
        for yy in range(y,y+h):
            for xx in range(x,x+w):
                if direction == 'vertical':
                    put(sprite('water',0 if yy==y else 32 if yy==y+h-1 else 16,
                               224 if xx==x else 192 if xx==x+w-1 else 208),xx,yy,1,1,90)
                else:
                    put(sprite('water',0 if xx==x else 32 if xx==x+w-1 else 16,
                               192 if yy==y else 224 if yy==y+h-1 else 208),xx,yy,1,1)
                blocked.discard((xx,yy))
        # Posts use the original end-grain sprite, sized independently of deck.
        for xx in [x-.18,x+w-.18]:
            for yy in [y-.25,y+h-.65]: put(sprite('water',96,256),xx,yy,.55,.65)

    # Trees along the frame, with openings kept at the four gates.
    for x in range(0,W,2):
        if x not in [24,26]:
            if number != 2:
                trees += [(x,-1,rng.choice(['round','pine','round','pink'])),(x,22,rng.choice(['round','pine','white']))]
    for y in [3,7,15,19]: trees += [(-1,y,'round'),(50,y,'pine')]
    props = []
    for x,y,kind in trees:
        t = {'pine':sprite('nature',0,32,64,48),'round':sprite('nature',48,288,48,48),
             'pink':sprite('nature',0,288,48,48),'white':sprite('nature',96,288,48,48),
             'gold':sprite('nature',144,288,48,48)}[kind]
        w = 2.5 if kind in ['pine','round'] else 2.2
        footprint = {(xx,yy) for yy in range(math.floor(y+1.5),math.ceil(y+2.2)) for xx in range(math.floor(x+.6),math.ceil(x+w-.6)) if 0<=xx<W and 0<=yy<H}
        if footprint & (safe|corridors|paths|wet): continue
        blocked |= footprint
        props.append((y+2.3,t,x,y,w,2.3))
    for x,y,size in rocks:
        t = sprite('nature',256,224,80,64) if size==3 else sprite('nature',256,80,64,48) if size==2 else sprite('nature',288,144)
        w,h = (3,2.4) if size==3 else (2.4,1.8) if size==2 else (1,1)
        footprint = {(xx,yy) for yy in range(math.floor(y+h/2),math.ceil(y+h)) for xx in range(math.floor(x),math.ceil(x+w))}
        if footprint & (safe|corridors|paths|wet): continue
        blocked |= footprint
        props.append((y+h,t,x,y,w,h))
    for _,t,x,y,w,h in sorted(props,key=lambda p:p[0]): put(t,x,y,w,h)
    # A few readable plants, flowers and lily pads; never random single tree tiles.
    for x,y in sorted(wet):
        if (x,y) in blocked and all((x+dx,y+dy) in wet for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)]) and rng.random()<.12:
            put(sprite('water',176,48),x+.2,y+.2,.7,.7)
    for _ in range(65):
        x,y=rng.randrange(1,51),rng.randrange(1,23)
        if (x,y) not in blocked|paths|safe:
            put(sprite('nature',rng.choice([0,16,32,48,64,96,112]),160),x,y,.6,.6)
    if number==1: put(sprite('nature',192,224,16,32),15,20,1,2)
    # Block the outer frame except the paired gates.
    gates = {'left':[(0,11),(0,12)],'right':[(51,11),(51,12)],'top':[(25,0),(26,0)],'bottom':[(25,23),(26,23)]}
    all_gates = {p for group in gates.values() for p in group}
    blocked |= {(x,y) for y in range(H) for x in range(W) if x in [0,51] or y in [0,23]}
    blocked -= all_gates|safe|corridors
    # Reapply boundary after clearing the portal approach corridors.
    blocked |= {(x,y) for y in range(H) for x in range(W) if (x in [0,51] or y in [0,23]) and (x,y) not in all_gates}
    arrivals={'left':[(50,11),(50,12)],'right':[(1,11),(1,12)],'top':[(25,22),(26,22)],'bottom':[(25,1),(26,1)]}
    point=lambda p:dict(zip(['x','y'],p))
    exits=[{'side':side,'cells':list(map(point,ps)), 'targetMap':f'world-{(number % 3 + 1) if side in ["right","bottom"] else ((number+1)%3+1):02}', 'arrivals':list(map(point,arrivals[side]))} for side,ps in gates.items()]
    data={'id':f'world-{number:02}','name':name,'width':W,'height':H,'tileSize':24,
          'collisions':sorted(y*W+x for x,y in blocked if 0<=x<W and 0<=y<H),
          'safeZone':{'x':2,'y':2,'width':7,'height':4},'spawn':{'x':3,'y':3},'exits':exits,
          'visuals':{'ground':palette,'road':sprite('floor',16,128),'obstacles':[sprite('nature',288,144)],'border':[sprite('nature',288,144)],'terrain':terrain,'decorations':decorations}}
    (ROOT/f'world-{number:02}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')


if __name__ == '__main__':
    for number in [1,2,3]: build(number)
