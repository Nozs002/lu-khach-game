import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const source = fileURLToPath(new URL('../../', import.meta.url));
await mkdir(path.join(source, '../statics/maps'), { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.MOVEMENT_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errors = [], loadedAssets = new Set(); page.on('pageerror', e => errors.push(String(e)));
  // Fulfil static files inside the test: no listening socket or game server.
  await page.route('http://movement.test/**', async route => {
    const relative = decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\//, '');
    const absolute = path.resolve(source, relative);
    if (!absolute.startsWith(source)) return route.fulfill({ status: 403, body: 'Forbidden' });
    try {
      const body = await readFile(absolute);
      if (absolute.endsWith('.png')) loadedAssets.add(path.basename(absolute));
      const contentType = absolute.endsWith('.html') ? 'text/html; charset=utf-8' : absolute.endsWith('.json') ? 'application/json' : absolute.endsWith('.png') ? 'image/png' : 'text/javascript';
      await route.fulfill({ status: 200, body, contentType });
    } catch { await route.fulfill({ status: 404, body: 'Not found' }); }
  });
  await page.clock.install({ time: new Date('2026-11-17T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-17T00:00:01Z'));
  await page.goto('http://movement.test/client/movement-demo.html');
  await page.waitForFunction(() => document.querySelector('canvas')?.width === 1248);
  await page.clock.runFor(100);
  assert.deepEqual([...loadedAssets].sort(), ['floor.png', 'nature.png', 'water.png'], 'loads original scene tilesets');
  await page.screenshot({ path: fileURLToPath(new URL('../movement-build/map-world-01.png', import.meta.url)), fullPage: true });
  const canvas = page.locator('canvas');
  const click = async (x, y) => { const r = await canvas.boundingBox(); await page.mouse.click(r.x + (x + .5) * r.width / 52, r.y + (y + .5) * r.height / 24); };
  await click(8,3); await page.clock.runFor(1200);
  assert.match(await page.locator('#status').textContent(), /Vị trí \(8, 3\)/, 'CSS-scaled click reaches correct tile');
  await click(0,0); assert.match(await page.locator('#message').textContent(), /chặn/);
  const message = page.locator('#message');
  const mapBeforeMessage = await canvas.boundingBox();
  assert.equal(await page.locator('header #message').count(), 0, 'message is inside the map');
  await page.clock.runFor(500);
  const noticeBounds = await message.boundingBox();
  assert.ok(noticeBounds && noticeBounds.y >= mapBeforeMessage.y && noticeBounds.x >= mapBeforeMessage.x && noticeBounds.x + noticeBounds.width <= mapBeforeMessage.x + mapBeforeMessage.width, 'dropdown stays inside the map');
  await click(0,0); await page.clock.runFor(999);
  assert.equal(await message.isVisible(), true, 'new notification restarts its one-second timeout');
  await page.clock.runFor(1);
  assert.equal(await message.isVisible(), false, 'notification disappears after one second');
  assert.equal(await message.textContent(), '');
  assert.deepEqual(await canvas.boundingBox(), mapBeforeMessage, 'notification does not shift the map');
  const layout = await page.locator('.world-layout').boundingBox();
  const bounds = await canvas.boundingBox();
  assert.equal(bounds.x, layout.x, 'map is aligned to the left');
  assert.ok(Math.abs(bounds.width / bounds.height - 52 / 24) < .01, 'map keeps square cells');
  assert.ok(Math.abs((layout.width - bounds.width) / layout.width - 12 / 64) < .01, 'twelve columns reserved on right');
  for (const id of ['world-01', 'world-02', 'world-03']) {
    await page.locator('#map-select').selectOption(id); await page.clock.runFor(200);
    assert.match(await page.locator('#status').textContent(), new RegExp(id));
    await page.locator('.world-layout').screenshot({ path: path.join(source, '../statics/maps', `${id}.png`) });
  }
  await page.locator('#map-select').selectOption('world-01'); await page.clock.runFor(200);
  await click(25,0); await page.clock.runFor(15000);
  assert.match(await page.locator('#status').textContent(), /world-03.*\(25, 22\)/, 'top gate changes map');
  await page.setViewportSize({ width: 600, height: 900 });
  await page.locator('#map-select').selectOption('world-01'); await page.clock.runFor(200);
  await click(8,3); await page.clock.runFor(1200);
  assert.match(await page.locator('#status').textContent(), /Vị trí \(8, 3\)/, 'small viewport click reaches correct tile');
  const mobileBounds = await canvas.boundingBox();
  assert.ok(Math.abs(mobileBounds.width / mobileBounds.height - 52 / 24) < .01, 'small viewport preserves aspect ratio');
  await page.locator('#disconnect').click();
  const disconnected = await page.locator('#status').textContent();
  assert.match(disconnected, /Đã rời demo/);
  await page.clock.runFor(1000); await click(10,10); await page.clock.runFor(1000);
  assert.equal(await page.locator('#status').textContent(), disconnected, 'no updates after disconnect');
  assert.deepEqual(errors, []);
  console.log('Browser: original tilesets loaded, CSS-scaled input, arrival, blocked target, map transition, disconnect passed');
} finally { await browser.close(); }
