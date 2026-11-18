import copy
import json
import unittest
from import_tiled_world import ROOT, convert


class WorldImportTest(unittest.TestCase):
    def setUp(self):
        self.world = json.loads((ROOT / 'source/common/maps/world.tmj').read_text(encoding='utf-8'))

    def test_preserves_source_and_exports_collision_and_spawn(self):
        before = copy.deepcopy(self.world)
        result = convert(self.world)
        self.assertEqual(self.world, before)
        self.assertEqual(result['spawns'], [{'x': 53, 'y': 233}])
        self.assertEqual(sum(map(sum, result['collision'])), 787)
        generated = json.loads((ROOT / 'source/client/src/data/world.generated.json').read_text())
        for layer in self.world['layers']:
            if layer['type'] == 'tilelayer' and layer['name'] != 'collision':
                self.assertEqual(layer, next(l for l in generated['layers'] if l['id'] == layer['id']))

    def test_rejects_blocked_spawn(self):
        layer = next(l for l in self.world['layers'] if l['name'] == 'collision')
        layer['data'][233 * 172 + 53] = 1
        with self.assertRaises(ValueError):
            convert(self.world)


if __name__ == '__main__':
    unittest.main()
