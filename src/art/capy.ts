// Procedural capybara art: body, faces and class gear.
import Phaser from 'phaser';
import { ClassId } from '../data';
import { addSheet, cv, ell, fs, OUT, rgrad, rr, shade, star, stroke, vgrad, frames } from './util';

export interface FurPal {
  base: string;
  dark: string;
  light: string;
}

export const FURS: FurPal[] = [
  { base: '#a8713f', dark: '#7a4d2a', light: '#cf9b69' },
  { base: '#b98a55', dark: '#8a6238', light: '#e0b784' },
  { base: '#8c5a36', dark: '#613c22', light: '#b58258' },
  { base: '#b06a3c', dark: '#834a26', light: '#d69464' },
  { base: '#9a7a5c', dark: '#6e543c', light: '#c2a482' },
];

export const CAPY_FW = 72;
export const CAPY_FH = 64;
export const CAPY_RES = 2;
export const CAPY_FRAMES = 6; // 0-3 walk, 4 blink, 5 hurt
const OX = 4,
  OY = 10;

type G = CanvasRenderingContext2D;

function legs(g: G, pal: FurPal, frame: number) {
  const walk = frame < 4 ? frame : 1;
  const A = [[2, 0], [0, -2], [-2, 0], [0, 0]][walk];
  const B = [[-2, 0], [0, 0], [2, 0], [0, -2]][walk];
  const leg = (x: number, off: number[], far: boolean) => {
    rr(g, x + off[0], 36 + off[1], 6.5, 12.5, 3);
    fs(g, far ? pal.dark : shade(pal.base, -0.08), 1.3);
    // tiny toe line
    g.beginPath();
    g.moveTo(x + off[0] + 2, 47 + off[1]);
    g.lineTo(x + off[0] + 2, 48.2 + off[1]);
    stroke(g, 0.7, OUT);
  };
  leg(19, B, true); // far back
  leg(41, A, true); // far front
  leg(12, A, false); // near back
  leg(34.5, B, false); // near front
}

function body(g: G, pal: FurPal) {
  rr(g, 7, 19.5, 41, 26, 12.5);
  fs(g, vgrad(g, 19, 46, [[0, pal.dark], [0.35, pal.base], [1, pal.light]]), 1.5);
  // belly
  ell(g, 27, 41, 14, 3.2);
  g.fillStyle = shade(pal.light, 0.12);
  g.globalAlpha = 0.55;
  g.fill();
  g.globalAlpha = 1;
  // A soft ridge catches the light without flattening the round silhouette.
  g.beginPath();
  g.moveTo(12, 26);
  g.quadraticCurveTo(24, 20, 34, 23);
  stroke(g, 1.2, shade(pal.light, 0.2));
  // fur tufts
  g.strokeStyle = pal.dark;
  g.lineWidth = 0.9;
  for (const [x, y] of [[14, 26], [19, 23], [26, 22], [31, 25], [17, 32], [24, 29]]) {
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + 1.5, y - 1.5, x + 3, y - 0.5);
    g.stroke();
  }
  // rump tuft
  g.beginPath();
  g.moveTo(8, 28);
  g.quadraticCurveTo(5.5, 29.5, 7.5, 32);
  stroke(g, 1.2, OUT);
}

function headShape(g: G) {
  g.beginPath();
  g.moveTo(37, 20);
  g.quadraticCurveTo(38, 11.5, 47, 11);
  g.lineTo(54, 11.5);
  g.quadraticCurveTo(60.5, 12, 61, 19);
  g.lineTo(61.5, 27);
  g.quadraticCurveTo(61.5, 33.5, 55, 33.5);
  g.lineTo(45, 34);
  g.quadraticCurveTo(36.5, 34.5, 35.5, 27);
  g.closePath();
}

function ear(g: G, pal: FurPal) {
  ell(g, 41, 13, 3.4, 3);
  fs(g, pal.dark, 1.2);
  ell(g, 41.2, 13.6, 1.6, 1.3);
  g.fillStyle = '#5a3322';
  g.fill();
}

function head(g: G, pal: FurPal, face: 'open' | 'blink' | 'hurt') {
  headShape(g);
  fs(g, vgrad(g, 11, 34, [[0, shade(pal.base, 0.05)], [0.6, pal.base], [1, shade(pal.base, -0.12)]]), 1.5);
  // muzzle shading
  ell(g, 56.5, 27.5, 4.5, 4.5);
  g.fillStyle = shade(pal.dark, -0.05);
  g.globalAlpha = 0.28;
  g.fill();
  g.globalAlpha = 1;
  // The muzzle and whiskers stay visible at the game's small display scale.
  ell(g, 57.2, 27.2, 2.7, 1.2);
  g.fillStyle = shade(pal.light, 0.16);
  g.globalAlpha = 0.55;
  g.fill();
  g.globalAlpha = 1;
  g.beginPath();
  g.moveTo(58.5, 25.3);
  g.lineTo(63.5, 24.4);
  g.moveTo(58.5, 27.1);
  g.lineTo(64, 27.7);
  stroke(g, 0.55, shade(pal.dark, -0.15));
  // blush
  ell(g, 52.5, 25.5, 3.3, 2.1);
  g.fillStyle = 'rgba(238,120,110,0.45)';
  g.fill();
  // nose
  ell(g, 58.8, 18.6, 1.9, 1.4, -0.3);
  g.fillStyle = '#2a1710';
  g.fill();
  // mouth
  g.beginPath();
  g.moveTo(60.5, 29.5);
  g.quadraticCurveTo(58.5, 31, 56.5, 29.8);
  stroke(g, 0.9, OUT);
  // eye
  if (face === 'open') {
    ell(g, 50, 18.2, 1.8, 2.1);
    g.fillStyle = '#170d08';
    g.fill();
    ell(g, 50.7, 17.4, 0.65, 0.65);
    g.fillStyle = '#fff';
    g.fill();
    // sleepy lid
    g.beginPath();
    g.moveTo(47.8, 16.6);
    g.quadraticCurveTo(50, 15.4, 52.2, 16.6);
    stroke(g, 0.9, OUT);
  } else if (face === 'blink') {
    g.beginPath();
    g.moveTo(48, 18.4);
    g.quadraticCurveTo(50, 19.6, 52, 18.4);
    stroke(g, 1, OUT);
  } else {
    g.beginPath();
    g.moveTo(48.2, 16.4);
    g.lineTo(51.4, 18.2);
    g.lineTo(48.2, 20);
    stroke(g, 1.1, OUT);
  }
}

// --------------------------------------------------------------- class gear
function gearBack(g: G, cls: ClassId, frame: number) {
  switch (cls) {
    case 'vanguard': {
      g.save();
      g.translate(19, 16);
      g.rotate(-0.5);
      rr(g, -2, -15, 4, 22, 1);
      fs(g, vgrad(g, -15, 7, [[0, '#f0f4f8'], [1, '#9aa6b4']]), 1.1);
      g.beginPath();
      g.moveTo(-2, -15);
      g.lineTo(0, -19);
      g.lineTo(2, -15);
      fs(g, '#e8eef4', 1.1);
      rr(g, -5.5, 6.5, 11, 2.8, 1);
      fs(g, '#d9a441', 1);
      rr(g, -1.3, 9.2, 2.6, 5, 1);
      fs(g, '#6b3f22', 1);
      g.restore();
      break;
    }
    case 'ranger': {
      g.beginPath();
      g.arc(28, 33, 20, -2.75, -0.35);
      stroke(g, 3.6, OUT);
      g.beginPath();
      g.arc(28, 33, 20, -2.75, -0.35);
      stroke(g, 2, '#9b6a36');
      g.beginPath();
      g.moveTo(28 + Math.cos(-2.75) * 20, 33 + Math.sin(-2.75) * 20);
      g.lineTo(28 + Math.cos(-0.35) * 20, 33 + Math.sin(-0.35) * 20);
      stroke(g, 0.6, '#f2e6c8');
      g.save();
      g.translate(18, 18);
      g.rotate(-0.55);
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(-2.5 + i * 2.5, -9);
        g.lineTo(-1 + i * 2.5, -13);
        g.lineTo(0.5 + i * 2.5, -9);
        fs(g, ['#e25d4a', '#f2e6c8', '#e25d4a'][i], 0.8);
      }
      rr(g, -4, -9, 8, 17, 2.5);
      fs(g, vgrad(g, -9, 8, [[0, '#8a5a30'], [1, '#5e3a1c']]), 1.2);
      g.beginPath();
      g.moveTo(-4, -5);
      g.lineTo(4, -5);
      stroke(g, 0.9, '#c89656');
      g.restore();
      break;
    }
    case 'ember': {
      g.save();
      g.translate(16, 26);
      g.rotate(-0.12);
      rr(g, -1.4, -24, 2.8, 44, 1.2);
      fs(g, vgrad(g, -24, 20, [[0, '#8a5530'], [1, '#5a3418']]), 1.1);
      // orb glow
      ell(g, 0, -26, 8, 8);
      g.fillStyle = rgrad(g, 0, -26, 0, 8, [[0, 'rgba(255,220,120,0.9)'], [0.5, 'rgba(255,140,40,0.45)'], [1, 'rgba(255,90,20,0)']]);
      g.fill();
      ell(g, 0, -26, 3.8, 3.8);
      fs(g, rgrad(g, -1, -27, 0.5, 4, [[0, '#fff6c0'], [0.5, '#ffb030'], [1, '#e0501a']]), 1);
      // prongs
      g.beginPath();
      g.moveTo(-3, -22);
      g.quadraticCurveTo(-4, -26, -2.5, -29);
      g.moveTo(3, -22);
      g.quadraticCurveTo(4, -26, 2.5, -29);
      stroke(g, 1.1, '#5a3418');
      g.restore();
      break;
    }
    case 'herbalist': {
      rr(g, 15, 15.5, 13, 11, 3.5);
      fs(g, vgrad(g, 15, 27, [[0, '#c9a56a'], [1, '#8f6c3c']]), 1.2);
      rr(g, 15, 15.5, 13, 5, 2.5);
      fs(g, '#a88450', 1.1);
      // leaves sticking up
      for (const [x, a] of [[18, -0.5], [21.5, 0.1], [25, 0.6]] as const) {
        g.save();
        g.translate(x, 16);
        g.rotate(a);
        ell(g, 0, -4, 1.8, 4.2);
        fs(g, '#6cbf4a', 0.9, '#28521c');
        g.restore();
      }
      break;
    }
    case 'storm': {
      const w = [0, 1.5, 0, -1.5, 0, 0][frame] ?? 0;
      g.beginPath();
      g.moveTo(39, 22);
      g.quadraticCurveTo(28, 16 + w, 18, 19 - w);
      g.quadraticCurveTo(12, 21 + w, 6, 17 + w);
      g.lineTo(7, 21 + w);
      g.quadraticCurveTo(14, 25 - w, 20, 23 + w);
      g.quadraticCurveTo(30, 21, 39, 26);
      g.closePath();
      fs(g, vgrad(g, 15, 27, [[0, '#6cb8ff'], [1, '#2b6fd0']]), 1.2);
      break;
    }
  }
}

function gearFront(g: G, cls: ClassId, frame: number) {
  switch (cls) {
    case 'vanguard': {
      g.beginPath();
      g.moveTo(14, 25);
      g.quadraticCurveTo(28, 15.5, 44, 22);
      g.lineTo(43.5, 31);
      g.quadraticCurveTo(29, 35, 15, 33);
      g.closePath();
      fs(g, vgrad(g, 17, 34, [[0, '#dfe6ee'], [0.5, '#a9b4c2'], [1, '#6f7a88']]), 1.3);
      g.beginPath();
      g.moveTo(15, 28.5);
      g.quadraticCurveTo(29, 24, 44, 26.5);
      stroke(g, 1.6, '#b8413a');
      for (const [x, y] of [[18, 25], [27, 21.5], [37, 22]]) {
        ell(g, x, y, 0.8, 0.8);
        g.fillStyle = '#f4f7fa';
        g.fill();
      }
      // shield
      ell(g, 24, 35, 8.8, 8.3);
      fs(g, rgrad(g, 22, 33, 1, 9, [[0, '#b77a3e'], [1, '#7a4a22']]), 1.4);
      ell(g, 24, 35, 8.8, 8.3);
      stroke(g, 1.6, '#c3ccd6');
      ell(g, 24, 35, 8.8, 8.3);
      stroke(g, 0.6, OUT);
      // acorn emblem
      ell(g, 24, 36.3, 2.6, 3);
      fs(g, '#e7b54e', 0.8);
      g.beginPath();
      g.moveTo(21, 34.2);
      g.quadraticCurveTo(24, 31.2, 27, 34.2);
      g.closePath();
      fs(g, '#7c5226', 0.8);
      break;
    }
    case 'ranger': {
      g.beginPath();
      g.moveTo(42, 21);
      g.quadraticCurveTo(28, 14.5, 12, 22);
      g.quadraticCurveTo(7.5, 30, 10, 39.5);
      g.lineTo(14.5, 36.5);
      g.lineTo(18.5, 40.5);
      g.lineTo(22.5, 36.5);
      g.lineTo(26.5, 39.5);
      g.lineTo(29.5, 34);
      g.quadraticCurveTo(38, 30, 42.5, 26.5);
      g.closePath();
      fs(g, vgrad(g, 15, 40, [[0, '#5d9c4a'], [1, '#2f6230']]), 1.3);
      g.beginPath();
      g.moveTo(16, 24);
      g.quadraticCurveTo(22, 29, 20, 36);
      stroke(g, 0.7, '#244a22');
      ell(g, 41.5, 23.5, 1.9, 1.9);
      fs(g, '#e8c050', 0.9);
      break;
    }
    case 'ember': {
      g.beginPath();
      g.moveTo(42, 21);
      g.quadraticCurveTo(28, 14.5, 12, 22);
      g.quadraticCurveTo(8, 31, 11, 40.5);
      g.quadraticCurveTo(20, 38, 29, 37);
      g.quadraticCurveTo(38, 32, 42.5, 27);
      g.closePath();
      fs(g, vgrad(g, 15, 41, [[0, '#7a4cc0'], [1, '#43246e']]), 1.3);
      g.beginPath();
      g.moveTo(11.5, 39.5);
      g.quadraticCurveTo(20, 37, 29, 36);
      stroke(g, 1.3, '#e8b84a');
      g.fillStyle = '#ffd86a';
      star(g, 22, 29, 2.6, 0.4, 4);
      g.fill();
      star(g, 15, 33, 1.6, 0.4, 4);
      g.fill();
      break;
    }
    case 'herbalist': {
      // strap + satchel
      g.beginPath();
      g.moveTo(41, 22);
      g.lineTo(24, 33);
      stroke(g, 2.8, OUT);
      g.beginPath();
      g.moveTo(41, 22);
      g.lineTo(24, 33);
      stroke(g, 1.6, '#8a5a2e');
      rr(g, 18, 30, 12, 10, 3);
      fs(g, vgrad(g, 30, 40, [[0, '#9a6636'], [1, '#6a4020']]), 1.2);
      rr(g, 18, 30, 12, 4.5, 2.5);
      fs(g, '#b07844', 1);
      ell(g, 24, 36.5, 2.2, 1.4, 0.4);
      fs(g, '#7fd05a', 0.7, '#28521c');
      // scarf
      g.beginPath();
      g.moveTo(37.5, 21);
      g.quadraticCurveTo(41, 26, 44, 32);
      g.lineTo(40.5, 33);
      g.quadraticCurveTo(38, 27, 35.8, 24);
      g.closePath();
      fs(g, '#5aa84a', 1.1, '#1e4a1a');
      break;
    }
    case 'storm': {
      g.beginPath();
      g.moveTo(10, 31);
      g.quadraticCurveTo(28, 36, 45, 30);
      stroke(g, 3.2, OUT);
      g.beginPath();
      g.moveTo(10, 31);
      g.quadraticCurveTo(28, 36, 45, 30);
      stroke(g, 2, '#3a3a52');
      for (const [x, a] of [[27, 1.2], [33, 1.35]] as const) {
        g.save();
        g.translate(x, 33.5);
        g.rotate(a);
        rr(g, -0.9, -1, 1.8, 3, 0.6);
        fs(g, '#6b3f22', 0.7);
        g.beginPath();
        g.moveTo(-1.2, 2);
        g.lineTo(1.2, 2);
        g.lineTo(0, 9);
        g.closePath();
        fs(g, '#e6edf5', 0.8);
        g.restore();
      }
      // bolt emblem
      g.beginPath();
      g.moveTo(17, 24);
      g.lineTo(14, 29);
      g.lineTo(17, 29);
      g.lineTo(15, 34);
      g.lineTo(20.5, 27.5);
      g.lineTo(17.5, 27.5);
      g.lineTo(19.5, 24);
      g.closePath();
      fs(g, '#ffe14a', 0.9);
      // scarf wrap at neck
      rr(g, 35, 20, 8, 10, 3);
      fs(g, '#3f86e0', 1.2);
      break;
    }
  }
}

function gearHead(g: G, cls: ClassId, frame: number) {
  switch (cls) {
    case 'vanguard': {
      // plume
      g.beginPath();
      g.moveTo(46, 9);
      g.quadraticCurveTo(38, 0, 30, 5);
      g.quadraticCurveTo(35, 5, 37, 9);
      g.quadraticCurveTo(40, 8, 42, 11);
      g.closePath();
      fs(g, vgrad(g, 0, 11, [[0, '#ff6a5a'], [1, '#b8302a']]), 1.1);
      g.beginPath();
      g.moveTo(36.5, 23);
      g.quadraticCurveTo(35.5, 9.5, 47, 8.5);
      g.quadraticCurveTo(57.8, 8, 58.4, 15);
      g.lineTo(46.5, 15.3);
      g.lineTo(44.5, 23);
      g.closePath();
      fs(g, vgrad(g, 8, 23, [[0, '#eef2f6'], [0.5, '#b4bfcc'], [1, '#7a8594']]), 1.3);
      rr(g, 54.3, 14, 2, 6.5, 0.8);
      fs(g, '#9aa6b4', 0.9);
      g.beginPath();
      g.moveTo(39, 12.5);
      g.quadraticCurveTo(46, 10, 55, 11);
      stroke(g, 0.9, 'rgba(255,255,255,0.8)');
      break;
    }
    case 'ranger': {
      g.beginPath();
      g.moveTo(36, 27);
      g.lineTo(29.5, 11);
      g.quadraticCurveTo(39, 7, 47, 9);
      g.quadraticCurveTo(56.5, 8.5, 58, 15.2);
      g.quadraticCurveTo(52, 13.2, 47.5, 15.5);
      g.quadraticCurveTo(44, 19.5, 44.2, 27);
      g.closePath();
      fs(g, vgrad(g, 8, 27, [[0, '#6aac52'], [1, '#356a32']]), 1.3);
      g.beginPath();
      g.moveTo(47.5, 15.5);
      g.quadraticCurveTo(52, 13.2, 58, 15.2);
      stroke(g, 1.1, '#244a22');
      // feather
      g.save();
      g.translate(38, 10);
      g.rotate(-0.9);
      ell(g, 0, -4, 1.6, 4.6);
      fs(g, '#e25d4a', 0.8);
      g.restore();
      break;
    }
    case 'ember': {
      ell(g, 47, 12.5, 12.5, 3.3);
      fs(g, '#3a1f60', 1.2);
      g.beginPath();
      g.moveTo(38.5, 12.5);
      g.lineTo(55.5, 12.5);
      g.quadraticCurveTo(50, 4, 46.5, -3.5);
      g.quadraticCurveTo(42.5, -9, 33.5, -8);
      g.quadraticCurveTo(40, -4.5, 41, 1.5);
      g.quadraticCurveTo(40.3, 7.5, 38.5, 12.5);
      g.closePath();
      fs(g, vgrad(g, -9, 13, [[0, '#9a6ae0'], [1, '#56308e']]), 1.3);
      g.beginPath();
      g.moveTo(39, 11);
      g.lineTo(55, 11);
      stroke(g, 2, '#e8b84a');
      g.fillStyle = '#ffe07a';
      star(g, 47, 4, 2.2, 0.4, 4);
      g.fill();
      star(g, 42.5, -2, 1.5, 0.4, 4);
      g.fill();
      ell(g, 33.5, -8, 1.6, 1.6);
      fs(g, '#ffd86a', 0.8);
      break;
    }
    case 'herbalist': {
      // the orange
      ell(g, 46, 6.2, 6.2, 5.6);
      fs(g, rgrad(g, 44, 4.5, 0.5, 7, [[0, '#ffc860'], [0.6, '#ff9a24'], [1, '#e2700c']]), 1.3);
      g.fillStyle = 'rgba(160,70,0,0.5)';
      for (const [x, y] of [[43, 7], [48, 8], [49.5, 4.5], [44.5, 3.5]]) {
        ell(g, x, y, 0.45, 0.45);
        g.fill();
      }
      ell(g, 44, 4, 1.6, 1);
      g.fillStyle = 'rgba(255,255,255,0.75)';
      g.fill();
      g.beginPath();
      g.moveTo(46.2, 0.8);
      g.lineTo(46.6, -1);
      stroke(g, 1, '#5a3a1a');
      g.save();
      g.translate(48.5, -0.8);
      g.rotate(0.5);
      ell(g, 0, 0, 3.4, 1.5);
      fs(g, '#5cb84a', 0.8, '#1e4a1a');
      g.restore();
      // little flower behind ear
      g.fillStyle = '#ff8ab0';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ell(g, 39 + Math.cos(a) * 1.6, 16 + Math.sin(a) * 1.6, 1.2, 1.2);
        g.fill();
      }
      ell(g, 39, 16, 0.9, 0.9);
      g.fillStyle = '#ffe070';
      g.fill();
      break;
    }
    case 'storm': {
      // spiky static fur
      g.beginPath();
      g.moveTo(40, 13);
      g.lineTo(41, 6.5);
      g.lineTo(44, 11);
      g.lineTo(46, 5);
      g.lineTo(48, 11);
      g.lineTo(51, 7);
      g.lineTo(51.5, 12);
      g.closePath();
      fs(g, '#8c6a4a', 1.1);
      // headband
      g.beginPath();
      g.moveTo(37.2, 16.5);
      g.quadraticCurveTo(46, 11.5, 58.6, 13.5);
      g.lineTo(58.8, 16.2);
      g.quadraticCurveTo(46, 14.5, 37.5, 19.5);
      g.closePath();
      fs(g, '#2b6fd0', 1.1);
      const w = [0, 1, 0, -1, 0, 0][frame] ?? 0;
      g.beginPath();
      g.moveTo(38, 17);
      g.quadraticCurveTo(33, 14 + w, 29, 15 + w * 1.5);
      g.lineTo(30, 18 + w);
      g.quadraticCurveTo(34, 18, 38, 19);
      g.closePath();
      fs(g, '#3f86e0', 1);
      g.beginPath();
      g.moveTo(38, 18.5);
      g.quadraticCurveTo(33, 20 - w, 30.5, 22 - w);
      stroke(g, 1.4, '#2b6fd0');
      g.fillStyle = '#ffe14a';
      star(g, 48, 14, 1.4, 0.45, 4);
      g.fill();
      break;
    }
  }
}

export interface CapyDrawOpts {
  cls: ClassId | null;
  pal: FurPal;
  frame: number;
}

export function drawCapy(g: G, o: CapyDrawOpts) {
  g.save();
  g.translate(OX, OY);
  const face = o.frame === 4 ? 'blink' : o.frame === 5 ? 'hurt' : 'open';
  if (o.cls) gearBack(g, o.cls, o.frame);
  legs(g, o.pal, o.frame);
  body(g, o.pal);
  if (o.cls) gearFront(g, o.cls, o.frame);
  // A one-pixel head nod gives the four walk cells their own silhouette.
  const nod = o.frame < 4 ? [0, -1, 0, 1][o.frame] : 0;
  g.translate(0, nod);
  if (o.cls !== 'vanguard' && o.cls !== 'ranger') ear(g, o.pal);
  head(g, o.pal, face);
  if (o.cls) gearHead(g, o.cls, o.frame);
  g.restore();
}

export function capyKey(cls: ClassId, fur: number) {
  return `capy_${cls}_${fur}`;
}

export function ensureCapyTexture(scene: Phaser.Scene, cls: ClassId, fur: number): string {
  const key = capyKey(cls, fur);
  if (scene.textures.exists(key)) return key;
  const c = frames(CAPY_FW, CAPY_FH, CAPY_FRAMES, CAPY_RES, (g, i) => drawCapy(g, { cls, pal: FURS[fur % FURS.length], frame: i }));
  addSheet(scene, key, c, CAPY_FW * CAPY_RES, CAPY_FH * CAPY_RES, CAPY_FRAMES);
  return key;
}

const portraitCache = new Map<string, string>();
export function capyPortrait(cls: ClassId, fur: number, size = 96, bg = true): string {
  const k = `${cls}_${fur}_${size}_${bg}`;
  const hit = portraitCache.get(k);
  if (hit) return hit;
  const [c, g] = cv(size, size);
  if (bg) {
    const col = { vanguard: '#6a5230', ranger: '#34522c', ember: '#4a2c66', herbalist: '#6a4a1c', storm: '#244a70' }[cls];
    g.fillStyle = rgrad(g, size / 2, size * 0.4, 2, size * 0.7, [[0, shade(col, 0.25)], [1, shade(col, -0.45)]]);
    g.fillRect(0, 0, size, size);
  }
  const s = size / 34;
  g.save();
  g.scale(s, s);
  g.translate(-OX - 32, -OY - 5);
  drawCapy(g, { cls, pal: FURS[fur % FURS.length], frame: 1 });
  g.restore();
  const url = c.toDataURL();
  portraitCache.set(k, url);
  return url;
}

export function makeGhostTexture(scene: Phaser.Scene) {
  const c = frames(CAPY_FW, CAPY_FH, 1, CAPY_RES, (g) => {
    g.globalAlpha = 0.85;
    drawCapy(g, { cls: null, pal: { base: '#e6f2ff', dark: '#b8cce8', light: '#ffffff' }, frame: 4 });
    g.globalAlpha = 1;
    ell(g, 51, 13, 7, 2.2);
    stroke(g, 1.6, '#ffe070');
  });
  addSheet(scene, 'ghost', c, CAPY_FW * CAPY_RES, CAPY_FH * CAPY_RES, 1);
}

export function makeTitleCapy(size: number, cls: ClassId, fur: number): HTMLCanvasElement {
  const [c, g] = cv(CAPY_FW * size, CAPY_FH * size);
  g.scale(size, size);
  drawCapy(g, { cls, pal: FURS[fur], frame: 1 });
  return c;
}
