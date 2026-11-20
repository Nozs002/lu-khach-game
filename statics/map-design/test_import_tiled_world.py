import copy
import json
import unittest
import tempfile
import warnings
from pathlib import Path
from unittest.mock import patch
import import_tiled_world
from import_tiled_world import ROOT, convert, monster_spawn_zones


class MonsterSpawnImportTest(unittest.TestCase):
    def setUp(self):
        self.obj = dict(id=101, x=24, y=40, width=80, height=48, rotation=0,
                        properties=[dict(name=k, value=v) for k, v in dict(
                            zoneId='forest_01', monsterType='slime', maxAlive=3,
                            respawnSeconds=15, aggroRadius=6, leashRadius=12).items()])
        self.layer = dict(name='monster_spawns', type='objectgroup', objects=[self.obj])

    def test_rectangle_preserves_metadata_and_converts_pixels_to_tiles(self):
        before = copy.deepcopy(self.layer)
        zone, = monster_spawn_zones([self.layer], 16)
        self.assertEqual(self.layer, before)
        self.assertEqual(zone['objectId'], 101)
        self.assertEqual(zone['zoneId'], 'forest_01')
        self.assertEqual(zone['maxAlive'], 3)
        self.assertEqual(zone['geometry'], dict(type='rectangle', x=1.5, y=2.5, width=5, height=3))

    def test_polygon_exports_absolute_tile_vertices(self):
        self.obj['polygon'] = [dict(x=0, y=0), dict(x=32, y=0), dict(x=0, y=48)]
        zone, = monster_spawn_zones([self.layer], 16)
        self.assertEqual(zone['geometry'], dict(type='polygon', points=[
            dict(x=1.5, y=2.5), dict(x=3.5, y=2.5), dict(x=1.5, y=5.5)]))

    def test_duplicate_ids_warn_without_dropping_regions(self):
        self.layer['objects'].append({**copy.deepcopy(self.obj), 'id': 102})
        with warnings.catch_warnings(record=True) as notices:
            warnings.simplefilter('always')
            zones = monster_spawn_zones([self.layer], 16)
        self.assertEqual([z['objectId'] for z in zones], [101, 102])
        self.assertIn('Duplicate monster zoneId', str(notices[0].message))

    def test_rejects_invalid_metadata_and_geometry(self):
        for key, value in [('maxAlive', 0), ('respawnSeconds', -1), ('aggroRadius', 1.5),
                           ('leashRadius', True), ('zoneId', ''), ('monsterType', '')]:
            layer = copy.deepcopy(self.layer)
            prop = next(p for p in layer['objects'][0]['properties'] if p['name'] == key)
            prop['value'] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                monster_spawn_zones([layer], 16)
        self.obj['rotation'] = 45
        with self.assertRaises(ValueError):
            monster_spawn_zones([self.layer], 16)

    def test_maps_without_monster_layer_export_empty_list(self):
        self.assertEqual(monster_spawn_zones([], 16), [])


class WorldImportTest(unittest.TestCase):
    def setUp(self):
        self.world = json.loads((ROOT / 'source/common/maps/world.tmj').read_text(encoding='utf-8'))

    def test_preserves_source_and_exports_collision_and_spawn(self):
        before = copy.deepcopy(self.world)
        result = convert(self.world)
        self.assertEqual(self.world, before)
        self.assertEqual(result['spawns'], [{'x': 53, 'y': 233}])
        source_collision = next(l['data'] for l in self.world['layers'] if l['name'] == 'collision')
        self.assertEqual([v for row in result['collision'] for v in row],
                         [int(bool(gid & 0x0fffffff)) for gid in source_collision])
        server = json.loads((ROOT / 'source/server/src/main/resources/maps/world.generated.json').read_text())
        self.assertEqual(server, result)
        generated = json.loads((ROOT / 'source/client/src/data/world.generated.json').read_text())
        for layer in self.world['layers']:
            if layer['type'] == 'tilelayer' and layer['name'] != 'collision':
                self.assertEqual(layer, next(l for l in generated['layers'] if l['id'] == layer['id']))

    def test_rejects_blocked_spawn(self):
        layer = next(l for l in self.world['layers'] if l['name'] == 'collision')
        layer['data'][233 * 172 + 53] = 1
        with self.assertRaises(ValueError):
            convert(self.world)

    def test_import_replaces_stale_compiled_server_resource(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'source/common/maps/world.tmj'
            source.parent.mkdir(parents=True)
            world = copy.deepcopy(self.world)
            world['tilesets'] = []  # This check only needs the gameplay resource.
            source.write_text(json.dumps(world), encoding='utf-8')
            compiled = root / 'source/server/target/classes/maps/world.generated.json'
            compiled.parent.mkdir(parents=True)
            compiled.write_text('{"collision":[[0]]}', encoding='utf-8')
            with patch.object(import_tiled_world, 'ROOT', root):
                import_tiled_world.main()
            resource = root / 'source/server/src/main/resources/maps/world.generated.json'
            self.assertEqual(json.loads(compiled.read_text()), convert(world))
            self.assertEqual(compiled.read_bytes(), resource.read_bytes())


if __name__ == '__main__':
    unittest.main()
