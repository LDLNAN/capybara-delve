// Item and perk icons. Used both in DOM (data URLs) and in-world (textures).
import Phaser from 'phaser';
import { addTex, cv, ell, fs, OUT, rgrad, rr, shade, star, stroke, vgrad } from './util';

type G = CanvasRenderingContext2D;

const STEEL = () => '#dfe6ee';

function blade(g: G, x0: number, y0: number, len: number, w: number, ang: number, col = '#e6edf5') {
  g.save();
  g.translate(x0, y0);
  g.rotate(ang);
  g.beginPath();
  g.moveTo(0, -w / 2);
  g.lineTo(len - w, -w / 2);
  g.lineTo(len, 0);
  g.lineTo(len - w, w / 2);
  g.lineTo(0, w / 2);
  g.closePath();
  fs(g, vgrad(g, -w / 2, w / 2, [[0, '#ffffff'], [0.5, col], [1, shade(col, -0.35)]]), 1.2);
  g.restore();
}

const DRAW: Record<string, (g: G) => void> = {
  sword(g) {
    blade(g, 11, 21, 18, 5, -0.785);
    g.save();
    g.translate(11, 21);
    g.rotate(-0.785);
    rr(g, -1.5, -6, 3, 12, 1);
    fs(g, '#d9a441', 1.1);
    g.restore();
    g.beginPath();
    g.moveTo(10, 22);
    g.lineTo(5, 27);
    stroke(g, 4.2, OUT);
    g.beginPath();
    g.moveTo(10, 22);
    g.lineTo(5, 27);
    stroke(g, 2.4, '#7a4a24');
    ell(g, 4.5, 27.5, 2, 2);
    fs(g, '#d9a441', 1);
  },
  cleaver(g) {
    g.beginPath();
    g.moveTo(8, 6);
    g.lineTo(26, 6);
    g.quadraticCurveTo(28, 16, 24, 20);
    g.lineTo(10, 20);
    g.closePath();
    fs(g, vgrad(g, 6, 20, [[0, '#ffffff'], [1, '#9aa6b4']]), 1.3);
    ell(g, 12, 10, 1.6, 1.6);
    fs(g, '#3a3a44', 0.6);
    ell(g, 20, 15, 3, 2);
    g.fillStyle = '#ffd860';
    g.fill();
    rr(g, 8, 19, 5, 10, 1.5);
    fs(g, '#7a4a24', 1.1);
  },
  mace(g) {
    g.beginPath();
    g.moveTo(8, 26);
    g.lineTo(18, 14);
    stroke(g, 4.4, OUT);
    g.beginPath();
    g.moveTo(8, 26);
    g.lineTo(18, 14);
    stroke(g, 2.6, '#7a4a24');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.beginPath();
      g.moveTo(21 + Math.cos(a) * 5, 11 + Math.sin(a) * 5);
      g.lineTo(21 + Math.cos(a) * 9, 11 + Math.sin(a) * 9);
      stroke(g, 2.6, OUT);
      g.beginPath();
      g.moveTo(21 + Math.cos(a) * 5, 11 + Math.sin(a) * 5);
      g.lineTo(21 + Math.cos(a) * 8.5, 11 + Math.sin(a) * 8.5);
      stroke(g, 1.2, '#b8c0cc');
    }
    ell(g, 21, 11, 6.5, 6.5);
    fs(g, rgrad(g, 19, 9, 1, 7, [[0, '#f0f4f8'], [1, '#7a8594']]), 1.3);
  },
  bow(g) {
    g.beginPath();
    g.arc(4, 28, 24, -1.45, -0.12);
    stroke(g, 4.6, OUT);
    g.beginPath();
    g.arc(4, 28, 24, -1.45, -0.12);
    stroke(g, 2.8, '#a8703c');
    g.beginPath();
    g.moveTo(4 + Math.cos(-1.45) * 24, 28 + Math.sin(-1.45) * 24);
    g.lineTo(4 + Math.cos(-0.12) * 24, 28 + Math.sin(-0.12) * 24);
    stroke(g, 0.8, '#f2e6c8');
    g.beginPath();
    g.moveTo(9, 23);
    g.lineTo(26, 6);
    stroke(g, 1.6, '#c8a06a');
    g.beginPath();
    g.moveTo(28, 4);
    g.lineTo(23, 6);
    g.lineTo(26, 9);
    g.closePath();
    fs(g, STEEL(), 0.8);
  },
  staff(g) {
    g.beginPath();
    g.moveTo(7, 28);
    g.lineTo(21, 11);
    stroke(g, 4.2, OUT);
    g.beginPath();
    g.moveTo(7, 28);
    g.lineTo(21, 11);
    stroke(g, 2.4, '#7a4a24');
    ell(g, 23, 9, 8, 8);
    g.fillStyle = rgrad(g, 23, 9, 0, 8, [[0, 'rgba(255,220,120,0.9)'], [1, 'rgba(255,90,20,0)']]);
    g.fill();
    ell(g, 23, 9, 4.2, 4.2);
    fs(g, rgrad(g, 22, 8, 0.5, 4.5, [[0, '#fff6c0'], [0.5, '#ffb030'], [1, '#e0501a']]), 1.1);
  },
  sprig(g) {
    g.beginPath();
    g.moveTo(6, 28);
    g.quadraticCurveTo(14, 16, 24, 6);
    stroke(g, 3.6, OUT);
    g.beginPath();
    g.moveTo(6, 28);
    g.quadraticCurveTo(14, 16, 24, 6);
    stroke(g, 2, '#6a8a3a');
    for (const [x, y, a] of [[12, 18, -0.4], [17, 13, 0.9], [20, 9, -0.3], [9, 22, 1]] as const) {
      ell(g, x, y, 4.6, 2.2, a);
      fs(g, '#6cc04a', 1, '#1e4a1a');
    }
    ell(g, 25, 5.5, 3.6, 3.6);
    fs(g, '#ff9a24', 1);
  },
  daggers(g) {
    blade(g, 7, 25, 17, 4, -0.95);
    blade(g, 25, 25, 17, 4, -2.19);
    for (const [x, y] of [[7, 25], [25, 25]]) {
      ell(g, x, y + 1, 2.6, 2.6);
      fs(g, '#3a86e0', 1);
    }
    g.fillStyle = '#ffe14a';
    star(g, 16, 8, 3, 0.4, 4);
    g.fill();
  },
  tunic(g) {
    g.beginPath();
    g.moveTo(10, 5);
    g.lineTo(22, 5);
    g.lineTo(29, 11);
    g.lineTo(25, 15);
    g.lineTo(24, 28);
    g.lineTo(8, 28);
    g.lineTo(7, 15);
    g.lineTo(3, 11);
    g.closePath();
    fs(g, vgrad(g, 5, 28, [[0, '#7ac05a'], [1, '#3a7a2a']]), 1.3);
    g.beginPath();
    g.moveTo(12, 5);
    g.quadraticCurveTo(16, 10, 20, 5);
    stroke(g, 1.1, OUT);
    g.beginPath();
    g.moveTo(8, 20);
    g.lineTo(24, 20);
    stroke(g, 1.6, '#8a5a2e');
  },
  mail(g) {
    DRAW.tunic(g);
    g.beginPath();
    g.moveTo(10, 5);
    g.lineTo(22, 5);
    g.lineTo(29, 11);
    g.lineTo(25, 15);
    g.lineTo(24, 28);
    g.lineTo(8, 28);
    g.lineTo(7, 15);
    g.lineTo(3, 11);
    g.closePath();
    fs(g, vgrad(g, 5, 28, [[0, '#d0d8e0'], [1, '#7a8494']]), 1.3);
    g.strokeStyle = 'rgba(40,40,60,0.45)';
    g.lineWidth = 0.7;
    for (let y = 9; y < 28; y += 3) for (let x = 8 + (y % 2); x < 25; x += 3) {
      g.beginPath();
      g.arc(x, y, 1.1, 0, Math.PI);
      g.stroke();
    }
  },
  plate(g) {
    g.beginPath();
    g.moveTo(8, 6);
    g.quadraticCurveTo(16, 3, 24, 6);
    g.lineTo(28, 12);
    g.lineTo(24, 14);
    g.quadraticCurveTo(25, 22, 21, 28);
    g.lineTo(11, 28);
    g.quadraticCurveTo(7, 22, 8, 14);
    g.lineTo(4, 12);
    g.closePath();
    fs(g, vgrad(g, 4, 28, [[0, '#f0f4f8'], [0.5, '#a9b4c2'], [1, '#5f6a78']]), 1.3);
    g.beginPath();
    g.moveTo(16, 7);
    g.lineTo(16, 27);
    stroke(g, 1, 'rgba(40,40,60,0.5)');
    g.beginPath();
    g.moveTo(9, 16);
    g.quadraticCurveTo(16, 19, 23, 16);
    stroke(g, 1.8, '#b8413a');
  },
  robe(g) {
    g.beginPath();
    g.moveTo(11, 4);
    g.lineTo(21, 4);
    g.lineTo(27, 10);
    g.lineTo(24, 12);
    g.lineTo(27, 29);
    g.lineTo(5, 29);
    g.lineTo(8, 12);
    g.lineTo(5, 10);
    g.closePath();
    fs(g, vgrad(g, 4, 29, [[0, '#9a6ae0'], [1, '#43246e']]), 1.3);
    g.beginPath();
    g.moveTo(16, 6);
    g.lineTo(16, 29);
    stroke(g, 1.4, '#e8b84a');
    g.fillStyle = '#ffe07a';
    star(g, 11, 20, 2.2, 0.4, 4);
    g.fill();
    star(g, 21, 15, 1.6, 0.4, 4);
    g.fill();
  },
  pebble(g) {
    ell(g, 16, 18, 10, 8.5, 0.3);
    fs(g, rgrad(g, 13, 14, 1, 12, [[0, '#d8d4e0'], [1, '#6a6474']]), 1.3);
    g.fillStyle = '#6af07a';
    star(g, 16, 18, 3.4, 0.45, 4);
    g.fill();
    ell(g, 12, 13, 2.6, 1.4, -0.4);
    g.fillStyle = 'rgba(255,255,255,0.6)';
    g.fill();
  },
  amulet(g) {
    g.beginPath();
    g.arc(16, 9, 9, 0.2, Math.PI - 0.2, true);
    stroke(g, 1.4, '#d9a441');
    ell(g, 16, 20, 7, 8);
    fs(g, rgrad(g, 14, 17, 1, 8, [[0, '#9af0ff'], [1, '#2a7ab0']]), 1.4);
    ell(g, 16, 20, 7, 8);
    stroke(g, 1.6, '#d9a441');
    ell(g, 14, 17, 2, 1.4, -0.5);
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.fill();
  },
  bell(g) {
    g.beginPath();
    g.moveTo(9, 24);
    g.quadraticCurveTo(9, 8, 16, 7);
    g.quadraticCurveTo(23, 8, 23, 24);
    g.lineTo(26, 26);
    g.lineTo(6, 26);
    g.closePath();
    fs(g, vgrad(g, 7, 26, [[0, '#fff0a0'], [1, '#c8901e']]), 1.3);
    ell(g, 16, 27.5, 2.4, 2);
    fs(g, '#c8901e', 1);
    ell(g, 16, 6, 2.2, 2);
    stroke(g, 1.2, '#c8901e');
  },
  flower(g) {
    g.beginPath();
    g.moveTo(16, 18);
    g.quadraticCurveTo(14, 24, 16, 30);
    stroke(g, 1.8, '#4a8a3a');
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ell(g, 16 + Math.cos(a) * 5.5, 13 + Math.sin(a) * 5.5, 4, 2.6, a);
      fs(g, '#ff9ac0', 1, '#8a2a5a');
    }
    ell(g, 16, 13, 3, 3);
    fs(g, '#ffe070', 1);
  },
  stick(g) {
    g.save();
    g.translate(16, 16);
    g.rotate(-0.7);
    g.beginPath();
    g.moveTo(-14, 1);
    g.quadraticCurveTo(0, -3, 14, 0);
    stroke(g, 5.4, OUT);
    g.beginPath();
    g.moveTo(-14, 1);
    g.quadraticCurveTo(0, -3, 14, 0);
    stroke(g, 3.4, '#8a5a30');
    g.beginPath();
    g.moveTo(-3, -1);
    g.lineTo(1, -7);
    stroke(g, 2.2, '#8a5a30');
    ell(g, 2, -8, 3.2, 1.8, -0.4);
    fs(g, '#6ac04a', 0.8, '#1e4a1a');
    g.restore();
    g.fillStyle = '#7ad0ff';
    for (const [x, y] of [[9, 24], [22, 12], [15, 20]]) {
      ell(g, x, y, 1.3, 2);
      g.fill();
    }
  },
  yuzu(g) {
    ell(g, 16, 18, 11, 10);
    fs(g, rgrad(g, 13, 14, 1, 12, [[0, '#fff080'], [0.6, '#ffd020'], [1, '#e0a010']]), 1.4);
    ell(g, 12, 13, 3, 1.6, -0.5);
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.fill();
    ell(g, 20, 6, 5, 2.2, 0.5);
    fs(g, '#5cb84a', 1, '#1e4a1a');
    g.fillStyle = 'rgba(255,255,200,0.9)';
    star(g, 25, 24, 3, 0.35, 4);
    g.fill();
  },
  boots(g) {
    for (const dx of [0, 10]) {
      g.beginPath();
      g.moveTo(4 + dx, 8);
      g.lineTo(11 + dx, 8);
      g.lineTo(11 + dx, 22);
      g.lineTo(16 + dx, 24);
      g.lineTo(16 + dx, 28);
      g.lineTo(4 + dx, 28);
      g.closePath();
      fs(g, vgrad(g, 8, 28, [[0, '#e05a3a'], [1, '#8a2a1a']]), 1.3);
      rr(g, 3.5 + dx, 7, 8, 3.5, 1);
      fs(g, '#ffd060', 1);
    }
    g.fillStyle = 'rgba(255,200,80,0.9)';
    for (const [x, y] of [[2, 20], [1, 26]]) {
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - 4, y - 1);
      g.lineTo(x, y + 2);
      g.fill();
    }
  },
  bubblebow(g) {
    DRAW.bow(g);
    for (const [x, y, r] of [[22, 22, 4], [27, 16, 2.6], [16, 27, 2.2]]) {
      ell(g, x, y, r, r);
      g.fillStyle = 'rgba(160,220,255,0.4)';
      g.fill();
      stroke(g, 1, '#c8f0ff');
    }
  },
  bigorange(g) {
    DRAW.staff(g);
    ell(g, 23, 9, 7.5, 7);
    fs(g, rgrad(g, 21, 7, 1, 8, [[0, '#ffd070'], [0.6, '#ff9a24'], [1, '#e2700c']]), 1.3);
    ell(g, 24, 2.5, 3, 1.4, 0.4);
    fs(g, '#5cb84a', 0.8, '#1e4a1a');
  },
  thunder(g) {
    DRAW.daggers(g);
    g.beginPath();
    g.moveTo(18, 2);
    g.lineTo(11, 16);
    g.lineTo(16, 16);
    g.lineTo(12, 30);
    g.lineTo(23, 12);
    g.lineTo(17, 12);
    g.lineTo(21, 2);
    g.closePath();
    fs(g, '#ffe14a', 1.2);
  },
  lid(g) {
    ell(g, 16, 18, 13, 11);
    fs(g, rgrad(g, 13, 14, 1, 14, [[0, '#f0f4f8'], [0.6, '#8a94a4'], [1, '#4a5260']]), 1.5);
    ell(g, 16, 18, 9, 7.5);
    stroke(g, 1, 'rgba(255,255,255,0.4)');
    rr(g, 12, 7, 8, 5, 2);
    fs(g, '#3a3a44', 1.2);
    g.fillStyle = 'rgba(255,255,255,0.7)';
    ell(g, 10, 13, 3, 1.4, -0.6);
    g.fill();
  },
  everbloom(g) {
    DRAW.sprig(g);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ell(g, 24 + Math.cos(a) * 4, 7 + Math.sin(a) * 4, 3, 2, a);
      fs(g, '#ff7ab0', 0.8, '#8a2a5a');
    }
    ell(g, 24, 7, 2.4, 2.4);
    fs(g, '#fff070', 0.8);
  },
  lettuce(g) {
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.55;
      ell(g, 16 + Math.cos(a) * 6, 18 + Math.sin(a) * 6, 8, 6, a);
      fs(g, shade('#8ae05a', -i * 0.06), 1.1, '#2a5a1a');
    }
    ell(g, 16, 20, 7, 6);
    fs(g, '#c8f09a', 1.1, '#2a5a1a');
  },
  bracelet(g) {
    ell(g, 16, 16, 11, 11);
    stroke(g, 5, OUT);
    const cols = ['#ff6a8a', '#ffd060', '#6ad0ff', '#8ae05a'];
    for (let i = 0; i < 12; i++) {
      const a0 = (i / 12) * Math.PI * 2;
      g.beginPath();
      g.arc(16, 16, 11, a0, a0 + Math.PI / 6);
      stroke(g, 3.2, cols[i % 4]);
    }
    g.fillStyle = '#fff';
    star(g, 16, 5, 2.6, 0.45, 5);
    g.fill();
  },
  shell(g) {
    ell(g, 16, 18, 13, 10);
    fs(g, rgrad(g, 13, 14, 1, 14, [[0, '#a8c870'], [1, '#4a6a2a']]), 1.5);
    g.strokeStyle = '#2a3a1a';
    g.lineWidth = 1.1;
    const hex = (x: number, y: number, r: number) => {
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const px = x + Math.cos(a) * r,
          py = y + Math.sin(a) * r * 0.8;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.stroke();
    };
    hex(16, 17, 4.5);
    hex(8.5, 15, 3.5);
    hex(23.5, 15, 3.5);
    hex(12, 23, 3);
    hex(20, 23, 3);
  },
  // perk / status glyphs
  heart(g) {
    g.beginPath();
    g.moveTo(16, 28);
    g.bezierCurveTo(-4, 14, 6, -2, 16, 9);
    g.bezierCurveTo(26, -2, 36, 14, 16, 28);
    fs(g, vgrad(g, 4, 28, [[0, '#ff8aa0'], [1, '#d02a50']]), 1.5);
  },
  shield(g) {
    g.beginPath();
    g.moveTo(16, 3);
    g.lineTo(27, 7);
    g.quadraticCurveTo(27, 22, 16, 29);
    g.quadraticCurveTo(5, 22, 5, 7);
    g.closePath();
    fs(g, vgrad(g, 3, 29, [[0, '#dfe6ee'], [1, '#6f7a88']]), 1.5);
    g.beginPath();
    g.moveTo(16, 6);
    g.lineTo(16, 26);
    stroke(g, 2, '#b8413a');
  },
  bolt(g) {
    g.beginPath();
    g.moveTo(19, 2);
    g.lineTo(8, 18);
    g.lineTo(15, 18);
    g.lineTo(12, 30);
    g.lineTo(24, 13);
    g.lineTo(17, 13);
    g.lineTo(21, 2);
    g.closePath();
    fs(g, vgrad(g, 2, 30, [[0, '#fff8a0'], [1, '#f0b020']]), 1.4);
  },
  star(g) {
    star(g, 16, 16, 13, 0.45, 5);
    fs(g, vgrad(g, 3, 29, [[0, '#fff8a0'], [1, '#f0a020']]), 1.4);
  },
  eye(g) {
    g.beginPath();
    g.moveTo(3, 16);
    g.quadraticCurveTo(16, 3, 29, 16);
    g.quadraticCurveTo(16, 29, 3, 16);
    fs(g, '#f4f0e8', 1.4);
    ell(g, 16, 16, 6, 6);
    fs(g, '#4a9ae0', 1.1);
    ell(g, 16, 16, 2.6, 2.6);
    g.fillStyle = OUT;
    g.fill();
  },
  leaf(g) {
    ell(g, 16, 16, 12, 6.5, -0.7);
    fs(g, vgrad(g, 4, 28, [[0, '#a8f070'], [1, '#3a8a2a']]), 1.4, '#1e4a1a');
    g.beginPath();
    g.moveTo(7, 25);
    g.lineTo(25, 7);
    stroke(g, 1.1, '#1e4a1a');
  },
  fang(g) {
    g.beginPath();
    g.moveTo(6, 6);
    g.lineTo(26, 6);
    g.lineTo(20, 12);
    g.lineTo(18, 28);
    g.lineTo(14, 12);
    g.lineTo(12, 12);
    g.closePath();
    fs(g, '#f4f0e8', 1.4);
    ell(g, 18, 27, 2, 3);
    g.fillStyle = '#e0304a';
    g.fill();
  },
  snow(g) {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI;
      g.beginPath();
      g.moveTo(16 + Math.cos(a) * 13, 16 + Math.sin(a) * 13);
      g.lineTo(16 - Math.cos(a) * 13, 16 - Math.sin(a) * 13);
      stroke(g, 4.2, OUT);
      g.beginPath();
      g.moveTo(16 + Math.cos(a) * 13, 16 + Math.sin(a) * 13);
      g.lineTo(16 - Math.cos(a) * 13, 16 - Math.sin(a) * 13);
      stroke(g, 2.4, '#bff0ff');
    }
  },
  flame(g) {
    g.beginPath();
    g.moveTo(16, 2);
    g.quadraticCurveTo(28, 14, 25, 22);
    g.quadraticCurveTo(22, 30, 16, 30);
    g.quadraticCurveTo(8, 30, 7, 22);
    g.quadraticCurveTo(6, 14, 16, 2);
    fs(g, vgrad(g, 2, 30, [[0, '#ffe070'], [0.6, '#ff8a2a'], [1, '#d0401a']]), 1.4);
    g.beginPath();
    g.moveTo(16, 14);
    g.quadraticCurveTo(21, 20, 19, 25);
    g.quadraticCurveTo(16, 28, 13, 25);
    g.quadraticCurveTo(11, 20, 16, 14);
    g.fillStyle = '#fff4c0';
    g.fill();
  },
  arrow(g) {
    g.beginPath();
    g.moveTo(5, 27);
    g.lineTo(24, 8);
    stroke(g, 3.6, OUT);
    g.beginPath();
    g.moveTo(5, 27);
    g.lineTo(24, 8);
    stroke(g, 2, '#c8a06a');
    g.beginPath();
    g.moveTo(28, 4);
    g.lineTo(18, 8);
    g.lineTo(24, 14);
    g.closePath();
    fs(g, '#e6edf5', 1.1);
    g.beginPath();
    g.moveTo(4, 22);
    g.lineTo(9, 23);
    g.lineTo(10, 28);
    g.lineTo(5, 29);
    g.closePath();
    fs(g, '#e25d4a', 1);
  },
  boot(g) {
    g.beginPath();
    g.moveTo(9, 4);
    g.lineTo(19, 4);
    g.lineTo(19, 19);
    g.lineTo(28, 22);
    g.lineTo(28, 28);
    g.lineTo(8, 28);
    g.closePath();
    fs(g, vgrad(g, 4, 28, [[0, '#b8804a'], [1, '#6a4020']]), 1.4);
    rr(g, 8, 3, 12, 4, 1.4);
    fs(g, '#e8c050', 1);
  },
  poison(g) {
    ell(g, 16, 18, 10, 10);
    fs(g, rgrad(g, 13, 15, 1, 11, [[0, '#d0ff90'], [1, '#4a9a2a']]), 1.4);
    ell(g, 12.5, 16, 2, 2.4);
    ell(g, 19.5, 16, 2, 2.4);
    g.fillStyle = OUT;
    g.fill();
  },
};

const urlCache = new Map<string, string>();

export function drawIcon(name: string, size: number): HTMLCanvasElement {
  const [c, g] = cv(size, size);
  g.scale(size / 32, size / 32);
  (DRAW[name] ?? DRAW.pebble)(g);
  return c;
}

export function iconURL(name: string): string {
  let u = urlCache.get(name);
  if (!u) {
    u = drawIcon(name, 64).toDataURL();
    urlCache.set(name, u);
  }
  return u;
}

export function makeIconTextures(scene: Phaser.Scene) {
  for (const k of Object.keys(DRAW)) addTex(scene, 'icon_' + k, drawIcon(k, 64));
}

export const ICON_NAMES = Object.keys(DRAW);
