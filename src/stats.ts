// Character model + stat computation.
import { CLASSES, ClassId, PERKS, Stats, emptyStats } from './data';
import { Item, Slot } from './items';

export interface CapyData {
  id: number;
  name: string;
  cls: ClassId;
  fur: number; // fur colour variant
  level: number;
  xp: number;
  hp: number;
  equip: Record<Slot, Item | null>;
  perks: string[];
  pendingPerks: number;
  alive: boolean;
  kills: number;
  intro: string;
  stats: Stats;
  legends: Set<string>;
  levelsGained: number;
}

export function xpToNext(level: number): number {
  return Math.round(10 + 9 * Math.pow(level - 1, 1.45) + level * 3);
}

export function computeStats(c: { cls: ClassId; level: number; perks: string[]; equip: Record<Slot, Item | null> }): Stats {
  const cb = CLASSES[c.cls].base;
  const L = c.level - 1;
  const base: Stats = { ...cb };
  base.maxHp = cb.maxHp * (1 + 0.1 * L);
  base.damage = cb.damage * (1 + 0.085 * L);
  base.attackSpeed = cb.attackSpeed * (1 + 0.012 * L);
  base.armor = cb.armor + 0.35 * L;
  base.regen = cb.regen + 0.05 * L;

  const add = emptyStats();
  const pct = emptyStats();
  for (const slot of ['weapon', 'armor', 'trinket'] as Slot[]) {
    const it = c.equip[slot];
    if (!it) continue;
    for (const m of it.mods) {
      if (m.pct) pct[m.stat] += m.value;
      else add[m.stat] += m.value;
    }
  }
  const s = emptyStats();
  for (const k of Object.keys(s) as (keyof Stats)[]) {
    s[k] = base[k] + add[k] + base[k] * pct[k];
  }
  // area size % applies to cleave range for melee classes too
  if (c.cls === 'vanguard') s.range += cb.range * pct.aoe;

  // weapon-flat damage gets boosted by pct damage too
  s.damage = (base.damage + add.damage) * (1 + pct.damage);

  for (const pid of c.perks) {
    const p = PERKS.find((x) => x.id === pid);
    if (p) p.apply(s, base);
  }
  s.crit = Math.min(s.crit, 0.9);
  s.dodge = Math.min(s.dodge, 0.5);
  s.chill = Math.min(s.chill, 0.6);
  s.moveSpeed = Math.min(s.moveSpeed, 360);
  return s;
}

export function dpsEstimate(cls: ClassId, s: Stats): number {
  const critF = 1 + s.crit * (s.critMult - 1);
  let hits = 1;
  if (cls === 'vanguard') hits = 2.2 * (s.range / 84);
  else if (cls === 'ember') hits = 2.2 * Math.pow(s.aoe / 78, 1.4);
  else if (cls === 'storm') hits = 1 + s.bounce * 0.7;
  else hits = 1 + s.pierce * 0.35 + s.bounce * 0.4;
  hits *= 1 + s.projectiles * 0.7;
  return s.damage * s.attackSpeed * critF * hits * (1 + s.burn * 0.8);
}

export function ehp(s: Stats): number {
  return s.maxHp * (1 + s.armor / 15) / (1 - s.dodge) + s.regen * 30;
}

// Single number used for auto-equip and upgrade arrows.
export function powerScore(cls: ClassId, s: Stats): number {
  let score = dpsEstimate(cls, s) * 3 + ehp(s) * 0.25 + s.lifesteal * 300 + s.chill * 40 + s.moveSpeed * 0.1;
  if (cls === 'herbalist') score += s.healPower * 60;
  return score;
}
