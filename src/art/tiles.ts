// Procedural dungeon tilesets (one per biome).
import Phaser from 'phaser';
import { Biome, BIOMES } from '../data';
import { RNG } from '../rng';
import { addTex, cv, rgb } from './util';

export const TS = 128; // tileset pixel size (displayed at 64 world units)
export const TILESET_COLS = 8;
// index layout
export const T_FLOOR = 0; // 0..7
export const T_FLOOR_MOSS = 8; // 8..11
export const T_FLOOR_SPECIAL = 12; // 12..15
export const T_FACE = 16; // 16..19
export const T_FACE_CAP = 20; // 20..23
export const T_TOP = 24; // 24..39 by mask
export const T_VOID = 40;

type G = CanvasRenderingContext2D;
type C3 = [number, number, number];

function jit(c: C3, a: number): string {
  return rgb(c[0] + a, c[1] + a, c[2] + a);
}

function speckle(g: G, r: RNG, x: number, y: number, w: number, h: number, n: number, base: C3, amt: number) {
  for (let i = 0; i < n; i++) {
    const a = r.range(-amt, amt);
    g.fillStyle = rgb(base[0] + a, base[1] + a, base[2] + a, r.range(0.25, 0.6));
    const s = r.range(1, 3);
    g.fillRect(x + r.range(0, w), y + r.range(0, h), s, s);
  }
}

function stone(g: G, r: RNG, x: number, y: number, w: number, h: number, base: C3, crack: boolean) {
  const a = r.range(-10, 10);
  const c: C3 = [base[0] + a, base[1] + a, base[2] + a + r.range(-3, 3)];
  g.beginPath();
  g.roundRect(x + 3, y + 3, w - 6, h - 6, 7);
  const gr = g.createLinearGradient(x, y, x + w, y + h);
  gr.addColorStop(0, jit(c, 12));
  gr.addColorStop(1, jit(c, -10));
  g.fillStyle = gr;
  g.fill();
  speckle(g, r, x + 4, y + 4, w - 8, h - 8, (w * h) / 60, c, 22);
  // bevel
  g.beginPath();
  g.moveTo(x + 6, y + h - 5);
  g.lineTo(x + 5, y + 6);
  g.lineTo(x + w - 6, y + 5);
  g.strokeStyle = 'rgba(255,255,255,0.10)';
  g.lineWidth = 2;
  g.stroke();
  g.beginPath();
  g.moveTo(x + w - 5, y + 7);
  g.lineTo(x + w - 5, y + h - 5);
  g.lineTo(x + 7, y + h - 5);
  g.strokeStyle = 'rgba(0,0,0,0.25)';
  g.lineWidth = 2;
  g.stroke();
  if (crack) {
    g.beginPath();
    let cx = x + r.range(10, w - 10),
      cy = y + 6;
    g.moveTo(cx, cy);
    for (let i = 0; i < 4; i++) {
      cx += r.range(-8, 8);
      cy += (h - 12) / 4;
      g.lineTo(cx, cy);
    }
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 1.5;
    g.stroke();
  }
}

function floorTile(g: G, r: RNG, b: Biome, variant: number) {
  const mortar = jit(b.floorAlt, -26);
  g.fillStyle = mortar;
  g.fillRect(0, 0, TS, TS);
  const base = variant % 2 === 0 ? b.floor : b.floorAlt;
  const layout = variant % 4;
  if (layout === 0) {
    stone(g, r, 0, 0, 64, 64, base, r.chance(0.2));
    stone(g, r, 64, 0, 64, 64, base, r.chance(0.2));
    stone(g, r, 0, 64, 64, 64, base, r.chance(0.2));
    stone(g, r, 64, 64, 64, 64, base, r.chance(0.2));
  } else if (layout === 1) {
    stone(g, r, 0, 0, 128, 64, base, r.chance(0.3));
    stone(g, r, 0, 64, 64, 64, base, false);
    stone(g, r, 64, 64, 64, 64, base, r.chance(0.3));
  } else if (layout === 2) {
    stone(g, r, 0, 0, 64, 128, base, r.chance(0.3));
    stone(g, r, 64, 0, 64, 64, base, false);
    stone(g, r, 64, 64, 64, 64, base, r.chance(0.2));
  } else {
    stone(g, r, 0, 0, 64, 64, base, false);
    stone(g, r, 64, 0, 64, 64, base, false);
    stone(g, r, 0, 64, 128, 64, base, r.chance(0.4));
  }
}

function moss(g: G, r: RNG, b: Biome, n: number) {
  for (let i = 0; i < n; i++) {
    const x = r.range(0, TS),
      y = r.range(0, TS);
    const blobs = r.int(4, 9);
    for (let k = 0; k < blobs; k++) {
      const a = r.range(-20, 20);
      g.fillStyle = rgb(b.moss[0] + a, b.moss[1] + a, b.moss[2] + a, r.range(0.35, 0.7));
      g.beginPath();
      g.arc(x + r.range(-12, 12), y + r.range(-8, 8), r.range(3, 9), 0, Math.PI * 2);
      g.fill();
    }
  }
}

function faceTile(g: G, r: RNG, b: Biome, cap: boolean) {
  g.fillStyle = jit(b.wall, -40);
  g.fillRect(0, 0, TS, TS);
  const rows = 4;
  for (let row = 0; row < rows; row++) {
    const off = row % 2 === 0 ? 0 : -32;
    for (let x = off; x < TS; x += 64) {
      const a = r.range(-12, 12);
      const c: C3 = [b.wall[0] + a, b.wall[1] + a, b.wall[2] + a];
      const y = row * 32;
      g.beginPath();
      g.roundRect(x + 2, y + 2, 60, 28, 4);
      const gr = g.createLinearGradient(0, y, 0, y + 32);
      gr.addColorStop(0, jit(c, 14));
      gr.addColorStop(1, jit(c, -12));
      g.fillStyle = gr;
      g.fill();
      speckle(g, r, x + 3, y + 3, 56, 24, 22, c, 20);
      g.fillStyle = 'rgba(255,255,255,0.09)';
      g.fillRect(x + 4, y + 3, 54, 2);
    }
  }
  // vertical ambient occlusion
  const gr = g.createLinearGradient(0, 0, 0, TS);
  gr.addColorStop(0, 'rgba(0,0,0,0.0)');
  gr.addColorStop(0.7, 'rgba(0,0,0,0.12)');
  gr.addColorStop(1, 'rgba(0,0,0,0.45)');
  g.fillStyle = gr;
  g.fillRect(0, 0, TS, TS);
  if (r.chance(0.35)) moss(g, r, b, 1);
  if (cap) {
    g.fillStyle = jit(b.wallTop, 18);
    g.fillRect(0, 0, TS, 16);
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.fillRect(0, 14, TS, 3);
  }
}

function topTile(g: G, r: RNG, b: Biome, mask: number) {
  g.fillStyle = jit(b.wallTop, 0);
  g.fillRect(0, 0, TS, TS);
  speckle(g, r, 0, 0, TS, TS, 90, b.wallTop, 10);
  const rim = jit(b.wallTop, 26);
  const rimW = 14;
  g.fillStyle = rim;
  if (mask & 1) g.fillRect(0, 0, TS, rimW);
  if (mask & 2) g.fillRect(TS - rimW, 0, rimW, TS);
  if (mask & 4) g.fillRect(0, TS - rimW, TS, rimW);
  if (mask & 8) g.fillRect(0, 0, rimW, TS);
  g.fillStyle = 'rgba(255,255,255,0.14)';
  if (mask & 1) g.fillRect(0, rimW - 3, TS, 3);
  if (mask & 2) g.fillRect(TS - rimW, 0, 3, TS);
  if (mask & 4) g.fillRect(0, TS - rimW, TS, 3);
  if (mask & 8) g.fillRect(rimW - 3, 0, 3, TS);
}

export function makeTilesets(scene: Phaser.Scene) {
  BIOMES.forEach((b, bi) => {
    const r = new RNG(1000 + bi * 77);
    const rows = 6;
    const [c, g] = cv(TS * TILESET_COLS, TS * rows);
    const at = (i: number, fn: (g: G) => void) => {
      g.save();
      g.translate((i % TILESET_COLS) * TS, Math.floor(i / TILESET_COLS) * TS);
      g.beginPath();
      g.rect(0, 0, TS, TS);
      g.clip();
      fn(g);
      g.restore();
    };
    for (let i = 0; i < 8; i++) at(T_FLOOR + i, (g) => floorTile(g, r, b, i));
    for (let i = 0; i < 4; i++)
      at(T_FLOOR_MOSS + i, (g) => {
        floorTile(g, r, b, i);
        moss(g, r, b, r.int(2, 4));
      });
    // special: drain grate, rune slab, cracked, puddle
    at(T_FLOOR_SPECIAL, (g) => {
      floorTile(g, r, b, 0);
      g.fillStyle = 'rgba(10,10,14,0.85)';
      g.beginPath();
      g.roundRect(34, 34, 60, 60, 6);
      g.fill();
      g.strokeStyle = jit(b.wall, 10);
      g.lineWidth = 5;
      for (let k = 0; k < 5; k++) {
        g.beginPath();
        g.moveTo(40 + k * 12, 38);
        g.lineTo(40 + k * 12, 90);
        g.stroke();
      }
    });
    at(T_FLOOR_SPECIAL + 1, (g) => {
      floorTile(g, r, b, 1);
      g.strokeStyle = 'rgba(0,0,0,0.3)';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(64, 64, 34, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        g.moveTo(64 + Math.cos(a) * 20, 64 + Math.sin(a) * 20);
        g.lineTo(64 + Math.cos(a) * 34, 64 + Math.sin(a) * 34);
      }
      g.stroke();
    });
    at(T_FLOOR_SPECIAL + 2, (g) => {
      floorTile(g, r, b, 2);
      g.strokeStyle = 'rgba(0,0,0,0.4)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(10, 20);
      g.lineTo(50, 60);
      g.lineTo(44, 90);
      g.moveTo(50, 60);
      g.lineTo(110, 70);
      g.stroke();
    });
    at(T_FLOOR_SPECIAL + 3, (g) => {
      floorTile(g, r, b, 3);
      const gr = g.createRadialGradient(60, 70, 4, 64, 64, 44);
      gr.addColorStop(0, 'rgba(120,150,190,0.45)');
      gr.addColorStop(1, 'rgba(120,150,190,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(64, 66, 46, 30, 0.2, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.beginPath();
      g.ellipse(50, 58, 12, 4, 0.2, 0, Math.PI * 2);
      g.fill();
    });
    for (let i = 0; i < 4; i++) at(T_FACE + i, (g) => faceTile(g, r, b, false));
    for (let i = 0; i < 4; i++) at(T_FACE_CAP + i, (g) => faceTile(g, r, b, true));
    for (let m = 0; m < 16; m++) at(T_TOP + m, (g) => topTile(g, r, b, m));
    at(T_VOID, (g) => {
      g.fillStyle = '#0a080c';
      g.fillRect(0, 0, TS, TS);
    });
    addTex(scene, `tiles_${bi}`, c);
  });

  // shadow strip cast by walls onto floor
  const [sc, sg] = cv(TS, TS);
  const gr = sg.createLinearGradient(0, 0, 0, TS);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)');
  gr.addColorStop(0.45, 'rgba(0,0,0,0.12)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  sg.fillStyle = gr;
  sg.fillRect(0, 0, TS, TS);
  addTex(scene, 'wallshadow', sc);
}
