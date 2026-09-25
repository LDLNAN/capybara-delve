// Props, decor and effect textures.
import Phaser from 'phaser';
import { addSheet, addTex, cv, ell, frames, fs, OUT, rgrad, rr, shade, star, stroke, vgrad } from './util';

type G = CanvasRenderingContext2D;
const RES = 2;

function reg(scene: Phaser.Scene, key: string, fw: number, fh: number, n: number, draw: (g: G, f: number) => void) {
  const c = frames(fw, fh, n, RES, draw);
  addSheet(scene, key, c, fw * RES, fh * RES, n);
}

function wood(g: G, y0: number, y1: number, base = '#9a6232') {
  return vgrad(g, y0, y1, [[0, shade(base, 0.15)], [1, shade(base, -0.25)]]);
}

function drawChest(g: G, open: boolean, gold: boolean) {
  const body = gold ? '#c8962a' : '#8e5a2c';
  const band = gold ? '#fff0a8' : '#c8ccd4';
  // base
  rr(g, 5, 20, 38, 20, 3);
  fs(g, wood(g, 20, 40, body), 1.5);
  for (const x of [11, 35]) {
    rr(g, x, 20, 3.5, 20, 1);
    fs(g, band, 1);
  }
  if (open) {
    // inside glow
    rr(g, 7, 15, 34, 8, 2);
    fs(g, '#2a1408', 1.2);
    ell(g, 24, 18, 14, 5);
    g.fillStyle = rgrad(g, 24, 18, 0, 16, [[0, 'rgba(255,240,160,0.9)'], [1, 'rgba(255,200,80,0)']]);
    g.fill();
    // lid tilted back
    g.beginPath();
    g.moveTo(5, 16);
    g.lineTo(43, 16);
    g.lineTo(40, 4);
    g.lineTo(8, 4);
    g.closePath();
    fs(g, wood(g, 4, 16, shade(body, -0.15)), 1.4);
  } else {
    g.beginPath();
    g.moveTo(5, 21);
    g.lineTo(5, 13);
    g.quadraticCurveTo(24, 3, 43, 13);
    g.lineTo(43, 21);
    g.closePath();
    fs(g, wood(g, 5, 21, shade(body, 0.1)), 1.5);
    for (const x of [11, 35]) {
      g.beginPath();
      g.moveTo(x, 21);
      g.lineTo(x, 10.5);
      g.lineTo(x + 3.5, 10);
      g.lineTo(x + 3.5, 21);
      g.closePath();
      fs(g, band, 1);
    }
    rr(g, 20.5, 17, 7, 8, 1.5);
    fs(g, gold ? '#fff8d0' : '#e8c050', 1.1);
    ell(g, 24, 21, 1, 1.4);
    g.fillStyle = OUT;
    g.fill();
  }
}

function drawBarrel(g: G) {
  ell(g, 16, 36, 12, 4);
  fs(g, shade('#8a5530', -0.2), 1.3);
  g.beginPath();
  g.moveTo(4, 8);
  g.quadraticCurveTo(1, 22, 4, 36);
  g.lineTo(28, 36);
  g.quadraticCurveTo(31, 22, 28, 8);
  g.closePath();
  const gr = g.createLinearGradient(2, 0, 30, 0);
  gr.addColorStop(0, '#6a3e1e');
  gr.addColorStop(0.35, '#a8703c');
  gr.addColorStop(1, '#5a3418');
  g.fillStyle = gr;
  g.fill();
  stroke(g, 1.4);
  g.strokeStyle = 'rgba(40,20,10,0.5)';
  g.lineWidth = 0.8;
  for (const x of [10, 16, 22]) {
    g.beginPath();
    g.moveTo(x, 8);
    g.quadraticCurveTo(x + (x - 16) * 0.2, 22, x, 36);
    g.stroke();
  }
  for (const y of [13, 30]) {
    g.beginPath();
    g.moveTo(2.6, y);
    g.lineTo(29.4, y);
    stroke(g, 2.6, '#3a3a44');
    g.beginPath();
    g.moveTo(2.6, y - 0.6);
    g.lineTo(29.4, y - 0.6);
    stroke(g, 0.8, '#8a8a98');
  }
  ell(g, 16, 8, 12, 4);
  fs(g, '#b88048', 1.3);
  ell(g, 16, 8, 8, 2.4);
  stroke(g, 0.7, 'rgba(60,30,10,0.6)');
}

function drawCrate(g: G) {
  rr(g, 3, 8, 30, 28, 2);
  fs(g, wood(g, 8, 36, '#a87840'), 1.4);
  g.beginPath();
  g.moveTo(5, 10);
  g.lineTo(31, 34);
  g.moveTo(31, 10);
  g.lineTo(5, 34);
  stroke(g, 2.4, '#6a4420');
  rr(g, 3, 8, 30, 28, 2);
  stroke(g, 3, '#7a5028');
  rr(g, 3, 8, 30, 28, 2);
  stroke(g, 1.2, OUT);
  rr(g, 3, 3, 30, 6, 1.5);
  fs(g, '#c89858', 1.2);
}

function drawPot(g: G) {
  g.beginPath();
  g.moveTo(9, 6);
  g.lineTo(19, 6);
  g.lineTo(18, 10);
  g.quadraticCurveTo(28, 14, 26, 24);
  g.quadraticCurveTo(24, 31, 14, 31);
  g.quadraticCurveTo(4, 31, 2, 24);
  g.quadraticCurveTo(0, 14, 10, 10);
  g.closePath();
  fs(g, rgrad(g, 10, 16, 1, 18, [[0, '#e0925a'], [1, '#8a4a28']]), 1.3);
  g.beginPath();
  g.moveTo(4, 20);
  g.quadraticCurveTo(14, 23, 24, 20);
  stroke(g, 1.4, '#f2d08a');
  ell(g, 14, 6, 5.5, 1.6);
  fs(g, '#5a2a14', 1);
}

function drawCage(g: G, front: boolean) {
  if (!front) {
    ell(g, 34, 66, 30, 6);
    fs(g, '#3a3036', 1.4);
    return;
  }
  g.strokeStyle = OUT;
  for (let i = 0; i <= 8; i++) {
    const x = 6 + i * 7;
    g.beginPath();
    g.moveTo(x, 12);
    g.lineTo(x, 66);
    stroke(g, 3.2, OUT);
    g.beginPath();
    g.moveTo(x, 12);
    g.lineTo(x, 66);
    stroke(g, 1.6, '#8a8ea0');
  }
  rr(g, 3, 8, 62, 6, 2);
  fs(g, '#5a5e70', 1.4);
  rr(g, 3, 62, 62, 6, 2);
  fs(g, '#5a5e70', 1.4);
  g.beginPath();
  g.moveTo(34, 8);
  g.lineTo(34, 1);
  stroke(g, 2, '#5a5e70');
  ell(g, 34, 1.5, 3, 2);
  stroke(g, 1.4, '#8a8ea0');
  rr(g, 29, 33, 10, 9, 2);
  fs(g, '#d8a840', 1.2);
}

function drawCampfire(g: G, f: number) {
  // stones
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ell(g, 24 + Math.cos(a) * 15, 38 + Math.sin(a) * 6, 4, 3);
    fs(g, shade('#7a7480', (i % 3) * 0.08), 1.1);
  }
  g.save();
  g.translate(24, 38);
  for (const a of [-0.5, 0.5]) {
    g.save();
    g.rotate(a);
    rr(g, -12, -2.5, 24, 5, 2);
    fs(g, wood(g, -3, 3, '#7a4a24'), 1.2);
    g.restore();
  }
  g.restore();
  const flick = [0, 1.5, -1, 0.8][f];
  const h = 22 + [0, 3, -2, 1][f];
  const flame = (w: number, hh: number, col0: string, col1: string, dx: number) => {
    g.beginPath();
    g.moveTo(24 - w + dx, 38);
    g.quadraticCurveTo(24 - w - 2 + dx, 38 - hh * 0.5, 24 + flick + dx, 38 - hh);
    g.quadraticCurveTo(24 + w + 2 + dx, 38 - hh * 0.45, 24 + w + dx, 38);
    g.closePath();
    g.fillStyle = vgrad(g, 38 - hh, 38, [[0, col0], [1, col1]]);
    g.fill();
  };
  flame(10, h, 'rgba(255,120,30,0.9)', 'rgba(220,60,20,0.95)', 0);
  flame(6.5, h * 0.72, 'rgba(255,210,80,0.95)', 'rgba(255,140,40,1)', -1);
  flame(3.5, h * 0.42, '#fff8d0', '#ffe070', 0.5);
}

function drawTorch(g: G, f: number) {
  // bracket
  rr(g, 8, 22, 6, 16, 1.5);
  fs(g, '#4a4250', 1.2);
  g.beginPath();
  g.moveTo(5, 22);
  g.lineTo(17, 22);
  g.lineTo(15, 26);
  g.lineTo(7, 26);
  g.closePath();
  fs(g, '#6a6070', 1.2);
  rr(g, 7.5, 14, 7, 9, 2);
  fs(g, '#6a3c1c', 1.1);
  const fl = [0, 1, -1, 0.5][f];
  const hh = 14 + [0, 2, -1, 1][f];
  g.beginPath();
  g.moveTo(5, 15);
  g.quadraticCurveTo(4, 15 - hh * 0.5, 11 + fl, 15 - hh);
  g.quadraticCurveTo(18, 15 - hh * 0.5, 17, 15);
  g.closePath();
  g.fillStyle = vgrad(g, 15 - hh, 15, [[0, 'rgba(255,140,40,0.9)'], [1, 'rgba(230,70,20,1)']]);
  g.fill();
  g.beginPath();
  g.moveTo(8, 15);
  g.quadraticCurveTo(7.5, 15 - hh * 0.35, 11 + fl * 0.5, 15 - hh * 0.65);
  g.quadraticCurveTo(14.5, 15 - hh * 0.35, 14, 15);
  g.closePath();
  g.fillStyle = '#ffe890';
  g.fill();
}

function drawStairs(g: G) {
  // opening in the floor with steps going down into dark
  rr(g, 4, 4, 120, 120, 10);
  fs(g, '#3a3440', 2);
  for (let i = 0; i < 6; i++) {
    const y = 10 + i * 17;
    const inset = i * 5;
    const c = 150 - i * 24;
    rr(g, 10 + inset, y, 108 - inset * 2, 15, 3);
    g.fillStyle = `rgb(${c},${c - 8},${c + 6})`;
    g.fill();
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(10 + inset, y + 11, 108 - inset * 2, 4);
  }
  const gr = g.createLinearGradient(0, 30, 0, 124);
  gr.addColorStop(0, 'rgba(8,4,12,0)');
  gr.addColorStop(1, 'rgba(8,4,12,0.95)');
  g.fillStyle = gr;
  g.fillRect(4, 4, 120, 120);
  rr(g, 4, 4, 120, 120, 10);
  stroke(g, 5, '#8a7a60');
  rr(g, 4, 4, 120, 120, 10);
  stroke(g, 1.6, OUT);
  // glowing runes on rim
  g.fillStyle = '#ffd070';
  for (const [x, y] of [[14, 10], [64, 7], [114, 10], [8, 64], [120, 64]]) {
    star(g, x, y, 3.4, 0.4, 4);
    g.fill();
  }
}

function drawPortal(g: G, f: number) {
  const cx = 48,
    cy = 48;
  ell(g, cx, cy, 44, 44);
  g.fillStyle = rgrad(g, cx, cy, 2, 44, [[0, 'rgba(255,255,255,0.95)'], [0.25, 'rgba(180,120,255,0.85)'], [0.7, 'rgba(90,40,200,0.6)'], [1, 'rgba(40,10,120,0)']]);
  g.fill();
  g.strokeStyle = 'rgba(230,210,255,0.8)';
  g.lineWidth = 2.4;
  for (let k = 0; k < 4; k++) {
    g.beginPath();
    for (let t = 0; t < 1; t += 0.02) {
      const a = t * Math.PI * 3 + (k * Math.PI) / 2 + f * 0.4;
      const r = 6 + t * 34;
      const x = cx + Math.cos(a) * r,
        y = cy + Math.sin(a) * r;
      if (t === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
}

function drawSpring(g: G) {
  // rocks ring
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    ell(g, 96 + Math.cos(a) * 84, 64 + Math.sin(a) * 48, 11 + (i % 3) * 2, 9);
    fs(g, shade('#8a8290', ((i * 7) % 5) * 0.05 - 0.1), 1.5);
  }
  ell(g, 96, 64, 78, 42);
  fs(g, rgrad(g, 90, 58, 4, 80, [[0, '#9ef0ff'], [0.5, '#4ac0d8'], [1, '#1a6a8a']]), 2);
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.lineWidth = 2;
  for (const [x, y, r] of [[70, 50, 14], [120, 72, 18], [100, 44, 9], [60, 78, 10]]) {
    ell(g, x, y, r, r * 0.45);
    g.stroke();
  }
  // a little rubber duck
  ell(g, 126, 50, 6, 4.6);
  fs(g, '#ffd23a', 1.2);
  ell(g, 130, 44.5, 3.6, 3.4);
  fs(g, '#ffd23a', 1.2);
  g.beginPath();
  g.moveTo(133, 44);
  g.lineTo(137, 45);
  g.lineTo(133, 46.5);
  g.closePath();
  fs(g, '#ff8a2a', 0.8);
  ell(g, 131, 43.5, 0.7, 0.7);
  g.fillStyle = OUT;
  g.fill();
}

function drawGrave(g: G) {
  rr(g, 6, 6, 20, 26, 9);
  fs(g, vgrad(g, 6, 32, [[0, '#a8a4b0'], [1, '#6a6670']]), 1.4);
  g.beginPath();
  g.moveTo(16, 11);
  g.lineTo(16, 24);
  g.moveTo(11, 16);
  g.lineTo(21, 16);
  stroke(g, 1.8, '#4a4650');
  ell(g, 16, 32, 14, 3);
  fs(g, '#4a6a3a', 1.2);
  // tiny flower
  g.fillStyle = '#ffd0e0';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ell(g, 24 + Math.cos(a) * 1.5, 30 + Math.sin(a) * 1.5, 1.1, 1.1);
    g.fill();
  }
}

function drawDecor(g: G, f: number) {
  switch (f) {
    case 0: // bones
      for (const [x0, y0, x1, y1] of [[6, 20, 26, 14], [10, 12, 24, 22]]) {
        g.beginPath();
        g.moveTo(x0, y0);
        g.lineTo(x1, y1);
        stroke(g, 4.4, OUT);
        g.beginPath();
        g.moveTo(x0, y0);
        g.lineTo(x1, y1);
        stroke(g, 2.6, '#e8dfc8');
        for (const [x, y] of [[x0, y0], [x1, y1]]) {
          ell(g, x, y, 2.2, 2.2);
          fs(g, '#e8dfc8', 1);
        }
      }
      break;
    case 1: // skull
      ell(g, 16, 16, 8, 7);
      fs(g, '#e8dfc8', 1.3);
      rr(g, 12, 19, 8, 5, 1.5);
      fs(g, '#e8dfc8', 1.1);
      for (const x of [13, 19]) {
        ell(g, x, 15.5, 2, 2.2);
        g.fillStyle = '#201418';
        g.fill();
      }
      break;
    case 2: // grass tuft
      for (let i = 0; i < 7; i++) {
        const x = 8 + i * 2.6;
        g.beginPath();
        g.moveTo(x, 26);
        g.quadraticCurveTo(x + (i - 3) * 1.2, 16, x + (i - 3) * 2.2, 8 + (i % 2) * 5);
        stroke(g, 1.8, i % 2 ? '#6aa84a' : '#4a8a3a');
      }
      break;
    case 3: // pebbles
      for (const [x, y, r] of [[10, 20, 3.4], [17, 23, 2.4], [22, 18, 3], [14, 14, 2]]) {
        ell(g, x, y, r, r * 0.8);
        fs(g, '#8a8490', 0.9);
      }
      break;
    case 4: // candles
      for (const [x, h] of [[9, 12], [16, 17], [23, 9]]) {
        rr(g, x - 2.2, 28 - h, 4.4, h, 1.2);
        fs(g, '#f2e6c8', 1);
        g.beginPath();
        g.moveTo(x - 1.6, 28 - h);
        g.quadraticCurveTo(x, 28 - h - 7, x + 1.6, 28 - h);
        g.fillStyle = '#ffd060';
        g.fill();
      }
      g.fillStyle = 'rgba(242,230,200,0.7)';
      ell(g, 16, 28, 11, 2.4);
      g.fill();
      break;
    case 5: // glowing mushrooms
      for (const [x, y, s] of [[9, 24, 1], [18, 26, 1.3], [24, 22, 0.8]]) {
        rr(g, x - 1.2 * s, y - 6 * s, 2.4 * s, 6 * s, 1);
        fs(g, '#e8f0ff', 0.8);
        g.beginPath();
        g.ellipse(x, y - 6 * s, 5 * s, 3.4 * s, 0, Math.PI, 0);
        g.closePath();
        fs(g, '#5af0e0', 0.9, '#1a4a50');
      }
      break;
    case 6: // cobweb (corner)
      g.strokeStyle = 'rgba(230,230,240,0.55)';
      g.lineWidth = 0.8;
      for (let i = 0; i < 5; i++) {
        const a = (i / 4) * (Math.PI / 2);
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(Math.cos(a) * 30, Math.sin(a) * 30);
        g.stroke();
      }
      for (const r of [8, 16, 24]) {
        g.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (i / 4) * (Math.PI / 2);
          const x = Math.cos(a) * r,
            y = Math.sin(a) * r;
          if (i === 0) g.moveTo(x, y);
          else g.quadraticCurveTo(Math.cos(a - 0.2) * r * 0.8, Math.sin(a - 0.2) * r * 0.8, x, y);
        }
        g.stroke();
      }
      break;
    case 7: // rubble
      for (const [x, y, w, h] of [[6, 18, 9, 7], [14, 20, 11, 8], [20, 14, 7, 6], [9, 12, 6, 5]]) {
        rr(g, x, y, w, h, 2);
        fs(g, shade('#7a7480', (x % 3) * 0.08 - 0.05), 1);
      }
      break;
    case 8: // banner (wall)
      g.beginPath();
      g.moveTo(4, 2);
      g.lineTo(28, 2);
      stroke(g, 2.4, '#5a4a3a');
      g.beginPath();
      g.moveTo(7, 3);
      g.lineTo(25, 3);
      g.lineTo(25, 28);
      g.lineTo(16, 23);
      g.lineTo(7, 28);
      g.closePath();
      fs(g, vgrad(g, 3, 28, [[0, '#a83a3a'], [1, '#6a1a2a']]), 1.2);
      // capybara crest
      ell(g, 16, 13, 5, 3.6);
      fs(g, '#e8b84a', 0.8);
      ell(g, 19.5, 11.5, 2.4, 2);
      fs(g, '#e8b84a', 0.8);
      break;
    case 9: // chain (wall)
      for (let i = 0; i < 6; i++) {
        ell(g, 16, 4 + i * 4.4, 2, 3, i % 2 ? 0 : 0);
        stroke(g, 1.4, '#7a7a88');
      }
      break;
  }
}

function drawGem(g: G, col: string, s: number) {
  g.save();
  g.translate(8, 9);
  g.scale(s, s);
  g.beginPath();
  g.moveTo(0, -7);
  g.lineTo(5, -2);
  g.lineTo(0, 7);
  g.lineTo(-5, -2);
  g.closePath();
  fs(g, vgrad(g, -7, 7, [[0, shade(col, 0.5)], [1, shade(col, -0.2)]]), 1.1, shade(col, -0.6));
  g.beginPath();
  g.moveTo(-5, -2);
  g.lineTo(5, -2);
  g.moveTo(0, -7);
  g.lineTo(0, 7);
  stroke(g, 0.5, 'rgba(255,255,255,0.5)');
  g.restore();
}

function drawMelon(g: G) {
  g.beginPath();
  g.moveTo(2, 4);
  g.quadraticCurveTo(14, 26, 26, 4);
  g.closePath();
  fs(g, '#3a9a3a', 1.2);
  g.beginPath();
  g.moveTo(4, 4);
  g.quadraticCurveTo(14, 21, 24, 4);
  g.closePath();
  g.fillStyle = '#f2f0c8';
  g.fill();
  g.beginPath();
  g.moveTo(5.5, 4);
  g.quadraticCurveTo(14, 18, 22.5, 4);
  g.closePath();
  g.fillStyle = '#ff5a6a';
  g.fill();
  g.fillStyle = '#2a1410';
  for (const [x, y] of [[10, 7], [14, 10], [18, 7], [14, 6]]) {
    ell(g, x, y, 0.8, 1.2);
    g.fill();
  }
}

export function makePropTextures(scene: Phaser.Scene) {
  reg(scene, 'chest', 48, 44, 2, (g, f) => drawChest(g, f === 1, false));
  reg(scene, 'chest_gold', 48, 44, 2, (g, f) => drawChest(g, f === 1, true));
  reg(scene, 'barrel', 32, 40, 1, drawBarrel);
  reg(scene, 'crate', 36, 38, 1, drawCrate);
  reg(scene, 'pot', 28, 33, 1, drawPot);
  reg(scene, 'cage', 68, 70, 2, (g, f) => drawCage(g, f === 1));
  reg(scene, 'campfire', 48, 46, 4, drawCampfire);
  reg(scene, 'torch', 22, 40, 4, drawTorch);
  reg(scene, 'stairs', 128, 128, 1, drawStairs);
  reg(scene, 'portal', 96, 96, 1, (g) => drawPortal(g, 0));
  reg(scene, 'spring', 192, 128, 1, drawSpring);
  reg(scene, 'grave', 32, 36, 1, drawGrave);
  reg(scene, 'decor', 32, 32, 10, drawDecor);
  reg(scene, 'gem', 16, 18, 3, (g, f) => drawGem(g, ['#6af07a', '#5ab8ff', '#e070ff'][f], [0.8, 1, 1.25][f]));
  reg(scene, 'melon', 28, 20, 1, drawMelon);
}

// ---------------------------------------------------------------- FX
export function makeFxTextures(scene: Phaser.Scene) {
  const radial = (key: string, size: number, stops: [number, string][]) => {
    const [c, g] = cv(size, size);
    g.fillStyle = rgrad(g, size / 2, size / 2, 0, size / 2, stops);
    g.fillRect(0, 0, size, size);
    addTex(scene, key, c);
  };
  radial('soft', 64, [[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']]);
  radial('light', 256, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.75)'], [0.7, 'rgba(255,255,255,0.25)'], [1, 'rgba(255,255,255,0)']]);
  radial('dot', 16, [[0, 'rgba(255,255,255,1)'], [0.6, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]);

  const make = (key: string, w: number, h: number, draw: (g: G) => void, res = 2) => {
    const [c, g] = cv(w * res, h * res);
    g.scale(res, res);
    draw(g);
    addTex(scene, key, c);
  };
  make('spark', 16, 16, (g) => {
    g.fillStyle = '#fff';
    star(g, 8, 8, 8, 0.25, 4);
    g.fill();
  });
  make('shadow', 64, 24, (g) => {
    ell(g, 32, 12, 30, 10);
    g.fillStyle = rgrad(g, 32, 12, 2, 30, [[0, 'rgba(0,0,0,0.5)'], [1, 'rgba(0,0,0,0)']]);
    g.fill();
  }, 1);
  make('slash', 80, 80, (g) => {
    g.beginPath();
    g.arc(40, 40, 36, -1.2, 1.2);
    g.arc(46, 40, 26, 1.1, -1.1, true);
    g.closePath();
    const gr = g.createLinearGradient(40, 0, 80, 40);
    gr.addColorStop(0, 'rgba(255,255,255,0)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0.95)');
    gr.addColorStop(1, 'rgba(255,255,255,0.6)');
    g.fillStyle = gr;
    g.fill();
  });
  make('arrow', 30, 8, (g) => {
    g.beginPath();
    g.moveTo(3, 4);
    g.lineTo(24, 4);
    stroke(g, 2.6, OUT);
    g.beginPath();
    g.moveTo(3, 4);
    g.lineTo(24, 4);
    stroke(g, 1.4, '#c8a06a');
    g.beginPath();
    g.moveTo(29, 4);
    g.lineTo(23, 1);
    g.lineTo(23, 7);
    g.closePath();
    fs(g, '#e8eef4', 0.8);
    g.beginPath();
    g.moveTo(1, 1);
    g.lineTo(7, 4);
    g.lineTo(1, 7);
    g.closePath();
    fs(g, '#e25d4a', 0.7);
  });
  make('bonearrow', 28, 8, (g) => {
    g.beginPath();
    g.moveTo(2, 4);
    g.lineTo(22, 4);
    stroke(g, 3, OUT);
    g.beginPath();
    g.moveTo(2, 4);
    g.lineTo(22, 4);
    stroke(g, 1.8, '#ece3cc');
    g.beginPath();
    g.moveTo(27, 4);
    g.lineTo(21, 0.5);
    g.lineTo(21, 7.5);
    g.closePath();
    fs(g, '#ff7a6a', 0.8);
  });
  make('fireball', 32, 32, (g) => {
    ell(g, 16, 16, 15, 15);
    g.fillStyle = rgrad(g, 16, 16, 0, 15, [[0, 'rgba(255,250,220,1)'], [0.3, 'rgba(255,200,80,1)'], [0.6, 'rgba(255,110,30,0.8)'], [1, 'rgba(255,60,10,0)']]);
    g.fill();
  });
  make('orangeball', 32, 32, (g) => {
    ell(g, 16, 16, 15, 15);
    g.fillStyle = rgrad(g, 16, 16, 0, 15, [[0, 'rgba(255,180,60,0.9)'], [1, 'rgba(255,120,20,0)']]);
    g.fill();
    ell(g, 16, 16, 8.5, 8);
    fs(g, rgrad(g, 14, 14, 1, 9, [[0, '#ffd070'], [0.6, '#ff9a24'], [1, '#e2700c']]), 1.2);
    ell(g, 16.5, 7.5, 2.4, 1.1, 0.4);
    fs(g, '#5cb84a', 0.6, '#1e4a1a');
  });
  make('seed', 16, 12, (g) => {
    ell(g, 8, 6, 6.5, 3.5, 0);
    fs(g, vgrad(g, 2, 10, [[0, '#a8f070'], [1, '#4a9a3a']]), 1, '#1e4a1a');
    g.beginPath();
    g.moveTo(2, 6);
    g.lineTo(14, 6);
    stroke(g, 0.6, '#1e4a1a');
  });
  make('leaf', 10, 8, (g) => {
    ell(g, 5, 4, 4.4, 2.4, 0.4);
    fs(g, '#7ae05a', 0.6, '#2a6a2a');
  });
  make('spore', 18, 18, (g) => {
    ell(g, 9, 9, 8.5, 8.5);
    g.fillStyle = rgrad(g, 9, 9, 0, 8.5, [[0, 'rgba(230,255,150,1)'], [0.5, 'rgba(150,220,60,0.9)'], [1, 'rgba(90,160,40,0)']]);
    g.fill();
    ell(g, 9, 9, 4, 4);
    fs(g, '#b8f070', 1, '#3a6a1a');
  });
  make('orb', 22, 22, (g) => {
    ell(g, 11, 11, 10.5, 10.5);
    g.fillStyle = rgrad(g, 11, 11, 0, 10.5, [[0, 'rgba(255,220,255,1)'], [0.45, 'rgba(220,90,255,0.9)'], [1, 'rgba(140,30,220,0)']]);
    g.fill();
    ell(g, 11, 11, 4.2, 4.2);
    fs(g, '#ffd8ff', 1.2, '#6a1a8a');
  });
  make('goo', 22, 22, (g) => {
    ell(g, 11, 11, 10.5, 10.5);
    g.fillStyle = rgrad(g, 11, 11, 0, 10.5, [[0, 'rgba(255,220,255,1)'], [0.5, 'rgba(230,120,230,0.9)'], [1, 'rgba(200,80,200,0)']]);
    g.fill();
    ell(g, 11, 11, 5, 4.4);
    fs(g, '#f0a0f0', 1.2, '#7a2a7a');
  });
  make('greenorb', 22, 22, (g) => {
    ell(g, 11, 11, 10.5, 10.5);
    g.fillStyle = rgrad(g, 11, 11, 0, 10.5, [[0, 'rgba(230,255,220,1)'], [0.45, 'rgba(90,240,120,0.9)'], [1, 'rgba(30,180,80,0)']]);
    g.fill();
    ell(g, 11, 11, 4.2, 4.2);
    fs(g, '#d0ffd0', 1.2, '#1a6a2a');
  });
  make('ring', 128, 128, (g) => {
    ell(g, 64, 64, 60, 60);
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.fill();
    ell(g, 64, 64, 60, 60);
    stroke(g, 4, 'rgba(255,255,255,0.95)');
  }, 1);
  make('disc', 128, 128, (g) => {
    ell(g, 64, 64, 62, 62);
    g.fillStyle = '#fff';
    g.fill();
  }, 1);
  make('branch', 64, 22, (g) => {
    g.beginPath();
    g.moveTo(3, 12);
    g.quadraticCurveTo(30, 6, 61, 11);
    stroke(g, 7, OUT);
    g.beginPath();
    g.moveTo(3, 12);
    g.quadraticCurveTo(30, 6, 61, 11);
    stroke(g, 4.6, '#8a5a30');
    g.beginPath();
    g.moveTo(22, 9);
    g.lineTo(28, 2);
    g.moveTo(40, 9);
    g.lineTo(46, 17);
    stroke(g, 3, '#8a5a30');
    ell(g, 29, 2.5, 4, 2.2, -0.4);
    fs(g, '#6ac04a', 0.8, '#1e4a1a');
    ell(g, 47, 18, 4, 2.2, 0.5);
    fs(g, '#6ac04a', 0.8, '#1e4a1a');
    g.fillStyle = 'rgba(120,200,255,0.8)';
    for (const [x, y] of [[12, 15], [34, 12], [54, 14]]) {
      ell(g, x, y, 1.2, 1.8);
      g.fill();
    }
  });
  make('bubble', 20, 20, (g) => {
    ell(g, 10, 10, 8.5, 8.5);
    g.fillStyle = 'rgba(160,220,255,0.35)';
    g.fill();
    stroke(g, 1.4, 'rgba(200,240,255,0.95)');
    ell(g, 7, 7, 2.6, 1.6, -0.6);
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.fill();
  });
  make('shock', 40, 60, (g) => {
    g.beginPath();
    g.moveTo(8, 4);
    g.quadraticCurveTo(38, 30, 8, 56);
    g.quadraticCurveTo(24, 30, 8, 4);
    g.fillStyle = 'rgba(255,240,200,0.9)';
    g.fill();
  });
  make('confetti', 6, 4, (g) => {
    g.fillStyle = '#fff';
    g.fillRect(0, 0, 6, 4);
  }, 2);
  make('smoke', 32, 32, (g) => {
    ell(g, 16, 16, 15, 15);
    g.fillStyle = rgrad(g, 16, 16, 0, 15, [[0, 'rgba(200,200,210,0.7)'], [1, 'rgba(200,200,210,0)']]);
    g.fill();
  });
  make('crown', 16, 12, (g) => {
    g.beginPath();
    g.moveTo(1, 11);
    g.lineTo(1, 3);
    g.lineTo(5, 6.5);
    g.lineTo(8, 1);
    g.lineTo(11, 6.5);
    g.lineTo(15, 3);
    g.lineTo(15, 11);
    g.closePath();
    fs(g, vgrad(g, 1, 11, [[0, '#fff0a0'], [1, '#e0a020']]), 1.1);
  }, 3);
  make('heart', 14, 13, (g) => {
    g.beginPath();
    g.moveTo(7, 12);
    g.bezierCurveTo(-3, 5, 2, -2, 7, 3.5);
    g.bezierCurveTo(12, -2, 17, 5, 7, 12);
    fs(g, '#ff5a7a', 1.1);
  });
  make('pointer', 40, 40, (g) => {
    g.beginPath();
    g.moveTo(36, 20);
    g.lineTo(8, 5);
    g.lineTo(15, 20);
    g.lineTo(8, 35);
    g.closePath();
    fs(g, vgrad(g, 5, 35, [[0, '#ffffff'], [1, '#e8e0d0']]), 2.4, '#2a1608');
  });
  make('bolt', 20, 60, (g) => {
    g.beginPath();
    g.moveTo(10, 0);
    g.lineTo(4, 30);
    g.lineTo(12, 30);
    g.lineTo(8, 60);
    g.lineTo(16, 24);
    g.lineTo(9, 24);
    g.closePath();
    g.fillStyle = '#fff';
    g.fill();
  });
}
