// DOM user interface: title, HUD, inventory, menus, banners.
import { audio } from '../audio';
import { capyPortrait } from '../art/capy';
import { iconURL } from '../art/icons';
import { CLASSES, CLASS_IDS, ClassId, PERKS, PerkDef, randomName } from '../data';
import { canEquip, Item, itemLines, itemTypeLabel, RARITY_COLORS, RARITY_NAMES, Slot, SLOT_NAMES, SLOTS } from '../items';
import { computeStats, dpsEstimate, ehp, powerScore, xpToNext } from '../stats';
import type { Capy, RunStats } from '../game/types';

export interface GameAPI {
  party: Capy[];
  bag: Item[];
  depth: number;
  stats: RunStats;
  equip(c: Capy, it: Item): void;
  unequip(c: Capy, slot: Slot): void;
  salvage(it: Item): void;
  moveBagItem(it: Item, slot: number): void;
  salvageCommons(): number;
  pauseGame(): void;
  resumeGame(): void;
  restartRun(): void;
  toMenu(): void;
}

export const BAG_SIZE = 36;

export const settings = { shake: 1, damageNumbers: true };
try {
  const s = JSON.parse(localStorage.getItem('capydelve_settings') || 'null');
  if (s) Object.assign(settings, s);
} catch {
  /* ignore */
}
function saveSettings() {
  try {
    localStorage.setItem('capydelve_settings', JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

export interface BestRun {
  depth: number;
  kills: number;
  time: number;
  runs: number;
}
export function loadBest(): BestRun {
  try {
    const b = JSON.parse(localStorage.getItem('capydelve_best') || 'null');
    if (b) return b;
  } catch {
    /* ignore */
  }
  return { depth: 0, kills: 0, time: 0, runs: 0 };
}
export function saveBest(b: BestRun) {
  try {
    localStorage.setItem('capydelve_best', JSON.stringify(b));
  } catch {
    /* ignore */
  }
}

const $ = (html: string): HTMLElement => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
};
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60),
    s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function clsColor(c: ClassId) {
  return CLASSES[c].color;
}

function bindSounds(el: HTMLElement) {
  el.querySelectorAll('button, .class-card, .perk, .slot, .prow').forEach((b) => {
    b.addEventListener('mouseenter', () => audio.play('hover'));
  });
}

class UIManager {
  root!: HTMLElement;
  hud: HTMLElement | null = null;
  modal: HTMLElement | null = null;
  modalKind: string | null = null;
  minimap: HTMLCanvasElement | null = null;
  cards = new Map<number, HTMLElement>();
  lastHp = new Map<number, number>();
  toasts!: HTMLElement;
  keyHandler: ((e: KeyboardEvent) => void) | null = null;
  invSel: { item: Item; owner: Capy | null } | null = null;
  invFocus: Capy | null = null;

  init() {
    this.root = document.getElementById('ui')!;
    window.addEventListener('keydown', (e) => {
      if (!this.keyHandler) return;
      const hadModal = !!this.modal;
      this.keyHandler(e);
      // a key that a modal consumed must not also reach the game (e.g. Esc closing the bag re-opening pause)
      if (hadModal) e.stopImmediatePropagation();
    });
  }

  isModalOpen() {
    return !!this.modal;
  }

  closeModal() {
    if (this.modal) this.modal.remove();
    this.modal = null;
    this.modalKind = null;
    this.keyHandler = null;
  }

  // ------------------------------------------------------------ title
  showTitle(onStart: (cls: ClassId, name: string, fur: number) => void) {
    this.clearAll();
    const best = loadBest();
    let sel: ClassId = 'vanguard';
    let name = randomName();
    let fur = Math.floor(Math.random() * 5);
    const el = $(`<div id="title">
      <div class="logo"><div class="l1">CAPYBARA</div><div class="l2">DELVE</div></div>
      <div class="tagline">A roguelike of automatic violence and extremely calm rodents.</div>
      ${best.runs > 0 ? `<div class="best">Deepest delve: <b>Depth ${best.depth}</b> · Most kills: <b>${best.kills}</b> · Runs: <b>${best.runs}</b></div>` : ''}
      <div class="class-row"></div>
      <div class="start-row">
        <div class="name-box">Your capybara: <b class="nm"></b><button class="btn small alt reroll" title="New name">↻</button></div>
        <button class="btn big go">BEGIN THE DELVE</button>
      </div>
      <div class="title-controls"><span class="kbd">WASD</span>/<span class="kbd">Arrows</span> move · attacks are automatic · <span class="kbd">E</span> pick up loot · <span class="kbd">I</span> bag · <span class="kbd">Esc</span> pause · <span class="kbd">F</span> fullscreen</div>
      <div class="title-foot">Find friends. Grab loot. Go deeper. Everybody is a capybara.</div>
    </div>`);
    const row = el.querySelector('.class-row')!;
    const nm = el.querySelector('.nm') as HTMLElement;
    const drawCards = () => {
      row.innerHTML = '';
      for (const c of CLASS_IDS) {
        const card = $(`<div class="class-card ${c === sel ? 'sel' : ''}">
          <img src="${capyPortrait(c, c === sel ? fur : 0)}"><div class="cn" style="color:${clsColor(c)}">${CLASSES[c].name}</div>
          <div class="cd">${CLASSES[c].desc}</div></div>`);
        card.addEventListener('click', () => {
          audio.unlock();
          audio.play('click');
          sel = c;
          drawCards();
        });
        card.addEventListener('mouseenter', () => audio.play('hover'));
        row.appendChild(card);
      }
      nm.textContent = name;
    };
    drawCards();
    el.querySelector('.reroll')!.addEventListener('click', () => {
      audio.unlock();
      audio.play('click');
      name = randomName([name]);
      fur = (fur + 1 + Math.floor(Math.random() * 4)) % 5;
      drawCards();
    });
    const go = () => {
      audio.unlock();
      audio.play('open');
      this.keyHandler = null;
      onStart(sel, name, fur);
    };
    el.querySelector('.go')!.addEventListener('click', go);
    el.addEventListener('pointerdown', () => {
      audio.unlock();
      audio.setMusic('title');
    });
    this.keyHandler = (e) => {
      if (e.key === 'Enter') go();
      const i = ['1', '2', '3', '4', '5'].indexOf(e.key);
      if (i >= 0) {
        sel = CLASS_IDS[i];
        drawCards();
      }
    };
    bindSounds(el);
    this.root.appendChild(el);
  }

  clearAll() {
    this.closeModal();
    this.root.innerHTML = '';
    this.hud = null;
    this.cards.clear();
    this.lastHp.clear();
  }

  // ------------------------------------------------------------ HUD
  buildHud(onBag: () => void) {
    this.clearAll();
    const el = $(`<div id="hud">
      <div class="party"></div>
      <div class="depth"><div class="d">DEPTH <b>1</b></div><div class="sub"></div></div>
      <div class="bossbar"><div class="bn"></div><div class="bar"><div class="fill"></div></div></div>
      <div class="minimap panel"><canvas width="200" height="150"></canvas><div class="ml"></div></div>
      <div class="bagbtn panel interactive"><img src="${iconURL('tunic')}"><div><div class="bc">Bag</div><div class="up">▲ Upgrade!</div></div><span class="kbd">I</span></div>
      <div class="toasts"></div>
      <div class="hint">Move with <span class="kbd">WASD</span> — your capybaras attack on their own.</div>
      <div class="vignette"></div>
    </div>`);
    el.querySelector('.bagbtn')!.addEventListener('click', () => {
      audio.play('click');
      onBag();
    });
    this.minimap = el.querySelector('.minimap canvas') as HTMLCanvasElement;
    this.toasts = el.querySelector('.toasts') as HTMLElement;
    this.hud = el;
    this.root.appendChild(el);
    setTimeout(() => {
      const h = el.querySelector('.hint') as HTMLElement | null;
      if (h) h.style.opacity = '0';
    }, 9000);
  }

  updateHud(g: GameAPI, extra: { time: number; kills: number; biome: string; lowHp: boolean; upgrade: boolean; roomsLeft: string }) {
    if (!this.hud) return;
    const party = this.hud.querySelector('.party')!;
    const leader = g.party.find((c) => c.alive);
    for (const c of g.party) {
      let card = this.cards.get(c.id);
      if (!card) {
        card = $(`<div class="pcard" style="--cc:${clsColor(c.cls)}">
          <div class="pp"><img class="port" src="${capyPortrait(c.cls, c.fur)}"><img class="crown" src="${iconURL('star')}" style="display:none"><div class="lv"></div><div class="skull">💀</div></div>
          <div class="info"><div class="nm"><span class="n"></span><span class="cl">${CLASSES[c.cls].name}</span></div>
          <div class="bar hp"><div class="ghost"></div><div class="fill"></div><div class="txt"></div></div>
          <div class="bar xp"><div class="fill"></div></div><div class="status"></div></div></div>`);
        (card.querySelector('.crown') as HTMLImageElement).src = crownURL();
        party.appendChild(card);
        this.cards.set(c.id, card);
      }
      const pct = Math.max(0, c.hp / c.stats.maxHp);
      card.querySelector<HTMLElement>('.n')!.textContent = c.name;
      card.querySelector<HTMLElement>('.lv')!.textContent = `${c.level}`;
      card.querySelector<HTMLElement>('.hp .fill')!.style.width = `${pct * 100}%`;
      card.querySelector<HTMLElement>('.hp .ghost')!.style.width = `${pct * 100}%`;
      card.querySelector<HTMLElement>('.hp')!.classList.toggle('low', pct < 0.3);
      card.querySelector<HTMLElement>('.hp .txt')!.textContent = c.alive ? `${Math.ceil(c.hp)} / ${Math.round(c.stats.maxHp)}` : 'FALLEN';
      card.querySelector<HTMLElement>('.xp .fill')!.style.width = `${Math.min(1, c.xp / xpToNext(c.level)) * 100}%`;
      card.classList.toggle('dead', !c.alive);
      card.classList.toggle('leader', c === leader);
      card.querySelector<HTMLElement>('.crown')!.style.display = c === leader ? 'block' : 'none';
      const prev = this.lastHp.get(c.id) ?? c.hp;
      if (c.hp < prev - 0.5 && c.alive) {
        card.classList.remove('hurt');
        void card.offsetWidth;
        card.classList.add('hurt');
      }
      this.lastHp.set(c.id, c.hp);
      const st = card.querySelector<HTMLElement>('.status')!;
      const want = c.alive && c.poison > 0 ? 'poison' : '';
      if (st.dataset.s !== want) {
        st.dataset.s = want;
        st.innerHTML = want ? `<img src="${iconURL('poison')}">` : '';
      }
    }
    this.hud.querySelector<HTMLElement>('.depth .d')!.innerHTML = `DEPTH <b>${g.depth}</b>`;
    this.hud.querySelector<HTMLElement>('.depth .sub')!.textContent = `${extra.biome} · ${fmtTime(extra.time)} · ${extra.kills} slain`;
    this.hud.querySelector<HTMLElement>('.minimap .ml')!.textContent = extra.roomsLeft;
    this.hud.querySelector<HTMLElement>('.bagbtn .bc')!.textContent = `Bag ${g.bag.length}/${BAG_SIZE}`;
    this.hud.querySelector<HTMLElement>('.bagbtn')!.classList.toggle('has-up', extra.upgrade);
    this.hud.querySelector<HTMLElement>('.vignette')!.classList.toggle('low', extra.lowHp);
  }

  bossBar(name: string | null, pct: number) {
    if (!this.hud) return;
    const b = this.hud.querySelector<HTMLElement>('.bossbar')!;
    if (!name) {
      b.style.display = 'none';
      return;
    }
    b.style.display = 'block';
    b.querySelector<HTMLElement>('.bn')!.textContent = name;
    b.querySelector<HTMLElement>('.fill')!.style.width = `${Math.max(0, pct) * 100}%`;
  }

  toast(html: string, icon?: string, life = 3, border?: string) {
    if (!this.hud) return;
    const t = $(`<div class="toast" style="--life:${life}s;${border ? `border-color:${border}` : ''}">${icon ? `<img src="${icon}">` : ''}<div>${html}</div></div>`);
    this.toasts.appendChild(t);
    while (this.toasts.children.length > 5) this.toasts.firstElementChild!.remove();
    setTimeout(() => t.remove(), (life + 0.6) * 1000);
  }

  banner(o: { title: string; sub?: string; text?: string; portrait?: string; life?: number; color?: string }) {
    if (!this.hud) return;
    this.hud.querySelectorAll('.banner').forEach((b) => b.remove());
    const life = o.life ?? 3.6;
    const b = $(`<div class="banner panel" style="--life:${life}s">${o.portrait ? `<img src="${o.portrait}" style="${o.color ? `box-shadow:0 0 0 3px ${o.color}` : ''}">` : ''}
      <div><div class="bt">${esc(o.title)}</div>${o.sub ? `<div class="bs">${o.sub}</div>` : ''}${o.text ? `<div class="bx">${esc(o.text)}</div>` : ''}</div></div>`);
    this.hud.appendChild(b);
    setTimeout(() => b.remove(), (life + 0.7) * 1000);
  }

  depthCard(depth: number, biome: string, flavor: string, boss: boolean) {
    if (!this.hud) return;
    const d = $(`<div class="depthcard"><div class="dc1 ${boss ? 'boss' : ''}">DEPTH ${depth}</div><div class="dc2">${boss ? '⚔ Boss Lair ⚔' : esc(biome)}</div><div class="dc3">${esc(flavor)}</div></div>`);
    this.hud.appendChild(d);
    setTimeout(() => d.remove(), 3500);
  }

  bossIntro(name: string, title: string) {
    if (!this.hud) return;
    const d = $(`<div class="bossintro"><div class="b1">${esc(name)}</div><div class="b2">${esc(title)}</div></div>`);
    this.hud.appendChild(d);
    setTimeout(() => d.remove(), 3100);
  }

  fade(on: boolean) {
    let f = this.root.querySelector<HTMLElement>('.fade-black');
    if (!f) {
      f = $(`<div class="fade-black"></div>`);
      this.root.appendChild(f);
    }
    void f.offsetWidth;
    f.classList.toggle('on', on);
  }

  // ------------------------------------------------------------ modals
  openModal(kind: string, inner: HTMLElement, onKey?: (e: KeyboardEvent) => void, closeOnBg = false, onClose?: () => void) {
    this.closeModal();
    const wrap = $(`<div class="modal-wrap"></div>`);
    wrap.appendChild(inner);
    if (closeOnBg)
      wrap.addEventListener('pointerdown', (e) => {
        if (e.target === wrap) onClose?.();
      });
    this.root.appendChild(wrap);
    this.modal = wrap;
    this.modalKind = kind;
    this.keyHandler = onKey ?? null;
    bindSounds(wrap);
  }

  settingsBlock(): HTMLElement {
    const el = $(`<div class="settings">
      <label>Master</label><input type="range" min="0" max="1" step="0.05" data-k="master">
      <label>Music</label><input type="range" min="0" max="1" step="0.05" data-k="music">
      <label>Sound FX</label><input type="range" min="0" max="1" step="0.05" data-k="sfx">
      <label>Screen shake</label><div class="seg shake"><button data-v="0">Off</button><button data-v="0.5">Low</button><button data-v="1">Full</button></div>
      <label>Damage numbers</label><div class="seg dmg"><button data-v="0">Off</button><button data-v="1">On</button></div>
      <label>Display</label><div><button class="btn small alt fs">Toggle fullscreen</button></div>
    </div>`);
    el.querySelectorAll<HTMLInputElement>('input[type=range]').forEach((r) => {
      const k = r.dataset.k as 'master' | 'music' | 'sfx';
      r.value = String(audio.volumes[k]);
      r.addEventListener('input', () => audio.setVolume(k, +r.value));
      r.addEventListener('change', () => audio.play('click'));
    });
    const seg = (sel: string, get: () => number, set: (v: number) => void) => {
      const bs = el.querySelectorAll<HTMLButtonElement>(`${sel} button`);
      const refresh = () => bs.forEach((b) => b.classList.toggle('on', +b.dataset.v! === get()));
      bs.forEach((b) =>
        b.addEventListener('click', () => {
          set(+b.dataset.v!);
          saveSettings();
          audio.play('click');
          refresh();
        }),
      );
      refresh();
    };
    seg('.shake', () => settings.shake, (v) => (settings.shake = v));
    seg('.dmg', () => (settings.damageNumbers ? 1 : 0), (v) => (settings.damageNumbers = v === 1));
    el.querySelector('.fs')!.addEventListener('click', () => toggleFullscreen());
    return el;
  }

  openPause(g: GameAPI) {
    const el = $(`<div class="modal panel"><h2>Paused</h2><div class="menu-col">
      <button class="btn big resume">Resume</button>
      <div class="set"></div>
      <button class="btn alt restart">Restart Run</button>
      <button class="btn alt menu">Main Menu</button>
      <div class="title-controls"><span class="kbd">WASD</span> move · <span class="kbd">E</span> pick up loot · <span class="kbd">I</span>/<span class="kbd">Tab</span> bag · <span class="kbd">Esc</span> resume</div>
    </div></div>`);
    el.querySelector('.set')!.appendChild(this.settingsBlock());
    const resume = () => {
      audio.play('click');
      this.closeModal();
      g.resumeGame();
    };
    el.querySelector('.resume')!.addEventListener('click', resume);
    let confirmR = false;
    el.querySelector('.restart')!.addEventListener('click', (e) => {
      audio.play('click');
      if (!confirmR) {
        confirmR = true;
        (e.target as HTMLElement).textContent = 'Really restart? (click again)';
        return;
      }
      this.closeModal();
      g.restartRun();
    });
    let confirmM = false;
    el.querySelector('.menu')!.addEventListener('click', (e) => {
      audio.play('click');
      if (!confirmM) {
        confirmM = true;
        (e.target as HTMLElement).textContent = 'Abandon run? (click again)';
        return;
      }
      this.closeModal();
      g.toMenu();
    });
    this.openModal('pause', el, (e) => {
      if (e.key === 'Escape') resume();
    });
  }

  // ------------------------------------------------------------ inventory
  openInventory(g: GameAPI) {
    const living = g.party.filter((c) => c.alive);
    if (!this.invFocus || !this.invFocus.alive || !g.party.includes(this.invFocus)) this.invFocus = living[0] ?? null;
    this.invSel = null;
    const el = $(`<div class="modal panel"><h2>Party &amp; Bag</h2><button class="btn small alt x">✕ Close</button>
      <div class="inv-top"><button class="btn small alt junk">Salvage all Common</button><span class="title-controls">Drag items to arrange your bag, or select one and click an empty space. Click to equip.</span></div>
      <div class="inv"><div class="col-party"><h3>Party</h3><div class="plist"></div></div>
      <div class="col-bag"><h3>Bag <span class="bagn"></span></h3><div class="baggrid"></div></div>
      <div class="col-detail"><h3>Details</h3><div class="detail"></div></div></div></div>`);
    const close = () => {
      audio.play('click');
      for (const it of g.bag) it.isNew = false;
      this.closeModal();
      g.resumeGame();
    };
    el.querySelector('.x')!.addEventListener('click', close);
    el.querySelector('.junk')!.addEventListener('click', () => {
      const n = g.salvageCommons();
      audio.play(n ? 'break' : 'deny');
      this.invSel = null;
      render();
    });
    const itemSlot = (it: Item | null, label: string, extra = '') => {
      if (!it) return `<div class="slot empty" data-label="${label}"></div>`;
      return `<div class="slot r${it.rarity} ${extra}" title="${esc(it.name)}"><img src="${iconURL(it.icon)}">${it.isNew ? '<span class="new">NEW</span>' : ''}</div>`;
    };

    const bestUpgradeFor = (it: Item): { c: Capy; d: number } | null => {
      let best: { c: Capy; d: number } | null = null;
      for (const c of living) {
        if (!canEquip(it, c.cls)) continue;
        const d = deltaPower(c, it);
        if (d > 0.01 && (!best || d > best.d)) best = { c, d };
      }
      return best;
    };

    const render = () => {
      const plist = el.querySelector('.plist')!;
      plist.innerHTML = '';
      for (const c of g.party) {
        const s = c.stats;
        const row = $(`<div class="prow ${c === this.invFocus ? 'sel' : ''} ${c.alive ? '' : 'dead'}" style="--cc:${clsColor(c.cls)}">
          <img src="${capyPortrait(c.cls, c.fur)}">
          <div class="pi"><div class="pn">${esc(c.name)} <small>Lv ${c.level} ${CLASSES[c.cls].name}${c.alive ? '' : ' · fallen'}</small></div>
          <div class="ps">DPS <b>${Math.round(dpsEstimate(c.cls, s))}</b> · HP <b>${Math.ceil(c.hp)}/${Math.round(s.maxHp)}</b> · Armour <b>${Math.round(s.armor)}</b></div>
          <div class="slots"></div></div></div>`);
        const slots = row.querySelector('.slots')!;
        for (const sl of SLOTS) {
          const it = c.equip[sl];
          const node = $(itemSlot(it, SLOT_NAMES[sl], this.invSel && this.invSel.item === it ? 'pick' : ''));
          node.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!c.alive) return;
            audio.play('click');
            this.invFocus = c;
            this.invSel = it ? { item: it, owner: c } : null;
            render();
          });
          slots.appendChild(node);
        }
        row.addEventListener('click', () => {
          if (!c.alive) return;
          audio.play('click');
          this.invFocus = c;
          render();
        });
        plist.appendChild(row);
      }
      if (this.invFocus) {
        const s = this.invFocus.stats;
        const pct = (v: number) => `${Math.round(v * 100)}%`;
        const extraStats = $(`<div class="stat-grid">
          <div>Damage <b>${s.damage.toFixed(1)}</b></div><div>Attacks/s <b>${s.attackSpeed.toFixed(2)}</b></div>
          <div>Crit <b>${pct(s.crit)} ×${s.critMult.toFixed(2)}</b></div><div>Range <b>${Math.round(s.range)}</b></div>
          <div>Regen <b>${s.regen.toFixed(1)}/s</b></div><div>Move <b>${Math.round(s.moveSpeed)}</b></div>
          ${s.projectiles ? `<div>Extra shots <b>+${s.projectiles}</b></div>` : ''}${s.pierce ? `<div>Pierce <b>${s.pierce}</b></div>` : ''}
          ${s.bounce ? `<div>Chain <b>${s.bounce}</b></div>` : ''}${s.lifesteal ? `<div>Lifesteal <b>${pct(s.lifesteal)}</b></div>` : ''}
          ${s.dodge ? `<div>Dodge <b>${pct(s.dodge)}</b></div>` : ''}${s.thorns ? `<div>Thorns <b>${pct(s.thorns)}</b></div>` : ''}
          ${this.invFocus.cls === 'herbalist' ? `<div>Healing <b>${pct(s.healPower)}</b></div>` : ''}
        </div>`);
        plist.appendChild(extraStats);
        if (this.invFocus.perks.length) {
          plist.appendChild($(`<div class="perklist">Talents: ${this.invFocus.perks.map((p) => PERKS.find((x) => x.id === p)?.name).join(' · ')}</div>`));
        }
      }

      el.querySelector('.bagn')!.textContent = `(${g.bag.length}/${BAG_SIZE})`;
      const grid = el.querySelector('.baggrid')!;
      grid.innerHTML = '';
      for (let slot = 0; slot < BAG_SIZE; slot++) {
        const it = g.bag.find((item) => item.bagSlot === slot);
        if (!it) {
          const empty = $(itemSlot(null, ''));
          empty.dataset.slot = String(slot);
          empty.addEventListener('click', () => {
            if (this.invSel && !this.invSel.owner) {
              g.moveBagItem(this.invSel.item, slot);
              audio.play('click');
              render();
            }
          });
          empty.addEventListener('dragover', (e) => e.preventDefault());
          empty.addEventListener('drop', (e) => {
            e.preventDefault();
            const moved = g.bag.find((item) => item.uid === Number(e.dataTransfer?.getData('text/plain')));
            if (moved) { g.moveBagItem(moved, slot); render(); }
          });
          grid.appendChild(empty);
          continue;
        }
        const up = bestUpgradeFor(it);
        const node = $(itemSlot(it, '', this.invSel && this.invSel.item === it ? 'pick' : ''));
        node.draggable = true;
        node.addEventListener('dragstart', (e) => e.dataTransfer?.setData('text/plain', String(it.uid)));
        node.addEventListener('dragover', (e) => e.preventDefault());
        node.addEventListener('drop', (e) => {
          e.preventDefault();
          const moved = g.bag.find((item) => item.uid === Number(e.dataTransfer?.getData('text/plain')));
          if (moved) { g.moveBagItem(moved, slot); render(); }
        });
        if (up) node.appendChild($(`<span class="upg">▲</span>`));
        if (this.invFocus && !canEquip(it, this.invFocus.cls)) node.appendChild($(`<span class="lock"></span>`));
        node.addEventListener('click', () => {
          audio.play('click');
          this.invSel = { item: it, owner: null };
          it.isNew = false;
          render();
        });
        node.addEventListener('dblclick', () => {
          const tgt = this.invFocus && canEquip(it, this.invFocus.cls) ? this.invFocus : up?.c;
          if (tgt) {
            g.equip(tgt, it);
            audio.play('open');
            this.invSel = null;
            render();
          }
        });
        grid.appendChild(node);
      }

      const det = el.querySelector('.detail')!;
      det.innerHTML = '';
      if (!this.invSel) {
        det.appendChild($(`<div class="emptyhint">Select an item to see what it does.<br><br>▲ marks an upgrade for someone.<br>Double-click to equip instantly.</div>`));
        return;
      }
      const { item: it, owner } = this.invSel;
      const d = $(`<div>
        <div class="dn" style="color:${RARITY_COLORS[it.rarity]}">${esc(it.name)}</div>
        <div class="dt">${RARITY_NAMES[it.rarity]} ${itemTypeLabel(it)}${owner ? ` · equipped by ${esc(owner.name)}` : ''}</div>
        ${itemLines(it).map((l) => `<div class="ln">${l}</div>`).join('')}
        ${it.legendDesc ? `<div class="lg">★ ${esc(it.legendDesc)}</div>` : ''}
        ${it.flavor ? `<div class="fl">“${esc(it.flavor)}”</div>` : ''}
        <div class="who"></div><div class="acts"></div></div>`);
      const who = d.querySelector('.who')!;
      const acts = d.querySelector('.acts')!;
      if (owner) {
        const b = $(`<button class="btn small alt">Unequip</button>`);
        b.addEventListener('click', () => {
          if (g.bag.length >= BAG_SIZE) {
            audio.play('deny');
            this.toast('Bag is full!');
            return;
          }
          g.unequip(owner, it.slot);
          audio.play('click');
          this.invSel = null;
          render();
        });
        acts.appendChild(b);
      } else {
        who.appendChild($(`<div class="dt">Equip on:</div>`));
        for (const c of living) {
          const ok = canEquip(it, c.cls);
          const cur = c.equip[it.slot];
          const dpct = ok ? deltaPower(c, it) : 0;
          const detail = ok ? statDeltaText(c, it) : `<span class="neg">${CLASSES[it.cls!].name} only</span>`;
          const row = $(`<div class="cmp"><img src="${capyPortrait(c.cls, c.fur, 56, true)}"><div style="flex:1">${esc(c.name)}
            <div style="font-size:11.5px;color:var(--muted)">${cur ? `replaces <span style="color:${RARITY_COLORS[cur.rarity]}">${esc(cur.name)}</span>` : 'empty slot'}</div>
            <div style="font-size:12px">${detail}</div></div>
            ${ok ? `<span class="delta ${dpct >= 0 ? 'pos' : 'neg'}">${dpct >= 0 ? '▲' : '▼'}${Math.abs(Math.round(dpct * 100))}%</span>` : ''}
            <button class="btn small" ${ok ? '' : 'disabled'}>Equip</button></div>`);
          row.querySelector('button')!.addEventListener('click', () => {
            g.equip(c, it);
            audio.play('open');
            this.invFocus = c;
            this.invSel = null;
            render();
          });
          who.appendChild(row);
        }
        const sv = $(`<button class="btn small alt">Salvage (+XP)</button>`);
        sv.addEventListener('click', () => {
          g.salvage(it);
          audio.play('break');
          this.invSel = null;
          render();
        });
        acts.appendChild(sv);
      }
      det.appendChild(d);
    };
    render();
    this.openModal('inv', el, (e) => {
      if (e.key === 'Escape' || e.key === 'i' || e.key === 'I' || e.key === 'Tab') {
        e.preventDefault();
        close();
      }
    }, true, close);
  }

  // ------------------------------------------------------------ perks
  openPerk(c: Capy, choices: PerkDef[], onPick: (p: PerkDef) => void) {
    const el = $(`<div class="modal panel"><div class="perkhead"><img src="${capyPortrait(c.cls, c.fur)}"><div><h2 style="margin:0">${esc(c.name)} reached level ${c.level}!</h2>
      <div class="tagline">Choose a talent</div></div></div><div class="perks"></div></div>`);
    const row = el.querySelector('.perks')!;
    const pick = (p: PerkDef) => {
      audio.play('perk');
      this.closeModal();
      onPick(p);
    };
    choices.forEach((p, i) => {
      const card = $(`<div class="perk"><img src="${iconURL(p.icon)}"><div class="pk">${esc(p.name)}</div><div class="pd">${esc(p.desc)}</div><div class="num"><span class="kbd">${i + 1}</span></div></div>`);
      card.addEventListener('click', () => pick(p));
      row.appendChild(card);
    });
    this.openModal('perk', el, (e) => {
      const i = ['1', '2', '3'].indexOf(e.key);
      if (i >= 0 && choices[i]) pick(choices[i]);
    });
  }

  // ------------------------------------------------------------ death
  showDeath(g: GameAPI, st: RunStats, depth: number, record: boolean, onNew: () => void, onMenu: () => void) {
    const fallen = st.fallen;
    const loot = [...st.notable].sort((a, b) => b.rarity - a.rarity).slice(0, 6);
    const levels = st.levels;
    const el = $(`<div class="modal panel death" style="width:min(820px,96vw)"><h2>Your Party Has Fallen</h2>
      <div class="tagline">The dungeon claims another cuddle of capybaras.</div>
      <div class="sum">
        <div class="st"><div class="v">${depth}</div><div class="k">Depth reached</div></div>
        <div class="st"><div class="v">${st.kills}</div><div class="k">Enemies slain</div></div>
        <div class="st"><div class="v">${st.bosses}</div><div class="k">Bosses slain</div></div>
        <div class="st"><div class="v">${fmtTime(st.time)}</div><div class="k">Survived</div></div>
        <div class="st"><div class="v">${st.recruited}</div><div class="k">Capybaras recruited</div></div>
        <div class="st"><div class="v">${levels}</div><div class="k">Levels gained</div></div>
        <div class="st"><div class="v">${st.itemsFound}</div><div class="k">Items found</div></div>
        <div class="st"><div class="v">${st.chests}</div><div class="k">Chests opened</div></div>
      </div>
      ${record ? `<div class="record">★ New deepest delve! ★</div>` : ''}
      <div class="section-t">In memoriam</div>
      <div class="fallen">${fallen
        .map((f) => `<div class="fc"><img src="${capyPortrait(f.cls, f.fur)}"><div class="fn">${esc(f.name)}</div><div class="fs">Lv ${f.level} ${CLASSES[f.cls].name}<br>${f.kills} kills · fell on depth ${f.depth}</div></div>`)
        .join('')}</div>
      ${loot.length ? `<div class="section-t">Notable loot</div><div class="loot">${loot.map((it) => `<div class="li"><img src="${iconURL(it.icon)}"><span style="color:${RARITY_COLORS[it.rarity]}">${esc(it.name)}</span></div>`).join('')}</div>` : ''}
      <div class="acts"><button class="btn big again">NEW RUN</button><button class="btn alt menu">Main Menu</button></div>
      <div class="title-controls" style="margin-top:8px"><span class="kbd">Enter</span> new run</div></div>`);
    void g;
    el.querySelector('.again')!.addEventListener('click', () => {
      audio.play('open');
      this.closeModal();
      onNew();
    });
    el.querySelector('.menu')!.addEventListener('click', () => {
      audio.play('click');
      this.closeModal();
      onMenu();
    });
    this.openModal('death', el, (e) => {
      if (e.key === 'Enter') {
        this.closeModal();
        onNew();
      }
    });
  }
}

let crownCache = '';
function crownURL() {
  if (!crownCache) {
    const c = document.createElement('canvas');
    c.width = 44;
    c.height = 32;
    const g = c.getContext('2d')!;
    g.scale(2.75, 2.75);
    g.beginPath();
    g.moveTo(1, 11);
    g.lineTo(1, 3);
    g.lineTo(5, 6.5);
    g.lineTo(8, 1);
    g.lineTo(11, 6.5);
    g.lineTo(15, 3);
    g.lineTo(15, 11);
    g.closePath();
    const gr = g.createLinearGradient(0, 1, 0, 11);
    gr.addColorStop(0, '#fff0a0');
    gr.addColorStop(1, '#e0a020');
    g.fillStyle = gr;
    g.fill();
    g.lineWidth = 1;
    g.strokeStyle = '#26160e';
    g.stroke();
    crownCache = c.toDataURL();
  }
  return crownCache;
}

export function withItem(c: Capy, it: Item) {
  const equip = { ...c.equip, [it.slot]: it };
  return computeStats({ cls: c.cls, level: c.level, perks: c.perks, equip });
}

export function deltaPower(c: Capy, it: Item): number {
  const a = powerScore(c.cls, c.stats);
  const b = powerScore(c.cls, withItem(c, it));
  return (b - a) / Math.max(1, a);
}

function statDeltaText(c: Capy, it: Item): string {
  const a = c.stats,
    b = withItem(c, it);
  const parts: string[] = [];
  const add = (label: string, x: number, y: number, digits = 0) => {
    const d = y - x;
    if (Math.abs(d) < (digits ? 0.05 : 0.5)) return;
    parts.push(`<span class="${d > 0 ? 'pos' : 'neg'}">${label} ${d > 0 ? '+' : ''}${d.toFixed(digits)}</span>`);
  };
  add('DPS', dpsEstimate(c.cls, a), dpsEstimate(c.cls, b));
  add('HP', a.maxHp, b.maxHp);
  add('Armour', a.armor, b.armor);
  add('Regen', a.regen, b.regen, 1);
  return parts.join(' · ') || '<span style="color:var(--muted)">no stat change</span>';
}

export function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen();
    else void document.exitFullscreen();
  } catch {
    /* ignore */
  }
}

export function ehpOf(c: Capy) {
  return ehp(c.stats);
}

export const UI = new UIManager();
