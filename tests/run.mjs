// Generic scripted browser session: node tests/run.mjs <script.mjs>
import { chromium } from 'playwright';
export async function launch(url, { w = 1600, h = 900 } = {}) {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') { errors.push(m.text()); console.log('[console]', m.type(), m.text()); } });
  p.on('pageerror', (e) => { errors.push(e.message); console.log('[pageerror]', e.message, e.stack?.split('\n').slice(0,4).join(' | ')); });
  await p.goto(url);
  return { b, p, errors };
}
