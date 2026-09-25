// The dungeon crawl itself: floors, party, enemies, combat, loot.
import Phaser from 'phaser';
import { audio } from '../audio';
import { capyPortrait, CAPY_FRAMES, ensureCapyTexture } from '../art/capy';
import { iconURL } from '../art/icons';
import { SHEETS } from '../art/monsters';
import { TILESET_COLS, T_FACE, T_FACE_CAP, T_FLOOR, T_FLOOR_MOSS, T_FLOOR_SPECIAL, T_TOP, TS } from '../art/tiles';
import {
  BIOMES, Biome, biomeIndex, BOSSES, bossForDepth, CLASSES, ClassId, CLASS_IDS, CLASS_INTROS, ELITE_MODS, EliteModId,
  ENEMIES, EnemyId, FLOOR_FLAVOR, isBossDepth, PERKS, randomName,
} from '../data';
import { Dungeon, FLOOR, generateDungeon, isSolid, Room, TILE } from '../dungeon';
import { canEquip, Item, makeItem, makeStarterWeapon, RARITY_COLORS, RARITY_HEX, Slot, SLOTS } from '../items';
import { clamp, dist2, rng, RNG } from '../rng';
import { computeStats, powerScore, xpToNext } from '../stats';
import { deltaPower, GameAPI, loadBest, saveBest, settings, toggleFullscreen, UI } from '../ui/ui';
import { updateBoss } from './boss';
import { D, FX } from './fx';
import { LightMap } from './lightmap';
import { Capy, Enemy, Gem, ItemDrop, Proj, ProjKind, Prop, RunStats, Telegraph } from './types';

export const BAG_MAX = 36;
const MAX_PARTY = 5;

export interface GameInit {
  cls: ClassId;
  name: string;
  fur: number;
  seed?: number;
}

let capyIdCounter = 1;
let enemyUid = 1;

export class GameScene extends Phaser.Scene implements GameAPI {
  // run
  party: Capy[] = [];
  bag: Item[] = [];
  depth = 1;
  stats!: RunStats;
  initData!: GameInit;
  // floor
  dun!: Dungeon;
  biome!: Biome;
  biomeIdx = 0;
  tmap: Phaser.Tilemaps.Tilemap | null = null;
  floorObjs: Phaser.GameObjects.GameObject[] = [];
  enemies: Enemy[] = [];
  projs: Proj[] = [];
  gems: Gem[] = [];
  drops: ItemDrop[] = [];
  props: Prop[] = [];
  teles: Telegraph[] = [];
  torches: { x: number; y: number; phase: number }[] = [];
  explored!: Uint8Array;
  flow!: Int32Array;
  flowTile = -1;
  flowT = 0;
  hash = new Map<number, Enemy[]>();
  trail: { x: number; y: number }[] = [];
  // state
  keys = new Set<string>();
  paused = false;
  ended = false;
  transitioning = false;
  hitStop = 0;
  slowT = 0;
  slowScale = 1;
  trauma = 0;
  camX = 0;
  camY = 0;
  camFocus: { x: number; y: number; t: number } | null = null;
  lightMap!: LightMap;
  pointer!: Phaser.GameObjects.Image;
  fx!: FX;
  boss: Enemy | null = null;
  bossStarted = false;
  bossDead = false;
  waveT = 30;
  floorT = 0;
  perkQueue: Capy[] = [];
  wavesThisFloor = 0;
  hudT = 0;
  miniT = 0;
  gemCombo = 0;
  gemComboT = 0;
  bagFullT = 0;
  stairsFound = false;
  levelSfxT = 0;
  leaderFacing = 0;
  testMode = false;
  zoomBase = 1;
  lastLeader: Capy | null = null;
  keyDown!: (e: KeyboardEvent) => void;
  keyUp!: (e: KeyboardEvent) => void;
  blurFn!: () => void;
  resizeFn!: () => void;

  constructor() {
    super('game');
  }

  init(data: GameInit) {
    this.initData = data;
    // Phaser reuses the scene instance on restart: reset all run state.
    this.party = [];
    this.bag = [];
    this.depth = 1;
    this.tmap = null;
    this.floorObjs = [];
    this.enemies = [];
    this.projs = [];
    this.gems = [];
    this.drops = [];
    this.props = [];
    this.teles = [];
    this.torches = [];
    this.trail = [];
    this.keys = new Set();
    this.paused = false;
    this.ended = false;
    this.transitioning = false;
    this.hitStop = 0;
    this.slowT = 0;
    this.trauma = 0;
    this.camFocus = null;
    this.boss = null;
    this.bossStarted = false;
    this.bossDead = false;
    this.perkQueue = [];
    this.lastLeader = null;
    this.gemCombo = 0;
  }

  get leader(): Capy | null {
    for (const c of this.party) if (c.alive) return c;
    return null;
  }

  get alive(): Capy[] {
    return this.party.filter((c) => c.alive);
  }

  // =====================================================================
  create() {
    this.testMode = new URLSearchParams(location.search).has('test');
    if (this.testMode) Object.assign(window, { __game: this, __makeItem: makeItem, __audio: audio });
    this.cameras.main.setBackgroundColor('#0a080c');
    this.fx = new FX(this);
    this.lightMap = new LightMap(this, D.dark);
    this.pointer = this.add.image(0, 0, 'pointer').setDepth(D.text - 5).setVisible(false);
    this.resize();

    this.keyDown = (e) => {
      if (UI.isModalOpen()) return;
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'tab'].includes(k)) e.preventDefault();
      this.keys.add(k);
      if (this.ended || this.transitioning) return;
      if (k === 'escape' || k === 'p') this.openPause();
      else if (k === 'i' || k === 'tab' || k === 'b') this.openBag();
      else if (k === 'f') toggleFullscreen();
      else if (k === 'm') {
        audio.muted = !audio.muted;
        audio.applyVolumes();
      }
    };
    this.keyUp = (e) => this.keys.delete(e.key.toLowerCase());
    this.blurFn = () => {
      this.keys.clear();
      if (!this.ended && !this.transitioning && !UI.isModalOpen() && !this.testMode) this.openPause();
    };
    this.resizeFn = () => this.resize();
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    window.addEventListener('blur', this.blurFn);
    this.scale.on('resize', this.resizeFn);
    this.events.once('shutdown', () => this.teardown());
    this.events.once('destroy', () => this.teardown());

    this.startRun();
  }

  teardown() {
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
    window.removeEventListener('blur', this.blurFn);
    this.scale.off('resize', this.resizeFn);
    this.lightMap?.destroy();
  }

  resize() {
    const w = this.scale.width,
      h = this.scale.height;
    this.zoomBase = clamp(Math.min(w / 1280, h / 740), 0.55, 3);
    this.cameras.main.setZoom(this.zoomBase);
  }

  startRun() {
    const d = this.initData;
    this.party = [];
    this.bag = [];
    this.depth = 1;
    this.ended = false;
    this.perkQueue = [];
    this.stats = { kills: 0, bosses: 0, recruited: 0, levels: 0, time: 0, itemsFound: 0, notable: [], fallen: [], chests: 0 };
    UI.buildHud(() => this.openBag());
    const c = this.makeCapy(d.cls, d.name, d.fur, 1, 0, 0);
    c.equip.weapon = makeStarterWeapon(d.cls, true);
    this.refreshStats(c);
    c.hp = c.stats.maxHp;
    this.party.push(c);
    this.buildFloor();
    audio.setMusic('dungeon');
  }

  // ===================================================================== capybaras
  makeCapy(cls: ClassId, name: string, fur: number, level: number, x: number, y: number): Capy {
    const key = ensureCapyTexture(this, cls, fur);
    const spr = this.add.sprite(x, y, key, 1).setOrigin(0.53, 0.9).setScale(0.5);
    const shadow = this.add.image(x, y, 'shadow').setScale(0.62, 0.6).setDepth(D.shadow).setAlpha(0.9);
    const crown = this.add.image(x, y, 'crown').setScale(0.42).setDepth(D.text - 1).setVisible(false);
    const c: Capy = {
      id: capyIdCounter++, name, cls, fur, level, xp: 0, hp: 1,
      equip: { weapon: null, armor: null, trinket: null }, perks: [], pendingPerks: 0, alive: true, kills: 0,
      intro: '', stats: computeStats({ cls, level, perks: [], equip: { weapon: null, armor: null, trinket: null } }),
      legends: new Set(), levelsGained: 0,
      x, y, vx: 0, vy: 0, r: 15, spr, shadow, crown, cd: rng.range(0, 0.4), healCd: 3, attackCount: 0, hurtT: 0,
      facing: 1, walkT: rng.range(0, 10), blinkT: rng.range(1, 4), lunge: 0, lungeAng: 0, hop: 0, poison: 0,
      target: null, retarget: 0, stuckT: 0, lastX: x, lastY: y, dashCd: 0, dashT: 0, yuzuT: 3, trailT: 0, deathT: 0,
      invuln: 0, texKey: key,
    };
    return c;
  }

  refreshStats(c: Capy) {
    const oldMax = c.stats.maxHp;
    c.stats = computeStats(c);
    c.legends = new Set(SLOTS.map((s) => c.equip[s]?.legend).filter((x): x is string => !!x));
    if (c.alive && oldMax > 0 && c.stats.maxHp !== oldMax) {
      c.hp = clamp(c.hp * (c.stats.maxHp / oldMax), 1, c.stats.maxHp);
    }
    c.hp = Math.min(c.hp, c.stats.maxHp);
  }

  // ===================================================================== floor
  clearFloor() {
    for (const o of this.floorObjs) o.destroy();
    this.floorObjs = [];
    for (const e of this.enemies) this.destroyEnemy(e);
    this.enemies = [];
    for (const p of this.projs) p.spr.destroy();
    this.projs = [];
    for (const g of this.gems) g.spr.destroy();
    this.gems = [];
    for (const d of this.drops) {
      d.spr.destroy();
      d.glow.destroy();
      d.beam?.destroy();
    }
    this.drops = [];
    for (const p of this.props) {
      p.spr.destroy();
      for (const x of p.extra) x.destroy();
      p.recruit?.spr.destroy();
    }
    this.props = [];
    for (const t of this.teles) t.gfx.destroy();
    this.teles = [];
    this.torches = [];
    this.fx.clear();
    this.tweens.killAll();
    if (this.tmap) {
      this.tmap.destroy();
      this.tmap = null;
    }
    this.boss = null;
    this.bossStarted = false;
    this.bossDead = false;
    UI.bossBar(null, 0);
    // restore capy sprites that may have been mid-tween
    for (const c of this.party) {
      if (c.alive) c.spr.setAlpha(1).setAngle(0).setVisible(true);
    }
  }

  buildFloor() {
    this.clearFloor();
    const depth = this.depth;
    const bossFloor = isBossDepth(depth);
    this.dun = generateDungeon(depth, bossFloor, rng);
    this.biomeIdx = biomeIndex(depth);
    this.biome = BIOMES[this.biomeIdx];
    const d = this.dun;
    this.explored = new Uint8Array(d.w * d.h);
    this.flow = new Int32Array(d.w * d.h);
    this.flowTile = -1;
    this.stairsFound = false;

    // tilemap
    const map = this.make.tilemap({ tileWidth: TS, tileHeight: TS, width: d.w, height: d.h });
    const ts = map.addTilesetImage(`tiles_${this.biomeIdx}`, `tiles_${this.biomeIdx}`, TS, TS, 0, 0)!;
    const layer = map.createBlankLayer('ground', ts, 0, 0)!;
    layer.setScale(TILE / TS).setDepth(D.floor);
    this.tmap = map;
    const T = (x: number, y: number) => (x < 0 || y < 0 || x >= d.w || y >= d.h ? 0 : d.tiles[y * d.w + x]);
    const tr = new RNG(depth * 7919 + 13);
    for (let y = 0; y < d.h; y++)
      for (let x = 0; x < d.w; x++) {
        const t = T(x, y);
        if (t === FLOOR) {
          const r = tr.next();
          let idx = T_FLOOR + tr.int(0, 7);
          if (r < 0.1) idx = T_FLOOR_MOSS + tr.int(0, 3);
          else if (r < 0.125) idx = T_FLOOR_SPECIAL + tr.int(0, 3);
          layer.putTileAt(idx, x, y);
          if (T(x, y - 1) !== FLOOR) {
            const sh = this.add.image(x * TILE, y * TILE, 'wallshadow').setOrigin(0).setScale(TILE / TS).setDepth(D.shadowWall);
            this.floorObjs.push(sh);
          }
        } else if (t !== 0) {
          if (T(x, y + 1) === FLOOR) {
            layer.putTileAt((T(x, y - 1) === FLOOR ? T_FACE_CAP : T_FACE) + tr.int(0, 3), x, y);
          } else {
            let mask = 0;
            if (T(x, y - 1) === FLOOR) mask |= 1;
            if (T(x + 1, y) === FLOOR) mask |= 2;
            if (T(x, y + 1) === FLOOR) mask |= 4;
            if (T(x - 1, y) === FLOOR) mask |= 8;
            layer.putTileAt(T_TOP + mask, x, y);
          }
        }
      }
    void TILESET_COLS;

    // decorate & populate
    const occupied = new Set<number>();
    for (const room of d.rooms) this.decorateRoom(room, tr, occupied);
    for (const room of d.rooms) this.populateRoom(room, occupied);

    // party placement
    const sx = (d.start.cx + 0.5) * TILE,
      sy = (d.start.cy + 0.5) * TILE;
    this.alive.forEach((c, i) => {
      const a = (i / Math.max(1, this.alive.length)) * Math.PI * 2;
      c.x = sx + (i ? Math.cos(a) * 50 : 0);
      c.y = sy + (i ? Math.sin(a) * 40 : 0);
      c.vx = c.vy = 0;
      c.target = null;
      c.spr.setVisible(true).setScale(0.5).setAlpha(1);
    });
    this.trail = [];
    const L = this.leader!;
    for (let i = 0; i < 30; i++) this.trail.push({ x: L.x, y: L.y });
    this.camX = L.x;
    this.camY = L.y;
    this.cameras.main.centerOn(this.camX, this.camY);
    this.waveT = depth === 1 ? 35 : Math.max(14, 28 - depth * 1.5);
    this.floorT = 0;
    this.wavesThisFloor = 0;
    this.revealAround();
    UI.depthCard(depth, this.biome.name, bossFloor ? `${BOSSES[bossForDepth(depth)].name} awaits.` : FLOOR_FLAVOR[(depth - 1) % FLOOR_FLAVOR.length], bossFloor);
    this.updateHud(true);
  }

  tileFree(tx: number, ty: number, occ: Set<number>) {
    const d = this.dun;
    if (isSolid(d, tx, ty)) return false;
    return !occ.has(ty * d.w + tx);
  }

  roomSpot(room: Room, occ: Set<number>, margin = 1, tries = 30): { x: number; y: number; tx: number; ty: number } | null {
    for (let i = 0; i < tries; i++) {
      const tx = rng.int(room.x + margin, room.x + room.w - 1 - margin);
      const ty = rng.int(room.y + margin, room.y + room.h - 1 - margin);
      if (this.tileFree(tx, ty, occ)) {
        occ.add(ty * this.dun.w + tx);
        return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE, tx, ty };
      }
    }
    return null;
  }

  decorateRoom(room: Room, r: RNG, occ: Set<number>) {
    const d = this.dun;
    // torches along top wall faces
    const ty = room.y - 1;
    let lastX = -99;
    for (let x = room.x; x < room.x + room.w; x++) {
      if (d.tiles[ty * d.w + x] === FLOOR || d.tiles[(ty + 1) * d.w + x] !== FLOOR) continue;
      if (x - lastX >= 4 && r.chance(0.55)) {
        lastX = x;
        const px = (x + 0.5) * TILE,
          py = ty * TILE + 30;
        const t = this.add.sprite(px, py, 'torch', 0).setScale(0.5).setDepth(D.decor + 0.5);
        t.play({ key: 'torch_anim', startFrame: r.int(0, 3) });
        this.floorObjs.push(t);
        this.torches.push({ x: px, y: py + 4, phase: r.range(0, 10) });
      } else if (r.chance(0.12)) {
        const b = this.add.image((x + 0.5) * TILE, ty * TILE + 26, 'decor', r.chance(0.6) ? 8 : 9).setScale(0.6).setDepth(D.decor);
        this.floorObjs.push(b);
      }
    }
    if (room.kind === 'junction') return;
    // cobwebs in top corners
    if (r.chance(0.5)) {
      const c = this.add.image(room.x * TILE, room.y * TILE, 'decor', 6).setOrigin(0).setScale(0.8).setDepth(D.decor);
      this.floorObjs.push(c);
    }
    if (r.chance(0.5)) {
      const c = this.add.image((room.x + room.w) * TILE, room.y * TILE, 'decor', 6).setOrigin(0).setScale(0.8).setFlipX(true).setOrigin(1, 0).setDepth(D.decor);
      this.floorObjs.push(c);
    }
    // floor clutter
    const n = Math.floor((room.w * room.h) / 9);
    const pool = [[0, 3], [1, 2], [2, 3], [3, 3], [4, 1], [5, 2], [7, 3]] as const;
    const biasShroom = this.biomeIdx === 1 ? 5 : 0;
    for (let i = 0; i < n; i++) {
      const tx = r.int(room.x, room.x + room.w - 1),
        tyy = r.int(room.y, room.y + room.h - 1);
      const f = r.weighted(pool, ([k, w]) => w + (k === 5 ? biasShroom : 0) + (k === 0 || k === 1 ? (this.biomeIdx === 2 ? 3 : 0) : 0))[0];
      const img = this.add
        .image((tx + r.range(0.1, 0.9)) * TILE, (tyy + r.range(0.1, 0.9)) * TILE, 'decor', f)
        .setScale(r.range(0.45, 0.65))
        .setFlipX(r.chance(0.5))
        .setDepth(D.decor)
        .setAlpha(0.95);
      this.floorObjs.push(img);
      if (f === 5 || f === 4) this.torches.push({ x: img.x, y: img.y, phase: -1 - f });
    }
    // breakables along edges
    if (room.kind !== 'boss') {
      const nb = r.int(1, 4) + (room.kind === 'treasure' ? 2 : 0);
      for (let i = 0; i < nb; i++) {
        const edge = r.int(0, 3);
        let tx = r.int(room.x, room.x + room.w - 1),
          tyy = r.int(room.y, room.y + room.h - 1);
        if (edge === 0) tyy = room.y;
        else if (edge === 1) tyy = room.y + room.h - 1;
        else if (edge === 2) tx = room.x;
        else tx = room.x + room.w - 1;
        if (!this.tileFree(tx, tyy, occ)) continue;
        occ.add(tyy * d.w + tx);
        const kind = r.pick(['barrel', 'crate', 'pot', 'pot'] as const);
        this.addProp(kind, (tx + 0.5) * TILE + r.range(-8, 8), (tyy + 0.5) * TILE + r.range(-8, 8));
      }
    }
  }

  addProp(kind: Prop['kind'], x: number, y: number, extra: Partial<Prop> = {}): Prop {
    let spr: Phaser.GameObjects.Sprite;
    const depthY = D.entity + y / 100;
    switch (kind) {
      case 'chest':
      case 'chest_gold':
        spr = this.add.sprite(x, y, kind, 0).setOrigin(0.5, 0.85).setScale(0.62).setDepth(depthY);
        break;
      case 'barrel':
      case 'crate':
      case 'pot':
        spr = this.add.sprite(x, y, kind, 0).setOrigin(0.5, 0.9).setScale(0.55).setDepth(depthY);
        break;
      case 'stairs':
        spr = this.add.sprite(x, y, 'stairs', 0).setScale(0.5).setDepth(D.floorProp);
        break;
      case 'portal':
        spr = this.add.sprite(x, y, 'portal', 0).setScale(0.8).setDepth(D.floorProp).setBlendMode(Phaser.BlendModes.ADD);
        break;
      case 'spring':
        spr = this.add.sprite(x, y, 'spring', 0).setScale(0.62).setDepth(D.floorProp);
        break;
      case 'campfire':
        spr = this.add.sprite(x, y, 'campfire', 0).setOrigin(0.5, 0.8).setScale(0.6).setDepth(depthY);
        spr.play('campfire_anim');
        break;
      case 'barrelcapy':
        spr = this.add.sprite(x, y, 'barrel', 0).setOrigin(0.5, 0.95).setScale(0.8).setDepth(depthY);
        break;
      default:
        spr = this.add.sprite(x, y, 'cage', 1).setOrigin(0.5, 0.92).setScale(0.62).setDepth(depthY + 0.5);
    }
    const p: Prop = { kind, x, y, r: 18, solid: false, spr, extra: [], used: false, hp: 1, ...extra };
    this.props.push(p);
    return p;
  }

  populateRoom(room: Room, occ: Set<number>) {
    const depth = this.depth;
    const cx = (room.cx + 0.5) * TILE,
      cy = (room.cy + 0.5) * TILE;
    const area = room.w * room.h;
    const budgetBase = (6 + depth * 2) * Math.sqrt(area / 80) * rng.range(0.85, 1.2);
    switch (room.kind) {
      case 'start':
        if (depth === 1) {
          const fire = this.addProp('campfire', cx + 90, cy - 20);
          fire.light = { r: 300, color: 0xff9a40, flicker: 1 };
        }
        break;
      case 'monster':
        this.spawnGroup(room, budgetBase, occ);
        break;
      case 'junction':
        if (rng.chance(0.4)) this.spawnGroup(room, budgetBase * 0.35, occ);
        break;
      case 'treasure': {
        const gold = rng.chance(0.12 + depth * 0.01);
        this.addProp(gold ? 'chest_gold' : 'chest', cx, cy);
        occ.add(room.cy * this.dun.w + room.cx);
        this.spawnGroup(room, budgetBase * 0.7, occ);
        break;
      }
      case 'recruit': {
        const aliveN = this.alive.length;
        const want = depth <= 2 || aliveN < 3 ? true : rng.chance(0.6);
        if (want) this.addRecruit(room, cx, cy);
        occ.add(room.cy * this.dun.w + room.cx);
        this.spawnGroup(room, depth === 1 ? 2.5 : budgetBase * 0.55, occ);
        break;
      }
      case 'spring': {
        const sp = this.addProp('spring', cx, cy, { pool: 2.5 });
        sp.light = { r: 260, color: 0x80e0ff, flicker: 0 };
        for (let dy = -1; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) occ.add((room.cy + dy) * this.dun.w + room.cx + dx);
        break;
      }
      case 'exit': {
        const st = this.addProp('stairs', cx, cy);
        st.light = { r: 220, color: 0xffd080, flicker: 0 };
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) occ.add((room.cy + dy) * this.dun.w + room.cx + dx);
        this.spawnGroup(room, budgetBase * 0.9, occ);
        break;
      }
      case 'boss': {
        const b = BOSSES[bossForDepth(depth)];
        this.boss = this.spawnBoss(b.id, cx, cy - 40, room.id);
        break;
      }
    }
  }

  addRecruit(room: Room, x: number, y: number) {
    const taken = this.party.map((c) => c.cls);
    const cls = rng.weighted(CLASS_IDS, (c) => (taken.includes(c) ? 1 : 5));
    const name = randomName(this.party.map((c) => c.name));
    const fur = rng.int(0, 4);
    const key = ensureCapyTexture(this, cls, fur);
    const roll = rng.next();
    const kind: Prop['kind'] = roll < 0.45 ? 'cage' : roll < 0.72 ? 'campfire' : 'barrelcapy';
    const rs = this.add.sprite(x, y, key, 1).setOrigin(0.53, 0.9).setScale(0.5).setDepth(D.entity + y / 100);
    const intro = rng.pick(CLASS_INTROS[cls]);
    let p: Prop;
    if (kind === 'cage') {
      p = this.addProp('cage', x, y + 4);
      const back = this.add.image(x, y + 4, 'cage', 0).setOrigin(0.5, 0.92).setScale(0.62).setDepth(D.shadow);
      p.extra.push(back);
    } else if (kind === 'campfire') {
      p = this.addProp('campfire', x + 46, y + 6);
      p.light = { r: 260, color: 0xff9a40, flicker: 1 };
      rs.setFlipX(false);
    } else {
      p = this.addProp('barrelcapy', x, y + 6);
      rs.setVisible(false);
    }
    const bubble = this.add.text(x, y - 50, '?', { fontFamily: 'Fredoka', fontStyle: '700', fontSize: '26px', color: '#ffe070', stroke: '#1a0e08', strokeThickness: 5 }).setOrigin(0.5).setDepth(D.text);
    p.extra.push(bubble);
    this.tweens.add({ targets: bubble, y: y - 60, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    p.recruit = { cls, name, fur, intro, spr: rs };
    p.r = 60;
  }

  spawnGroup(room: Room, budget: number, occ: Set<number>) {
    const depth = this.depth;
    const costs: Record<EnemyId, number> = { rat: 1, bat: 0.8, slime: 2, minislime: 0.5, skeleton: 2.2, archer: 2.6, shroom: 3, beetle: 3.5 };
    const bias: Record<EnemyId, number>[] = [
      { rat: 3, slime: 2, bat: 1.5, skeleton: 1, archer: 0.7, shroom: 0.6, beetle: 0.5, minislime: 0 },
      { rat: 1, slime: 2.5, bat: 2, skeleton: 1, archer: 1, shroom: 3, beetle: 1, minislime: 0 },
      { rat: 1, slime: 1, bat: 2, skeleton: 3, archer: 2.5, shroom: 1, beetle: 1, minislime: 0 },
      { rat: 1.5, slime: 1.5, bat: 1.5, skeleton: 2, archer: 2, shroom: 1.5, beetle: 2.5, minislime: 0 },
    ];
    const avail = (Object.keys(ENEMIES) as EnemyId[]).filter((k) => ENEMIES[k].minDepth <= depth && ENEMIES[k].weight > 0);
    const b = bias[this.biomeIdx];
    const types = [rng.weighted(avail, (k) => ENEMIES[k].weight * b[k])];
    if (depth >= 2 && rng.chance(0.65)) types.push(rng.weighted(avail, (k) => ENEMIES[k].weight * b[k]));
    if (depth >= 5 && rng.chance(0.5)) types.push(rng.weighted(avail, (k) => ENEMIES[k].weight * b[k]));
    const clusters = rng.int(1, Math.min(3, 1 + Math.floor(budget / 6)));
    const centers: { x: number; y: number }[] = [];
    for (let i = 0; i < clusters; i++) {
      const s = this.roomSpot(room, occ, 1);
      if (s) centers.push(s);
    }
    if (!centers.length) return;
    let eliteLeft = depth >= 2 && rng.chance(0.25 + depth * 0.04) ? (depth >= 7 && rng.chance(0.4) ? 2 : 1) : 0;
    let spent = 0,
      guard = 0;
    while (spent < budget && guard++ < 60) {
      const id = rng.pick(types);
      const c = rng.pick(centers);
      const x = c.x + rng.range(-70, 70),
        y = c.y + rng.range(-60, 60);
      const tx = Math.floor(x / TILE),
        ty = Math.floor(y / TILE);
      if (isSolid(this.dun, tx, ty)) continue;
      let elite: EliteModId | null = null;
      if (eliteLeft > 0 && id !== 'shroom' && rng.chance(0.3)) {
        elite = rng.pick(ELITE_MODS).id;
        eliteLeft--;
      }
      this.spawnEnemy(id, x, y, { elite, room: room.id });
      spent += costs[id] * (elite ? 3 : 1);
    }
  }

  depthHpMul(d = this.depth) {
    return 1 + 0.3 * (d - 1) + 0.04 * (d - 1) * (d - 1);
  }
  depthDmgMul(d = this.depth) {
    return 1 + 0.13 * (d - 1) + 0.006 * (d - 1) * (d - 1);
  }

  spawnEnemy(id: EnemyId, x: number, y: number, o: { elite?: EliteModId | null; room?: number; awake?: boolean; wave?: boolean } = {}): Enemy {
    const def = ENEMIES[id];
    const sheet = SHEETS[`m_${id}`];
    const elite = o.elite ?? null;
    const scale = elite ? 1.42 : 1;
    const spr = this.add.sprite(x, y, sheet.key, 0).setOrigin(sheet.ox, sheet.oy).setScale(0.5 * scale);
    const shadow = this.add.image(x, y, 'shadow').setDepth(D.shadow).setScale((def.radius / 26) * scale, (def.radius / 30) * scale);
    let hp = def.hp * this.depthHpMul();
    let dmg = def.dmg * this.depthDmgMul();
    let speed = def.speed * (1 + Math.min(0.3, 0.02 * (this.depth - 1)));
    let aura: Phaser.GameObjects.Image | null = null;
    let label: Phaser.GameObjects.Text | null = null;
    let color = 0xffffff;
    if (elite) {
      const m = ELITE_MODS.find((q) => q.id === elite)!;
      color = m.color;
      hp *= 4.2;
      dmg *= 1.4;
      if (elite === 'swift') speed *= 1.45;
      if (elite === 'brutal') dmg *= 1.5;
      if (elite === 'armored') hp *= 1.3;
      aura = this.add.image(x, y, 'soft').setTint(color).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.55).setScale((def.radius / 18) * scale);
      label = this.add.text(x, y, `${m.name} ${def.name}`, { fontFamily: 'Fredoka', fontStyle: '600', fontSize: '12px', color: '#' + color.toString(16).padStart(6, '0'), stroke: '#120a08', strokeThickness: 4 }).setOrigin(0.5, 1).setDepth(D.text - 2);
    }
    const e: Enemy = {
      uid: enemyUid++, def, boss: null, x, y, vx: 0, vy: 0, kx: 0, ky: 0, r: def.radius * scale, hp, maxHp: hp, dmg, speed, mass: def.mass * (elite ? 2.5 : 1),
      spr, shadow, aura, label, elite, eliteColor: color, state: 'idle', t: rng.range(0, 2), atkCd: rng.range(0.3, 1.2), burnDps: 0, burnT: 0,
      chill: 0, chillT: 0, flash: 0, awake: !!o.awake, room: o.room ?? -1, phase: rng.range(0, Math.PI * 2), target: null, losT: 0, los: false,
      animT: rng.range(0, 10), baseScale: 0.5 * scale, dead: false, spawnT: o.wave ? 0.6 : 0, move: 0, moveName: '', sub: 0, aimX: 0, aimY: 0,
      hitSet: null, enraged: false, xpMul: elite ? 5 : 1, fromWave: !!o.wave, hgt: 0, lx: 0, ly: 0,
    };
    if (o.wave) {
      spr.setAlpha(0);
      this.fx.burst(this.fx.smoke, 5, x, y, 0x605060);
    }
    this.enemies.push(e);
    return e;
  }

  spawnBoss(id: keyof typeof BOSSES, x: number, y: number, room: number): Enemy {
    const b = BOSSES[id];
    const key = `b_${id}`;
    const sheet = SHEETS[key];
    const spr = this.add.sprite(x, y, key, 0).setOrigin(sheet.ox, sheet.oy).setScale(0.5);
    const shadow = this.add.image(x, y, 'shadow').setDepth(D.shadow).setScale(b.radius / 22, b.radius / 30);
    const cycle = Math.floor((this.depth - 1) / 9);
    const partyF = 0.75 + 0.12 * Math.max(1, this.alive.length);
    const hp = b.hp * (1 + 0.55 * cycle) * (1 + 0.3 * cycle * cycle) * partyF * (1 + (this.depth - 3) * 0.06);
    const e: Enemy = {
      uid: enemyUid++, def: null, boss: b, x, y, vx: 0, vy: 0, kx: 0, ky: 0, r: b.radius, hp, maxHp: hp,
      dmg: b.dmg * this.depthDmgMul() * 0.8, speed: b.speed, mass: 20, spr, shadow, aura: null, label: null, elite: null, eliteColor: 0xff4040,
      state: 'intro', t: 0, atkCd: 1.5, burnDps: 0, burnT: 0, chill: 0, chillT: 0, flash: 0, awake: false, room, phase: 0,
      target: null, losT: 0, los: true, animT: 0, baseScale: 0.5, dead: false, spawnT: 0, move: 0, moveName: '', sub: 0,
      aimX: 0, aimY: 0, hitSet: null, enraged: false, xpMul: 1, fromWave: false, hgt: 0, lx: 0, ly: 0,
    };
    this.enemies.push(e);
    return e;
  }

  destroyEnemy(e: Enemy) {
    e.spr.destroy();
    e.shadow.destroy();
    e.aura?.destroy();
    e.label?.destroy();
  }

  // ===================================================================== main loop
  update(_time: number, deltaMs: number) {
    if (this.paused) return;
    let dt = Math.min(deltaMs / 1000, 0.05);
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      dt *= 0.08;
    }
    if (this.slowT > 0) {
      this.slowT -= deltaMs / 1000;
      dt *= this.slowScale;
    }
    if (this.ended) dt *= 0.25;

    if (!this.ended && !this.transitioning) this.stats.time += dt;
    this.floorT += dt;

    const L = this.leader;
    if (L && L !== this.lastLeader) {
      if (this.lastLeader) {
        UI.toast(`<b>${L.name}</b> takes the lead!`, capyPortrait(L.cls, L.fur, 56), 3);
      }
      this.lastLeader = L;
    }
    this.buildHash();
    if (L) {
      this.updateFlow(dt);
      this.updateTrail(L);
    }
    for (const c of this.party) this.updateCapy(c, dt, c === L);
    this.separateParty();
    for (const e of this.enemies) if (!e.dead) this.updateEnemy(e, dt);
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.updateProjs(dt);
    this.updateGems(dt);
    this.updateDrops(dt);
    this.updateProps(dt);
    this.updateTeles(dt);
    this.updateWaves(dt);
    this.fx.update(dt);
    this.updateCamera(dt);
    this.updateLights();
    this.updateUI(dt);
    if (!this.ended && !this.transitioning && this.perkQueue.length && !UI.isModalOpen()) this.openPerk();
  }

  // ------------------------------------------------------------------ hash / flow
  buildHash() {
    this.hash.clear();
    for (const e of this.enemies) {
      if (e.dead) continue;
      const k = (Math.floor(e.x / 64) << 12) | Math.floor(e.y / 64);
      let a = this.hash.get(k);
      if (!a) this.hash.set(k, (a = []));
      a.push(e);
    }
  }

  near(x: number, y: number, r: number, out: Enemy[] = []): Enemy[] {
    out.length = 0;
    const x0 = Math.floor((x - r) / 64),
      x1 = Math.floor((x + r) / 64);
    const y0 = Math.floor((y - r) / 64),
      y1 = Math.floor((y + r) / 64);
    for (let gx = x0; gx <= x1; gx++)
      for (let gy = y0; gy <= y1; gy++) {
        const a = this.hash.get((gx << 12) | gy);
        if (a) for (const e of a) out.push(e);
      }
    return out;
  }

  updateFlow(dt: number) {
    const L = this.leader!;
    const d = this.dun;
    const tx = Math.floor(L.x / TILE),
      ty = Math.floor(L.y / TILE);
    const t = ty * d.w + tx;
    this.flowT -= dt;
    if (t === this.flowTile && this.flowT > 0) return;
    this.flowT = 0.25;
    this.flowTile = t;
    const f = this.flow;
    f.fill(-1);
    const q = new Int32Array(d.w * d.h);
    let qh = 0,
      qt = 0;
    if (isSolid(d, tx, ty)) return;
    f[t] = 0;
    q[qt++] = t;
    while (qh < qt) {
      const cur = q[qh++];
      const cx = cur % d.w,
        cy = (cur / d.w) | 0;
      const nd = f[cur] + 1;
      if (nd > 60) continue;
      for (let k = 0; k < 4; k++) {
        const nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0),
          ny = cy + (k === 2 ? 1 : k === 3 ? -1 : 0);
        const ni = ny * d.w + nx;
        if (nx < 0 || ny < 0 || nx >= d.w || ny >= d.h) continue;
        if (f[ni] !== -1 || d.tiles[ni] !== FLOOR) continue;
        f[ni] = nd;
        q[qt++] = ni;
      }
    }
  }

  // direction along the flow field toward the leader
  flowDir(x: number, y: number): { x: number; y: number } | null {
    const d = this.dun;
    const tx = Math.floor(x / TILE),
      ty = Math.floor(y / TILE);
    const cur = this.flow[ty * d.w + tx];
    if (cur < 0) return null;
    let best = cur,
      bx = 0,
      by = 0;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = tx + dx,
          ny = ty + dy;
        if (isSolid(d, nx, ny)) continue;
        if (dx && dy && (isSolid(d, tx + dx, ty) || isSolid(d, tx, ty + dy))) continue;
        const v = this.flow[ny * d.w + nx];
        if (v >= 0 && v < best) {
          best = v;
          bx = dx;
          by = dy;
        }
      }
    if (!bx && !by) return null;
    const gx = (tx + bx + 0.5) * TILE - x,
      gy = (ty + by + 0.5) * TILE - y;
    const l = Math.hypot(gx, gy) || 1;
    return { x: gx / l, y: gy / l };
  }

  los(x0: number, y0: number, x1: number, y1: number): boolean {
    const dx = x1 - x0,
      dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    const steps = Math.ceil(len / 20);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (isSolid(this.dun, Math.floor((x0 + dx * t) / TILE), Math.floor((y0 + dy * t) / TILE))) return false;
    }
    return true;
  }

  solidAt(x: number, y: number) {
    return isSolid(this.dun, Math.floor(x / TILE), Math.floor(y / TILE));
  }

  // circle vs tile collision with sliding
  moveBody(o: { x: number; y: number }, r: number, dx: number, dy: number) {
    const stepMax = 12;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / stepMax));
    const sx = dx / steps,
      sy = dy / steps;
    for (let i = 0; i < steps; i++) {
      o.x += sx;
      this.resolve(o, r);
      o.y += sy;
      this.resolve(o, r);
    }
  }

  resolve(o: { x: number; y: number }, r: number) {
    const d = this.dun;
    const tx0 = Math.floor((o.x - r) / TILE),
      tx1 = Math.floor((o.x + r) / TILE);
    const ty0 = Math.floor((o.y - r) / TILE),
      ty1 = Math.floor((o.y + r) / TILE);
    for (let ty = ty0; ty <= ty1; ty++)
      for (let tx = tx0; tx <= tx1; tx++) {
        if (!isSolid(d, tx, ty)) continue;
        const nx = clamp(o.x, tx * TILE, tx * TILE + TILE),
          ny = clamp(o.y, ty * TILE, ty * TILE + TILE);
        let ddx = o.x - nx,
          ddy = o.y - ny;
        const dd = ddx * ddx + ddy * ddy;
        if (dd < r * r) {
          if (dd < 0.0001) {
            // centre inside tile: push out along smallest axis
            const cx = tx * TILE + TILE / 2,
              cy = ty * TILE + TILE / 2;
            ddx = o.x - cx;
            ddy = o.y - cy;
            if (Math.abs(ddx) > Math.abs(ddy)) o.x = ddx > 0 ? tx * TILE + TILE + r : tx * TILE - r;
            else o.y = ddy > 0 ? ty * TILE + TILE + r : ty * TILE - r;
          } else {
            const dist = Math.sqrt(dd);
            const push = r - dist;
            o.x += (ddx / dist) * push;
            o.y += (ddy / dist) * push;
          }
        }
      }
  }

  updateTrail(L: Capy) {
    const last = this.trail[this.trail.length - 1];
    if (!last || dist2(last.x, last.y, L.x, L.y) > 22 * 22) {
      this.trail.push({ x: L.x, y: L.y });
      if (this.trail.length > 80) this.trail.shift();
    }
  }

  trailPoint(back: number) {
    let acc = 0;
    let prev = this.trail[this.trail.length - 1];
    for (let i = this.trail.length - 2; i >= 0; i--) {
      const p = this.trail[i];
      acc += Math.hypot(p.x - prev.x, p.y - prev.y);
      if (acc >= back) return p;
      prev = p;
    }
    return this.trail[0];
  }

  // ------------------------------------------------------------------ capy update
  updateCapy(c: Capy, dt: number, isLeader: boolean) {
    if (!c.alive) {
      if (c.deathT > 0) c.deathT -= dt;
      return;
    }
    if (this.transitioning) {
      c.crown.setVisible(false);
      return;
    }
    const s = c.stats;
    if (!this.ended) {
      c.hp = Math.min(s.maxHp, c.hp + s.regen * dt);
      if (c.poison > 0) {
        c.poison -= dt;
        c.hp -= (3 + this.depth * 1.2) * dt;
        if (c.hp <= 0) this.capyDeath(c);
        if (!c.alive) return;
      }
    }
    if (c.invuln > 0) c.invuln -= dt;
    // yuzu legendary: party heal
    if (c.legends.has('yuzu')) {
      c.yuzuT -= dt;
      if (c.yuzuT <= 0) {
        c.yuzuT = 3;
        for (const o of this.alive) this.healCapy(o, o.stats.maxHp * 0.03, false);
        this.fx.burst(this.fx.stars, 6, c.x, c.y - 20);
      }
    }

    // ------------------- movement
    let tvx = 0,
      tvy = 0;
    let speed = s.moveSpeed;
    if (this.transitioning || this.ended) {
      speed = 0;
    } else if (isLeader) {
      let ix = 0,
        iy = 0;
      const k = this.keys;
      if (k.has('a') || k.has('arrowleft')) ix -= 1;
      if (k.has('d') || k.has('arrowright')) ix += 1;
      if (k.has('w') || k.has('arrowup')) iy -= 1;
      if (k.has('s') || k.has('arrowdown')) iy += 1;
      const auto = (this as unknown as { autoMove?: { x: number; y: number } }).autoMove;
      if (auto && !ix && !iy) {
        ix = auto.x;
        iy = auto.y;
      }
      const l = Math.hypot(ix, iy);
      if (l > 0) {
        tvx = (ix / l) * speed;
        tvy = (iy / l) * speed;
        this.leaderFacing = Math.atan2(iy, ix);
      }
    } else {
      const v = this.followerSteer(c, dt);
      tvx = v.x;
      tvy = v.y;
    }
    if (c.dashT > 0) {
      c.dashT -= dt;
      const l = Math.hypot(tvx, tvy) || 1;
      tvx = (tvx / l) * speed * 2.6;
      tvy = (tvy / l) * speed * 2.6;
      if (Math.random() < 0.5) this.fx.burst(this.fx.sparks, 1, c.x, c.y - 10, 0x6ec6ff);
    }
    const accel = isLeader ? 16 : 9;
    const k = Math.min(1, dt * accel);
    c.vx += (tvx - c.vx) * k;
    c.vy += (tvy - c.vy) * k;
    this.moveBody(c, c.r, c.vx * dt, c.vy * dt);

    // zoomboots fire trail
    if (c.legends.has('zoomboots') && Math.hypot(c.vx, c.vy) > 60) {
      c.trailT -= dt;
      if (c.trailT <= 0) {
        c.trailT = 0.12;
        this.fx.burst(this.fx.embers, 2, c.x, c.y);
        for (const e of this.near(c.x, c.y, 40)) if (dist2(e.x, e.y, c.x, c.y) < (e.r + 26) ** 2) this.damageEnemy(e, s.damage * 0.35, { owner: c, crit: false, burn: 0.5 });
      }
    }

    // ------------------- attacking
    this.capyAttack(c, dt);

    // ------------------- herbalist heal pulse
    if (c.cls === 'herbalist' && !this.ended) {
      c.healCd -= dt;
      if (c.healCd <= 0) {
        const needs = this.alive.some((o) => o.hp < o.stats.maxHp * 0.92);
        const enemiesNear = c.legends.has('everbloom') && this.near(c.x, c.y, 220).length > 0;
        if (needs || enemiesNear) {
          c.healCd = 4.2;
          this.healPulse(c);
        } else c.healCd = 0.5;
      }
    }

    // ------------------- animation
    const spd = Math.hypot(c.vx, c.vy);
    if (Math.abs(c.vx) > 12) c.facing = c.vx > 0 ? 1 : -1;
    if (c.target && spd < 40) c.facing = c.target.x > c.x ? 1 : -1;
    c.walkT += dt * (spd > 20 ? 5 + spd / 30 : 0);
    c.blinkT -= dt;
    let frame = spd > 20 ? Math.floor(c.walkT) % 4 : 1;
    if (spd <= 20 && c.blinkT < 0.12) frame = 4;
    if (c.blinkT <= 0) c.blinkT = rng.range(2, 5);
    if (c.hurtT > 0) {
      c.hurtT -= dt;
      frame = 5;
    }
    c.spr.setFrame(frame);
    c.spr.setFlipX(c.facing < 0);
    c.lunge = Math.max(0, c.lunge - dt * 6);
    c.hop = Math.max(0, c.hop - dt);
    const bob = spd > 20 ? Math.abs(Math.sin(c.walkT * Math.PI)) * 3 : Math.sin(this.floorT * 2 + c.id) * 0.6;
    const hopY = c.hop > 0 ? Math.sin((1 - c.hop / 0.6) * Math.PI) * 26 : 0;
    const lx = Math.cos(c.lungeAng) * c.lunge * 10,
      ly = Math.sin(c.lungeAng) * c.lunge * 10;
    const breathe = spd > 20 ? 1 : 1 + Math.sin(this.floorT * 2.4 + c.id) * 0.02;
    const squash = c.lunge > 0 ? 1 + c.lunge * 0.12 : 1;
    c.spr.setPosition(c.x + lx, c.y + ly - bob - hopY);
    c.spr.setScale(0.5 * squash, (0.5 * breathe) / squash);
    c.spr.setRotation(spd > 20 ? Math.sin(c.walkT * Math.PI) * 0.04 : 0);
    c.spr.setDepth(D.entity + c.y / 100);
    c.shadow.setPosition(c.x, c.y + 1).setScale(0.62 - hopY * 0.004, 0.6 - hopY * 0.004);
    if (c.hurtT > 0.1) c.spr.setTintFill(0xffffff);
    else if (c.poison > 0) c.spr.setTint(0xb8ff90);
    else c.spr.clearTint();
    c.crown.setVisible(isLeader && this.alive.length > 1).setPosition(c.x + 4 * c.facing, c.spr.y - 42);
  }

  followerSteer(c: Capy, dt: number): { x: number; y: number } {
    const L = this.leader!;
    const s = c.stats;
    const idx = this.alive.indexOf(c);
    const dL = Math.hypot(L.x - c.x, L.y - c.y);
    let speed = s.moveSpeed * (dL > 240 ? 1.4 : 1);
    // catch-up teleport when hopelessly separated
    const moved = Math.hypot(c.x - c.lastX, c.y - c.lastY);
    c.lastX = c.x;
    c.lastY = c.y;
    if (dL > 150 && moved < 20 * dt) c.stuckT += dt;
    else c.stuckT = Math.max(0, c.stuckT - dt);
    if (dL > 900 || c.stuckT > 2.5) {
      const p = this.trailPoint(40 + idx * 20);
      this.fx.burst(this.fx.smoke, 6, c.x, c.y - 10);
      c.x = p.x;
      c.y = p.y;
      c.vx = c.vy = 0;
      c.stuckT = 0;
      this.fx.burst(this.fx.smoke, 6, c.x, c.y - 10);
      return { x: 0, y: 0 };
    }

    // desired point
    let tx: number, ty: number;
    const fa = this.leaderFacing;
    const slots = [
      [-70, -46],
      [-70, 46],
      [-128, -28],
      [-128, 28],
    ];
    const melee = CLASSES[c.cls].role === 'melee';
    const [bx, lat] = slots[(idx - 1) % 4];
    const back = melee ? bx * 0.55 : bx;
    const sx = L.x + Math.cos(fa) * back - Math.sin(fa) * lat;
    const sy = L.y + Math.sin(fa) * back + Math.cos(fa) * lat;
    if (!this.solidAt(sx, sy) && this.los(L.x, L.y, sx, sy)) {
      tx = sx;
      ty = sy;
    } else {
      const p = this.trailPoint(50 + idx * 45);
      tx = p.x;
      ty = p.y;
    }

    // engagement
    const leashed = dL < 380;
    if (leashed) {
      if (melee) {
        let best: Enemy | null = null,
          bd = 1e9;
        for (const e of this.enemies) {
          if (e.dead || !e.awake || e.state === 'hidden') continue;
          const de = dist2(e.x, e.y, c.x, c.y);
          if (de < 320 * 320 && dist2(e.x, e.y, L.x, L.y) < 380 * 380 && de < bd) {
            bd = de;
            best = e;
          }
        }
        if (best && this.los(c.x, c.y, best.x, best.y)) {
          const want = (c.cls === 'vanguard' ? s.range * 0.55 : s.range * 0.5) + best.r;
          const d = Math.sqrt(bd);
          const ax = (best.x - c.x) / (d || 1),
            ay = (best.y - c.y) / (d || 1);
          tx = best.x - ax * want;
          ty = best.y - ay * want;
          if (c.cls === 'storm' && c.dashCd <= 0 && d > 130) {
            c.dashCd = 2.2;
            c.dashT = 0.22;
            audio.play('dodge');
          }
        }
      } else {
        // ranged: kite away from close threats
        let fx = 0,
          fy = 0;
        for (const e of this.near(c.x, c.y, 130)) {
          if (e.dead || !e.awake) continue;
          const d = Math.hypot(c.x - e.x, c.y - e.y) || 1;
          if (d < 120 + e.r) {
            fx += ((c.x - e.x) / d) * (130 - d);
            fy += ((c.y - e.y) / d) * (130 - d);
          }
        }
        if (fx || fy) {
          tx = c.x + fx * 1.2;
          ty = c.y + fy * 1.2;
          speed *= 1.1;
        }
      }
    }
    c.dashCd -= dt;

    // path: direct if visible, else follow the flow field
    let dx = tx - c.x,
      dy = ty - c.y;
    let d = Math.hypot(dx, dy);
    if (d > 40 && !this.los(c.x, c.y, tx, ty)) {
      const f = this.flowDir(c.x, c.y);
      if (f) {
        return { x: f.x * speed, y: f.y * speed };
      }
    }
    if (d < 10) return { x: 0, y: 0 };
    const arrive = Math.min(1, d / 70);
    dx /= d;
    dy /= d;
    d = speed * arrive;
    return { x: dx * d, y: dy * d };
  }

  separateParty() {
    const a = this.alive;
    for (let i = 0; i < a.length; i++)
      for (let j = i + 1; j < a.length; j++) {
        const p = a[i],
          q = a[j];
        const dx = q.x - p.x,
          dy = q.y - p.y;
        const d = Math.hypot(dx, dy);
        const min = 34;
        if (d < min && d > 0.01) {
          const push = (min - d) * 0.5;
          const nx = dx / d,
            ny = dy / d;
          this.moveBody(p, p.r, -nx * push * 0.5, -ny * push * 0.5);
          this.moveBody(q, q.r, nx * push * 0.5, ny * push * 0.5);
        }
      }
  }

  // ------------------------------------------------------------------ party attacks
  findTarget(c: Capy): Enemy | null {
    const range = c.stats.range + (c.cls === 'vanguard' ? 0 : 0);
    const cand: { e: Enemy; d: number }[] = [];
    for (const e of this.enemies) {
      if (e.dead || e.state === 'hidden' || e.spawnT > 0) continue;
      const d = Math.hypot(e.x - c.x, e.y - c.y) - e.r;
      if (d <= range) cand.push({ e, d: d - (e.boss ? 40 : 0) });
    }
    cand.sort((a, b) => a.d - b.d);
    for (let i = 0; i < Math.min(4, cand.length); i++) if (this.los(c.x, c.y - 8, cand[i].e.x, cand[i].e.y)) return cand[i].e;
    return null;
  }

  rollDmg(c: Capy, mult = 1): { dmg: number; crit: boolean } {
    let dmg = c.stats.damage * mult * rng.range(0.9, 1.1);
    if (c.legends.has('friendship')) dmg *= 1 + 0.1 * this.alive.length;
    const crit = rng.chance(c.stats.crit);
    if (crit) dmg *= c.stats.critMult;
    return { dmg, crit };
  }

  capyAttack(c: Capy, dt: number) {
    if (this.transitioning || this.ended) return;
    c.cd -= dt;
    c.retarget -= dt;
    if (c.target && (c.target.dead || c.target.state === 'hidden')) c.target = null;
    if (c.retarget <= 0 || !c.target) {
      c.target = this.findTarget(c);
      c.retarget = 0.18;
    }
    const t = c.target;
    if (!t || c.cd > 0) return;
    const s = c.stats;
    const d = Math.hypot(t.x - c.x, t.y - c.y) - t.r;
    const reach = c.cls === 'vanguard' ? s.range * 0.85 : s.range;
    if (d > reach) return;
    c.cd = 1 / s.attackSpeed;
    const ang = Math.atan2(t.y - c.y, t.x - c.x);
    c.lunge = 1;
    c.lungeAng = ang;
    c.facing = Math.cos(ang) >= 0 ? 1 : -1;
    c.attackCount++;
    switch (CLASSES[c.cls].attack) {
      case 'cleave':
        this.cleave(c, ang);
        break;
      case 'arrow':
        this.volley(c, ang, 'arrow');
        break;
      case 'seed':
        this.volley(c, ang, 'seed');
        break;
      case 'fireball':
        this.fireball(c, t);
        break;
      case 'zap':
        this.zap(c, t);
        break;
    }
    if (c.legends.has('wetstick') && c.attackCount % 5 === 0) {
      const { dmg, crit } = this.rollDmg(c, 3);
      this.spawnProj({ kind: 'branch', x: c.x, y: c.y - 12, ang, speed: 430, dmg, crit, owner: c, pierce: 999, life: 1.6, r: 26, wall: false });
      audio.play('branch');
    }
  }

  cleave(c: Capy, ang: number) {
    const s = c.stats;
    const range = s.range;
    const slash = this.add.image(c.x + Math.cos(ang) * 12, c.y - 12 + Math.sin(ang) * 12, 'slash').setRotation(ang).setDepth(D.fxTop).setBlendMode(Phaser.BlendModes.ADD).setScale((range / 75) * 0.62).setAlpha(0.95);
    slash.setTint(c.legends.has('potlid') ? 0xfff0c0 : 0xffffff);
    this.tweens.add({ targets: slash, alpha: 0, scale: slash.scale * 1.18, rotation: ang + 0.5, duration: 170, onComplete: () => slash.destroy() });
    audio.play('slash', { pitch: 0.9 + rng.range(0, 0.2) });
    let hitAny = false;
    for (const e of this.near(c.x, c.y, range + 60)) {
      if (e.dead || e.state === 'hidden') continue;
      const dx = e.x - c.x,
        dy = e.y - c.y;
      const d = Math.hypot(dx, dy);
      if (d > range + e.r) continue;
      let da = Math.atan2(dy, dx) - ang;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) > 1.3 && d > e.r + 14) continue;
      const { dmg, crit } = this.rollDmg(c);
      this.damageEnemy(e, dmg, { owner: c, crit, kx: dx / (d || 1), ky: dy / (d || 1), knock: 260, burn: s.burn, chill: s.chill });
      hitAny = true;
    }
    this.breakPropsInArc(c.x, c.y, range, ang);
    if (hitAny) this.shake(0.08);
    if (c.legends.has('potlid')) {
      const { dmg, crit } = this.rollDmg(c, 1.2);
      this.spawnProj({ kind: 'shock', x: c.x, y: c.y - 10, ang, speed: 520, dmg, crit, owner: c, pierce: 999, life: 0.6, r: 30, wall: true });
    }
  }

  volley(c: Capy, ang: number, kind: 'arrow' | 'seed') {
    const s = c.stats;
    const n = 1 + Math.round(s.projectiles);
    const spread = 0.13;
    for (let i = 0; i < n; i++) {
      const a = ang + (i - (n - 1) / 2) * spread;
      const { dmg, crit } = this.rollDmg(c);
      this.spawnProj({
        kind, x: c.x + Math.cos(a) * 12, y: c.y - 14 + Math.sin(a) * 6, ang: a, speed: kind === 'arrow' ? s.projSpeed : s.projSpeed,
        dmg, crit, owner: c, pierce: Math.round(s.pierce), bounce: Math.round(s.bounce), life: (s.range * 1.25) / Math.max(200, s.projSpeed), r: kind === 'arrow' ? 8 : 9,
        burn: s.burn, chill: s.chill,
      });
    }
    audio.play(kind === 'arrow' ? 'bow' : 'seed');
  }

  fireball(c: Capy, t: Enemy) {
    const s = c.stats;
    const n = 1 + Math.round(s.projectiles);
    const big = c.legends.has('bigorange');
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 50;
      const ang = Math.atan2(t.y - c.y, t.x - c.x);
      const tx = t.x - Math.sin(ang) * off + t.vx * 0.3,
        ty = t.y + Math.cos(ang) * off + t.vy * 0.3;
      const a = Math.atan2(ty - c.y, tx - c.x);
      const { dmg, crit } = this.rollDmg(c);
      const p = this.spawnProj({ kind: big ? 'orange' : 'fireball', x: c.x, y: c.y - 16, ang: a, speed: s.projSpeed, dmg, crit, owner: c, life: 3, r: big ? 16 : 12, aoe: s.aoe, burn: s.burn, chill: s.chill });
      p.tx = tx;
      p.ty = ty;
    }
    audio.play('fireball');
  }

  zap(c: Capy, first: Enemy) {
    const s = c.stats;
    const chain: Enemy[] = [first];
    const jumps = Math.round(s.bounce);
    for (let k = 0; k < jumps; k++) {
      const last = chain[chain.length - 1];
      let best: Enemy | null = null,
        bd = 190 * 190;
      for (const e of this.near(last.x, last.y, 190)) {
        if (e.dead || chain.includes(e) || e.state === 'hidden') continue;
        const d = dist2(e.x, e.y, last.x, last.y);
        if (d < bd) {
          bd = d;
          best = e;
        }
      }
      if (!best) break;
      chain.push(best);
    }
    const pts = [{ x: c.x + c.facing * 10, y: c.y - 16 }, ...chain.map((e) => ({ x: e.x, y: e.y - e.r * 0.6 }))];
    this.fx.lightning(pts);
    const thunder = c.legends.has('thunderwhisk');
    chain.forEach((e, i) => {
      const { dmg, crit } = this.rollDmg(c, thunder ? 1 : Math.pow(0.8, i));
      const ang = Math.atan2(e.y - c.y, e.x - c.x);
      this.damageEnemy(e, dmg, { owner: c, crit, kx: Math.cos(ang), ky: Math.sin(ang), knock: 60, burn: s.burn, chill: s.chill });
      this.fx.burst(this.fx.sparks, 3, e.x, e.y - e.r * 0.5, 0x9ad8ff);
    });
    audio.play('zap');
  }

  healPulse(c: Capy) {
    const amt = (7 + c.level * 2.4) * c.stats.healPower;
    let healed = 0;
    for (const o of this.alive) {
      if (Math.hypot(o.x - c.x, o.y - c.y) < 380) healed += this.healCapy(o, amt, true);
    }
    const ring = this.add.image(c.x, c.y, 'ring').setDepth(D.fxTop).setTint(0x8aff7a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.2).setAlpha(0.9);
    this.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 520, onComplete: () => ring.destroy() });
    this.fx.burst(this.fx.leaves, 10, c.x, c.y - 16);
    this.fx.flash(c.x, c.y, 260, 0x80ff80, 0.4);
    if (healed > 0) audio.play('heal');
    if (c.legends.has('everbloom')) {
      for (const e of this.near(c.x, c.y, 220)) {
        if (dist2(e.x, e.y, c.x, c.y) < 220 * 220) this.damageEnemy(e, amt * 3, { owner: c, crit: false, kx: e.x - c.x, ky: e.y - c.y, knock: 200 });
      }
    }
    c.hop = 0.4;
  }

  healCapy(c: Capy, amt: number, show: boolean): number {
    if (!c.alive) return 0;
    const before = c.hp;
    c.hp = Math.min(c.stats.maxHp, c.hp + amt);
    const h = c.hp - before;
    if (show && h >= 1) this.fx.number(c.x, c.y - 44, `+${Math.round(h)}`, '#7ee06a', 15);
    if (h > 0 && c.poison > 0 && show) c.poison = 0;
    return h;
  }

  // ------------------------------------------------------------------ projectiles
  spawnProj(o: {
    kind: ProjKind; x: number; y: number; ang: number; speed: number; dmg: number; crit?: boolean; owner?: Capy | null; pierce?: number;
    bounce?: number; life?: number; r?: number; aoe?: number; burn?: number; chill?: number; friendly?: boolean; wall?: boolean; homing?: number; poison?: number;
  }): Proj {
    const tex: Record<ProjKind, string> = {
      arrow: 'arrow', fireball: 'fireball', seed: 'seed', bone: 'bonearrow', spore: 'spore', orb: 'orb', goo: 'goo', greenorb: 'greenorb',
      branch: 'branch', bubble: 'bubble', shock: 'shock', orange: 'orangeball',
    };
    const friendly = o.friendly ?? !!o.owner;
    const spr = this.add.image(o.x, o.y, tex[o.kind]).setDepth(D.proj).setRotation(o.ang);
    const sc: Partial<Record<ProjKind, number>> = { arrow: 0.55, fireball: 0.9, seed: 0.6, bone: 0.6, spore: 0.75, orb: 0.8, goo: 0.85, greenorb: 0.8, branch: 0.8, bubble: 0.7, shock: 0.8, orange: 0.95 };
    spr.setScale(sc[o.kind] ?? 0.6);
    if (o.kind === 'fireball' || o.kind === 'orb' || o.kind === 'greenorb' || o.kind === 'goo') spr.setBlendMode(Phaser.BlendModes.ADD);
    const p: Proj = {
      kind: o.kind, spr, x: o.x, y: o.y, vx: Math.cos(o.ang) * o.speed, vy: Math.sin(o.ang) * o.speed, r: o.r ?? 8, dmg: o.dmg, friendly,
      owner: o.owner ?? null, pierce: o.pierce ?? 0, bounce: o.bounce ?? 0, hit: new Set(), life: o.life ?? 2.5, aoe: o.aoe ?? 0,
      crit: o.crit ? 1 : 0, critMult: 1, burn: o.burn ?? 0, chill: o.chill ?? 0, lifesteal: 0, spin: o.kind === 'branch' ? 14 : o.kind === 'seed' ? 10 : 0,
      homing: o.homing ?? 0, wall: o.wall ?? true, tx: NaN, ty: NaN, dead: false, poison: o.poison,
    };
    this.projs.push(p);
    return p;
  }

  updateProjs(dt: number) {
    for (const p of this.projs) {
      if (p.dead) continue;
      p.life -= dt;
      if (p.homing > 0) {
        let best: Enemy | null = null,
          bd = 300 * 300;
        for (const e of this.near(p.x, p.y, 300)) {
          if (e.dead || p.hit.has(e)) continue;
          const d = dist2(e.x, e.y, p.x, p.y);
          if (d < bd) {
            bd = d;
            best = e;
          }
        }
        if (best) {
          const sp = Math.hypot(p.vx, p.vy);
          const a0 = Math.atan2(p.vy, p.vx),
            a1 = Math.atan2(best.y - p.y, best.x - p.x);
          let da = a1 - a0;
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          const a = a0 + clamp(da, -p.homing * dt, p.homing * dt);
          p.vx = Math.cos(a) * sp;
          p.vy = Math.sin(a) * sp;
        }
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.spr.setPosition(p.x, p.y);
      if (p.spin) p.spr.rotation += p.spin * dt;
      else if (p.kind !== 'fireball' && p.kind !== 'orange') p.spr.setRotation(Math.atan2(p.vy, p.vx));
      if (p.kind === 'fireball' || p.kind === 'orange') {
        if (Math.random() < 0.6) this.fx.burst(this.fx.embers, 1, p.x, p.y);
        p.spr.rotation += dt * 4;
      }
      if (p.kind === 'greenorb' || p.kind === 'orb') p.spr.setScale(0.8 + Math.sin(p.life * 20) * 0.08);

      if (p.life <= 0) {
        if (p.aoe) this.explode(p);
        this.killProj(p, false);
        continue;
      }
      if (p.wall && this.solidAt(p.x, p.y)) {
        if (p.aoe) this.explode(p);
        else this.fx.burst(this.fx.sparks, 3, p.x, p.y, p.friendly ? 0xffe0a0 : 0xff9090);
        this.killProj(p, false);
        continue;
      }
      if (p.friendly) {
        if (!isNaN(p.tx) && dist2(p.x, p.y, p.tx, p.ty) < 16 * 16) {
          this.explode(p);
          this.killProj(p, false);
          continue;
        }
        for (const e of this.near(p.x, p.y, p.r + 60)) {
          if (e.dead || p.hit.has(e) || e.state === 'hidden' || e.spawnT > 0) continue;
          if (dist2(e.x, e.y - e.r * 0.4, p.x, p.y) > (e.r + p.r) ** 2) continue;
          this.projHit(p, e);
          if (p.dead) break;
        }
        if (!p.dead) this.breakPropsAt(p.x, p.y, p.r);
      } else {
        for (const c of this.party) {
          if (!c.alive) continue;
          if (dist2(c.x, c.y - 10, p.x, p.y) < (c.r + p.r - 2) ** 2) {
            this.damageCapy(c, p.dmg, null, false);
            if (p.poison) c.poison = Math.max(c.poison, p.poison);
            this.fx.burst(this.fx.sparks, 4, p.x, p.y, p.kind === 'spore' ? 0xb0ff60 : 0xff8080);
            this.killProj(p, false);
            break;
          }
        }
      }
    }
    this.projs = this.projs.filter((p) => !p.dead);
  }

  projHit(p: Proj, e: Enemy) {
    if (p.aoe) {
      this.explode(p);
      this.killProj(p, false);
      return;
    }
    p.hit.add(e);
    const sp = Math.hypot(p.vx, p.vy) || 1;
    const knock = p.kind === 'branch' ? 320 : p.kind === 'shock' ? 260 : p.kind === 'arrow' ? 90 : 60;
    this.damageEnemy(e, p.dmg, { owner: p.owner, crit: !!p.crit, kx: p.vx / sp, ky: p.vy / sp, knock, burn: p.burn, chill: p.chill });
    this.fx.burst(this.fx.sparks, 2, p.x, p.y, p.kind === 'seed' ? 0xa0ff80 : 0xffffff);
    if (p.owner?.legends.has('bubblebow') && p.kind === 'arrow') {
      for (let i = 0; i < 3; i++) {
        const b = this.spawnProj({ kind: 'bubble', x: p.x, y: p.y, ang: rng.range(0, Math.PI * 2), speed: 260, dmg: p.dmg * 0.4, owner: p.owner, life: 1.6, r: 9, homing: 7 });
        b.hit.add(e);
      }
      audio.play('bubble');
    }
    if (p.pierce > 0) {
      p.pierce--;
      return;
    }
    if (p.bounce > 0) {
      p.bounce--;
      let best: Enemy | null = null,
        bd = 280 * 280;
      for (const o of this.near(p.x, p.y, 280)) {
        if (o.dead || p.hit.has(o)) continue;
        const d = dist2(o.x, o.y, p.x, p.y);
        if (d < bd) {
          bd = d;
          best = o;
        }
      }
      if (best) {
        const a = Math.atan2(best.y - best.r * 0.4 - p.y, best.x - p.x);
        p.vx = Math.cos(a) * sp;
        p.vy = Math.sin(a) * sp;
        p.life = Math.max(p.life, 0.8);
        return;
      }
    }
    this.killProj(p, false);
  }

  killProj(p: Proj, _fx: boolean) {
    p.dead = true;
    p.spr.destroy();
  }

  explode(p: Proj) {
    const big = p.kind === 'orange';
    const r = p.aoe;
    const boom = (x: number, y: number, mult: number) => {
      const img = this.add.image(x, y, big ? 'orangeball' : 'fireball').setDepth(D.fxTop).setBlendMode(Phaser.BlendModes.ADD).setScale(0.4);
      this.tweens.add({ targets: img, scale: (r / 16) * 1.1, alpha: 0, duration: 300, ease: 'Cubic.out', onComplete: () => img.destroy() });
      const ring = this.add.image(x, y, 'ring').setDepth(D.fxTop).setTint(big ? 0xffa030 : 0xff7030).setBlendMode(Phaser.BlendModes.ADD).setScale(0.2).setAlpha(0.8);
      this.tweens.add({ targets: ring, scale: r / 60, alpha: 0, duration: 280, onComplete: () => ring.destroy() });
      this.fx.burst(this.fx.embers, 14, x, y);
      this.fx.burst(this.fx.smoke, 4, x, y);
      if (big) this.fx.burst(this.fx.puffs, 10, x, y, 0xffa030);
      this.fx.flash(x, y, r * 3.2, 0xff8030, 0.35);
      audio.play('explode', { vol: 0.8 });
      this.shake(0.12);
      for (const e of this.near(x, y, r + 60)) {
        if (e.dead || e.state === 'hidden') continue;
        const d = Math.hypot(e.x - x, e.y - y);
        if (d > r + e.r) continue;
        const crit = !!p.crit;
        this.damageEnemy(e, p.dmg * mult * (d < r * 0.5 ? 1 : 0.75), { owner: p.owner, crit, kx: (e.x - x) / (d || 1), ky: (e.y - y) / (d || 1), knock: 180, burn: p.burn, chill: p.chill });
      }
      this.breakPropsAt(x, y, r * 0.8);
    };
    boom(p.x, p.y, 1);
    if (big) {
      const x = p.x,
        y = p.y;
      this.time.delayedCall(260, () => {
        if (!this.transitioning) boom(x, y, 0.6);
      });
    }
  }

  // ------------------------------------------------------------------ damage
  damageEnemy(e: Enemy, amount: number, o: { owner: Capy | null; crit: boolean; kx?: number; ky?: number; knock?: number; burn?: number; chill?: number }) {
    if (e.dead || e.state === 'hidden' || this.ended) return;
    if (e.boss && (e.state === 'air' || e.state === 'intro')) return;
    let dmg = amount;
    if (e.elite === 'armored') dmg *= 0.65;
    e.hp -= dmg;
    e.flash = 0.09;
    if (!e.awake) this.wake(e);
    const col = o.crit ? '#ffe070' : '#ffffff';
    this.fx.number(e.x, e.y - e.r - 20, `${Math.max(1, Math.round(dmg))}${o.crit ? '!' : ''}`, col, o.crit ? 20 : 15, o.crit);
    if (o.crit) {
      audio.play('crit');
      this.fx.burst(this.fx.sparks, 5, e.x, e.y - e.r * 0.5, 0xffe070);
    } else audio.play('hit', { vol: 0.7 });
    if (o.knock && (o.kx || o.ky)) {
      const m = e.boss ? 0.03 : 1 / e.mass;
      const l = Math.hypot(o.kx!, o.ky!) || 1;
      e.kx += (o.kx! / l) * o.knock * m;
      e.ky += (o.ky! / l) * o.knock * m;
    }
    if (o.burn && o.burn > 0) {
      e.burnDps = Math.max(e.burnDps * (e.burnT > 0 ? 1 : 0), dmg * o.burn);
      e.burnT = 3;
    }
    if (o.chill && o.chill > 0) {
      e.chill = Math.max(e.chill, o.chill);
      e.chillT = 2;
    }
    if (o.owner && o.owner.alive && o.owner.stats.lifesteal > 0) this.healCapy(o.owner, dmg * o.owner.stats.lifesteal, false);
    if (e.elite === 'vampiric' && o.owner) {
      /* vampiric elites heal when hitting, not when hit */
    }
    if (e.hp <= 0) this.killEnemy(e, o.owner);
  }

  wake(e: Enemy) {
    if (e.awake || e.boss) return;
    e.awake = true;
    // alert nearby dormant enemies
    for (const o of this.near(e.x, e.y, 300)) {
      if (!o.awake && !o.boss && dist2(o.x, o.y, e.x, e.y) < 300 * 300) {
        o.awake = true;
      }
    }
  }

  killEnemy(e: Enemy, killer: Capy | null) {
    if (e.dead) return;
    e.dead = true;
    this.stats.kills++;
    if (killer) killer.kills++;
    const x = e.x,
      y = e.y;
    if (e.boss) {
      this.bossDeath(e);
      return;
    }
    const def = e.def!;
    const colors: Record<string, number> = { rat: 0x9a8aa8, slime: 0x7ee06a, minislime: 0x8ae0d0, bat: 0x7a5a9a, skeleton: 0xece3cc, archer: 0xece3cc, shroom: 0xe05050, beetle: 0x6a7aa0 };
    this.fx.burst(this.fx.puffs, e.elite ? 16 : 8, x, y - e.r * 0.5, colors[def.id] ?? 0xffffff);
    this.fx.burst(this.fx.sparks, 4, x, y - e.r * 0.5);
    const sfx = def.id === 'rat' ? 'squeak' : def.id === 'slime' || def.id === 'minislime' ? 'blorp' : def.id === 'skeleton' || def.id === 'archer' ? 'bones' : 'enemyDie';
    audio.play(sfx, { pitch: e.elite ? 0.7 : 1 });
    // death pop
    const ghost = this.add.sprite(e.spr.x, e.spr.y, e.spr.texture.key, e.spr.frame.name).setOrigin(e.spr.originX, e.spr.originY).setScale(e.spr.scaleX, e.spr.scaleY).setFlipX(e.spr.flipX).setDepth(e.spr.depth).setTintFill(0xffffff);
    this.tweens.add({ targets: ghost, scaleX: ghost.scaleX * 1.4, scaleY: ghost.scaleY * 0.3, alpha: 0, duration: 180, onComplete: () => ghost.destroy() });
    this.destroyEnemy(e);

    // XP
    const xp = def.xp * (1 + 0.18 * (this.depth - 1)) * e.xpMul * (e.fromWave ? 0.7 : 1);
    this.dropGems(x, y, xp);
    // loot
    const lettuce = this.alive.some((c) => c.legends.has('lettuce'));
    if (rng.chance(0.018 + (lettuce ? 0.06 : 0))) this.spawnGem(x, y, 0, true);
    if (e.elite) {
      this.dropItem(makeItem({ depth: this.depth, rarityBonus: 0.6 }), x, y);
      this.hitStop = 0.05;
      this.shake(0.3);
      if (e.elite === 'volatile') this.volatileBlast(x, y);
    } else if (rng.chance(0.03 + this.depth * 0.002)) this.dropItem(makeItem({ depth: this.depth }), x, y);
    if (def.id === 'slime') {
      for (let i = 0; i < 2; i++) {
        const m = this.spawnEnemy('minislime', x + (i ? 12 : -12), y, { awake: true, room: e.room });
        m.kx = (i ? 1 : -1) * 120;
      }
    }
  }

  volatileBlast(x: number, y: number) {
    const r = 110;
    this.telegraph(0.7, (g, k) => {
      g.clear();
      g.fillStyle(0xff6020, 0.15 + k * 0.2);
      g.fillCircle(x, y, r * k);
      g.lineStyle(3, 0xffa040, 0.9);
      g.strokeCircle(x, y, r);
    }, () => {
      this.fx.burst(this.fx.embers, 20, x, y);
      this.fx.flash(x, y, 300, 0xff8030, 0.4);
      audio.play('explode');
      this.shake(0.3);
      for (const c of this.alive) if (dist2(c.x, c.y, x, y) < (r + c.r) ** 2) this.damageCapy(c, 14 * this.depthDmgMul(), null, false);
    });
  }

  damageCapy(c: Capy, amount: number, src: Enemy | null, melee: boolean) {
    if (!c.alive || c.invuln > 0 || this.ended || this.transitioning) return;
    const s = c.stats;
    if (rng.chance(s.dodge)) {
      this.fx.number(c.x, c.y - 40, 'dodge', '#a8d8ff', 13);
      audio.play('dodge');
      return;
    }
    const dmg = amount * (14 / (14 + Math.max(0, s.armor)));
    c.hp -= dmg;
    c.hurtT = 0.22;
    this.fx.number(c.x, c.y - 40, `${Math.max(1, Math.round(dmg))}`, '#ff6a5a', 15);
    audio.play('capyHurt');
    if (c === this.leader) this.shake(Math.min(0.3, 0.08 + dmg / c.stats.maxHp));
    if (melee && src && s.thorns > 0) this.damageEnemy(src, amount * s.thorns, { owner: c, crit: false });
    if (src && src.elite === 'vampiric') src.hp = Math.min(src.maxHp, src.hp + dmg * 2);
    if (c.hp <= 0) this.capyDeath(c);
  }

  capyDeath(c: Capy) {
    if (!c.alive) return;
    c.alive = false;
    c.hp = 0;
    c.deathT = 1;
    c.crown.setVisible(false);
    audio.play('capyDie');
    this.slowT = 0.8;
    this.slowScale = 0.35;
    this.shake(0.4);
    this.stats.fallen.push({ name: c.name, cls: c.cls, fur: c.fur, level: c.level, depth: this.depth, kills: c.kills });
    // flop over, then a ghost floats up
    c.spr.setTintFill(0xffffff);
    this.tweens.add({ targets: c.spr, angle: c.facing * 180, y: c.spr.y - 10, duration: 350, ease: 'Back.out', onComplete: () => c.spr.clearTint() });
    this.tweens.add({ targets: [c.spr, c.shadow], alpha: 0, delay: 900, duration: 600 });
    const grave = this.add.image(c.x, c.y, 'grave').setOrigin(0.5, 0.9).setScale(0.6).setDepth(D.entity + c.y / 100).setAlpha(0);
    this.floorObjs.push(grave);
    this.tweens.add({ targets: grave, alpha: 1, delay: 1100, duration: 400 });
    const ghost = this.add.sprite(c.x, c.y - 10, 'ghost', 0).setOrigin(0.53, 0.9).setScale(0.5).setDepth(D.text - 3).setAlpha(0).setFlipX(c.facing < 0);
    this.tweens.add({ targets: ghost, alpha: 0.85, duration: 300, delay: 300 });
    this.tweens.add({ targets: ghost, y: ghost.y - 110, alpha: 0, delay: 600, duration: 2200, ease: 'Sine.in', onComplete: () => ghost.destroy() });
    this.fx.burst(this.fx.stars, 12, c.x, c.y - 20);
    // gear goes back to the bag
    for (const sl of SLOTS) {
      const it = c.equip[sl];
      if (!it) continue;
      c.equip[sl] = null;
      if (this.bag.length < BAG_MAX) this.bag.push(it);
      else this.dropItem(it, c.x, c.y);
    }
    this.perkQueue = this.perkQueue.filter((q) => q !== c);
    const alive = this.alive;
    if (alive.length === 0) {
      this.squadWipe();
      return;
    }
    UI.toast(`<b>${c.name}</b> has fallen… their gear was saved.`, capyPortrait(c.cls, c.fur, 56), 4, '#a03030');
  }

  squadWipe() {
    this.ended = true;
    audio.setMusic('none');
    audio.play('wipe');
    UI.bossBar(null, 0);
    this.stats.levels = this.party.reduce((a, c) => a + c.levelsGained, 0);
    const best = loadBest();
    const record = this.depth > best.depth;
    best.runs++;
    best.depth = Math.max(best.depth, this.depth);
    best.kills = Math.max(best.kills, this.stats.kills);
    best.time = Math.max(best.time, this.stats.time);
    saveBest(best);
    this.time.delayedCall(2600, () => {
      this.paused = true;
      UI.showDeath(this, this.stats, this.depth, record, () => this.restartRun(), () => this.toMenu());
    });
  }

  // ------------------------------------------------------------------ enemy AI
  pickTarget(e: Enemy): Capy | null {
    let best: Capy | null = null,
      bd = 1e12;
    for (const c of this.party) {
      if (!c.alive) continue;
      let d = dist2(c.x, c.y, e.x, e.y);
      if (c.cls === 'vanguard') d *= 0.45;
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    return best;
  }

  updateEnemy(e: Enemy, dt: number) {
    e.animT += dt;
    if (e.flash > 0) e.flash -= dt;
    if (e.spawnT > 0) {
      e.spawnT -= dt;
      e.spr.setAlpha(1 - Math.max(0, e.spawnT) / 0.6);
    }
    // status
    if (e.burnT > 0) {
      e.burnT -= dt;
      e.hp -= e.burnDps * dt;
      if (Math.random() < dt * 8) this.fx.burst(this.fx.embers, 1, e.x + rng.range(-8, 8), e.y - e.r);
      if (e.hp <= 0) {
        this.killEnemy(e, null);
        return;
      }
    }
    if (e.chillT > 0) {
      e.chillT -= dt;
      if (e.chillT <= 0) e.chill = 0;
    }
    const slow = 1 - e.chill;

    if (e.boss) {
      updateBoss(this, e, dt);
    } else if (!this.ended && !this.transitioning) {
      this.enemyAI(e, dt, slow);
    }

    // knockback & motion
    e.kx *= Math.pow(0.0015, dt);
    e.ky *= Math.pow(0.0015, dt);
    if (e.state !== 'hidden') {
      this.moveBody(e, Math.min(e.r, 26), (e.vx * slow + e.kx) * dt, (e.vy * slow + e.ky) * dt);
      // separation among enemies
      if (!e.boss) {
        for (const o of this.near(e.x, e.y, e.r + 30)) {
          if (o === e || o.dead) continue;
          const dx = e.x - o.x,
            dy = e.y - o.y;
          const d = Math.hypot(dx, dy);
          const min = (e.r + o.r) * 0.85;
          if (d < min && d > 0.01) {
            const push = ((min - d) / d) * 0.5 * (o.mass / (o.mass + e.mass)) * 2;
            e.x += dx * push * 0.5;
            e.y += dy * push * 0.5;
          }
        }
      }
      // push against party (enemies can't overlap capybaras)
      for (const c of this.party) {
        if (!c.alive) continue;
        const dx = e.x - c.x,
          dy = e.y - c.y;
        const d = Math.hypot(dx, dy);
        const min = e.r + c.r - 4;
        if (d < min && d > 0.01) {
          const f = (min - d) / d;
          const wE = e.boss ? 0.1 : 0.75,
            wC = e.boss ? 0.9 : 0.25;
          e.x += dx * f * wE;
          e.y += dy * f * wE;
          this.moveBody(c, c.r, -dx * f * wC, -dy * f * wC);
        }
      }
      this.resolve(e, Math.min(e.r, 26));
    }

    // render
    const def = e.def;
    const n = def ? def.frames : 2;
    const rate = def ? def.animRate : 4;
    const moving = Math.hypot(e.vx, e.vy) > 5;
    let frame = Math.floor(e.animT * rate * (moving || def?.kind === 'flyer' ? 1 : 0.35)) % n;
    if (def?.id === 'shroom') frame = e.state === 'windup' ? 1 : 0;
    if (def?.id === 'archer' && e.state === 'windup') frame = 1;
    e.spr.setFrame(frame);
    if (Math.abs(e.vx) > 4) e.spr.setFlipX(def?.id === 'bat' ? false : e.vx < 0);
    let sx = e.baseScale,
      sy = e.baseScale,
      oy = 0;
    if (def?.id === 'slime' || def?.id === 'minislime') {
      const w = Math.sin(e.animT * 6);
      sx *= 1 + w * 0.06;
      sy *= 1 - w * 0.06;
    }
    if (def?.kind === 'flyer') oy = -14 + Math.sin(e.animT * 5) * 4;
    if (e.state === 'windup' && !e.boss) {
      const k = Math.sin(e.t * 40) * 0.05;
      sx *= 1.08 + k;
      sy *= 0.94;
    }
    if (e.boss) {
      const w = Math.sin(e.animT * 3);
      if (e.boss.id === 'slimemonarch') {
        sx *= 1 + w * 0.05;
        sy *= 1 - w * 0.05;
      }
      if (e.boss.id === 'lich') oy = -10 + w * 5;
      oy -= e.hgt;
    }
    e.spr.setPosition(e.x, e.y + oy).setScale(sx, sy).setDepth(D.entity + e.y / 100 + (def?.kind === 'flyer' ? 2 : 0));
    e.shadow.setPosition(e.x, e.y + 1);
    if (e.flash > 0) e.spr.setTintFill(0xffffff);
    else if (e.state === 'windup' && !e.boss) e.spr.setTint(0xffb0a0);
    else if (e.burnT > 0) e.spr.setTint(0xffa070);
    else if (e.chillT > 0) e.spr.setTint(0x9ad8ff);
    else if (e.boss && e.enraged) e.spr.setTint(0xffc8c8);
    else e.spr.clearTint();
    if (e.aura) e.aura.setPosition(e.x, e.y - e.r * 0.5).setDepth(e.spr.depth - 0.01).setAlpha(0.45 + Math.sin(e.animT * 4) * 0.15);
    if (e.label) e.label.setPosition(e.x, e.y + oy - e.r * 2.3);
  }

  enemyAI(e: Enemy, dt: number, slow: number) {
    const def = e.def!;
    e.t += dt;
    e.atkCd -= dt * slow * (e.elite === 'frenzied' ? 1.7 : 1);
    const tgt = e.awake ? this.pickTarget(e) : null;
    e.target = tgt;
    if (!e.awake) {
      // idle wander + wake checks
      e.vx *= 0.9;
      e.vy *= 0.9;
      if (def.kind === 'flyer') {
        e.vx = Math.cos(e.animT * 0.7 + e.phase) * 20;
        e.vy = Math.sin(e.animT * 0.9 + e.phase) * 20;
      }
      e.losT -= dt;
      if (e.losT <= 0) {
        e.losT = 0.3;
        for (const c of this.alive) {
          const d2 = dist2(c.x, c.y, e.x, e.y);
          if (d2 < 360 * 360 && this.los(e.x, e.y, c.x, c.y)) {
            this.wake(e);
            break;
          }
        }
        const L = this.leader;
        if (L && e.room >= 0 && this.dun.roomAt[Math.floor(L.y / TILE) * this.dun.w + Math.floor(L.x / TILE)] === e.room) this.wake(e);
      }
      return;
    }
    if (!tgt) {
      e.vx = e.vy = 0;
      return;
    }
    const dx = tgt.x - e.x,
      dy = tgt.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    e.losT -= dt;
    if (e.losT <= 0) {
      e.losT = 0.25 + Math.random() * 0.1;
      e.los = this.los(e.x, e.y, tgt.x, tgt.y);
    }
    const chaseDir = (): { x: number; y: number } => {
      if (e.los || d < 60) return { x: dx / d, y: dy / d };
      const f = this.flowDir(e.x, e.y);
      return f ?? { x: dx / d, y: dy / d };
    };

    if (e.state === 'windup') {
      e.vx *= 0.8;
      e.vy *= 0.8;
      if (e.t >= def.windup) {
        this.enemyStrike(e, tgt);
        e.state = 'recover';
        e.t = 0;
        e.atkCd = def.atkCd;
      }
      return;
    }
    if (e.state === 'recover') {
      e.vx *= 0.85;
      e.vy *= 0.85;
      if (e.t > 0.25) e.state = 'chase';
      return;
    }
    e.state = 'chase';
    switch (def.kind) {
      case 'melee':
      case 'flyer': {
        const reach = def.reach + tgt.r + e.r * 0.4;
        if (d < reach && e.atkCd <= 0 && e.spawnT <= 0) {
          e.state = 'windup';
          e.t = 0;
          return;
        }
        const dir = chaseDir();
        let vx = dir.x * e.speed,
          vy = dir.y * e.speed;
        if (def.kind === 'flyer') {
          const w = Math.sin(e.animT * 3 + e.phase) * 0.8;
          vx += -dir.y * e.speed * w;
          vy += dir.x * e.speed * w;
        }
        if (d < reach * 0.8) {
          vx *= 0.2;
          vy *= 0.2;
        }
        e.vx += (vx - e.vx) * Math.min(1, dt * 8);
        e.vy += (vy - e.vy) * Math.min(1, dt * 8);
        break;
      }
      case 'ranged': {
        const want = 260;
        let vx = 0,
          vy = 0;
        if (!e.los || d > def.reach) {
          const dir = chaseDir();
          vx = dir.x * e.speed;
          vy = dir.y * e.speed;
        } else if (d < want - 60) {
          vx = (-dx / d) * e.speed * 0.9;
          vy = (-dy / d) * e.speed * 0.9;
        } else {
          const s = Math.sin(e.animT * 0.8 + e.phase);
          vx = (-dy / d) * e.speed * 0.5 * s;
          vy = (dx / d) * e.speed * 0.5 * s;
        }
        e.vx += (vx - e.vx) * Math.min(1, dt * 6);
        e.vy += (vy - e.vy) * Math.min(1, dt * 6);
        if (e.los && d < def.reach && e.atkCd <= 0 && e.spawnT <= 0) {
          e.state = 'windup';
          e.t = 0;
          e.aimX = tgt.x + tgt.vx * 0.35;
          e.aimY = tgt.y + tgt.vy * 0.35;
          const ax = e.aimX,
            ay = e.aimY;
          const ex = e.x,
            ey = e.y;
          this.telegraph(def.windup, (g, k) => {
            g.clear();
            g.lineStyle(2, 0xff5040, 0.25 + k * 0.5);
            g.lineBetween(ex, ey - 16, ex + (ax - ex) * k, ey - 16 + (ay - ey) * k);
          }, () => {});
        }
        break;
      }
      case 'turret': {
        e.vx = e.vy = 0;
        if (d < def.reach && e.los && e.atkCd <= 0) {
          e.state = 'windup';
          e.t = 0;
        }
        break;
      }
    }
  }

  enemyStrike(e: Enemy, tgt: Capy) {
    const def = e.def!;
    if (def.kind === 'ranged') {
      const a = Math.atan2(e.aimY - (e.y - 16), e.aimX - e.x);
      const n = e.elite ? 3 : this.depth >= 8 ? 2 : 1;
      for (let i = 0; i < n; i++) this.spawnProj({ kind: 'bone', x: e.x, y: e.y - 16, ang: a + (i - (n - 1) / 2) * 0.18, speed: def.projSpeed! * (1 + this.depth * 0.02), dmg: e.dmg, friendly: false, life: 2.2, r: 7 });
      audio.play('enemyShoot');
      return;
    }
    if (def.kind === 'turret') {
      const n = 8 + Math.min(6, Math.floor(this.depth / 3)) + (e.elite ? 4 : 0);
      const off = rng.range(0, Math.PI);
      for (let i = 0; i < n; i++) {
        const a = off + (i / n) * Math.PI * 2;
        this.spawnProj({ kind: 'spore', x: e.x, y: e.y - 20, ang: a, speed: def.projSpeed!, dmg: e.dmg, friendly: false, life: 2.6, r: 8, poison: 2.5 });
      }
      this.fx.burst(this.fx.puffs, 8, e.x, e.y - 20, 0xb0e060);
      audio.play('spore');
      return;
    }
    // melee lunge
    const dx = tgt.x - e.x,
      dy = tgt.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    e.kx += (dx / d) * 160;
    e.ky += (dy / d) * 160;
    if (d < def.reach + tgt.r + e.r * 0.5 + 12) {
      this.damageCapy(tgt, e.dmg, e, true);
      this.fx.burst(this.fx.sparks, 3, tgt.x, tgt.y - 14, 0xff9090);
    }
  }

  // ------------------------------------------------------------------ waves
  updateWaves(dt: number) {
    if (this.ended || this.transitioning) return;
    const L = this.leader;
    if (!L) return;
    if (this.boss && this.bossStarted && !this.bossDead) return;
    this.waveT -= dt;
    if (this.waveT > 0) return;
    const depth = this.depth;
    this.waveT = Math.max(10, 26 - depth * 1.6) * rng.range(0.85, 1.15);
    const count = Math.min(30, Math.round(4 + depth * 1.7 + this.floorT / 35));
    this.wavesThisFloor++;
    if (this.wavesThisFloor === 1) UI.toast(rng.pick(['You hear skittering in the dark…', 'Something is coming…', 'The dungeon stirs. More are coming.', 'Distant squeaks grow louder…']), undefined, 2.6, '#6a4a3a');
    const avail = (Object.keys(ENEMIES) as EnemyId[]).filter((k) => ENEMIES[k].minDepth <= depth && ENEMIES[k].weight > 0 && ENEMIES[k].kind !== 'turret');
    const type = rng.pick(avail);
    const type2 = rng.pick(avail);
    // pick spawn point out of sight
    const cam = this.cameras.main;
    const vw = cam.width / cam.zoom / 2 + 80,
      vh = cam.height / cam.zoom / 2 + 80;
    let spot: { x: number; y: number } | null = null;
    for (let i = 0; i < 60 && !spot; i++) {
      const tx = rng.int(1, this.dun.w - 2),
        ty = rng.int(1, this.dun.h - 2);
      if (isSolid(this.dun, tx, ty)) continue;
      const x = (tx + 0.5) * TILE,
        y = (ty + 0.5) * TILE;
      const d = Math.hypot(x - L.x, y - L.y);
      if (d < 450 || d > 1100) continue;
      if (Math.abs(x - this.camX) < vw && Math.abs(y - this.camY) < vh) continue;
      const f = this.flow[ty * this.dun.w + tx];
      if (f < 0) continue;
      const bossRoom = this.boss ? this.dun.rooms[this.boss.room] : null;
      if (bossRoom && tx >= bossRoom.x - 1 && tx <= bossRoom.x + bossRoom.w && ty >= bossRoom.y - 1 && ty <= bossRoom.y + bossRoom.h) continue;
      spot = { x, y };
    }
    if (!spot) return;
    for (let i = 0; i < count; i++) {
      const x = spot.x + rng.range(-60, 60),
        y = spot.y + rng.range(-60, 60);
      if (this.solidAt(x, y)) continue;
      const elite = depth >= 3 && i === 0 && rng.chance(0.2 + depth * 0.03) ? rng.pick(ELITE_MODS).id : null;
      const e = this.spawnEnemy(i % 3 === 2 ? type2 : type, x, y, { awake: true, wave: true, elite });
      e.spawnT = 0.6 + i * 0.05;
    }
  }

  // ------------------------------------------------------------------ gems / xp
  dropGems(x: number, y: number, xp: number) {
    let left = xp;
    let n = 0;
    while (left > 0.2 && n < 6) {
      const v = left > 30 ? 25 : left > 10 ? 8 : left;
      this.spawnGem(x, y, v, false);
      left -= v;
      n++;
    }
  }

  spawnGem(x: number, y: number, val: number, melon: boolean) {
    const frame = val >= 20 ? 2 : val >= 6 ? 1 : 0;
    const spr = melon ? this.add.image(x, y, 'melon').setScale(0.55) : this.add.image(x, y, 'gem', frame).setScale(0.6);
    spr.setDepth(D.pickup);
    const a = rng.range(0, Math.PI * 2),
      sp = rng.range(40, 140);
    this.gems.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, val, spr, t: 0, pull: false, melon });
  }

  updateGems(dt: number) {
    this.gemComboT -= dt;
    if (this.gemComboT <= 0) this.gemCombo = 0;
    const alive = this.alive;
    if (!alive.length) return;
    for (const g of this.gems) {
      g.t += dt;
      let near: Capy | null = null,
        nd = 1e12;
      for (const c of alive) {
        const d = dist2(c.x, c.y, g.x, g.y);
        if (d < nd) {
          nd = d;
          near = c;
        }
      }
      if (!near) break;
      if (!g.pull && (nd < 130 * 130 || (g.t > 9 && !g.melon))) g.pull = true;
      if (g.pull) {
        const d = Math.sqrt(nd) || 1;
        const sp = 260 + g.t * 60 + Math.max(0, 500 - d);
        g.vx += (((near.x - g.x) / d) * sp - g.vx) * Math.min(1, dt * 8);
        g.vy += (((near.y - 10 - g.y) / d) * sp - g.vy) * Math.min(1, dt * 8);
      } else {
        g.vx *= Math.pow(0.02, dt);
        g.vy *= Math.pow(0.02, dt);
      }
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      if (!g.pull) this.resolve(g, 6);
      g.spr.setPosition(g.x, g.y - 6 + Math.sin(g.t * 5 + g.x) * 2.5);
      if (nd < 26 * 26) {
        g.t = -999;
        if (g.melon) {
          for (const c of alive) this.healCapy(c, c.stats.maxHp * 0.25, true);
          audio.play('chomp');
          this.fx.burst(this.fx.puffs, 6, g.x, g.y, 0xff6a7a);
        } else {
          this.gainXp(g.val);
          this.gemCombo++;
          this.gemComboT = 0.4;
          audio.play('gem', { n: this.gemCombo });
        }
        g.spr.destroy();
      }
    }
    this.gems = this.gems.filter((g) => g.t > -999);
  }

  gainXp(amount: number) {
    for (const c of this.alive) {
      c.xp += amount * c.stats.xpGain;
      let need = xpToNext(c.level);
      while (c.xp >= need) {
        c.xp -= need;
        this.levelUp(c);
        need = xpToNext(c.level);
      }
    }
  }

  levelUp(c: Capy) {
    c.level++;
    c.levelsGained++;
    this.refreshStats(c);
    this.healCapy(c, c.stats.maxHp * 0.3, false);
    const txt = this.add.text(c.x, c.y - 50, 'LEVEL UP!', { fontFamily: 'Fredoka', fontStyle: '700', fontSize: '18px', color: '#ffe070', stroke: '#3a1e0c', strokeThickness: 5 }).setOrigin(0.5).setDepth(D.text);
    this.tweens.add({ targets: txt, y: txt.y - 40, alpha: 0, duration: 1300, ease: 'Cubic.out', onComplete: () => txt.destroy() });
    const pillar = this.add.image(c.x, c.y - 30, 'soft').setTint(0xffe070).setBlendMode(Phaser.BlendModes.ADD).setScale(0.8, 3).setDepth(D.fxTop).setAlpha(0.8);
    this.tweens.add({ targets: pillar, alpha: 0, scaleX: 0.2, duration: 700, onComplete: () => pillar.destroy() });
    this.fx.burst(this.fx.stars, 14, c.x, c.y - 20);
    this.fx.flash(c.x, c.y, 220, 0xffe070, 0.5);
    c.hop = 0.5;
    if (this.levelSfxT < this.stats.time) {
      audio.play('levelup');
      this.levelSfxT = this.stats.time + 0.5;
    }
    if (c.level % 3 === 0) this.perkQueue.push(c);
  }

  // ------------------------------------------------------------------ items
  dropItem(it: Item, x: number, y: number) {
    const a = rng.range(0, Math.PI * 2),
      dist = rng.range(24, 60);
    let tx = x + Math.cos(a) * dist,
      ty = y + Math.sin(a) * dist;
    if (this.solidAt(tx, ty)) {
      tx = x;
      ty = y;
    }
    const col = RARITY_HEX[it.rarity];
    const glow = this.add.image(x, y, 'soft').setTint(col).setBlendMode(Phaser.BlendModes.ADD).setDepth(D.pickup - 0.5).setScale(0.9).setAlpha(0.7);
    const spr = this.add.image(x, y, 'icon_' + it.icon).setScale(0.42).setDepth(D.proj - 1);
    let beam: Phaser.GameObjects.Image | null = null;
    if (it.rarity >= 2) {
      beam = this.add.image(tx, ty - 60, 'soft').setTint(col).setBlendMode(Phaser.BlendModes.ADD).setDepth(D.fxTop - 1).setScale(0.35, 3.2).setAlpha(0);
      this.tweens.add({ targets: beam, alpha: 0.55, duration: 400, delay: 350 });
    }
    const d: ItemDrop = { item: it, x: tx, y: ty, spr, glow, beam, t: 0, ready: false };
    this.drops.push(d);
    const o = { k: 0 };
    this.tweens.add({
      targets: o, k: 1, duration: 480, ease: 'Linear',
      onUpdate: () => {
        const k = o.k;
        const px = x + (tx - x) * k,
          py = y + (ty - y) * k - Math.sin(k * Math.PI) * 50;
        spr.setPosition(px, py);
        glow.setPosition(px, py);
      },
      onComplete: () => {
        d.ready = true;
        this.fx.burst(this.fx.sparks, 6, tx, ty, col);
      },
    });
    audio.play('loot', { n: it.rarity });
    if (it.rarity === 4) {
      audio.play('legendary');
      this.fx.flash(tx, ty, 400, col, 1.2);
    }
  }

  updateDrops(dt: number) {
    const alive = this.alive;
    for (const d of this.drops) {
      d.t += dt;
      if (!d.ready) continue;
      d.spr.setPosition(d.x, d.y - 10 + Math.sin(d.t * 3) * 3);
      d.glow.setPosition(d.x, d.y - 6).setScale(0.8 + Math.sin(d.t * 4) * 0.12);
      if (d.beam) d.beam.setPosition(d.x, d.y - 70);
      for (const c of alive) {
        const dd = dist2(c.x, c.y, d.x, d.y);
        if (dd < 110 * 110 && dd > 30 * 30 && this.bag.length < BAG_MAX) {
          const l = Math.sqrt(dd);
          d.x += ((c.x - d.x) / l) * 320 * dt;
          d.y += ((c.y - d.y) / l) * 320 * dt;
        }
        if (dd < 40 * 40) {
          if (this.bag.length >= BAG_MAX) {
            if (this.bagFullT < this.stats.time) {
              this.bagFullT = this.stats.time + 4;
              UI.toast('Bag full! Press <span class="kbd">I</span> to salvage or equip.', undefined, 3, '#a03030');
              audio.play('deny');
            }
            break;
          }
          this.pickupItem(d);
          break;
        }
      }
    }
    this.drops = this.drops.filter((d) => d.t >= 0);
  }

  pickupItem(d: ItemDrop) {
    d.t = -1;
    d.spr.destroy();
    d.glow.destroy();
    d.beam?.destroy();
    const it = d.item;
    it.isNew = true;
    this.bag.push(it);
    this.stats.itemsFound++;
    if (it.rarity >= 2) this.stats.notable.push(it);
    let up = '';
    let best = 0;
    for (const c of this.alive) {
      if (!canEquip(it, c.cls)) continue;
      const dp = deltaPower(c, it);
      if (dp > 0.01 && dp > best) {
        best = dp;
        up = `<span class="up">▲ upgrade for ${c.name}</span>`;
      }
    }
    UI.toast(`<span style="color:${RARITY_COLORS[it.rarity]};font-weight:600">${it.name}</span> ${up}`, iconURL(it.icon), 3.2, RARITY_COLORS[it.rarity]);
    if (it.rarity === 4) UI.banner({ title: it.name, sub: '<span style="color:#ffa93a">LEGENDARY</span>', text: it.legendDesc, portrait: iconURL(it.icon), color: '#ffa93a', life: 3.6 });
    audio.play('open');
  }

  equip(c: Capy, it: Item) {
    if (!canEquip(it, c.cls) || !c.alive) return;
    const i = this.bag.indexOf(it);
    if (i < 0) return;
    this.bag.splice(i, 1);
    const old = c.equip[it.slot];
    c.equip[it.slot] = it;
    it.isNew = false;
    if (old) this.bag.push(old);
    this.refreshStats(c);
  }

  unequip(c: Capy, slot: Slot) {
    const it = c.equip[slot];
    if (!it || this.bag.length >= BAG_MAX) return;
    c.equip[slot] = null;
    this.bag.push(it);
    this.refreshStats(c);
  }

  salvage(it: Item) {
    const i = this.bag.indexOf(it);
    if (i < 0) return;
    this.bag.splice(i, 1);
    this.gainXp((3 + it.ilvl * 2) * (1 + it.rarity * 1.2));
  }

  autoEquip() {
    for (let pass = 0; pass < 2; pass++)
      for (const c of this.alive) {
        for (const slot of SLOTS) {
          let best: Item | null = null;
          let bestScore = powerScore(c.cls, c.stats) + 0.01;
          for (const it of this.bag) {
            if (it.slot !== slot || !canEquip(it, c.cls)) continue;
            const eq = { ...c.equip, [slot]: it };
            const sc = powerScore(c.cls, computeStats({ cls: c.cls, level: c.level, perks: c.perks, equip: eq }));
            if (sc > bestScore) {
              bestScore = sc;
              best = it;
            }
          }
          if (best) this.equip(c, best);
        }
      }
  }

  hasUpgrade(): boolean {
    for (const it of this.bag) {
      if (!it.isNew) continue;
      for (const c of this.alive) if (canEquip(it, c.cls) && deltaPower(c, it) > 0.01) return true;
    }
    return false;
  }

  // ------------------------------------------------------------------ props
  breakPropsAt(x: number, y: number, r: number) {
    for (const p of this.props) {
      if (p.used || (p.kind !== 'barrel' && p.kind !== 'crate' && p.kind !== 'pot')) continue;
      if (dist2(p.x, p.y - 10, x, y) < (r + 16) ** 2) this.breakProp(p);
    }
  }

  breakPropsInArc(x: number, y: number, r: number, ang: number) {
    for (const p of this.props) {
      if (p.used || (p.kind !== 'barrel' && p.kind !== 'crate' && p.kind !== 'pot')) continue;
      const dx = p.x - x,
        dy = p.y - y;
      const d = Math.hypot(dx, dy);
      if (d > r + 16) continue;
      let da = Math.atan2(dy, dx) - ang;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) < 1.4) this.breakProp(p);
    }
  }

  breakProp(p: Prop) {
    p.used = true;
    const col = p.kind === 'pot' ? 0xd0804a : 0x9a6232;
    this.fx.burst(this.fx.debris, 10, p.x, p.y - 12, col);
    this.fx.burst(this.fx.smoke, 3, p.x, p.y - 10);
    audio.play('break', { pitch: p.kind === 'pot' ? 1.3 : 0.9 });
    p.spr.destroy();
    const r = rng.next();
    if (r < 0.04) this.dropItem(makeItem({ depth: this.depth }), p.x, p.y);
    else if (r < 0.12) this.spawnGem(p.x, p.y, 0, true);
    else if (r < 0.7) this.dropGems(p.x, p.y, 1 + this.depth * 0.6);
  }

  updateProps(dt: number) {
    const alive = this.alive;
    const L = this.leader;
    for (const p of this.props) {
      if (p.used && p.kind !== 'spring' && p.kind !== 'stairs' && p.kind !== 'portal') continue;
      switch (p.kind) {
        case 'barrel':
        case 'crate':
        case 'pot':
          for (const c of alive)
            if (dist2(c.x, c.y, p.x, p.y) < 30 * 30) {
              this.breakProp(p);
              break;
            }
          break;
        case 'chest':
        case 'chest_gold':
          for (const c of alive)
            if (dist2(c.x, c.y, p.x, p.y) < 46 * 46) {
              this.openChest(p);
              break;
            }
          break;
        case 'cage':
        case 'campfire':
        case 'barrelcapy':
          if (p.recruit && !p.used && p.kind === 'barrelcapy') {
            const w = (this.floorT + p.x * 0.01) % 2.4;
            p.spr.setRotation(w < 0.5 ? Math.sin(w * 40) * 0.12 * (1 - w * 2) : 0);
            for (const c of alive)
              if (dist2(c.x, c.y, p.x, p.y) < 72 * 72) {
                this.recruit(p);
                break;
              }
          } else if (p.recruit && !p.used) {
            const rs = p.recruit.spr;
            rs.setFrame(Math.sin(this.floorT * 1.3 + p.x) > 0.95 ? 4 : 1);
            rs.y = p.y + (p.kind === 'cage' ? -4 : -6) + Math.sin(this.floorT * 2) * 0.8;
            if (p.kind === 'campfire') rs.setPosition(p.x - 46, p.y - 6 + Math.sin(this.floorT * 2) * 0.8);
            for (const c of alive)
              if (dist2(c.x, c.y, rs.x, rs.y) < 72 * 72) {
                this.recruit(p);
                break;
              }
          }
          break;
        case 'stairs':
        case 'portal':
          if (p.kind === 'portal') p.spr.rotation += dt * 1.6;
          if (!this.stairsFound && L && dist2(L.x, L.y, p.x, p.y) < 420 * 420) {
            this.stairsFound = true;
          }
          if (L && !this.transitioning && !this.ended && dist2(L.x, L.y, p.x, p.y) < 40 * 40) this.descend(p);
          break;
        case 'spring':
          if (Math.random() < dt * 4) this.fx.burst(this.fx.smoke, 1, p.x + rng.range(-70, 70), p.y + rng.range(-30, 20), 0xe0f0ff);
          if ((p.pool ?? 0) > 0) {
            for (const c of alive) {
              const nx = (c.x - p.x) / 110,
                ny = (c.y - p.y) / 62;
              if (nx * nx + ny * ny < 1 && c.hp < c.stats.maxHp) {
                const amt = c.stats.maxHp * 0.1 * dt;
                const h = this.healCapy(c, amt, false);
                p.pool! -= h / c.stats.maxHp;
                c.poison = 0;
                if (Math.random() < dt * 3) {
                  this.fx.number(c.x, c.y - 44, '♨', '#9af0ff', 16);
                  audio.play('splash', { vol: 0.5 });
                }
              }
            }
            if (p.pool! <= 0) {
              p.light = { r: 120, color: 0x80c0ff, flicker: 0 };
              p.spr.setTint(0x8090a0);
              UI.toast('The hot spring has gone cold.', undefined, 2.5);
            }
          }
          break;
      }
    }
  }

  openChest(p: Prop) {
    p.used = true;
    p.spr.setFrame(1);
    this.stats.chests++;
    const gold = p.kind === 'chest_gold';
    audio.play('chest');
    this.fx.burst(this.fx.sparks, 16, p.x, p.y - 16, 0xffe080);
    this.fx.burst(this.fx.stars, 10, p.x, p.y - 16);
    this.fx.flash(p.x, p.y, 300, 0xffd080, 0.6);
    this.tweens.add({ targets: p.spr, scaleX: p.spr.scaleX * 1.15, scaleY: p.spr.scaleY * 0.85, duration: 90, yoyo: true });
    const n = gold ? 3 : rng.int(1, 2);
    for (let i = 0; i < n; i++) {
      this.time.delayedCall(120 + i * 160, () => {
        if (!this.transitioning) this.dropItem(makeItem({ depth: this.depth, rarityBonus: gold ? 1.1 : 0.4 }), p.x, p.y - 10);
      });
    }
    this.dropGems(p.x, p.y, 6 + this.depth * 3);
    if (rng.chance(0.4)) this.spawnGem(p.x, p.y, 0, true);
    const glow = this.add.image(p.x, p.y - 14, 'soft').setTint(0xffd080).setBlendMode(Phaser.BlendModes.ADD).setScale(1.4).setDepth(D.fxTop).setAlpha(0.9);
    this.tweens.add({ targets: glow, alpha: 0, scale: 2.4, duration: 800, onComplete: () => glow.destroy() });
  }

  recruit(p: Prop) {
    p.used = true;
    const r = p.recruit!;
    for (const x of p.extra) if (x instanceof Phaser.GameObjects.Text) x.destroy();
    p.extra = p.extra.filter((x) => !(x instanceof Phaser.GameObjects.Text));
    if (p.kind === 'cage') {
      this.fx.burst(this.fx.sparks, 20, p.x, p.y - 30, 0xc0c8d8);
      this.tweens.add({ targets: p.spr, y: p.y - 80, alpha: 0, angle: 25, duration: 500, ease: 'Cubic.out' });
      audio.play('break', { pitch: 1.4 });
    }
    if (p.kind === 'barrelcapy') {
      this.fx.burst(this.fx.debris, 18, p.x, p.y - 16, 0x9a6232);
      this.fx.burst(this.fx.smoke, 6, p.x, p.y - 14);
      audio.play('break', { pitch: 0.8 });
      p.spr.setVisible(false);
    }
    const rx = r.spr.x,
      ry = p.kind === 'cage' ? p.y : p.kind === 'barrelcapy' ? p.y - 2 : r.spr.y + 6;
    r.spr.destroy();
    if (this.alive.length >= MAX_PARTY) {
      const it = makeItem({ depth: this.depth, rarityBonus: 1 });
      this.dropItem(it, rx, ry);
      const ghostSpr = this.add.sprite(rx, ry, ensureCapyTexture(this, r.cls, r.fur), 1).setOrigin(0.53, 0.9).setScale(0.5).setDepth(D.entity + ry / 100);
      this.tweens.add({ targets: ghostSpr, y: ry - 20, yoyo: true, repeat: 2, duration: 180, onComplete: () => this.tweens.add({ targets: ghostSpr, alpha: 0, duration: 600, onComplete: () => ghostSpr.destroy() }) });
      UI.banner({ title: `${r.name} waves hello!`, sub: 'Your party is full — they leave you a gift.', portrait: capyPortrait(r.cls, r.fur), life: 3 });
      audio.play('recruit');
      return;
    }
    const lvl = Math.max(1, Math.round(this.alive.reduce((a, c) => a + c.level, 0) / Math.max(1, this.alive.length)) - 1);
    const c = this.makeCapy(r.cls, r.name, r.fur, lvl, rx, ry);
    c.equip.weapon = makeStarterWeapon(r.cls);
    if (this.depth >= 3) c.equip.armor = makeItem({ depth: this.depth - 1, slot: 'armor', rarity: 1 });
    c.intro = r.intro;
    this.refreshStats(c);
    c.hp = c.stats.maxHp;
    c.hop = 0.6;
    c.invuln = 1.5;
    this.party.push(c);
    this.stats.recruited++;
    this.fx.burst(this.fx.confetti, 40, rx, ry - 20);
    this.fx.flash(rx, ry, 320, 0xffe0a0, 0.8);
    audio.play('recruit');
    UI.banner({
      title: `${r.name.toUpperCase()} JOINED THE PARTY!`,
      sub: `<span style="color:${CLASSES[r.cls].color}">Level ${lvl} ${CLASSES[r.cls].name}</span>`,
      text: r.intro,
      portrait: capyPortrait(r.cls, r.fur),
      color: CLASSES[r.cls].color,
      life: 4,
    });
  }

  descend(p: Prop) {
    this.transitioning = true;
    audio.play('stairs');
    this.keys.clear();
    for (const c of this.alive) {
      this.tweens.add({ targets: c.spr, x: p.x, y: p.y, scale: 0.1, alpha: 0, duration: 700, ease: 'Cubic.in' });
      c.shadow.setVisible(false);
      c.crown.setVisible(false);
    }
    this.time.delayedCall(450, () => UI.fade(true));
    this.time.delayedCall(1100, () => {
      this.depth++;
      for (const c of this.alive) {
        this.healCapy(c, c.stats.maxHp * 0.2, false);
        c.poison = 0;
        c.shadow.setVisible(true);
      }
      this.buildFloor();
      this.transitioning = false;
      UI.fade(false);
    });
  }

  // ------------------------------------------------------------------ telegraphs / boss hooks
  telegraph(dur: number, draw: (g: Phaser.GameObjects.Graphics, k: number) => void, done: () => void) {
    const gfx = this.add.graphics().setDepth(D.proj - 2);
    this.teles.push({ gfx, t: 0, dur, draw, done });
  }

  updateTeles(dt: number) {
    for (const t of this.teles) {
      t.t += dt;
      const k = Math.min(1, t.t / t.dur);
      t.draw(t.gfx, k);
      if (t.t >= t.dur) {
        t.gfx.destroy();
        t.done();
      }
    }
    this.teles = this.teles.filter((t) => t.t < t.dur);
  }

  startBoss(e: Enemy) {
    if (this.bossStarted) return;
    this.bossStarted = true;
    e.state = 'intro';
    e.t = 0;
    this.camFocus = { x: e.x, y: e.y, t: 2.2 };
    audio.setMusic('boss');
    audio.play('bossRoar');
    this.shake(0.5);
    UI.bossIntro(e.boss!.name, e.boss!.title);
    this.fx.burst(this.fx.smoke, 20, e.x, e.y);
  }

  bossDeath(e: Enemy) {
    this.bossDead = true;
    this.stats.bosses++;
    this.slowT = 1.6;
    this.slowScale = 0.3;
    UI.bossBar(null, 0);
    audio.play('bossRoar');
    const x = e.x,
      y = e.y;
    this.camFocus = { x, y, t: 2.4 };
    e.spr.setTintFill(0xffffff);
    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 130, () => {
        const ex = x + rng.range(-50, 50),
          ey = y + rng.range(-50, 30);
        this.fx.burst(this.fx.embers, 16, ex, ey);
        this.fx.burst(this.fx.puffs, 10, ex, ey, 0xffffff);
        this.fx.flash(ex, ey, 300, 0xffe0a0, 0.4);
        audio.play('explode', { pitch: 0.8 + i * 0.05 });
        this.shake(0.35);
      });
    }
    this.tweens.add({
      targets: e.spr, alpha: 0, scaleX: e.spr.scaleX * 1.4, scaleY: e.spr.scaleY * 1.4, duration: 900, delay: 300,
      onComplete: () => this.destroyEnemy(e),
    });
    this.time.delayedCall(900, () => {
      if (this.transitioning) return;
      this.dropGems(x, y, e.boss!.xp * (1 + 0.2 * (this.depth - 1)));
      for (let i = 0; i < 3; i++) this.dropItem(makeItem({ depth: this.depth + 1, rarityBonus: 1.3 }), x, y);
      const room = this.dun.rooms[e.room];
      const px = (room.cx + 0.5) * TILE,
        py = (room.cy + 0.5) * TILE + 60;
      const portal = this.addProp('portal', px, py);
      portal.light = { r: 260, color: 0xc080ff, flicker: 0 };
      this.stairsFound = true;
      audio.play('portal');
      audio.setMusic('dungeon');
      UI.banner({ title: `${e.boss!.name} DEFEATED!`, sub: 'A portal to the depths has opened.', life: 3.5 });
      this.spawnGem(x + 30, y, 0, true);
      this.spawnGem(x - 30, y, 0, true);
    });
  }

  // ------------------------------------------------------------------ camera, lights, ui
  shake(amt: number) {
    this.trauma = Math.min(1, this.trauma + amt * settings.shake);
  }

  updateCamera(dt: number) {
    const cam = this.cameras.main;
    const L = this.leader;
    let tx = this.camX,
      ty = this.camY;
    let zoom = this.zoomBase;
    if (this.camFocus) {
      this.camFocus.t -= dt / Math.max(0.3, this.slowScale && this.slowT > 0 ? this.slowScale : 1);
      tx = this.camFocus.x;
      ty = this.camFocus.y;
      if (this.camFocus.t <= 0) this.camFocus = null;
    } else if (L) {
      tx = L.x + L.vx * 0.18;
      ty = L.y + L.vy * 0.18 - 10;
      if (this.boss && this.bossStarted && !this.boss.dead) {
        const b = this.boss;
        const d = Math.hypot(b.x - L.x, b.y - L.y);
        if (d < 700) {
          tx += (b.x - L.x) * 0.25;
          ty += (b.y - L.y) * 0.25;
          zoom *= 0.9;
        }
      }
    }
    const k = 1 - Math.exp(-dt * (this.camFocus ? 3 : 6));
    this.camX += (tx - this.camX) * k;
    this.camY += (ty - this.camY) * k;
    const z = cam.zoom + (zoom - cam.zoom) * Math.min(1, dt * 3);
    cam.setZoom(z);
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    const sh = this.trauma * this.trauma * 14;
    const t = this.time.now / 1000;
    const ox = sh * (Math.sin(t * 71) + Math.sin(t * 37)) * 0.5,
      oy = sh * (Math.sin(t * 83 + 1) + Math.sin(t * 29)) * 0.5;
    cam.centerOn(this.camX + ox, this.camY + oy);
    this.updatePointer();
  }

  updatePointer() {
    const pt = this.stairsFound ? this.props.find((q) => q.kind === 'stairs' || q.kind === 'portal') : undefined;
    const cam = this.cameras.main;
    if (!pt || this.transitioning || this.ended) {
      this.pointer.setVisible(false);
      return;
    }
    const vw = cam.width / cam.zoom / 2,
      vh = cam.height / cam.zoom / 2;
    const cx = cam.midPoint.x,
      cy = cam.midPoint.y;
    const dx = pt.x - cx,
      dy = pt.y - cy;
    if (Math.abs(dx) < vw - 20 && Math.abs(dy) < vh - 20) {
      this.pointer.setVisible(false);
      return;
    }
    const m = 46 / cam.zoom;
    const k = Math.min((vw - m) / Math.max(1, Math.abs(dx)), (vh - m) / Math.max(1, Math.abs(dy)));
    const s = (0.55 + Math.sin(this.time.now / 180) * 0.06) / cam.zoom;
    this.pointer.setVisible(true).setPosition(cx + dx * k, cy + dy * k).setRotation(Math.atan2(dy, dx)).setScale(s).setTint(pt.kind === 'portal' ? 0xd0a0ff : 0xffd070);
  }

  updateLights() {
    const cam = this.cameras.main;
    const vw = cam.width / cam.zoom,
      vh = cam.height / cam.zoom;
    const vx = cam.midPoint.x - vw / 2 - 8,
      vy = cam.midPoint.y - vh / 2 - 8;
    const lm = this.lightMap;
    lm.begin(vx, vy, vw + 16, vh + 16, this.biome.ambient);
    const t = this.time.now / 1000;
    const stamp = (x: number, y: number, r: number, color: number, alpha = 1) => lm.light(x, y, r, color, alpha);
    for (const c of this.party) if (c.alive) stamp(c.x, c.y - 10, c === this.leader ? 330 : 250, 0xfff0d8, 0.95);
    for (const tch of this.torches) {
      if (tch.phase <= -1) {
        stamp(tch.x, tch.y, tch.phase === -6 ? 110 : 90, tch.phase === -6 ? 0x60f0e0 : 0xffc070, 0.7);
        continue;
      }
      const f = 1 + Math.sin(t * 9 + tch.phase) * 0.05 + Math.sin(t * 23 + tch.phase * 2) * 0.03;
      stamp(tch.x, tch.y + 20, 230 * f, 0xffa050, 0.95);
    }
    for (const p of this.props) {
      if (!p.light) continue;
      const f = p.light.flicker ? 1 + Math.sin(t * 8 + p.x) * 0.06 : 1 + Math.sin(t * 2) * 0.04;
      stamp(p.x, p.y, p.light.r * f, p.light.color, 0.95);
    }
    for (const p of this.projs) {
      if (p.kind === 'fireball' || p.kind === 'orange') stamp(p.x, p.y, 110, 0xff8030, 0.9);
      else if (p.kind === 'orb' || p.kind === 'greenorb' || p.kind === 'goo') stamp(p.x, p.y, 70, p.kind === 'greenorb' ? 0x60ff80 : 0xd060ff, 0.7);
    }
    for (const d of this.drops) stamp(d.x, d.y, 60 + d.item.rarity * 20, RARITY_HEX[d.item.rarity], 0.6);
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (e.elite) stamp(e.x, e.y, 90, e.eliteColor, 0.5);
      if (e.boss) stamp(e.x, e.y, 260, 0xff9080, 0.6);
    }
    for (const f of this.fx.flashes) {
      const k = 1 - f.t / f.dur;
      stamp(f.x, f.y, f.r * (0.6 + 0.4 * k), f.color, k);
    }
    lm.end();
  }

  revealAround() {
    const d = this.dun;
    const R = 6;
    for (const c of this.alive) {
      const tx = Math.floor(c.x / TILE),
        ty = Math.floor(c.y / TILE);
      for (let y = ty - R; y <= ty + R; y++)
        for (let x = tx - R; x <= tx + R; x++) {
          if (x < 0 || y < 0 || x >= d.w || y >= d.h) continue;
          if ((x - tx) ** 2 + (y - ty) ** 2 > R * R) continue;
          this.explored[y * d.w + x] = 1;
        }
      const room = d.roomAt[ty * d.w + tx];
      if (room >= 0) {
        const rm = d.rooms[room];
        if (!rm.visited) {
          rm.visited = true;
          for (let y = rm.y - 1; y <= rm.y + rm.h; y++) for (let x = rm.x - 1; x <= rm.x + rm.w; x++) if (x >= 0 && y >= 0 && x < d.w && y < d.h) this.explored[y * d.w + x] = 1;
          if (rm.kind === 'boss' && this.boss && !this.bossStarted) this.startBoss(this.boss);
        }
      }
    }
  }

  drawMinimap() {
    const cv = UI.minimap;
    if (!cv) return;
    const g = cv.getContext('2d')!;
    const d = this.dun;
    const s = Math.min(cv.width / d.w, cv.height / d.h);
    const ox = (cv.width - d.w * s) / 2,
      oy = (cv.height - d.h * s) / 2;
    g.clearRect(0, 0, cv.width, cv.height);
    for (let y = 0; y < d.h; y++)
      for (let x = 0; x < d.w; x++) {
        if (!this.explored[y * d.w + x]) continue;
        const t = d.tiles[y * d.w + x];
        if (t === FLOOR) g.fillStyle = d.roomAt[y * d.w + x] >= 0 ? '#8a7a68' : '#6a5e52';
        else if (t !== 0) g.fillStyle = '#3a2e2a';
        else continue;
        g.fillRect(ox + x * s, oy + y * s, Math.ceil(s), Math.ceil(s));
      }
    const dot = (x: number, y: number, col: string, r: number) => {
      const tx = x / TILE,
        ty = y / TILE;
      if (!this.explored[Math.floor(ty) * d.w + Math.floor(tx)]) return;
      g.fillStyle = col;
      g.beginPath();
      g.arc(ox + tx * s, oy + ty * s, r, 0, Math.PI * 2);
      g.fill();
    };
    for (const p of this.props) {
      if (p.kind === 'stairs' || p.kind === 'portal') dot(p.x, p.y, '#ffd060', 4);
      else if ((p.kind === 'chest' || p.kind === 'chest_gold') && !p.used) dot(p.x, p.y, '#ffb040', 2.5);
      else if (p.recruit && !p.used) dot(p.x, p.y, '#7ee06a', 3.5);
      else if (p.kind === 'spring' && (p.pool ?? 0) > 0) dot(p.x, p.y, '#80e0ff', 3);
    }
    if (this.boss && !this.boss.dead) dot(this.boss.x, this.boss.y, '#ff4040', 4);
    for (const d2 of this.drops) if (d2.item.rarity >= 2) dot(d2.x, d2.y, RARITY_COLORS[d2.item.rarity], 2);
    for (const c of this.party) if (c.alive) dot(c.x, c.y, c === this.leader ? '#ffffff' : CLASSES[c.cls].color, c === this.leader ? 3.2 : 2.4);
  }

  updateHud(force = false) {
    const L = this.leader;
    UI.updateHud(this, {
      time: this.stats.time,
      kills: this.stats.kills,
      biome: this.biome.name,
      lowHp: !!L && L.hp / L.stats.maxHp < 0.25 && !this.ended,
      upgrade: this.hasUpgrade(),
      roomsLeft: this.boss && !this.bossDead ? (this.bossStarted ? 'Defeat the boss!' : 'Find the boss lair') : this.stairsFound ? '★ Stairs found' : 'Find the stairs down',
    });
    void force;
  }

  updateUI(dt: number) {
    this.hudT -= dt;
    if (this.hudT <= 0) {
      this.hudT = 0.1;
      this.updateHud();
      if (this.boss && this.bossStarted && !this.boss.dead) UI.bossBar(this.boss.boss!.name, this.boss.hp / this.boss.maxHp);
    }
    this.miniT -= dt;
    if (this.miniT <= 0) {
      this.miniT = 0.25;
      this.revealAround();
      this.drawMinimap();
    }
    // music intensity
    const L = this.leader;
    if (L) {
      let n = 0;
      for (const e of this.near(L.x, L.y, 450)) if (e.awake) n++;
      audio.setIntensity(Math.min(1, n / 12));
    }
  }

  // test helper: jump straight to a given depth
  debugJump(depth: number) {
    this.depth = depth;
    this.buildFloor();
  }

  salvageCommons() {
    const junk = this.bag.filter((it) => it.rarity === 0);
    for (const it of junk) this.salvage(it);
    return junk.length;
  }

  // ------------------------------------------------------------------ menus / flow
  pauseGame() {
    this.paused = true;
    this.keys.clear();
    this.scene.pause();
  }

  resumeGame() {
    this.paused = false;
    this.keys.clear();
    this.scene.resume();
  }

  openPause() {
    if (UI.isModalOpen() || this.ended) return;
    audio.play('click');
    this.pauseGame();
    UI.openPause(this);
  }

  openBag() {
    if (UI.isModalOpen() || this.ended) return;
    audio.play('open');
    this.pauseGame();
    UI.openInventory(this);
  }

  openPerk() {
    const c = this.perkQueue.shift()!;
    if (!c.alive) return;
    const pool = PERKS.filter((p) => (!p.classes || p.classes.includes(c.cls)) && !(p.id === 'frost' && c.perks.includes('frost')));
    const choices: typeof PERKS = [];
    const r = new RNG(Math.floor(Math.random() * 1e9));
    const copy = r.shuffle([...pool]);
    // favour class-specific talents a bit
    copy.sort((a, b) => (b.classes ? 1 : 0) - (a.classes ? 1 : 0) + (r.next() - 0.5) * 1.6);
    for (const p of copy) if (choices.length < 3 && !choices.includes(p)) choices.push(p);
    this.pauseGame();
    audio.play('levelup');
    UI.openPerk(c, choices, (p) => {
      c.perks.push(p.id);
      this.refreshStats(c);
      this.resumeGame();
      this.fx.burst(this.fx.stars, 16, c.x, c.y - 20);
    });
  }

  restartRun() {
    UI.closeModal();
    const fresh: GameInit = { cls: this.initData.cls, name: randomName([this.initData.name]), fur: rng.int(0, 4) };
    UI.fade(true);
    this.time.delayedCall(10, () => {
      this.scene.restart(fresh);
      setTimeout(() => UI.fade(false), 150);
    });
    if (this.paused) {
      this.scene.restart(fresh);
      setTimeout(() => UI.fade(false), 150);
    }
  }

  toMenu() {
    UI.closeModal();
    audio.setMusic('title');
    this.scene.start('title');
  }
}

export { CAPY_FRAMES };
