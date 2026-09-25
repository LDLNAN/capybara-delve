// Boss test: jump to each boss depth with a strong invulnerable party, fight, verify death + portal.
import { launch } from './run.mjs';
const url = (process.env.URL || 'http://localhost:5173/') + '?test';
const { b, p, errors } = await launch(url, { w: 1600, h: 900 });
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
await p.waitForSelector('.go', { timeout: 30000 });
await p.click('.go');
await p.waitForFunction(() => window.__game && window.__game.leader, null, { timeout: 30000 });

// audio check: tap the master bus with an analyser
const rms = await p.evaluate(async () => {
  const a = window.__audio;
  if (!a.ctx) return -1;
  const an = a.ctx.createAnalyser();
  an.fftSize = 2048;
  a.master.connect(an);
  const buf = new Float32Array(an.fftSize);
  let peak = 0;
  for (let i = 0; i < 20; i++) {
    a.play('hit'); a.play('levelup');
    await new Promise((r) => setTimeout(r, 60));
    an.getFloatTimeDomainData(buf);
    let s = 0; for (const v of buf) s += v * v;
    peak = Math.max(peak, Math.sqrt(s / buf.length));
  }
  return { peak, state: a.ctx.state, music: a.music?.track };
});
ok(rms !== -1 && rms.peak > 0.001, 'audio produces signal: ' + JSON.stringify(rms));

// strengthen party
await p.evaluate(() => {
  const g = window.__game;
  const L = g.leader;
  for (let i = 0; i < 12; i++) g.levelUp(L);
  g.perkQueue = [];
  for (const cls of ['ranger', 'ember', 'herbalist', 'storm']) {
    const c = g.makeCapy(cls, cls, 1, 12, L.x + 20, L.y);
    c.equip.weapon = window.__makeItem({ depth: 8, slot: 'weapon', cls, rarity: 3 });
    g.refreshStats(c); c.hp = c.stats.maxHp; g.party.push(c);
  }
});
for (const depth of [3, 6, 9, 12]) {
  await p.evaluate((d) => { const g = window.__game; g.perkQueue = []; g.debugJump(d); }, depth);
  await p.waitForTimeout(600);
  const info = await p.evaluate(() => {
    const g = window.__game;
    const room = g.dun.rooms[g.boss.room];
    // teleport party to the arena's lower edge
    const x = (room.cx + 0.5) * 64, y = (room.y + room.h - 2) * 64;
    for (const c of g.alive) { c.x = x + Math.random() * 40; c.y = y; }
    return { boss: g.boss.boss.id, hp: Math.round(g.boss.hp) };
  });
  console.log('depth', depth, info);
  let saw = new Set();
  for (let t = 0; t < 70; t++) {
    await p.waitForTimeout(1000);
    const st = await p.evaluate(() => {
      const g = window.__game;
      for (const c of g.party) if (c.alive) c.hp = c.stats.maxHp; // god mode
      g.perkQueue = [];
      const pk = document.querySelector('.perk'); if (pk) pk.click();
      // keep the leader circling inside the arena
      const room = g.dun.rooms[g.boss.room];
      const cx = (room.cx + 0.5) * 64, cy = (room.cy + 0.5) * 64;
      const L = g.leader; const a = Math.atan2(L.y - cy, L.x - cx) + 0.9;
      g.autoMove = { x: Math.cos(a), y: Math.sin(a) };
      return { hp: Math.round(g.boss.hp), max: Math.round(g.boss.maxHp), state: g.boss.state, move: g.boss.moveName, dead: g.boss.dead, started: g.bossStarted, portal: g.props.some((q) => q.kind === 'portal'), tele: g.teles.length, projs: g.projs.filter((q) => !q.friendly).length, enemies: g.enemies.length };
    });
    if (st.move) saw.add(st.move);
    if (t === 4 || t === 9 || t === 15) await p.screenshot({ path: `tests/shots/boss_${depth}_${t}.png` });
    if (st.portal) { console.log('  boss dead + portal after', t, 's; moves seen:', [...saw].join(',')); break; }
    if (t === 45) await p.evaluate(() => { const g = window.__game; g.boss.hp = Math.min(g.boss.hp, g.boss.maxHp * 0.05); });
    if (t % 10 === 0) console.log('  t', t, JSON.stringify(st));
  }
  const done = await p.evaluate(() => window.__game.props.some((q) => q.kind === 'portal'));
  ok(done, `boss at depth ${depth} defeated and portal opened`);
  await p.screenshot({ path: `tests/shots/boss_${depth}_end.png` });
  // enter portal
  await p.evaluate(() => { const g = window.__game; const pt = g.props.find((q) => q.kind === 'portal'); if (pt) { g.leader.x = pt.x; g.leader.y = pt.y; } });
  await p.waitForTimeout(2500);
  ok(await p.evaluate((d) => window.__game.depth === d + 1, depth), 'portal leads to depth ' + (depth + 1));
}
ok(errors.length === 0, 'no console errors: ' + errors.slice(0, 3).join(' | '));
await b.close();
