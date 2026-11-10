import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const source = fileURLToPath(new URL('../../', import.meta.url));
const browser = await chromium.launch({ executablePath: process.env.MOVEMENT_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 600, height: 900 } });
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
  await page.clock.install();
  await page.goto('http://movement.test/client/movement-demo.html');
  await page.waitForFunction(() => document.querySelector('canvas')?.width === 768);
  await page.clock.runFor(100);
  assert.deepEqual([...loadedAssets].sort(), ['floor.png', 'nature.png'], 'loads both original tilesets');
  await page.screenshot({ path: fileURLToPath(new URL('../movement-build/map-world-01.png', import.meta.url)), fullPage: true });
  const canvas = page.locator('canvas');
  const click = async (x, y) => { const r = await canvas.boundingBox(); await page.mouse.click(r.x + (x + .5) * r.width / 32, r.y + (y + .5) * r.height / 24); };
  await click(8,3); await page.clock.runFor(1200);
  assert.match(await page.locator('#status').textContent(), /Vị trí \(8, 3\)/, 'CSS-scaled click reaches correct tile');
  await click(0,0); assert.match(await page.locator('#message').textContent(), /chặn/);
  await click(15,0); await page.clock.runFor(3000);
  assert.match(await page.locator('#status').textContent(), /world-02.*\(15, 22\)/, 'top gate changes map');
  await page.screenshot({ path: new URL('../movement-build/demo-preview.png', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), fullPage: true });
  await page.locator('#disconnect').click();
  const disconnected = await page.locator('#status').textContent();
  assert.match(disconnected, /Đã rời demo/);
  await page.clock.runFor(1000); await click(10,10); await page.clock.runFor(1000);
  assert.equal(await page.locator('#status').textContent(), disconnected, 'no updates after disconnect');
  assert.deepEqual(errors, []);
  console.log('Browser: original tilesets loaded, CSS-scaled input, arrival, blocked target, map transition, disconnect passed');
} finally { await browser.close(); }
