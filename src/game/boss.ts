// Boss behaviours with telegraphed attack patterns.
import { audio } from '../audio';
import { TILE } from '../dungeon';
import { clamp, dist2, rng } from '../rng';
import { UI } from '../ui/ui';
import type { GameScene } from './GameScene';
import type { Capy, Enemy } from './types';

function arena(S: GameScene, e: Enemy) {
  const r = S.dun.rooms[e.room];
  return { x0: (r.x + 0.8) * TILE, y0: (r.y + 0.8) * TILE, x1: (r.x + r.w - 0.8) * TILE, y1: (r.y + r.h - 0.8) * TILE };
}

function clampArena(S: GameScene, e: Enemy) {
  const a = arena(S, e);
  e.x = clamp(e.x, a.x0, a.x1);
  e.y = clamp(e.y, a.y0, a.y1);
}

function ring(S: GameScene, e: Enemy, n: number, kind: 'bone' | 'goo' | 'greenorb' | 'orb', speed: number, off = 0, dmgMul = 0.6) {
  for (let i = 0; i < n; i++) {
    const a = off + (i / n) * Math.PI * 2;
    S.spawnProj({ kind, x: e.x, y: e.y - e.r * 0.5, ang: a, speed, dmg: e.dmg * dmgMul, friendly: false, life: 4, r: kind === 'bone' ? 7 : 10 });
  }
}

export function updateBoss(S: GameScene, e: Enemy, dt: number) {
  const b = e.boss!;
  if (S.ended || S.transitioning || !S.bossStarted) {
    e.vx = e.vy = 0;
    return;
  }
  if (e.state === 'intro') {
    e.t += dt;
    e.vx = e.vy = 0;
    if (e.t > 2.2) {
      e.state = 'move';
      e.t = 0;
      e.awake = true;
    }
    return;
  }
  if (!e.enraged && e.hp < e.maxHp * 0.5) {
    e.enraged = true;
    audio.play('bossRoar');
    S.shake(0.4);
    UI.toast(`<b>${b.name}</b> is enraged!`, undefined, 2.5, '#c03030');
  }
  const tgt = S.pickTarget(e);
  if (!tgt) {
    e.vx = e.vy = 0;
    return;
  }
  const fast = e.enraged ? 1.3 : 1;
  e.atkCd -= dt;
  e.t += dt * fast;

  // contact damage
  if (e.state !== 'air' && e.state !== 'hidden') {
    for (const c of S.alive) {
      if (dist2(c.x, c.y, e.x, e.y) < (e.r + c.r + 2) ** 2 && e.atkCd <= 0) {
        S.damageCapy(c, e.dmg, e, true);
        e.atkCd = 0.9;
        const d = Math.hypot(c.x - e.x, c.y - e.y) || 1;
        S.moveBody(c, c.r, ((c.x - e.x) / d) * 30, ((c.y - e.y) / d) * 30);
      }
    }
  }

  if (e.state === 'move') {
    const dx = tgt.x - e.x,
      dy = tgt.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    let vx = (dx / d) * e.speed * fast,
      vy = (dy / d) * e.speed * fast;
    if (b.id === 'lich') {
      // keep a haughty distance
      const want = 300;
      const s = d > want + 40 ? 1 : d < want - 60 ? -1 : 0;
      vx = (dx / d) * e.speed * s + (-dy / d) * e.speed * 0.6 * Math.sin(e.animT);
      vy = (dy / d) * e.speed * s + (dx / d) * e.speed * 0.6 * Math.sin(e.animT);
    }
    e.vx += (vx - e.vx) * Math.min(1, dt * 4);
    e.vy += (vy - e.vy) * Math.min(1, dt * 4);
    if (Math.abs(e.vx) > 5) e.spr.setFlipX(e.vx < 0);
    if (e.t > (e.enraged ? 1.1 : 1.7)) {
      e.moveName = b.moves[e.move % b.moves.length];
      e.move++;
      e.state = 'windup';
      e.t = 0;
      e.sub = 0;
      e.hitSet = null;
    }
    clampArena(S, e);
    return;
  }

  let done = false;
  switch (e.moveName) {
    case 'charge':
      done = charge(S, e, tgt, dt);
      break;
    case 'summon':
      done = summon(S, e);
      break;
    case 'tailspin':
      done = tailspin(S, e);
      break;
    case 'leap':
      done = leap(S, e, tgt);
      break;
    case 'goo':
      done = goo(S, e);
      break;
    case 'split':
      done = split(S, e);
      break;
    case 'spiral':
      done = spiral(S, e, dt);
      break;
    case 'curse':
      done = curse(S, e);
      break;
    case 'teleport':
      done = teleport(S, e);
      break;
    case 'volley':
      done = volley(S, e, tgt);
      break;
    default:
      done = true;
  }
  clampArena(S, e);
  if (done) {
    e.state = 'move';
    e.t = 0;
    e.vx *= 0.3;
    e.vy *= 0.3;
  }
}

// ------------------------------------------------------------------ rat king
function charge(S: GameScene, e: Enemy, tgt: Capy, dt: number): boolean {
  if (e.sub === 0) {
    e.sub = 1;
    e.vx = e.vy = 0;
    const a = Math.atan2(tgt.y - e.y, tgt.x - e.x);
    e.aimX = Math.cos(a);
    e.aimY = Math.sin(a);
    e.spr.setFlipX(e.aimX < 0);
    audio.play('telegraph');
    const len = 620,
      w = e.r * 2.2;
    S.telegraph(0.75, (g, k) => {
      g.clear();
      const ex = e.x,
        ey = e.y;
      const px = -e.aimY * (w / 2),
        py = e.aimX * (w / 2);
      g.fillStyle(0xff3030, 0.12 + k * 0.18);
      g.beginPath();
      g.moveTo(ex + px, ey + py);
      g.lineTo(ex + px + e.aimX * len * k, ey + py + e.aimY * len * k);
      g.lineTo(ex - px + e.aimX * len * k, ey - py + e.aimY * len * k);
      g.lineTo(ex - px, ey - py);
      g.closePath();
      g.fillPath();
      g.lineStyle(2, 0xff6040, 0.8);
      g.strokePath();
    }, () => {});
  }
  if (e.sub === 1) {
    e.vx = e.vy = 0;
    e.kx = Math.sin(e.t * 60) * 20;
    if (e.t >= 0.75) {
      e.sub = 2;
      e.t = 0;
      e.hitSet = new Set();
      audio.play('slam', { pitch: 1.4 });
    }
    return false;
  }
  if (e.sub === 2) {
    const sp = 760;
    e.vx = e.aimX * sp;
    e.vy = e.aimY * sp;
    if (Math.random() < 0.6) S.fx.burst(S.fx.smoke, 1, e.x, e.y);
    for (const c of S.alive) {
      if (e.hitSet!.has(c)) continue;
      if (dist2(c.x, c.y, e.x, e.y) < (e.r + c.r + 8) ** 2) {
        e.hitSet!.add(c);
        S.damageCapy(c, e.dmg * 1.4, e, true);
        S.moveBody(c, c.r, -e.aimY * 60 * Math.sign(Math.random() - 0.5), e.aimX * 60);
      }
    }
    const ahead = S.solidAt(e.x + e.aimX * (e.r + 10), e.y + e.aimY * (e.r + 10));
    const a = arena(S, e);
    const out = e.x <= a.x0 + 2 || e.x >= a.x1 - 2 || e.y <= a.y0 + 2 || e.y >= a.y1 - 2;
    if (ahead || out || e.t > 0.9) {
      e.sub = 3;
      e.t = 0;
      e.vx = e.vy = 0;
      S.shake(0.45);
      audio.play('slam');
      S.fx.burst(S.fx.debris, 16, e.x + e.aimX * e.r, e.y + e.aimY * e.r, 0x8a8490);
      S.fx.burst(S.fx.stars, 8, e.x, e.y - e.r);
    }
    void dt;
    return false;
  }
  // stunned
  e.vx = e.vy = 0;
  return e.t > (e.enraged ? 0.5 : 0.9);
}

function summon(S: GameScene, e: Enemy): boolean {
  if (e.sub === 0) {
    e.sub = 1;
    e.vx = e.vy = 0;
    audio.play('squeak', { pitch: 0.6 });
    const lich = e.boss!.id === 'lich';
    const n = lich ? 3 + Math.floor(S.depth / 6) : 4 + Math.floor(S.depth / 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = e.x + Math.cos(a) * (e.r + 50),
        y = e.y + Math.sin(a) * (e.r + 40);
      if (S.solidAt(x, y)) continue;
      const kind = lich ? (i % 3 === 2 && S.depth >= 6 ? 'archer' : 'skeleton') : 'rat';
      const m = S.spawnEnemy(kind, x, y, { awake: true, wave: true, room: e.room });
      m.xpMul = 0.5;
      S.fx.burst(S.fx.smoke, 6, x, y, lich ? 0x60ff80 : 0x8a7a70);
    }
  }
  return e.t > 0.9;
}

function tailspin(S: GameScene, e: Enemy): boolean {
  if (e.sub === 0) {
    e.sub = 1;
    e.vx = e.vy = 0;
    audio.play('telegraph');
    const x = e.x,
      y = e.y,
      r = e.r + 40;
    S.telegraph(0.5, (g, k) => {
      g.clear();
      g.lineStyle(3, 0xff5040, 0.3 + 0.6 * k);
      g.strokeCircle(x, y, r * (0.4 + 0.6 * k));
    }, () => {});
  }
  if (e.sub === 1 && e.t > 0.5) {
    e.sub = 2;
    ring(S, e, 14 + (e.enraged ? 6 : 0), 'bone', 230);
    audio.play('enemyShoot', { pitch: 0.7 });
    S.shake(0.15);
  }
  if (e.sub === 2 && e.t > 0.9) {
    e.sub = 3;
    ring(S, e, 14 + (e.enraged ? 6 : 0), 'bone', 230, Math.PI / 14);
    audio.play('enemyShoot', { pitch: 0.6 });
  }
  if (e.spr) e.spr.rotation = e.sub >= 1 && e.sub < 3 ? Math.sin(e.t * 30) * 0.15 : 0;
  if (e.t > 1.2) {
    e.spr.rotation = 0;
    return true;
  }
  return false;
}

// ------------------------------------------------------------------ slime monarch
function leap(S: GameScene, e: Enemy, tgt: Capy): boolean {
  if (e.sub === 0) {
    e.sub = 1;
    e.vx = e.vy = 0;
    const a = arena(S, e);
    e.aimX = clamp(tgt.x + tgt.vx * 0.5, a.x0, a.x1);
    e.aimY = clamp(tgt.y + tgt.vy * 0.5, a.y0, a.y1);
    const x = e.aimX,
      y = e.aimY,
      r = 150;
    audio.play('telegraph', { pitch: 0.7 });
    S.telegraph(1.35, (g, k) => {
      g.clear();
      g.fillStyle(0xff3030, 0.1 + k * 0.2);
      g.fillCircle(x, y, r * k);
      g.lineStyle(3, 0xff6040, 0.9);
      g.strokeCircle(x, y, r);
    }, () => {});
  }
  if (e.sub === 1) {
    e.vx = e.vy = 0;
    if (e.t > 0.3) {
      e.sub = 2;
      e.state = 'air';
      e.lx = e.x;
      e.ly = e.y;
      audio.play('blorp', { pitch: 0.5 });
    }
    return false;
  }
  if (e.sub === 2) {
    const k = clamp((e.t - 0.3) / 1.05, 0, 1);
    e.x = e.lx + (e.aimX - e.lx) * k;
    e.y = e.ly + (e.aimY - e.ly) * k;
    e.vx = e.vy = 0;
    e.hgt = Math.sin(k * Math.PI) * 220;
    if (k >= 1) {
      e.hgt = 0;
      e.state = 'windup';
      e.sub = 3;
      e.t = 0;
      S.shake(0.6);
      audio.play('slam');
      S.fx.burst(S.fx.puffs, 20, e.x, e.y, 0xe080e0);
      S.fx.burst(S.fx.debris, 14, e.x, e.y, 0x8a8490);
      for (const c of S.alive) if (dist2(c.x, c.y, e.x, e.y) < (150 + c.r) ** 2) S.damageCapy(c, e.dmg * 1.5, e, false);
      ring(S, e, 12 + (e.enraged ? 6 : 0), 'goo', 210);
      for (let i = 0; i < 2; i++) {
        const m = S.spawnEnemy('minislime', e.x + (i ? 50 : -50), e.y + 20, { awake: true, room: e.room });
        m.xpMul = 0.5;
      }
    }
    return false;
  }
  return e.t > 0.5;
}

function goo(S: GameScene, e: Enemy): boolean {
  e.vx *= 0.8;
  e.vy *= 0.8;
  const waves = e.enraged ? 4 : 3;
  const idx = Math.floor(e.t / 0.35);
  if (idx > e.sub - 1 && e.sub < waves && e.t > 0.2) {
    e.sub++;
    ring(S, e, 14, 'goo', 200, e.sub * 0.22);
    audio.play('blorp', { pitch: 0.8 });
  }
  return e.t > 0.35 * waves + 0.4;
}

function split(S: GameScene, e: Enemy): boolean {
  if (e.sub === 0) {
    e.sub = 1;
    audio.play('blorp', { pitch: 0.6 });
    S.fx.burst(S.fx.puffs, 14, e.x, e.y, 0xe080e0);
    const n = 3 + Math.floor(S.depth / 6);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = e.x + Math.cos(a) * (e.r + 30),
        y = e.y + Math.sin(a) * (e.r + 30);
      if (S.solidAt(x, y)) continue;
      const m = S.spawnEnemy(i % 2 ? 'slime' : 'minislime', x, y, { awake: true, room: e.room });
      m.xpMul = 0.5;
      m.kx = Math.cos(a) * 200;
      m.ky = Math.sin(a) * 200;
    }
  }
  return e.t > 0.8;
}

// ------------------------------------------------------------------ bone baron
function spiral(S: GameScene, e: Enemy, dt: number): boolean {
  e.vx *= 0.9;
  e.vy *= 0.9;
  e.phase -= dt;
  if (e.phase <= 0 && e.t > 0.3) {
    e.phase = 0.1;
    const arms = e.enraged ? 3 : 2;
    e.sub += 0.27;
    for (let i = 0; i < arms; i++) {
      const a = e.sub + (i / arms) * Math.PI * 2;
      S.spawnProj({ kind: 'greenorb', x: e.x, y: e.y - 30, ang: a, speed: 185, dmg: e.dmg * 0.5, friendly: false, life: 4.5, r: 10 });
    }
    audio.play('seed', { pitch: 0.5, vol: 0.5 });
  }
  return e.t > 2.8;
}

function curse(S: GameScene, e: Enemy): boolean {
  if (e.sub === 0) {
    e.sub = 1;
    audio.play('telegraph', { pitch: 1.3 });
    const spots = S.alive.slice(0, 4).map((c) => ({ x: c.x + c.vx * 0.4, y: c.y + c.vy * 0.4 }));
    if (e.enraged) {
      const L = S.leader!;
      for (let i = 0; i < 2; i++) spots.push({ x: L.x + rng.range(-120, 120), y: L.y + rng.range(-120, 120) });
    }
    for (const p of spots) {
      const r = 80;
      S.telegraph(1.15, (g, k) => {
        g.clear();
        g.fillStyle(0x60ff80, 0.08 + k * 0.2);
        g.fillCircle(p.x, p.y, r * k);
        g.lineStyle(3, 0x80ff90, 0.9);
        g.strokeCircle(p.x, p.y, r);
      }, () => {
        S.fx.burst(S.fx.sparks, 14, p.x, p.y, 0x80ff90);
        S.fx.flash(p.x, p.y, 240, 0x60ff80, 0.4);
        audio.play('explode', { pitch: 1.4, vol: 0.6 });
        for (const c of S.alive) if (dist2(c.x, c.y, p.x, p.y) < (r + c.r) ** 2) S.damageCapy(c, e.dmg * 1.2, e, false);
      });
    }
  }
  e.vx *= 0.9;
  e.vy *= 0.9;
  return e.t > 1.5;
}

function teleport(S: GameScene, e: Enemy): boolean {
  e.vx = e.vy = 0;
  if (e.sub === 0) {
    e.sub = 1;
    audio.play('portal');
    S.fx.burst(S.fx.smoke, 14, e.x, e.y - 20, 0x6a4a8a);
  }
  if (e.sub === 1) {
    e.spr.setAlpha(Math.max(0, 1 - e.t / 0.35));
    if (e.t > 0.35) {
      e.sub = 2;
      e.state = 'hidden';
      const a = arena(S, e);
      const L = S.leader!;
      for (let i = 0; i < 20; i++) {
        const x = rng.range(a.x0, a.x1),
          y = rng.range(a.y0, a.y1);
        if (Math.hypot(x - L.x, y - L.y) > 280) {
          e.x = x;
          e.y = y;
          break;
        }
      }
      S.fx.burst(S.fx.smoke, 14, e.x, e.y - 20, 0x6a4a8a);
    }
    return false;
  }
  e.spr.setAlpha(Math.min(1, (e.t - 0.35) / 0.35));
  if (e.t > 0.55) e.state = 'windup';
  if (e.t > 0.75) {
    e.spr.setAlpha(1);
    ring(S, e, 10, 'greenorb', 170, rng.range(0, 1), 0.5);
    return true;
  }
  return false;
}

function volley(S: GameScene, e: Enemy, tgt: Capy): boolean {
  e.vx *= 0.9;
  e.vy *= 0.9;
  const shots = e.enraged ? 4 : 3;
  if (e.t > 0.25 + e.sub * 0.4 && e.sub < shots) {
    e.sub++;
    const a = Math.atan2(tgt.y - (e.y - 30), tgt.x - e.x);
    for (let i = -2; i <= 2; i++) S.spawnProj({ kind: 'greenorb', x: e.x, y: e.y - 30, ang: a + i * 0.2, speed: 260, dmg: e.dmg * 0.55, friendly: false, life: 3, r: 10 });
    audio.play('enemyShoot', { pitch: 0.5 });
  }
  return e.t > 0.25 + shots * 0.4 + 0.3;
}
