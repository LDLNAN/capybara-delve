// Procedural monster art.
import Phaser from 'phaser';
import { addSheet, ell, frames, fs, OUT, rgrad, rr, shade, star, stroke, vgrad } from './util';

type G = CanvasRenderingContext2D;
const RES = 2;

export interface MonsterSheet {
  key: string;
  fw: number;
  fh: number;
  n: number;
  ox: number; // origin (0..1)
  oy: number;
}

// ---------------------------------------------------------------- rat
function drawRat(g: G, f: number, king = false) {
  const body = king ? '#6e5a78' : '#7d6f86';
  const dark = shade(body, -0.3);
  const light = shade(body, 0.25);
  // tail
  g.beginPath();
  g.moveTo(10, 23);
  g.bezierCurveTo(2, 22, 4, 12 + f * 2, -2 + f, 10);
  stroke(g, 3.4, OUT);
  g.beginPath();
  g.moveTo(10, 23);
  g.bezierCurveTo(2, 22, 4, 12 + f * 2, -2 + f, 10);
  stroke(g, 1.8, '#e79aa0');
  // legs
  const lx = f === 0 ? [13, 30] : [17, 26];
  const lx2 = f === 0 ? [18, 25] : [14, 31];
  for (const x of lx2) {
    ell(g, x, 29, 2.6, 2);
    fs(g, shade('#e79aa0', -0.25), 1);
  }
  if (king) {
    // cape
    g.beginPath();
    g.moveTo(30, 12);
    g.quadraticCurveTo(16, 8, 7, 18);
    g.quadraticCurveTo(4, 26, 8, 31);
    g.lineTo(26, 30);
    g.closePath();
    fs(g, vgrad(g, 8, 31, [[0, '#c83a4a'], [1, '#7a1a2a']]), 1.2);
    g.beginPath();
    g.moveTo(8, 30.5);
    g.lineTo(26, 29.5);
    stroke(g, 2.2, '#f2f2f2');
  }
  ell(g, 22, 21 + (f ? 0.5 : 0), 13, 8.5 - (f ? 0.5 : 0));
  fs(g, vgrad(g, 12, 30, [[0, dark], [0.4, body], [1, light]]), 1.3);
  if (king) {
    g.beginPath();
    g.moveTo(28, 12.5);
    g.quadraticCurveTo(17, 10, 10, 18);
    g.quadraticCurveTo(9, 24, 12, 27);
    g.lineTo(18, 21);
    g.closePath();
    fs(g, vgrad(g, 8, 28, [[0, '#d84a5a'], [1, '#8a2030']]), 1.1);
  }
  for (const x of lx) {
    ell(g, x, 29.5, 2.6, 2);
    fs(g, '#e79aa0', 1);
  }
  // head
  g.beginPath();
  g.moveTo(29, 14);
  g.quadraticCurveTo(40, 12.5, 46.5, 21);
  g.quadraticCurveTo(41, 26.5, 30, 26.5);
  g.closePath();
  fs(g, vgrad(g, 12, 27, [[0, body], [1, light]]), 1.3);
  ell(g, 31.5, 12.5, 4, 4.5, -0.3);
  fs(g, body, 1.2);
  ell(g, 31.8, 12.8, 2, 2.6, -0.3);
  g.fillStyle = '#e79aa0';
  g.fill();
  ell(g, 46.2, 21, 1.8, 1.6);
  fs(g, '#f28a98', 0.8);
  // eye (glowing)
  ell(g, 38, 17, 2.4, 2.4);
  g.fillStyle = 'rgba(255,60,60,0.35)';
  g.fill();
  ell(g, 38, 17, 1.4, 1.5);
  g.fillStyle = '#ff3a3a';
  g.fill();
  ell(g, 38.4, 16.6, 0.5, 0.5);
  g.fillStyle = '#fff';
  g.fill();
  // brow
  g.beginPath();
  g.moveTo(35.5, 14.2);
  g.lineTo(40, 15.4);
  stroke(g, 0.9, OUT);
  // teeth
  rr(g, 42.5, 24, 1.8, 2.2, 0.4);
  fs(g, '#fffbe8', 0.6);
  // whiskers
  g.beginPath();
  g.moveTo(44, 21);
  g.lineTo(50, 19);
  g.moveTo(44, 22);
  g.lineTo(50, 23);
  stroke(g, 0.5, 'rgba(255,255,255,0.6)');
  if (king) {
    g.save();
    g.translate(33, 10);
    g.rotate(-0.15);
    g.beginPath();
    g.moveTo(-6, 2);
    g.lineTo(-6, -5);
    g.lineTo(-3, -1.5);
    g.lineTo(0, -7);
    g.lineTo(3, -1.5);
    g.lineTo(6, -5);
    g.lineTo(6, 2);
    g.closePath();
    fs(g, vgrad(g, -7, 2, [[0, '#fff0a0'], [1, '#d99a20']]), 1);
    ell(g, 0, -0.5, 1.2, 1.2);
    g.fillStyle = '#e03050';
    g.fill();
    g.restore();
  }
}

// ---------------------------------------------------------------- slime
function drawSlime(g: G, f: number, col: string, royal = false) {
  const dark = shade(col, -0.5);
  g.beginPath();
  if (f === 0) {
    g.moveTo(4, 34);
    g.quadraticCurveTo(1, 19, 12, 12);
    g.quadraticCurveTo(22, 5, 32, 12);
    g.quadraticCurveTo(43, 19, 40, 34);
  } else {
    g.moveTo(2, 34);
    g.quadraticCurveTo(0, 23, 12, 16.5);
    g.quadraticCurveTo(22, 11, 32, 16.5);
    g.quadraticCurveTo(44, 23, 42, 34);
  }
  g.quadraticCurveTo(22, 36.5, 4 - (f ? 2 : 0), 34);
  g.closePath();
  g.save();
  g.globalAlpha = 0.93;
  fs(g, rgrad(g, 16, 16, 2, 26, [[0, shade(col, 0.45)], [0.6, col], [1, shade(col, -0.3)]]), 0);
  g.restore();
  stroke(g, 1.4, dark);
  if (royal) {
    // skull floating inside
    g.save();
    g.globalAlpha = 0.45;
    ell(g, 28, 27, 4, 3.5);
    g.fillStyle = '#fff6e0';
    g.fill();
    ell(g, 26.8, 27, 0.9, 1);
    ell(g, 29.2, 27, 0.9, 1);
    g.fillStyle = '#402030';
    g.fill();
    rr(g, 10, 26, 7, 2, 1);
    g.fillStyle = '#fff6e0';
    g.fill();
    g.restore();
  }
  // bubbles
  g.fillStyle = 'rgba(255,255,255,0.35)';
  ell(g, 31, 26, 1.4, 1.4);
  g.fill();
  ell(g, 12, 28, 1, 1);
  g.fill();
  ell(g, 13.5, 16 + f * 3, 4.2, 2.4, -0.6);
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.fill();
  const ey = f ? 25 : 23;
  for (const x of [17, 26]) {
    ell(g, x, ey, 2.2, 3);
    g.fillStyle = '#1a1a22';
    g.fill();
    ell(g, x + 0.7, ey - 1, 0.8, 0.8);
    g.fillStyle = '#fff';
    g.fill();
  }
  g.beginPath();
  g.moveTo(19.5, ey + 4);
  g.quadraticCurveTo(21.5, ey + 5.5, 23.5, ey + 4);
  stroke(g, 1, '#1a1a22');
  if (royal) {
    g.save();
    g.translate(24, f ? 13 : 9);
    g.rotate(0.2);
    g.beginPath();
    g.moveTo(-7, 3);
    g.lineTo(-7, -4);
    g.lineTo(-3.5, -0.5);
    g.lineTo(0, -6);
    g.lineTo(3.5, -0.5);
    g.lineTo(7, -4);
    g.lineTo(7, 3);
    g.closePath();
    fs(g, vgrad(g, -6, 3, [[0, '#fff0a0'], [1, '#d99a20']]), 1);
    for (const x of [-4, 0, 4]) {
      ell(g, x, 1, 1, 1);
      g.fillStyle = ['#40a0ff', '#e03050', '#40e080'][(x + 4) / 4];
      g.fill();
    }
    g.restore();
  }
}

// ---------------------------------------------------------------- bat
function drawBat(g: G, f: number) {
  const col = '#4a3462';
  const wing = (dir: number) => {
    g.save();
    g.translate(24, 17);
    g.scale(dir, 1);
    g.beginPath();
    g.moveTo(4, -2);
    if (f === 0) {
      g.quadraticCurveTo(12, -14, 22, -12);
      g.quadraticCurveTo(20, -6, 21, -2);
      g.quadraticCurveTo(17, -4, 15, 0);
      g.quadraticCurveTo(11, -2, 9, 3);
      g.quadraticCurveTo(7, 1, 4, 4);
    } else {
      g.quadraticCurveTo(13, 2, 21, 12);
      g.quadraticCurveTo(16, 11, 15, 14);
      g.quadraticCurveTo(12, 10, 9, 12);
      g.quadraticCurveTo(8, 8, 4, 5);
    }
    g.closePath();
    fs(g, vgrad(g, -12, 14, [[0, '#6a4a8a'], [1, '#2e1e42']]), 1.2);
    g.restore();
  };
  wing(1);
  wing(-1);
  // ears
  for (const d of [-1, 1]) {
    g.beginPath();
    g.moveTo(24 + d * 2, 11);
    g.lineTo(24 + d * 5, 5);
    g.lineTo(24 + d * 6, 12);
    g.closePath();
    fs(g, col, 1.1);
  }
  ell(g, 24, 17, 7.5, 8);
  fs(g, rgrad(g, 22, 14, 1, 9, [[0, '#7a5a9a'], [1, col]]), 1.3);
  for (const d of [-1, 1]) {
    ell(g, 24 + d * 3, 15.5, 1.8, 1.8);
    g.fillStyle = '#ffd040';
    g.fill();
    ell(g, 24 + d * 3, 15.8, 0.7, 1.1);
    g.fillStyle = '#301010';
    g.fill();
  }
  for (const d of [-1, 1]) {
    g.beginPath();
    g.moveTo(24 + d * 1.2, 20);
    g.lineTo(24 + d * 2, 22.5);
    g.lineTo(24 + d * 2.8, 20);
    g.closePath();
    g.fillStyle = '#fff';
    g.fill();
  }
}

// ---------------------------------------------------------------- skeleton
const BONE = '#ece3cc';
function bone(g: G, x0: number, y0: number, x1: number, y1: number, w = 2.4) {
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  stroke(g, w + 1.8, OUT);
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  stroke(g, w, BONE);
}

function drawSkeleton(g: G, f: number, archer: boolean) {
  const s = f === 0 ? 3 : -3;
  // legs
  bone(g, 17, 32, 15 + s, 45);
  bone(g, 21, 32, 23 - s, 45);
  ell(g, 15 + s, 46, 2.8, 1.5);
  fs(g, BONE, 1);
  ell(g, 23 - s, 46, 2.8, 1.5);
  fs(g, BONE, 1);
  // pelvis
  rr(g, 14, 29.5, 10, 4, 2);
  fs(g, BONE, 1.2);
  // spine
  bone(g, 19, 21, 19, 30, 2);
  // ribs
  rr(g, 12.5, 18, 13, 10, 4);
  fs(g, BONE, 1.3);
  g.strokeStyle = '#5a4a3a';
  g.lineWidth = 1;
  for (const y of [21, 24]) {
    g.beginPath();
    g.moveTo(14, y);
    g.lineTo(24, y);
    g.stroke();
  }
  if (archer) {
    // hood / cloak
    g.beginPath();
    g.moveTo(11, 20);
    g.quadraticCurveTo(8, 30, 11, 36);
    g.lineTo(16, 33);
    g.lineTo(14, 22);
    g.closePath();
    fs(g, '#5a2a32', 1.1);
    // arms + bow
    bone(g, 24, 20, 30, 23 + (f ? 1 : 0), 1.8);
    g.beginPath();
    g.arc(26, 22, 11, -1.1, 1.1);
    stroke(g, 3.4, OUT);
    g.beginPath();
    g.arc(26, 22, 11, -1.1, 1.1);
    stroke(g, 1.8, '#8a5a30');
    g.beginPath();
    g.moveTo(26 + Math.cos(-1.1) * 11, 22 + Math.sin(-1.1) * 11);
    g.lineTo(29 - (f ? 2 : 0), 22);
    g.lineTo(26 + Math.cos(1.1) * 11, 22 + Math.sin(1.1) * 11);
    stroke(g, 0.6, '#f2e6c8');
  } else {
    bone(g, 13, 20, 9, 29, 1.8);
    bone(g, 25, 20, 29, 27 + (f ? -1 : 0), 1.8);
    // sword
    g.save();
    g.translate(29.5, 27 + (f ? -1 : 0));
    g.rotate(-0.35 + (f ? -0.15 : 0));
    rr(g, -1.3, -17, 2.6, 16, 0.8);
    fs(g, vgrad(g, -17, 0, [[0, '#c8b8a0'], [1, '#8a7a6a']]), 1);
    g.fillStyle = 'rgba(160,80,40,0.6)';
    g.fillRect(-1, -9, 1.6, 2);
    rr(g, -4, -1.5, 8, 2, 0.8);
    fs(g, '#6a5a4a', 0.9);
    g.restore();
  }
  // skull
  ell(g, 19, 11.5, 7.8, 7.2);
  fs(g, rgrad(g, 17, 9, 1, 8, [[0, '#fffaf0'], [1, '#d8ccb0']]), 1.3);
  rr(g, 15, 15, 8, 4.5, 1.5);
  fs(g, BONE, 1.1);
  g.strokeStyle = OUT;
  g.lineWidth = 0.6;
  for (const x of [17, 19, 21]) {
    g.beginPath();
    g.moveTo(x, 15.5);
    g.lineTo(x, 19);
    g.stroke();
  }
  for (const x of [16.3, 21.7]) {
    ell(g, x, 11, 2.2, 2.4);
    g.fillStyle = '#1a1014';
    g.fill();
    ell(g, x, 11.3, 0.9, 0.9);
    g.fillStyle = archer ? '#80ff90' : '#ff5a4a';
    g.fill();
  }
  if (archer) {
    g.beginPath();
    g.moveTo(10.5, 14);
    g.quadraticCurveTo(10, 2, 19, 2.5);
    g.quadraticCurveTo(28, 2, 27.5, 14);
    g.quadraticCurveTo(26, 7.5, 19, 6.5);
    g.quadraticCurveTo(12, 7.5, 10.5, 14);
    g.closePath();
    fs(g, '#6a3040', 1.2);
  }
}

// ---------------------------------------------------------------- mushroom
function drawShroom(g: G, f: number) {
  const puff = f ? 1.08 : 1;
  rr(g, 13, 22, 18, 20, 7);
  fs(g, vgrad(g, 22, 42, [[0, '#f4e8cc'], [1, '#c8b08a']]), 1.3);
  // face
  for (const d of [-1, 1]) {
    g.beginPath();
    g.moveTo(22 + d * 6, 26);
    g.lineTo(22 + d * 2, 28);
    stroke(g, 1.2, OUT);
    ell(g, 22 + d * 3.8, 30, 1.4, 1.8);
    g.fillStyle = '#2a1410';
    g.fill();
  }
  g.beginPath();
  if (f) ell(g, 22, 35.5, 2.2, 1.8);
  else {
    g.moveTo(19, 36);
    g.quadraticCurveTo(22, 33.5, 25, 36);
  }
  if (f) {
    g.fillStyle = '#2a1410';
    g.fill();
  } else stroke(g, 1.1, OUT);
  if (f) {
    for (const d of [-1, 1]) {
      ell(g, 22 + d * 6.5, 33, 2.2, 1.6);
      g.fillStyle = 'rgba(160,220,90,0.6)';
      g.fill();
    }
  }
  // cap
  g.save();
  g.translate(22, 23);
  g.scale(puff, puff);
  g.beginPath();
  g.moveTo(-21, 0);
  g.quadraticCurveTo(-20, -19, 0, -20);
  g.quadraticCurveTo(20, -19, 21, 0);
  g.quadraticCurveTo(15, 3, 10, 0.5);
  g.quadraticCurveTo(5, 3.5, 0, 1);
  g.quadraticCurveTo(-5, 3.5, -10, 0.5);
  g.quadraticCurveTo(-15, 3, -21, 0);
  g.closePath();
  fs(g, rgrad(g, -6, -12, 2, 24, [[0, '#ff6a6a'], [0.6, '#c8303a'], [1, '#8a1a2a']]), 1.4);
  g.fillStyle = '#fff6ea';
  for (const [x, y, r] of [[-10, -9, 3.2], [2, -14, 2.6], [11, -7, 3], [-2, -5, 1.8], [-15, -3, 1.6], [15, -2, 1.4]]) {
    ell(g, x, y, r, r * 0.85);
    g.fill();
  }
  g.restore();
}

// ---------------------------------------------------------------- beetle
function drawBeetle(g: G, f: number) {
  g.strokeStyle = '#1a1620';
  for (let i = 0; i < 3; i++) {
    const x = 14 + i * 9;
    const o = (i % 2 === 0) === (f === 0) ? 2 : -2;
    g.beginPath();
    g.moveTo(x, 26);
    g.lineTo(x - 3 + o, 33);
    stroke(g, 2, '#1a1620');
  }
  ell(g, 25, 20, 18, 12.5);
  fs(g, rgrad(g, 19, 13, 1, 20, [[0, '#9ab0d8'], [0.4, '#4a5a80'], [1, '#232a40']]), 1.5);
  g.beginPath();
  g.moveTo(25, 8);
  g.quadraticCurveTo(24, 20, 26, 32);
  stroke(g, 1.1, '#141828');
  ell(g, 18, 13, 5, 2, -0.4);
  g.fillStyle = 'rgba(255,255,255,0.45)';
  g.fill();
  ell(g, 42, 22, 6, 5.5);
  fs(g, '#2a2a3a', 1.3);
  g.beginPath();
  g.moveTo(45, 18);
  g.quadraticCurveTo(50, 14, 49, 7);
  g.quadraticCurveTo(47.5, 12, 43.5, 16.5);
  g.closePath();
  fs(g, '#5a6a8a', 1.1);
  ell(g, 44.5, 21, 1.2, 1.2);
  g.fillStyle = '#ff5040';
  g.fill();
}

// ---------------------------------------------------------------- bone baron
function drawBaron(g: G, f: number) {
  const w = f ? 1.5 : -1.5;
  // staff
  g.save();
  g.translate(58, 50);
  g.rotate(0.1);
  rr(g, -1.6, -40, 3.2, 56, 1.4);
  fs(g, vgrad(g, -40, 16, [[0, '#4a3a4a'], [1, '#2a1a2a']]), 1.2);
  ell(g, 0, -44, 11, 11);
  g.fillStyle = rgrad(g, 0, -44, 0, 11, [[0, 'rgba(160,255,140,0.9)'], [0.5, 'rgba(60,220,90,0.4)'], [1, 'rgba(40,200,80,0)']]);
  g.fill();
  ell(g, 0, -44, 4.5, 4.5);
  fs(g, '#c8ffb0', 1);
  g.restore();
  // robe
  g.beginPath();
  g.moveTo(22, 34);
  g.quadraticCurveTo(12, 60, 10 + w, 78);
  g.lineTo(17, 74 - w);
  g.lineTo(23, 80 + w);
  g.lineTo(30, 74);
  g.lineTo(37, 80 - w);
  g.lineTo(44, 74 + w);
  g.lineTo(51, 79);
  g.quadraticCurveTo(50, 58, 42, 34);
  g.closePath();
  fs(g, vgrad(g, 30, 80, [[0, '#5a2e7a'], [1, '#26122e']]), 1.5);
  // chest opening with ribs
  g.beginPath();
  g.moveTo(28, 36);
  g.lineTo(36, 36);
  g.lineTo(32, 56);
  g.closePath();
  fs(g, '#1a0e1e', 1);
  g.strokeStyle = BONE;
  g.lineWidth = 1.4;
  for (const y of [40, 44, 48]) {
    g.beginPath();
    g.moveTo(29.5 + (y - 36) * 0.18, y);
    g.lineTo(34.5 - (y - 36) * 0.18, y);
    g.stroke();
  }
  // collar
  g.beginPath();
  g.moveTo(18, 30);
  g.lineTo(46, 30);
  g.lineTo(42, 38);
  g.lineTo(32, 34);
  g.lineTo(22, 38);
  g.closePath();
  fs(g, '#8a3a9a', 1.3);
  // bony hands
  bone(g, 44, 42, 56, 44, 2.2);
  ell(g, 57, 44, 3, 3);
  fs(g, BONE, 1);
  bone(g, 20, 42, 12, 50 + w, 2.2);
  ell(g, 11, 51 + w, 3, 3);
  fs(g, BONE, 1);
  // skull
  ell(g, 32, 22, 11, 10);
  fs(g, rgrad(g, 28, 18, 1, 12, [[0, '#fffaf0'], [1, '#d0c4a8']]), 1.5);
  rr(g, 26.5, 27, 11, 6, 2);
  fs(g, BONE, 1.2);
  g.strokeStyle = OUT;
  g.lineWidth = 0.7;
  for (const x of [29, 32, 35]) {
    g.beginPath();
    g.moveTo(x, 27.5);
    g.lineTo(x, 32.5);
    g.stroke();
  }
  for (const x of [28, 36]) {
    ell(g, x, 21, 3, 3.2);
    g.fillStyle = '#140a14';
    g.fill();
    ell(g, x, 21.5, 1.3, 1.3);
    g.fillStyle = '#90ff80';
    g.fill();
  }
  // monocle
  ell(g, 36, 21, 4.2, 4.2);
  stroke(g, 1.1, '#e8c050');
  g.beginPath();
  g.moveTo(40, 22);
  g.quadraticCurveTo(43, 30, 41, 36);
  stroke(g, 0.6, '#e8c050');
  // top hat
  rr(g, 21, 11, 22, 3.6, 1.5);
  fs(g, '#1e1822', 1.3);
  rr(g, 24.5, -4, 15, 16, 1.5);
  fs(g, vgrad(g, -4, 12, [[0, '#3a3040'], [1, '#18121c']]), 1.3);
  rr(g, 24.5, 7, 15, 3, 0.5);
  g.fillStyle = '#8a3a9a';
  g.fill();
}

function drawBigRat(g: G, f: number) {
  g.save();
  g.scale(2.2, 2.2);
  g.translate(2, 2);
  drawRat(g, f, true);
  g.restore();
}

function drawBigSlime(g: G, f: number) {
  g.save();
  g.scale(3.1, 3.1);
  g.translate(1, 2);
  drawSlime(g, f, '#d470d8', true);
  g.restore();
}

export const SHEETS: Record<string, MonsterSheet> = {};

function reg(scene: Phaser.Scene, key: string, fw: number, fh: number, n: number, ox: number, oy: number, draw: (g: G, f: number) => void) {
  const c = frames(fw, fh, n, RES, draw);
  addSheet(scene, key, c, fw * RES, fh * RES, n);
  SHEETS[key] = { key, fw, fh, n, ox, oy };
}

export function makeMonsterTextures(scene: Phaser.Scene) {
  reg(scene, 'm_rat', 52, 36, 2, 0.45, 0.85, (g, f) => {
    g.translate(2, 0);
    drawRat(g, f);
  });
  reg(scene, 'm_slime', 44, 38, 2, 0.5, 0.9, (g, f) => drawSlime(g, f, '#6ed85a'));
  reg(scene, 'm_minislime', 44, 38, 2, 0.5, 0.9, (g, f) => drawSlime(g, f, '#8ae0d0'));
  reg(scene, 'm_bat', 48, 36, 2, 0.5, 0.6, drawBat);
  reg(scene, 'm_skeleton', 38, 50, 2, 0.5, 0.94, (g, f) => drawSkeleton(g, f, false));
  reg(scene, 'm_archer', 38, 50, 2, 0.5, 0.94, (g, f) => drawSkeleton(g, f, true));
  reg(scene, 'm_shroom', 44, 46, 2, 0.5, 0.92, drawShroom);
  reg(scene, 'm_beetle', 52, 38, 2, 0.5, 0.88, drawBeetle);
  reg(scene, 'b_ratking', 118, 82, 2, 0.45, 0.85, drawBigRat);
  reg(scene, 'b_slimemonarch', 142, 120, 2, 0.5, 0.9, drawBigSlime);
  reg(scene, 'b_lich', 76, 86, 2, 0.45, 0.9, drawBaron);
}

export { star };
