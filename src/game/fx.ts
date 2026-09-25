// Visual effects: particles, floating numbers, lightning, flashes.
import Phaser from 'phaser';
import { settings } from '../ui/ui';
import { FloatText } from './types';

export const D = {
  floor: 0,
  shadowWall: 1,
  decor: 2,
  floorProp: 3,
  pickup: 5,
  shadow: 6,
  entity: 10, // + y / 100
  proj: 205,
  dark: 200,
  fxTop: 210,
  text: 300,
};

type FadeObj = Phaser.GameObjects.GameObject & { alpha: number; setAlpha(v: number): unknown };

interface Fading {
  obj: FadeObj;
  t: number;
  dur: number;
  from: number;
}

export class FX {
  s: Phaser.Scene;
  sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  puffs!: Phaser.GameObjects.Particles.ParticleEmitter;
  embers!: Phaser.GameObjects.Particles.ParticleEmitter;
  smoke!: Phaser.GameObjects.Particles.ParticleEmitter;
  leaves!: Phaser.GameObjects.Particles.ParticleEmitter;
  confetti!: Phaser.GameObjects.Particles.ParticleEmitter;
  debris!: Phaser.GameObjects.Particles.ParticleEmitter;
  stars!: Phaser.GameObjects.Particles.ParticleEmitter;
  floats: FloatText[] = [];
  fading: Fading[] = [];
  flashes: { x: number; y: number; r: number; color: number; t: number; dur: number }[] = [];

  constructor(s: Phaser.Scene) {
    this.s = s;
    const add = (tex: string, cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig, depth: number) =>
      s.add.particles(0, 0, tex, { emitting: false, ...cfg }).setDepth(depth);
    this.sparks = add('spark', { lifespan: { min: 200, max: 420 }, speed: { min: 90, max: 300 }, scale: { start: 0.55, end: 0 }, blendMode: 'ADD', rotate: { min: 0, max: 180 } }, D.fxTop);
    this.puffs = add('soft', { lifespan: { min: 280, max: 520 }, speed: { min: 40, max: 170 }, scale: { start: 0.55, end: 0.05 }, alpha: { start: 0.9, end: 0 } }, D.fxTop - 4);
    this.embers = add('dot', { lifespan: { min: 400, max: 900 }, speed: { min: 20, max: 110 }, scale: { start: 0.6, end: 0 }, gravityY: -120, blendMode: 'ADD', tint: [0xffc040, 0xff7020, 0xffe080] }, D.fxTop);
    this.smoke = add('smoke', { lifespan: { min: 500, max: 900 }, speed: { min: 10, max: 60 }, scale: { start: 0.5, end: 1.4 }, alpha: { start: 0.45, end: 0 }, gravityY: -30 }, D.fxTop - 5);
    this.leaves = add('leaf', { lifespan: { min: 500, max: 1000 }, speed: { min: 30, max: 140 }, scale: { start: 1, end: 0.2 }, rotate: { min: 0, max: 360 }, gravityY: 60, alpha: { start: 1, end: 0 } }, D.fxTop);
    this.confetti = add('confetti', { lifespan: { min: 900, max: 1500 }, speed: { min: 150, max: 420 }, angle: { min: 200, max: 340 }, gravityY: 520, rotate: { min: 0, max: 360 }, scale: { start: 1, end: 0.6 }, tint: [0xff6a8a, 0xffd060, 0x6ad0ff, 0x8ae05a, 0xc07aff] }, D.fxTop);
    this.debris = add('dot', { lifespan: { min: 300, max: 600 }, speed: { min: 80, max: 240 }, angle: { min: 200, max: 340 }, gravityY: 700, scale: { start: 0.7, end: 0.3 } }, D.fxTop - 3);
    this.stars = add('spark', { lifespan: { min: 600, max: 1100 }, speed: { min: 10, max: 60 }, scale: { start: 0.45, end: 0 }, gravityY: -40, blendMode: 'ADD', tint: [0xfff0a0, 0xffffff] }, D.fxTop);
  }

  burst(em: Phaser.GameObjects.Particles.ParticleEmitter, n: number, x: number, y: number, tint?: number) {
    if (tint !== undefined) em.setParticleTint(tint);
    em.explode(n, x, y);
  }

  flash(x: number, y: number, r: number, color: number, dur = 0.25) {
    this.flashes.push({ x, y, r, color, t: 0, dur });
  }

  number(x: number, y: number, text: string, color: string, size = 16, crit = false) {
    if (!settings.damageNumbers && !crit && color !== '#7ee06a' && color !== '#ffe070') return;
    let f = this.floats.find((q) => !q.active);
    if (!f) {
      if (this.floats.length < 70) {
        const txt = this.s.add.text(0, 0, '', { fontFamily: 'Fredoka', fontStyle: '700', fontSize: '16px', color: '#fff', stroke: '#1a0e08', strokeThickness: 4 }).setOrigin(0.5).setDepth(D.text);
        f = { txt, t: 0, life: 0.8, vy: 0, active: false };
        this.floats.push(f);
      } else {
        f = this.floats.reduce((a, b) => (a.t > b.t ? a : b));
      }
    }
    f.active = true;
    f.t = 0;
    f.life = crit ? 1.0 : 0.75;
    f.vy = crit ? -70 : -55;
    f.txt.setVisible(true).setText(text).setColor(color).setFontSize(size).setPosition(x + (Math.random() - 0.5) * 14, y).setAlpha(1).setScale(crit ? 1.5 : 1.15);
  }

  fadeOut(obj: FadeObj, dur: number) {
    this.fading.push({ obj, t: 0, dur, from: obj.alpha });
  }

  lightning(points: { x: number; y: number }[], color = 0x9ad8ff) {
    const g = this.s.add.graphics().setDepth(D.fxTop).setBlendMode(Phaser.BlendModes.ADD);
    const jag: { x: number; y: number }[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i],
        b = points[i + 1];
      const segs = Math.max(2, Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 18));
      for (let k = 0; k < segs; k++) {
        const t = k / segs;
        const off = k === 0 ? 0 : (Math.random() - 0.5) * 18;
        const nx = -(b.y - a.y),
          ny = b.x - a.x;
        const nl = Math.hypot(nx, ny) || 1;
        jag.push({ x: a.x + (b.x - a.x) * t + (nx / nl) * off, y: a.y + (b.y - a.y) * t + (ny / nl) * off });
      }
    }
    jag.push(points[points.length - 1]);
    const stroke = (w: number, c: number, a: number) => {
      g.lineStyle(w, c, a);
      g.beginPath();
      g.moveTo(jag[0].x, jag[0].y);
      for (const p of jag) g.lineTo(p.x, p.y);
      g.strokePath();
    };
    stroke(9, color, 0.25);
    stroke(4, color, 0.7);
    stroke(1.6, 0xffffff, 1);
    this.fadeOut(g, 0.16);
    for (const p of points.slice(1)) this.flash(p.x, p.y, 90, color, 0.15);
  }

  update(dt: number) {
    for (const f of this.floats) {
      if (!f.active) continue;
      f.t += dt;
      f.txt.y += f.vy * dt;
      f.vy *= 1 - dt * 2.5;
      const k = f.t / f.life;
      if (f.t < 0.1) f.txt.setScale(f.txt.scaleX + (1 - f.txt.scaleX) * Math.min(1, dt * 18));
      f.txt.setAlpha(k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1);
      if (f.t >= f.life) {
        f.active = false;
        f.txt.setVisible(false);
      }
    }
    for (let i = this.fading.length - 1; i >= 0; i--) {
      const f = this.fading[i];
      f.t += dt;
      f.obj.setAlpha(f.from * (1 - f.t / f.dur));
      if (f.t >= f.dur) {
        f.obj.destroy();
        this.fading.splice(i, 1);
      }
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      this.flashes[i].t += dt;
      if (this.flashes[i].t >= this.flashes[i].dur) this.flashes.splice(i, 1);
    }
  }

  clear() {
    for (const f of this.fading) f.obj.destroy();
    this.fading = [];
    this.flashes = [];
    for (const f of this.floats) {
      f.active = false;
      f.txt.setVisible(false);
    }
    for (const e of [this.sparks, this.puffs, this.embers, this.smoke, this.leaves, this.confetti, this.debris, this.stars]) e.killAll();
  }
}
