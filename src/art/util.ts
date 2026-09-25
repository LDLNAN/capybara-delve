import Phaser from 'phaser';

export const OUT = '#26160e';

export function cv(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  const g = c.getContext('2d')!;
  return [c, g];
}

export function stroke(g: CanvasRenderingContext2D, lw = 1.4, col = OUT) {
  g.lineWidth = lw;
  g.strokeStyle = col;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.stroke();
}

export function fs(g: CanvasRenderingContext2D, fill: string | CanvasGradient, lw = 1.4, col = OUT) {
  g.fillStyle = fill;
  g.fill();
  if (lw > 0) stroke(g, lw, col);
}

export function ell(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0) {
  g.beginPath();
  g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2);
}

export function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

export function hexToRgb(hex: string): [number, number, number] {
  if (hex.startsWith('rgb')) {
    const m = hex.match(/[\d.]+/g)!.map(Number);
    return [m[0], m[1], m[2]];
  }
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgb(r: number, g: number, b: number, a = 1) {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return a >= 1 ? `rgb(${c(r)},${c(g)},${c(b)})` : `rgba(${c(r)},${c(g)},${c(b)},${a})`;
}

export function shade(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  if (amt >= 0) return rgb(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
  return rgb(r * (1 + amt), g * (1 + amt), b * (1 + amt));
}

export function vgrad(g: CanvasRenderingContext2D, y0: number, y1: number, stops: [number, string][]) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}

export function rgrad(g: CanvasRenderingContext2D, x: number, y: number, r0: number, r1: number, stops: [number, string][], fx?: number, fy?: number) {
  const gr = g.createRadialGradient(fx ?? x, fy ?? y, r0, x, y, r1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}

export function star(g: CanvasRenderingContext2D, x: number, y: number, r: number, inner = 0.4, points = 4, rot = -Math.PI / 2) {
  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = rot + (i * Math.PI) / points;
    const rad = i % 2 === 0 ? r : r * inner;
    const px = x + Math.cos(a) * rad,
      py = y + Math.sin(a) * rad;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
}

// Register a horizontal strip of frames as one texture with numbered frames.
export function addSheet(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement, fw: number, fh: number, n: number) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.addCanvas(key, canvas)!;
  for (let i = 0; i < n; i++) tex.add(i, 0, i * fw, 0, fw, fh);
  return tex;
}

export function addTex(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  return scene.textures.addCanvas(key, canvas)!;
}

// Draw `n` frames, each in a (fw x fh) cell at resolution `res`.
export function frames(fw: number, fh: number, n: number, res: number, draw: (g: CanvasRenderingContext2D, i: number) => void) {
  const [c, g] = cv(fw * res * n, fh * res);
  for (let i = 0; i < n; i++) {
    g.save();
    g.translate(i * fw * res, 0);
    g.beginPath();
    g.rect(0, 0, fw * res, fh * res);
    g.clip();
    g.scale(res, res);
    draw(g, i);
    g.restore();
  }
  return c;
}
