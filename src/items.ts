// Loot: item bases, affixes, legendaries, generation and descriptions.
import { CLASSES, ClassId, CLASS_IDS, Stats, emptyStats, PERKS } from './data';
import { rng } from './rng';

export type Slot = 'weapon' | 'armor' | 'trinket';
export const SLOTS: Slot[] = ['weapon', 'armor', 'trinket'];
export const SLOT_NAMES: Record<Slot, string> = { weapon: 'Weapon', armor: 'Armour', trinket: 'Charm' };

export const RARITY_NAMES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
export const RARITY_COLORS = ['#cfc8bc', '#6ddc5a', '#4fb0ff', '#c77dff', '#ffa93a'];
export const RARITY_HEX = [0xcfc8bc, 0x6ddc5a, 0x4fb0ff, 0xc77dff, 0xffa93a];

export interface Mod {
  stat: keyof Stats;
  value: number;
  pct: boolean;
}

export interface Item {
  uid: number;
  name: string;
  slot: Slot;
  rarity: number;
  cls?: ClassId;
  icon: string;
  ilvl: number;
  mods: Mod[];
  legend?: string;
  legendDesc?: string;
  flavor?: string;
  isNew?: boolean;
  bagSlot?: number;
}

let uidCounter = 1;

interface BaseDef {
  name: string;
  icon: string;
  slot: Slot;
  cls?: ClassId;
  minLvl: number;
  heavy?: number; // armour flavour: 0 light, 1 heavy, 2 robe
}

const BASES: BaseDef[] = [
  // vanguard
  { name: 'Twig Sword', icon: 'sword', slot: 'weapon', cls: 'vanguard', minLvl: 0 },
  { name: 'Rusty Shortsword', icon: 'sword', slot: 'weapon', cls: 'vanguard', minLvl: 1 },
  { name: 'Cheese Cleaver', icon: 'cleaver', slot: 'weapon', cls: 'vanguard', minLvl: 2 },
  { name: 'Bramble Mace', icon: 'mace', slot: 'weapon', cls: 'vanguard', minLvl: 3 },
  { name: 'Knightly Broadsword', icon: 'sword', slot: 'weapon', cls: 'vanguard', minLvl: 5 },
  { name: 'Pondkeeper Blade', icon: 'sword', slot: 'weapon', cls: 'vanguard', minLvl: 6 },
  { name: 'Riverstone Hammer', icon: 'mace', slot: 'weapon', cls: 'vanguard', minLvl: 7 },
  { name: 'Deepstone Maul', icon: 'mace', slot: 'weapon', cls: 'vanguard', minLvl: 10 },
  // ranger
  { name: 'Reed Bow', icon: 'bow', slot: 'weapon', cls: 'ranger', minLvl: 0 },
  { name: 'Mossy Longbow', icon: 'bow', slot: 'weapon', cls: 'ranger', minLvl: 2 },
  { name: "Hunter's Recurve", icon: 'bow', slot: 'weapon', cls: 'ranger', minLvl: 4 },
  { name: 'Willow Longbow', icon: 'bow', slot: 'weapon', cls: 'ranger', minLvl: 6 },
  { name: 'Elderwood Greatbow', icon: 'bow', slot: 'weapon', cls: 'ranger', minLvl: 7 },
  { name: 'Moonreed Bow', icon: 'bow', slot: 'weapon', cls: 'ranger', minLvl: 10 },
  // ember
  { name: 'Charred Twig', icon: 'staff', slot: 'weapon', cls: 'ember', minLvl: 0 },
  { name: 'Ember Staff', icon: 'staff', slot: 'weapon', cls: 'ember', minLvl: 2 },
  { name: 'Candlewick Wand', icon: 'staff', slot: 'weapon', cls: 'ember', minLvl: 4 },
  { name: 'Firefly Lantern', icon: 'staff', slot: 'weapon', cls: 'ember', minLvl: 6 },
  { name: 'Magma Scepter', icon: 'staff', slot: 'weapon', cls: 'ember', minLvl: 7 },
  { name: 'Cinderheart Staff', icon: 'staff', slot: 'weapon', cls: 'ember', minLvl: 10 },
  // herbalist
  { name: 'Garden Trowel', icon: 'sprig', slot: 'weapon', cls: 'herbalist', minLvl: 0 },
  { name: 'Leafy Sprig', icon: 'sprig', slot: 'weapon', cls: 'herbalist', minLvl: 2 },
  { name: 'Blooming Rod', icon: 'sprig', slot: 'weapon', cls: 'herbalist', minLvl: 4 },
  { name: 'Golden Marigold', icon: 'sprig', slot: 'weapon', cls: 'herbalist', minLvl: 6 },
  { name: 'Mandarin Scepter', icon: 'sprig', slot: 'weapon', cls: 'herbalist', minLvl: 7 },
  { name: 'Ancient Lotus', icon: 'sprig', slot: 'weapon', cls: 'herbalist', minLvl: 10 },
  // storm
  { name: 'Pointy Pebbles', icon: 'daggers', slot: 'weapon', cls: 'storm', minLvl: 0 },
  { name: 'Twin Daggers', icon: 'daggers', slot: 'weapon', cls: 'storm', minLvl: 2 },
  { name: 'Spark Knives', icon: 'daggers', slot: 'weapon', cls: 'storm', minLvl: 4 },
  { name: 'Rainflash Knives', icon: 'daggers', slot: 'weapon', cls: 'storm', minLvl: 6 },
  { name: 'Thunder Fangs', icon: 'daggers', slot: 'weapon', cls: 'storm', minLvl: 7 },
  { name: 'Stormglass Fangs', icon: 'daggers', slot: 'weapon', cls: 'storm', minLvl: 10 },
  // armour
  { name: 'Leaf Tunic', icon: 'tunic', slot: 'armor', minLvl: 0, heavy: 0 },
  { name: 'Padded Vest', icon: 'tunic', slot: 'armor', minLvl: 1, heavy: 0 },
  { name: 'Acorn Chainmail', icon: 'mail', slot: 'armor', minLvl: 2, heavy: 1 },
  { name: 'Apprentice Robe', icon: 'robe', slot: 'armor', minLvl: 1, heavy: 2 },
  { name: 'Bark Plate', icon: 'plate', slot: 'armor', minLvl: 4, heavy: 1 },
  { name: 'Starweave Robe', icon: 'robe', slot: 'armor', minLvl: 5, heavy: 2 },
  { name: 'Riverguard Coat', icon: 'tunic', slot: 'armor', minLvl: 6, heavy: 0 },
  { name: "Knight's Cuirass", icon: 'plate', slot: 'armor', minLvl: 7, heavy: 1 },
  { name: 'Deepwood Hauberk', icon: 'mail', slot: 'armor', minLvl: 9, heavy: 1 },
  { name: 'Moonmoss Robe', icon: 'robe', slot: 'armor', minLvl: 10, heavy: 2 },
  // charms
  { name: 'Lucky Pebble', icon: 'pebble', slot: 'trinket', minLvl: 0 },
  { name: 'River Charm', icon: 'amulet', slot: 'trinket', minLvl: 0 },
  { name: 'Tiny Bell', icon: 'bell', slot: 'trinket', minLvl: 1 },
  { name: 'Pressed Flower', icon: 'flower', slot: 'trinket', minLvl: 1 },
  { name: 'Snail Shell Amulet', icon: 'amulet', slot: 'trinket', minLvl: 3 },
  { name: 'Old Brass Button', icon: 'pebble', slot: 'trinket', minLvl: 4 },
  { name: 'Glowcap Brooch', icon: 'flower', slot: 'trinket', minLvl: 5 },
  { name: 'Riverglass Pendant', icon: 'amulet', slot: 'trinket', minLvl: 7 },
  { name: 'Little Silver Bell', icon: 'bell', slot: 'trinket', minLvl: 9 },
];

interface AffixDef {
  stat: keyof Stats;
  pct: boolean;
  min: number;
  max: number;
  per: number; // extra per ilvl
  slots: Slot[];
  classes?: ClassId[];
  prefix: string;
  suffix: string;
  minRarity?: number;
  weight: number;
  round?: boolean;
}

const RANGED: ClassId[] = ['ranger', 'ember', 'herbalist'];
const ALL: Slot[] = ['weapon', 'armor', 'trinket'];

const AFFIXES: AffixDef[] = [
  { stat: 'damage', pct: true, min: 0.08, max: 0.16, per: 0.012, slots: ['weapon', 'trinket'], prefix: 'Vicious', suffix: 'of Biting', weight: 10 },
  { stat: 'attackSpeed', pct: true, min: 0.06, max: 0.14, per: 0.008, slots: ALL, prefix: 'Swift', suffix: 'of Haste', weight: 9 },
  { stat: 'crit', pct: false, min: 0.03, max: 0.07, per: 0.003, slots: ALL, prefix: 'Lucky', suffix: 'of Precision', weight: 7 },
  { stat: 'critMult', pct: false, min: 0.15, max: 0.35, per: 0.02, slots: ['weapon', 'trinket'], prefix: 'Cruel', suffix: 'of Ruin', weight: 5 },
  { stat: 'maxHp', pct: false, min: 8, max: 16, per: 5, slots: ['armor', 'trinket'], prefix: 'Hearty', suffix: 'of the Bear', weight: 10, round: true },
  { stat: 'maxHp', pct: true, min: 0.08, max: 0.15, per: 0.008, slots: ['armor', 'trinket'], prefix: 'Robust', suffix: 'of Vigour', weight: 6 },
  { stat: 'armor', pct: false, min: 1, max: 3, per: 0.5, slots: ['armor', 'trinket'], prefix: 'Sturdy', suffix: 'of the Tortoise', weight: 8, round: true },
  { stat: 'regen', pct: false, min: 0.6, max: 1.2, per: 0.25, slots: ['armor', 'trinket'], prefix: 'Soothing', suffix: 'of the Hot Spring', weight: 6 },
  { stat: 'moveSpeed', pct: true, min: 0.05, max: 0.1, per: 0.003, slots: ['armor', 'trinket'], prefix: 'Fleet', suffix: 'of Zoomies', weight: 5 },
  { stat: 'lifesteal', pct: false, min: 0.02, max: 0.035, per: 0.001, slots: ['weapon', 'trinket'], prefix: 'Vampiric', suffix: 'of Nibbling', weight: 3, minRarity: 2 },
  { stat: 'burn', pct: false, min: 0.2, max: 0.35, per: 0.01, slots: ['weapon'], prefix: 'Blazing', suffix: 'of Embers', weight: 5 },
  { stat: 'chill', pct: false, min: 0.25, max: 0.35, per: 0, slots: ['weapon'], prefix: 'Frosty', suffix: 'of Winter', weight: 4 },
  { stat: 'thorns', pct: false, min: 0.2, max: 0.4, per: 0.01, slots: ['armor'], prefix: 'Prickly', suffix: 'of Brambles', weight: 4 },
  { stat: 'xpGain', pct: false, min: 0.1, max: 0.2, per: 0, slots: ['trinket', 'armor'], prefix: 'Wise', suffix: 'of Wisdom', weight: 3 },
  { stat: 'dodge', pct: false, min: 0.04, max: 0.08, per: 0, slots: ['armor', 'trinket'], prefix: 'Slippery', suffix: 'of Evasion', weight: 4 },
  { stat: 'range', pct: true, min: 0.1, max: 0.2, per: 0, slots: ['weapon'], prefix: 'Farsighted', suffix: 'of Reach', weight: 4 },
  { stat: 'projectiles', pct: false, min: 1, max: 1, per: 0, slots: ['weapon'], classes: RANGED, prefix: 'Twin', suffix: 'of Plenty', weight: 4, minRarity: 2, round: true },
  { stat: 'pierce', pct: false, min: 1, max: 2, per: 0, slots: ['weapon'], classes: ['ranger', 'herbalist'], prefix: 'Piercing', suffix: 'of Skewering', weight: 5, round: true },
  { stat: 'bounce', pct: false, min: 1, max: 2, per: 0, slots: ['weapon'], classes: ['ranger', 'storm', 'herbalist'], prefix: 'Ricocheting', suffix: 'of Bouncing', weight: 5, round: true },
  { stat: 'projSpeed', pct: true, min: 0.15, max: 0.3, per: 0, slots: ['weapon'], classes: RANGED, prefix: 'Streamlined', suffix: 'of Velocity', weight: 3 },
  { stat: 'aoe', pct: true, min: 0.15, max: 0.3, per: 0.01, slots: ['weapon'], classes: ['ember', 'vanguard'], prefix: 'Explosive', suffix: 'of Calamity', weight: 5 },
  { stat: 'healPower', pct: false, min: 0.2, max: 0.4, per: 0.02, slots: ['weapon', 'trinket', 'armor'], classes: ['herbalist'], prefix: 'Blooming', suffix: 'of Mending', weight: 6 },
];

interface LegendDef {
  id: string;
  name: string;
  slot: Slot;
  cls?: ClassId;
  icon: string;
  desc: string;
  flavor: string;
  mods: (ilvl: number) => Mod[];
}

export const LEGENDS: LegendDef[] = [
  {
    id: 'wetstick', name: 'The Wet Stick', slot: 'trinket', icon: 'stick',
    desc: 'Every 5th attack hurls a giant spinning branch through enemies.',
    flavor: 'It has been in the river. It has seen things.',
    mods: (l) => [{ stat: 'damage', pct: true, value: 0.15 + l * 0.01 }],
  },
  {
    id: 'yuzu', name: 'Yuzu of Serenity', slot: 'trinket', icon: 'yuzu',
    desc: 'Every 3 seconds, heal the whole party for 3% of their max health.',
    flavor: 'Balance it on your head. Achieve inner peace.',
    mods: (l) => [{ stat: 'regen', pct: false, value: 1 + l * 0.3 }],
  },
  {
    id: 'zoomboots', name: 'Boots of Endless Zoomies', slot: 'armor', icon: 'boots',
    desc: '+25% move speed. Leave a trail of fire while moving.',
    flavor: 'Four boots. Twice the zoom.',
    mods: (l) => [{ stat: 'moveSpeed', pct: true, value: 0.25 }, { stat: 'armor', pct: false, value: 2 + Math.round(l * 0.6) }],
  },
  {
    id: 'bubblebow', name: 'The Bubblebow', slot: 'weapon', cls: 'ranger', icon: 'bubblebow',
    desc: 'Arrows burst into 3 homing bubbles on hit.',
    flavor: 'Pop pop pop.',
    mods: (l) => [{ stat: 'damage', pct: false, value: Math.round(3 + l * 1.4) }, { stat: 'attackSpeed', pct: true, value: 0.12 }],
  },
  {
    id: 'bigorange', name: 'The Big Orange', slot: 'weapon', cls: 'ember', icon: 'bigorange',
    desc: 'Fireballs become enormous oranges. +60% explosion radius; explosions burst twice.',
    flavor: 'Vitamin C-4.',
    mods: (l) => [{ stat: 'damage', pct: false, value: Math.round(6 + l * 2.5) }, { stat: 'aoe', pct: true, value: 0.6 }],
  },
  {
    id: 'thunderwhisk', name: 'Thunderwhiskers', slot: 'weapon', cls: 'storm', icon: 'thunder',
    desc: 'Lightning chains to 4 additional enemies. Chains never lose damage.',
    flavor: 'Rubbed on a balloon for six hundred years.',
    mods: (l) => [{ stat: 'damage', pct: false, value: Math.round(2 + l * 1) }, { stat: 'bounce', pct: false, value: 4 }],
  },
  {
    id: 'potlid', name: 'Lid of the Great Pot', slot: 'weapon', cls: 'vanguard', icon: 'lid',
    desc: 'Cleaves send a shockwave rolling forward through enemies.',
    flavor: 'From the legendary soup that fed a thousand capybaras.',
    mods: (l) => [{ stat: 'damage', pct: false, value: Math.round(4 + l * 1.8) }, { stat: 'armor', pct: false, value: 4 }],
  },
  {
    id: 'everbloom', name: 'Everbloom Sprig', slot: 'weapon', cls: 'herbalist', icon: 'everbloom',
    desc: 'Healing pulses also blast nearby enemies for 300% of the heal.',
    flavor: 'Violently wholesome.',
    mods: (l) => [{ stat: 'healPower', pct: false, value: 0.3 }, { stat: 'damage', pct: false, value: Math.round(2 + l) }],
  },
  {
    id: 'lettuce', name: "Grandma's Lettuce", slot: 'trinket', icon: 'lettuce',
    desc: 'Kills have a 6% chance to drop a watermelon slice.',
    flavor: 'She always packs extra.',
    mods: (l) => [{ stat: 'maxHp', pct: true, value: 0.12 }],
  },
  {
    id: 'friendship', name: 'Friendship Bracelet', slot: 'trinket', icon: 'bracelet',
    desc: '+10% damage for each living party member.',
    flavor: 'Hand-woven from pond weed. Unbreakable bond.',
    mods: () => [{ stat: 'crit', pct: false, value: 0.05 }],
  },
  {
    id: 'tortoise', name: 'Shell of the Elder Tortoise', slot: 'armor', icon: 'shell',
    desc: 'Reflect 60% of melee damage. -10% move speed.',
    flavor: 'The tortoise wants it back, but slowly.',
    mods: (l) => [{ stat: 'armor', pct: false, value: 10 + Math.round(l * 0.8) }, { stat: 'thorns', pct: false, value: 0.6 }, { stat: 'moveSpeed', pct: true, value: -0.1 }, { stat: 'maxHp', pct: false, value: 20 + l * 6 }],
  },
];

const RARITY_MULT = [1, 1.18, 1.36, 1.58, 1.85];
const AFFIX_COUNT: [number, number][] = [[0, 0], [1, 1], [2, 2], [3, 3], [2, 3]];

export function rollRarity(depth: number, bonus = 0): number {
  const w = [
    Math.max(8, 62 - depth * 3 - bonus * 30),
    26 + depth * 0.6,
    9 + depth * 1.1 + bonus * 10,
    2.2 + depth * 0.55 + bonus * 5,
    0.5 + depth * 0.22 + bonus * 2.5,
  ];
  const idx = [0, 1, 2, 3, 4];
  return rng.weighted(idx, (i) => w[i]);
}

function rollAffixValue(a: AffixDef, ilvl: number, rarity: number): number {
  let v = rng.range(a.min, a.max) + a.per * ilvl;
  v *= 0.9 + rarity * 0.1;
  if (a.round) v = Math.max(1, Math.round(v));
  return v;
}

export function makeItem(opts: { depth: number; rarity?: number; slot?: Slot; cls?: ClassId; rarityBonus?: number }): Item {
  const ilvl = Math.max(0, opts.depth - 1 + rng.int(0, 1));
  const rarity = opts.rarity ?? rollRarity(opts.depth, opts.rarityBonus ?? 0);
  const slot: Slot = opts.slot ?? rng.weighted(SLOTS, (s) => (s === 'weapon' ? 4 : s === 'armor' ? 3 : 3));

  if (rarity === 4) {
    const pool = LEGENDS.filter((l) => l.slot === slot && (!opts.cls || !l.cls || l.cls === opts.cls));
    if (pool.length) {
      const L = rng.pick(pool);
      return {
        uid: uidCounter++, name: L.name, slot: L.slot, rarity: 4, cls: L.cls, icon: L.icon, ilvl,
        mods: [...baseMods(L.slot, L.cls, ilvl, 4, L.slot === 'armor' ? 1 : 0), ...L.mods(ilvl)],
        legend: L.id, legendDesc: L.desc, flavor: L.flavor, isNew: true,
      };
    }
  }

  let cls = opts.cls;
  if (slot === 'weapon' && !cls) cls = rng.pick(CLASS_IDS);
  const bases = BASES.filter((b) => b.slot === slot && (!b.cls || b.cls === cls) && b.minLvl <= ilvl + 1);
  const best = bases.filter((b) => b.minLvl >= Math.min(ilvl - 3, 4));
  const base = rng.pick(best.length ? best : bases);

  const mods = baseMods(slot, base.cls, ilvl, rarity, base.heavy ?? 0);
  const [cmin, cmax] = AFFIX_COUNT[Math.min(rarity, 3)];
  const count = rng.int(cmin, cmax);
  const pool = AFFIXES.filter(
    (a) => a.slots.includes(slot) && (!a.classes || (slot === 'weapon' && cls && a.classes.includes(cls)) || (slot !== 'weapon' && a.classes === undefined)) && (a.minRarity ?? 0) <= rarity,
  );
  const chosen: AffixDef[] = [];
  for (let i = 0; i < count; i++) {
    const available = pool.filter((a) => !chosen.some((c) => c.stat === a.stat));
    if (!available.length) break;
    const a = rng.weighted(available, (x) => x.weight);
    chosen.push(a);
    mods.push({ stat: a.stat, pct: a.pct, value: rollAffixValue(a, ilvl, rarity) });
  }

  let name = base.name;
  if (chosen.length === 1) name = rng.chance(0.5) ? `${chosen[0].prefix} ${base.name}` : `${base.name} ${chosen[0].suffix}`;
  else if (chosen.length >= 2) name = `${chosen[0].prefix} ${base.name} ${chosen[1].suffix}`;

  return { uid: uidCounter++, name, slot, rarity, cls: base.cls, icon: base.icon, ilvl, mods, isNew: true };
}

function baseMods(slot: Slot, cls: ClassId | undefined, ilvl: number, rarity: number, heavy: number): Mod[] {
  const m = RARITY_MULT[rarity] * rng.range(0.9, 1.1);
  if (slot === 'weapon' && cls) {
    const bd = CLASSES[cls].base.damage;
    return [{ stat: 'damage', pct: false, value: Math.max(1, Math.round(bd * (0.18 + ilvl * 0.13) * m)) }];
  }
  if (slot === 'armor') {
    if (heavy === 1) return [{ stat: 'armor', pct: false, value: Math.round((2 + ilvl * 0.8) * m) }, { stat: 'maxHp', pct: false, value: Math.round((8 + ilvl * 5) * m) }];
    if (heavy === 2) return [{ stat: 'maxHp', pct: false, value: Math.round((10 + ilvl * 6) * m) }, { stat: 'regen', pct: false, value: +(0.3 + ilvl * 0.12).toFixed(1) }];
    return [{ stat: 'armor', pct: false, value: Math.round((1 + ilvl * 0.45) * m) }, { stat: 'maxHp', pct: false, value: Math.round((12 + ilvl * 7) * m) }];
  }
  return [];
}

export function makeStarterWeapon(cls: ClassId, terrible = false): Item {
  const base = BASES.find((b) => b.cls === cls && b.minLvl === 0)!;
  const name = terrible ? ({ vanguard: 'Suspiciously Wet Twig', ranger: 'Bendy Reed Bow', ember: 'Soggy Matchstick', herbalist: 'Plastic Garden Trowel', storm: 'Two Sharp-ish Rocks' } as const)[cls] : base.name;
  return {
    uid: uidCounter++, name, slot: 'weapon', rarity: 0, cls, icon: base.icon, ilvl: 0,
    mods: [{ stat: 'damage', pct: false, value: Math.max(1, Math.round(CLASSES[cls].base.damage * (terrible ? 0.08 : 0.18))) }],
    flavor: terrible ? 'Technically a weapon.' : undefined,
  };
}

// ------------------------------------------------------------- descriptions
function fmt(n: number, digits = 0) {
  const r = +n.toFixed(digits);
  return r.toString();
}

export function modLine(m: Mod): string {
  const sign = m.value < 0 ? '−' : '+';
  const v = Math.abs(m.value);
  const P = (x: number) => `${fmt(x * 100)}%`;
  switch (m.stat) {
    case 'damage': return m.pct ? `${sign}${P(v)} Damage` : `${sign}${fmt(v)} Damage`;
    case 'attackSpeed': return `${sign}${P(v)} Attack Speed`;
    case 'crit': return `${sign}${P(v)} Critical Chance`;
    case 'critMult': return `${sign}${P(v)} Critical Damage`;
    case 'maxHp': return m.pct ? `${sign}${P(v)} Max Health` : `${sign}${fmt(v)} Max Health`;
    case 'armor': return `${sign}${fmt(v)} Armour`;
    case 'regen': return `${sign}${fmt(v, 1)} Health / sec`;
    case 'moveSpeed': return `${sign}${P(v)} Move Speed`;
    case 'lifesteal': return `Heal for ${fmt(v * 100, 1)}% of damage dealt`;
    case 'burn': return `Hits burn for ${P(v)} damage over time`;
    case 'chill': return `Hits chill enemies (slow ${P(v)})`;
    case 'thorns': return `Reflect ${P(v)} of melee damage`;
    case 'xpGain': return `${sign}${P(v)} Experience`;
    case 'dodge': return `${sign}${P(v)} Dodge Chance`;
    case 'range': return `${sign}${P(v)} Range`;
    case 'projectiles': return `${sign}${fmt(v)} Projectile${v > 1 ? 's' : ''}`;
    case 'pierce': return `Projectiles pierce ${fmt(v)} more enem${v > 1 ? 'ies' : 'y'}`;
    case 'bounce': return `${sign}${fmt(v)} Bounce / Chain`;
    case 'projSpeed': return `${sign}${P(v)} Projectile Speed`;
    case 'aoe': return `${sign}${P(v)} Area Size`;
    case 'healPower': return `${sign}${P(v)} Healing Power`;
    default: return `${m.stat} ${fmt(v, 2)}`;
  }
}

export function itemLines(it: Item): string[] {
  return it.mods.map(modLine);
}

export function canEquip(it: Item, cls: ClassId): boolean {
  return it.slot !== 'weapon' || !it.cls || it.cls === cls;
}

export function itemTypeLabel(it: Item): string {
  if (it.slot === 'weapon' && it.cls) return `${CLASSES[it.cls].name} ${CLASSES[it.cls].weaponWord}`;
  return SLOT_NAMES[it.slot];
}

export { PERKS, emptyStats };
