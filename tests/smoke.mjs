// Smoke test: title -> start -> play a bit -> screenshot.
import { launch } from './run.mjs';
const url = process.env.URL || 'http://localhost:5173/?test';
const { b, p, errors } = await launch(url);
await p.waitForSelector('.go', { timeout: 20000 });
await p.waitForTimeout(1500);
await p.screenshot({ path: 'tests/shots/01_title.png' });
await p.click('.go');
await p.waitForTimeout(2500);
await p.screenshot({ path: 'tests/shots/02_start.png' });
// walk around
for (const k of ['d', 's', 'd', 'w']) {
  await p.keyboard.down(k);
  await p.waitForTimeout(900);
  await p.keyboard.up(k);
}
await p.waitForTimeout(500);
await p.screenshot({ path: 'tests/shots/03_walk.png' });
const st = await p.evaluate(() => { const g = window.__game; return { depth: g.depth, party: g.party.length, enemies: g.enemies.length, x: g.leader.x, y: g.leader.y, kills: g.stats.kills }; });
console.log(JSON.stringify(st));
console.log('errors:', errors.length);
await b.close();
