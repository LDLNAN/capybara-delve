// usage: node tests/shot.mjs <url> <out.png> [waitMs] [w] [h]
import { chromium } from 'playwright';
const [url, out, wait = '1500', w = '1800', h = '2000'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.type(), m.text()); });
p.on('pageerror', (e) => console.log('[pageerror]', e.message));
await p.goto(url);
await p.waitForTimeout(+wait);
await p.screenshot({ path: out });
await b.close();
