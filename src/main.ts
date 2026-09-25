import Phaser from 'phaser';
import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import '@fontsource/grenze-gotisch/600.css';
import './ui/style.css';
import { generateAllTextures } from './art/index';
import { GameScene } from './game/GameScene';
import { TitleScene } from './title';
import { UI } from './ui/ui';

class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }
  create() {
    generateAllTextures(this);
    const mk = (key: string, tex: string, n: number, rate: number) =>
      this.anims.create({ key, frames: this.anims.generateFrameNumbers(tex, { start: 0, end: n - 1 }), frameRate: rate, repeat: -1 });
    mk('torch_anim', 'torch', 4, 10);
    mk('campfire_anim', 'campfire', 4, 9);
    this.scene.start('title');
  }
}

async function boot() {
  try {
    await Promise.all([
      document.fonts.load('400 16px Fredoka'),
      document.fonts.load('600 16px Fredoka'),
      document.fonts.load('700 16px Fredoka'),
      document.fonts.load('600 16px "Grenze Gotisch"'),
    ]);
  } catch {
    /* fall back to system fonts */
  }
  UI.init();
  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: 'game',
    backgroundColor: '#0a080c',
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    render: { antialias: true, roundPixels: false, powerPreference: 'high-performance' },
    fps: { target: 60 },
    scene: [BootScene, TitleScene, GameScene],
    disableContextMenu: true,
  });
  if (new URLSearchParams(location.search).has('test')) (window as unknown as { __phaser: Phaser.Game }).__phaser = game;
}

void boot();
