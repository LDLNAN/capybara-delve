// Autonomous bot that plays the game in a headless browser.
// usage: node tests/bot.mjs [--god] [--secs=180] [--shots=20] [--cls=vanguard] [--tag=name]
import { launch } from './run.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const secs = +(args.secs ?? 180);
const shotEvery = +(args.shots ?? 20);
const tag = args.tag ?? 'bot';
const url = (process.env.URL || 'http://localhost:5173/') + '?test';
const { b, p, errors } = await launch(url, { w: 1600, h: 900 });
await p.waitForSelector('.go', { timeout: 30000 });
if (args.cls) {
  const idx = ['vanguard', 'ranger', 'ember', 'herbalist', 'storm'].indexOf(args.cls);
  await p.keyboard.press(String(idx + 1));
}
await p.click('.go');
await p.waitForFunction(() => window.__game && window.__game.leader, null, { timeout: 30000 });

await p.evaluate(({ god }) => {
  const G = () => window.__game;
  window.__bot = { god, log: [], lastDepth: 0, stuck: 0, lastPos: null, target: null };
  const bfs = (g, sx, sy, goal) => {
    const d = g.dun, W = d.w;
    const prev = new Int32Array(d.w * d.h).fill(-1);
    const start = sy * W + sx;
    prev[start] = start;
    const q = [start];
    let found = -1;
    while (q.length) {
      const c = q.shift();
      if (goal(c % W, (c / W) | 0)) { found = c; break; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = (c % W) + dx, ny = ((c / W) | 0) + dy;
        const ni = ny * W + nx;
        if (nx < 0 || ny < 0 || nx >= W || ny >= d.h || prev[ni] !== -1 || d.tiles[ni] !== 1) continue;
        prev[ni] = c;
        q.push(ni);
      }
    }
    if (found < 0) return null;
    const path = [];
    let c = found;
    while (c !== start) { path.push(c); c = prev[c]; }
    path.reverse();
    return path;
  };
  setInterval(() => {
    const g = G();
    if (!g || !g.leader || g.paused || g.ended || g.transitioning) {
      // answer perk modals
      const perk = document.querySelector('.perk');
      if (perk) perk.click();
      return;
    }
    const L = g.leader;
    if (window.__bot.god) for (const c of g.party) { if (c.alive) c.hp = Math.max(c.hp, c.stats.maxHp * 0.6); }
    if (g.drops.some((d) => d.ready && d.t >= 0)) g.pickupNearestDrop();
    const T = 64;
    const enemies = g.enemies.filter((e) => !e.dead && e.awake && e.state !== 'hidden');
    let near = null, nd = 1e9;
    for (const e of enemies) { const d = Math.hypot(e.x - L.x, e.y - L.y); if (d < nd) { nd = d; near = e; } }
    let mv = null;
    const hpk = L.hp / L.stats.maxHp;
    // danger avoidance: enemy projectiles close
    let px = 0, py = 0;
    for (const pr of g.projs) {
      if (pr.friendly) continue;
      const d = Math.hypot(pr.x - L.x, pr.y - L.y);
      if (d < 110) { px += (L.x - pr.x) / d; py += (L.y - pr.y) / d; }
    }
    if (near && (nd < 90 + near.r || (hpk < 0.4 && nd < 260))) {
      mv = { x: L.x - near.x + px * 60, y: L.y - near.y + py * 60 };
      // perpendicular component to avoid walls
      const l = Math.hypot(mv.x, mv.y) || 1;
      mv = { x: mv.x / l - (mv.y / l) * 0.6, y: mv.y / l + (mv.x / l) * 0.6 };
      const ax = L.x + mv.x * 40, ay = L.y + mv.y * 40;
      if (g.solidAt(ax, ay)) mv = { x: -mv.y, y: mv.x };
    } else if (px || py) {
      mv = { x: px, y: py };
    } else if (near && nd < 400 && !near.boss) {
      // hold position & let the party fight; drift toward it slowly
      mv = null;
    } else {
      // exploration targets
      const tx = Math.floor(L.x / T), ty = Math.floor(L.y / T);
      const goals = [];
      for (const pr of g.props) {
        if (pr.used && pr.kind !== 'stairs' && pr.kind !== 'portal') continue;
        if (pr.recruit) goals.push({ x: pr.x, y: pr.y, pri: 0 });
        else if (pr.kind === 'chest' || pr.kind === 'chest_gold') goals.push({ x: pr.x, y: pr.y, pri: 1 });
      }
      for (const d of g.drops) if (d.ready && g.bag.length < 30) goals.push({ x: d.x, y: d.y, pri: 1 });
      if (g.boss && !g.boss.dead) goals.push({ x: g.boss.x, y: g.boss.y + 150, pri: 3 });
      const stairs = g.props.find((q) => q.kind === 'stairs' || q.kind === 'portal');
      const leave = g.floorT > 150 || !goals.length;
      if (stairs && leave) goals.push({ x: stairs.x, y: stairs.y, pri: -1 });
      // unexplored rooms
      if (!goals.length || (!stairs && !g.boss)) {
        for (const r of g.dun.rooms) if (!r.visited) goals.push({ x: (r.cx + 0.5) * T, y: (r.cy + 0.5) * T, pri: 2 });
      }
      if (!stairs && !(g.boss && !g.boss.dead)) for (const r of g.dun.rooms) if (!r.visited) goals.push({ x: (r.cx + 0.5) * T, y: (r.cy + 0.5) * T, pri: 2 });
      goals.sort((a, b) => a.pri - b.pri || Math.hypot(a.x - L.x, a.y - L.y) - Math.hypot(b.x - L.x, b.y - L.y));
      const goal = goals[0];
      if (goal) {
        const gx = Math.floor(goal.x / T), gy = Math.floor(goal.y / T);
        if (Math.hypot(goal.x - L.x, goal.y - L.y) < 50) mv = { x: goal.x - L.x, y: goal.y - L.y };
        else {
          const path = bfs(g, tx, ty, (x, y) => Math.abs(x - gx) + Math.abs(y - gy) <= 0);
          if (path && path.length) {
            const n = path[Math.min(1, path.length - 1)];
            const nx = ((n % g.dun.w) + 0.5) * T, ny = (((n / g.dun.w) | 0) + 0.5) * T;
            mv = { x: nx - L.x, y: ny - L.y };
          }
        }
      }
    }
    if (mv) { const l = Math.hypot(mv.x, mv.y) || 1; g.autoMove = { x: mv.x / l, y: mv.y / l }; } else g.autoMove = null;
  }, 80);
}, { god: !!args.god });

const t0 = Date.now();
let shot = 0;
let lastLog = 0;
while ((Date.now() - t0) / 1000 < secs) {
  await p.waitForTimeout(1000);
  const el = (Date.now() - t0) / 1000;
  const st = await p.evaluate(() => {
    const g = window.__game;
    if (!g) return null;
    return {
      depth: g.depth, t: Math.round(g.stats.time), kills: g.stats.kills, party: g.party.map((c) => `${c.name}:${c.cls[0]}${c.level}${c.alive ? '' : '†'}(${Math.round(c.hp)}/${Math.round(c.stats.maxHp)})`).join(' '),
      enemies: g.enemies.length, bag: g.bag.length, ended: g.ended, fps: Math.round(window.__phaser.loop.actualFps), boss: g.boss ? `${g.boss.boss.id}:${Math.round(g.boss.hp)}/${Math.round(g.boss.maxHp)}${g.boss.dead ? ' dead' : ''}` : '',
      modal: document.querySelector('.modal-wrap') ? document.querySelector('.modal h2')?.textContent : '',
    };
  });
  if (el - lastLog >= 5) {
    lastLog = el;
    console.log(Math.round(el) + 's', JSON.stringify(st));
  }
  if (shotEvery && el >= (shot + 1) * shotEvery) {
    shot++;
    await p.screenshot({ path: `tests/shots/${tag}_${String(shot).padStart(2, '0')}.png` });
  }
  if (st?.modal === 'Your Party Has Fallen') {
    console.log('PARTY WIPED at', JSON.stringify(st));
    await p.screenshot({ path: `tests/shots/${tag}_death.png` });
    break;
  }
}
console.log('errors:', errors.length, errors.slice(0, 5));
await b.close();
