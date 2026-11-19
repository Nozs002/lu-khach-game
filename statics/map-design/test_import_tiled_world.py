import copy
import json
import unittest
import tempfile
from pathlib import Path
from unittest.mock import patch
import import_tiled_world
from import_tiled_world import ROOT, convert


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
