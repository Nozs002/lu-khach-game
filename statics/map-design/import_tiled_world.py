"""Export world.tmj without changing its art, positions or tile flip flags."""
import json
import math
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def convert(world):
    if world.get('infinite') or world['orientation'] != 'orthogonal':
        raise ValueError('Expected a finite orthogonal map')
    width, height = world['width'], world['height']
    size = world['tilewidth']
    if size != world['tileheight']:
        raise ValueError('Expected square tiles')
    layers = world['layers']
    for layer in layers:
        if layer['type'] == 'tilelayer':
            if (layer['width'], layer['height']) != (width, height) or len(layer['data']) != width * height:
                raise ValueError('Invalid layer dimensions')
            if any(layer.get(key, 0) for key in ('x', 'y', 'offsetx', 'offsety')):
                raise ValueError('Offset layers are not supported')
        elif layer['type'] != 'objectgroup':
            raise ValueError('Unsupported layer type')
    collision_layer = next(layer for layer in layers if layer['name'] == 'collision')
    collision = [[int(bool(gid & 0x0fffffff)) for gid in collision_layer['data'][y*width:(y+1)*width]] for y in range(height)]
    spawns = []
    for layer in layers:
        if layer['type'] != 'objectgroup':
            continue
        for obj in layer['objects']:
            if (obj.get('class') or obj.get('type')) != 'spawn':
                continue
            x, y = math.floor(obj['x'] / size), math.floor(obj['y'] / size)
            if not (0 <= x < width and 0 <= y < height) or collision[y][x]:
                raise ValueError(f'Blocked or out-of-bounds spawn: {obj["name"]}')
            spawns.append({'x': x, 'y': y})
    if not spawns:
        raise ValueError('Map must contain a spawn object')
    return dict(width=width, height=height, tileSize=size, collision=collision, spawns=spawns)


def main():
    source = ROOT / 'source/common/maps/world.tmj'
    world = json.loads(source.read_text(encoding='utf-8'))
    runtime = convert(world)
    output = ROOT / 'source/client/public/assets/maps/tiled'
    output.mkdir(parents=True, exist_ok=True)
    tilesets = []
    for tileset in world['tilesets']:
        if 'source' in tileset:
            raise ValueError('Embed tileset definitions before exporting')
        image = (source.parent / tileset['image']).resolve()
        shutil.copy2(image, output / image.name)
        tilesets.append({**tileset, 'image': '/assets/maps/tiled/' + image.name})
    client = {**runtime, 'tilesets': tilesets, 'layers': [layer for layer in world['layers'] if layer['type'] == 'tilelayer' and layer['name'] != 'collision']}
    for path, data in [(ROOT / 'source/client/src/data/world.generated.json', client), (ROOT / 'source/server/src/main/resources/maps/world.generated.json', runtime)]:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, separators=(',', ':')), encoding='utf-8')
    print(f'Imported {runtime["width"]} x {runtime["height"]}; {len(runtime["spawns"])} spawn(s), {sum(map(sum, runtime["collision"]))} blocked cells')


if __name__ == '__main__':
    main()
