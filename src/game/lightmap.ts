// Dynamic lighting: a low-resolution 2D canvas lightmap multiplied over the world.
import Phaser from 'phaser';

let uid = 0;

export class LightMap {
  scene: Phaser.Scene;
  scale = 4; // world units per lightmap pixel
  canvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;
  tex!: Phaser.Textures.CanvasTexture;
  img!: Phaser.GameObjects.Image;
  key = '';
  vx = 0;
  vy = 0;
  grads = new Map<number, HTMLCanvasElement>();
  depth: number;

  constructor(scene: Phaser.Scene, depth: number) {
    this.scene = scene;
    this.depth = depth;
    this.alloc(64, 64);
  }

  alloc(w: number, h: number) {
    if (this.img) this.img.destroy();
    if (this.key && this.scene.textures.exists(this.key)) this.scene.textures.remove(this.key);
    this.key = `__lightmap${uid++}`;
    this.tex = this.scene.textures.createCanvas(this.key, w, h)!;
    this.canvas = this.tex.getSourceImage() as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.img = this.scene.add.image(0, 0, this.key).setOrigin(0).setDepth(this.depth).setBlendMode(Phaser.BlendModes.MULTIPLY);
  }

  grad(color: number): HTMLCanvasElement {
    let c = this.grads.get(color);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const r = (color >> 16) & 255,
      gg = (color >> 8) & 255,
      b = color & 255;
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${r},${gg},${b},1)`);
    gr.addColorStop(0.35, `rgba(${r},${gg},${b},0.75)`);
    gr.addColorStop(0.7, `rgba(${r},${gg},${b},0.25)`);
    gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    this.grads.set(color, c);
    return c;
  }

  begin(vx: number, vy: number, vw: number, vh: number, ambient: number) {
    const w = Math.ceil(vw / this.scale) + 2,
      h = Math.ceil(vh / this.scale) + 2;
    if (w > this.canvas.width || h > this.canvas.height || w < this.canvas.width - 40 || h < this.canvas.height - 40) this.alloc(w, h);
    this.vx = vx;
    this.vy = vy;
    const g = this.ctx;
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.fillStyle = '#' + ambient.toString(16).padStart(6, '0');
    g.fillRect(0, 0, this.canvas.width, this.canvas.height);
    g.globalCompositeOperation = 'lighter';
  }

  light(x: number, y: number, r: number, color: number, alpha = 1) {
    const s = this.scale;
    const px = (x - this.vx) / s,
      py = (y - this.vy) / s,
      pr = r / s;
    if (px + pr < 0 || py + pr < 0 || px - pr > this.canvas.width || py - pr > this.canvas.height) return;
    this.ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    this.ctx.drawImage(this.grad(color), px - pr, py - pr, pr * 2, pr * 2);
  }

  end() {
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = 'source-over';
    this.tex.refresh();
    this.img.setPosition(this.vx, this.vy).setScale(this.scale);
  }

  destroy() {
    this.img?.destroy();
    if (this.scene.textures.exists(this.key)) this.scene.textures.remove(this.key);
  }
}
