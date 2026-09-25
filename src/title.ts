// Title screen: a cozy campfire diorama rendered behind the DOM menu.
import Phaser from 'phaser';
import { audio } from './audio';
import { ensureCapyTexture } from './art/capy';
import { T_FACE, T_FACE_CAP, T_FLOOR, T_FLOOR_MOSS, T_TOP, TS } from './art/tiles';
import { CLASS_IDS, ClassId } from './data';
import { TILE } from './dungeon';
import { RNG } from './rng';
import { UI } from './ui/ui';
import { LightMap } from './game/lightmap';

export class TitleScene extends Phaser.Scene {
  lm!: LightMap;
  capys: { spr: Phaser.GameObjects.Sprite; base: number; ph: number; blink: number }[] = [];
  torches: { x: number; y: number }[] = [];
  embers!: Phaser.GameObjects.Particles.ParticleEmitter;
  fireX = 0;
  fireY = 0;

  constructor() {
    super('title');
  }

  create() {
    this.capys = [];
    this.torches = [];
    const W = 22,
      H = 13;
    const r = new RNG(7);
    const map = this.make.tilemap({ tileWidth: TS, tileHeight: TS, width: W, height: H });
    const ts = map.addTilesetImage('tiles_0', 'tiles_0', TS, TS, 0, 0)!;
    const layer = map.createBlankLayer('g', ts, 0, 0)!.setScale(TILE / TS);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (y <= 1) layer.putTileAt(y === 1 ? T_FACE + r.int(0, 3) : T_TOP + 4, x, y);
        else layer.putTileAt(r.chance(0.12) ? T_FLOOR_MOSS + r.int(0, 3) : T_FLOOR + r.int(0, 7), x, y);
      }
    void T_FACE_CAP;
    for (let x = 0; x < W; x++) this.add.image(x * TILE, 2 * TILE, 'wallshadow').setOrigin(0).setScale(TILE / TS).setDepth(1);
    for (const tx of [3, 8, 13, 18]) {
      const t = this.add.sprite((tx + 0.5) * TILE, TILE + 30, 'torch', 0).setScale(0.5).setDepth(2);
      t.play({ key: 'torch_anim', startFrame: tx % 4 });
      this.torches.push({ x: t.x, y: t.y + 24 });
    }
    this.add.image(6 * TILE, TILE + 26, 'decor', 8).setScale(0.6).setDepth(2);
    this.add.image(16 * TILE, TILE + 26, 'decor', 8).setScale(0.6).setDepth(2);
    const cx = (W / 2) * TILE,
      cy = 8.2 * TILE;
    this.fireX = cx;
    this.fireY = cy;
    this.add.sprite(cx, cy, 'campfire', 0).setOrigin(0.5, 0.8).setScale(0.9).setDepth(10 + cy / 100).play('campfire_anim');
    // clutter
    for (let i = 0; i < 26; i++) {
      const f = r.pick([0, 1, 2, 3, 3, 5, 7, 2]);
      this.add.image(r.range(TILE, (W - 1) * TILE), r.range(2.6 * TILE, (H - 0.5) * TILE), 'decor', f).setScale(r.range(0.45, 0.6)).setDepth(2).setFlipX(r.chance(0.5));
    }
    this.add.sprite(3 * TILE, 3.2 * TILE, 'barrel').setOrigin(0.5, 0.9).setScale(0.55).setDepth(12);
    this.add.sprite(3.6 * TILE, 3.4 * TILE, 'crate').setOrigin(0.5, 0.9).setScale(0.55).setDepth(12);
    this.add.sprite(18.5 * TILE, 3.3 * TILE, 'chest', 0).setOrigin(0.5, 0.85).setScale(0.62).setDepth(12);
    this.add.sprite(19.4 * TILE, 3.2 * TILE, 'pot').setOrigin(0.5, 0.9).setScale(0.55).setDepth(12);

    // capybaras around the fire
    const spots: [number, number, ClassId, number][] = [
      [-150, -8, 'vanguard', 0],
      [150, -8, 'ember', 1],
      [-100, 70, 'herbalist', 3],
      [110, 72, 'ranger', 2],
      [0, 108, 'storm', 4],
    ];
    for (const [dx, dy, cls, fur] of spots) {
      const key = ensureCapyTexture(this, cls, fur);
      const x = cx + dx,
        y = cy + dy;
      this.add.image(x, y, 'shadow').setScale(0.7, 0.62).setDepth(6);
      const spr = this.add.sprite(x, y, key, 1).setOrigin(0.53, 0.9).setScale(0.62).setDepth(10 + y / 100).setFlipX(dx > 0);
      this.capys.push({ spr, base: y, ph: r.range(0, 6), blink: r.range(1, 4) });
    }
    this.embers = this.add.particles(0, 0, 'dot', {
      x: cx, y: cy - 20, lifespan: { min: 900, max: 1800 }, speedY: { min: -70, max: -30 }, speedX: { min: -18, max: 18 },
      scale: { start: 0.6, end: 0 }, frequency: 90, blendMode: 'ADD', tint: [0xffc040, 0xff7020, 0xffe080],
    }).setDepth(210);

    this.lm = new LightMap(this, 200);
    const fit = () => {
      const cam = this.cameras.main;
      const z = Math.max(this.scale.width / (W * TILE - 60), this.scale.height / (H * TILE - 40));
      cam.setZoom(z);
      cam.centerOn(cx, cy - 1.6 * TILE);
    };
    fit();
    this.scale.on('resize', fit);
    this.events.once('shutdown', () => {
      this.scale.off('resize', fit);
      this.lm.destroy();
    });

    UI.showTitle((cls, name, fur) => {
      audio.unlock();
      UI.fade(true);
      this.time.delayedCall(450, () => {
        this.scene.start('game', { cls, name, fur });
        UI.fade(false);
      });
    });
    if (audio.ctx) audio.setMusic('title');
    void CLASS_IDS;
  }

  update(time: number) {
    const t = time / 1000;
    for (const c of this.capys) {
      c.blink -= 1 / 60;
      c.spr.setFrame(c.blink < 0.12 ? 4 : 1);
      if (c.blink <= 0) c.blink = 2 + Math.random() * 4;
      const s = 0.62 * (1 + Math.sin(t * 2 + c.ph) * 0.015);
      c.spr.setScale(0.62, s);
    }
    const cam = this.cameras.main;
    const vw = cam.width / cam.zoom,
      vh = cam.height / cam.zoom;
    const vx = cam.midPoint.x - vw / 2 - 4,
      vy = cam.midPoint.y - vh / 2 - 4;
    this.lm.begin(vx, vy, vw + 8, vh + 8, 0x3a3448);
    const f = 1 + Math.sin(t * 8) * 0.05 + Math.sin(t * 21) * 0.03;
    const stamp = (x: number, y: number, r: number, c: number, a = 1) => this.lm.light(x, y, r, c, a);
    stamp(this.fireX, this.fireY - 20, 520 * f, 0xffa050);
    stamp(this.fireX, this.fireY - 20, 260 * f, 0xffe0b0, 0.8);
    for (const tc of this.torches) stamp(tc.x, tc.y, 200 * (1 + Math.sin(t * 9 + tc.x) * 0.05), 0xff9040, 0.9);
    this.lm.end();
  }
}
