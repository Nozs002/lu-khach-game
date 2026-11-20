"""Export world.tmj without changing its art, positions or tile flip flags."""
import json
import math
import shutil
import warnings
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def monster_spawn_zones(layers, size):
    """Export authored regions in tile units; never rewrite the Tiled source."""
    zones = []
    seen = set()
    for layer in layers:
        if layer['name'] != 'monster_spawns':
            continue
        if layer['type'] != 'objectgroup':
            raise ValueError('monster_spawns must be an object layer')
        if any(layer.get(key, 0) for key in ('x', 'y', 'offsetx', 'offsety')):
            raise ValueError('monster_spawns layer offsets are not supported')
        for obj in layer.get('objects', []):
            label = f'monster_spawns object {obj.get("id")}'
            props = {p['name']: p['value'] for p in obj.get('properties', [])}
            if type(props.get('enabled', True)) is not bool:
                raise ValueError(f'{label}: enabled must be a boolean')
            if props.get('enabled', True) is False:
                continue
            for key in ('zoneId', 'monsterType'):
                if not isinstance(props.get(key), str) or not props[key].strip():
                    raise ValueError(f'{label}: missing or invalid {key}')
            for key in ('maxAlive', 'respawnSeconds', 'aggroRadius', 'leashRadius'):
                value = props.get(key)
                if type(value) is not int or value < (1 if key == 'maxAlive' else 0):
                    raise ValueError(f'{label}: invalid integer {key}')
            if obj.get('rotation', 0) != 0:
                raise ValueError(f'{label}: rotated regions are not supported')
            if any(obj.get(key) for key in ('point', 'ellipse', 'polyline', 'text', 'gid')):
                raise ValueError(f'{label}: expected rectangle or polygon')

            def coordinate(value):
                if type(value) not in (int, float) or not math.isfinite(value):
                    raise ValueError(f'{label}: invalid geometry coordinate')
                return value / size

            x, y = coordinate(obj.get('x')), coordinate(obj.get('y'))
            if 'polygon' in obj:
                points = [{'x': x + coordinate(p.get('x')), 'y': y + coordinate(p.get('y'))}
                          for p in obj['polygon']]
                if len(points) < 3:
                    raise ValueError(f'{label}: polygon needs at least 3 vertices')
                area = sum(a['x'] * b['y'] - b['x'] * a['y']
                           for a, b in zip(points, points[1:] + points[:1]))
                if abs(area) < 1e-9:
                    raise ValueError(f'{label}: polygon has zero area')
                geometry = {'type': 'polygon', 'points': points}
            else:
                width = coordinate(obj.get('width'))
                height = coordinate(obj.get('height'))
                if width <= 0 or height <= 0:
                    raise ValueError(f'{label}: rectangle must have positive dimensions')
                geometry = dict(type='rectangle', x=x, y=y, width=width, height=height)
            if props['zoneId'] in seen:
                warnings.warn(f'Duplicate monster zoneId {props["zoneId"]!r} (objectId={obj["id"]}); '
                              'give each region a unique zoneId in Tiled', stacklevel=2)
            seen.add(props['zoneId'])
            zones.append(dict(objectId=obj['id'], zoneId=props['zoneId'],
                              monsterType=props['monsterType'], maxAlive=props['maxAlive'],
                              respawnSeconds=props['respawnSeconds'], aggroRadius=props['aggroRadius'],
                              leashRadius=props['leashRadius'], geometry=geometry))
    return zones


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
    return dict(width=width, height=height, tileSize=size, collision=collision, spawns=spawns,
                monsterSpawns=monster_spawn_zones(layers, size))


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
    # IDE/exec:java launches may reuse target/classes without copying resources.
    # Keep an existing compiled output in sync as well as the source resource.
    classes = ROOT / 'source/server/target/classes'
    if classes.is_dir():
        compiled_map = classes / 'maps/world.generated.json'
        compiled_map.parent.mkdir(parents=True, exist_ok=True)
        compiled_map.write_text(json.dumps(runtime, separators=(',', ':')), encoding='utf-8')
    print(f'Imported {runtime["width"]} x {runtime["height"]}; {len(runtime["spawns"])} spawn(s), '
          f'{len(runtime["monsterSpawns"])} monster zone(s), {sum(map(sum, runtime["collision"]))} blocked cells')


if __name__ == '__main__':
    main()
