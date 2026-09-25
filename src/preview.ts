import Phaser from 'phaser';
import { generateAllTextures } from './art/index';
import { ensureCapyTexture } from './art/capy';
import { CLASS_IDS } from './data';
import { ICON_NAMES } from './art/icons';

class P extends Phaser.Scene {
  create() {
    generateAllTextures(this);
    let x = 10, y = 10;
    const row = () => { x = 10; y += 150; };
    for (const c of CLASS_IDS) for (let f = 0; f < 6; f++) { ensureCapyTexture(this, c, f % 5); this.add.image(x, y, `capy_${c}_${f%5}`, f).setOrigin(0); x += 150; if (x > 1700) row(); }
    row();
    for (const k of ['m_rat','m_slime','m_minislime','m_bat','m_skeleton','m_archer','m_shroom','m_beetle']) for (let f=0; f<2; f++) { this.add.image(x, y, k, f).setOrigin(0); x += 110; }
    row();
    for (const k of ['b_ratking','b_slimemonarch','b_lich']) for (let f=0; f<2; f++) { this.add.image(x, y, k, f).setOrigin(0).setScale(0.6); x += 190; }
    row();
    for (const k of ['chest','chest_gold','barrel','crate','pot','cage','campfire','torch','grave','melon','gem']) { const t = this.textures.get(k); const n = t.frameTotal - 1; for (let f=0; f<n; f++) { this.add.image(x, y, k, f).setOrigin(0); x += t.get(f).width + 8; } }
    row();
    for (let f=0; f<10; f++) { this.add.image(x, y, 'decor', f).setOrigin(0); x += 70; }
    for (const k of ['stairs','portal','spring']) { this.add.image(x, y, k).setOrigin(0).setScale(0.5); x += 130; }
    row();
    for (const k of ['soft','spark','slash','arrow','bonearrow','fireball','orangeball','seed','leaf','spore','orb','goo','greenorb','ring','branch','bubble','shock','crown','heart','bolt','ghost']) { this.add.image(x, y, k).setOrigin(0).setScale(0.8); x += 90; if (x>1700) row(); }
    row();
    for (const k of ICON_NAMES) { this.add.image(x, y, 'icon_'+k).setOrigin(0); x += 70; if (x > 1700) { x = 10; y += 70; } }
    y += 80; x = 10;
    for (let b=0;b<4;b++){ this.add.image(x, y, 'tiles_'+b).setOrigin(0).setScale(0.4); x += 420; }
  }
}
new Phaser.Game({ type: Phaser.WEBGL, width: 1800, height: 2000, backgroundColor: '#3a3a44', parent: 'p', scene: P });
