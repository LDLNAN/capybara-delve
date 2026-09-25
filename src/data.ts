// Data-driven definitions: classes, enemies, bosses, perks, names, biomes.
import { rng } from './rng';

export type ClassId = 'vanguard' | 'ranger' | 'ember' | 'herbalist' | 'storm';
export const CLASS_IDS: ClassId[] = ['vanguard', 'ranger', 'ember', 'herbalist', 'storm'];

export interface Stats {
  maxHp: number;
  damage: number;
  attackSpeed: number; // attacks per second
  range: number;
  armor: number;
  crit: number; // 0..1
  critMult: number;
  regen: number; // hp per second
  moveSpeed: number;
  projectiles: number; // extra projectiles
  pierce: number;
  bounce: number;
  projSpeed: number;
  lifesteal: number; // fraction
  burn: number; // burn dps fraction of hit
  chill: number; // slow strength 0..1
  healPower: number; // multiplier
  aoe: number; // radius for splash / arc
  thorns: number;
  xpGain: number;
  dodge: number;
}

export function emptyStats(): Stats {
  return {
    maxHp: 0, damage: 0, attackSpeed: 0, range: 0, armor: 0, crit: 0, critMult: 0, regen: 0,
    moveSpeed: 0, projectiles: 0, pierce: 0, bounce: 0, projSpeed: 0, lifesteal: 0, burn: 0,
    chill: 0, healPower: 0, aoe: 0, thorns: 0, xpGain: 0, dodge: 0,
  };
}

export type AttackKind = 'cleave' | 'arrow' | 'fireball' | 'seed' | 'zap';

export interface ClassDef {
  id: ClassId;
  name: string;
  weaponWord: string;
  color: string;
  attack: AttackKind;
  role: 'melee' | 'ranged';
  desc: string;
  base: Stats;
  keepDist: number; // preferred distance from targets
}

const S = (o: Partial<Stats>): Stats => ({ ...emptyStats(), critMult: 1.75, healPower: 1, xpGain: 1, ...o });

export const CLASSES: Record<ClassId, ClassDef> = {
  vanguard: {
    id: 'vanguard', name: 'Vanguard', weaponWord: 'Blade', color: '#e0b25a', attack: 'cleave', role: 'melee',
    desc: 'Sturdy shield-bearer. Cleaves everything nearby and draws monsters away from friends.',
    base: S({ maxHp: 130, damage: 13, attackSpeed: 1.15, range: 84, armor: 4, crit: 0.05, moveSpeed: 205, aoe: 1 }),
    keepDist: 40,
  },
  ranger: {
    id: 'ranger', name: 'Ranger', weaponWord: 'Bow', color: '#8fcf6a', attack: 'arrow', role: 'ranged',
    desc: 'Rapid-fire archer with enormous range. Fragile, so keep them behind the tank.',
    base: S({ maxHp: 72, damage: 8, attackSpeed: 2.1, range: 440, armor: 1, crit: 0.08, moveSpeed: 210, projSpeed: 760 }),
    keepDist: 230,
  },
  ember: {
    id: 'ember', name: 'Embermancer', weaponWord: 'Staff', color: '#ff7a3d', attack: 'fireball', role: 'ranged',
    desc: 'Hurls slow, gorgeous fireballs that explode and set crowds ablaze.',
    base: S({ maxHp: 66, damage: 19, attackSpeed: 0.8, range: 380, armor: 0, crit: 0.05, moveSpeed: 200, projSpeed: 400, aoe: 78, burn: 0.15 }),
    keepDist: 210,
  },
  herbalist: {
    id: 'herbalist', name: 'Herbalist', weaponWord: 'Sprig', color: '#ffb347', attack: 'seed', role: 'ranged',
    desc: 'Wears an orange with great dignity. Periodically heals the whole party.',
    base: S({ maxHp: 84, damage: 6, attackSpeed: 1.3, range: 320, armor: 1, crit: 0.05, moveSpeed: 205, projSpeed: 560, regen: 0.5 }),
    keepDist: 190,
  },
  storm: {
    id: 'storm', name: 'Stormrunner', weaponWord: 'Daggers', color: '#6ec6ff', attack: 'zap', role: 'melee',
    desc: 'Hyperactive and crackling. Darts in close, zapping foes with chaining lightning.',
    base: S({ maxHp: 88, damage: 7, attackSpeed: 2.9, range: 175, armor: 1, crit: 0.18, critMult: 2, moveSpeed: 235, bounce: 1 }),
    keepDist: 110,
  },
};

export const CLASS_INTROS: Record<ClassId, string[]> = {
  vanguard: [
    'Has never once lost a staring contest.',
    'Polishes their shield with river water every morning.',
    'Claims the helmet is "mostly for style".',
    'Stands in front. Always. It is simply what they do.',
  ],
  ranger: [
    'Can hit a blueberry from across a lake.',
    'Keeps their arrows in a quiver made of reeds.',
    'Quiet, observant, slightly damp.',
    'Once shot an apple off a sleeping crocodile.',
  ],
  ember: [
    'Smells faintly of toasted marshmallows.',
    'The hat is load-bearing. Do not ask about the hat.',
    'Accidentally invented the hot spring. Twice.',
    'Studied pyromancy at a very small, very flammable academy.',
  ],
  herbalist: [
    'Smells faintly of oranges.',
    'Has balanced this orange on their head for eleven years.',
    'Believes most problems can be fixed with a warm bath.',
    'Talks to plants. Some of them talk back.',
  ],
  storm: [
    'Has had fourteen coffees. Capybaras should not drink coffee.',
    'Static cling is a lifestyle.',
    'Ran here. From very far away. For fun.',
    'Their whiskers crackle when they are excited, which is always.',
  ],
};

export const NAMES = [
  'Beans', 'Rupert', 'Clementine', 'Moss', 'Gerald', 'Biscuit', 'Pebble', 'Marmalade', 'Douglas', 'Fern',
  'Waffles', 'Juniper', 'Barnaby', 'Tofu', 'Nutmeg', 'Horace', 'Pickles', 'Olive', 'Cornelius', 'Dumpling',
  'Maple', 'Humphrey', 'Truffle', 'Basil', 'Mabel', 'Reginald', 'Sprout', 'Wilbur', 'Clover', 'Percival',
  'Noodle', 'Hazel', 'Bartholomew', 'Crumpet', 'Yuzu', 'Ferdinand', 'Pudding', 'Mochi', 'Winifred', 'Thistle',
  'Custard', 'Ambrose', 'Radish', 'Gertrude', 'Toffee', 'Rosemary', 'Chestnut', 'Archibald', 'Kumquat', 'Bramble',
  'Muffin', 'Seymour', 'Wasabi', 'Petunia', 'Gus', 'Lentil', 'Otis', 'Paprika', 'Dorothy', 'Porridge',
];

export function randomName(exclude: string[] = []): string {
  const pool = NAMES.filter((n) => !exclude.includes(n));
  return rng.pick(pool.length ? pool : NAMES);
}

// ---------------------------------------------------------------- enemies
export type EnemyKind = 'melee' | 'ranged' | 'flyer' | 'turret' | 'boss';
export type EnemyId = 'rat' | 'slime' | 'minislime' | 'bat' | 'skeleton' | 'archer' | 'shroom' | 'beetle';

export interface EnemyDef {
  id: EnemyId;
  name: string;
  hp: number;
  dmg: number;
  speed: number;
  radius: number;
  xp: number;
  kind: EnemyKind;
  reach: number;
  atkCd: number;
  windup: number;
  minDepth: number;
  weight: number;
  mass: number;
  projSpeed?: number;
  frames: number;
  animRate: number;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  rat: { id: 'rat', name: 'Dungeon Rat', hp: 14, dmg: 6, speed: 150, radius: 13, xp: 2, kind: 'melee', reach: 26, atkCd: 0.9, windup: 0.22, minDepth: 1, weight: 10, mass: 0.7, frames: 2, animRate: 10 },
  slime: { id: 'slime', name: 'Slime', hp: 42, dmg: 8, speed: 62, radius: 19, xp: 4, kind: 'melee', reach: 28, atkCd: 1.2, windup: 0.3, minDepth: 1, weight: 7, mass: 1.6, frames: 2, animRate: 3 },
  minislime: { id: 'minislime', name: 'Slimelet', hp: 12, dmg: 4, speed: 95, radius: 11, xp: 1, kind: 'melee', reach: 20, atkCd: 1, windup: 0.2, minDepth: 99, weight: 0, mass: 0.6, frames: 2, animRate: 5 },
  bat: { id: 'bat', name: 'Cave Bat', hp: 9, dmg: 4, speed: 185, radius: 12, xp: 2, kind: 'flyer', reach: 22, atkCd: 0.8, windup: 0.12, minDepth: 2, weight: 8, mass: 0.4, frames: 2, animRate: 14 },
  skeleton: { id: 'skeleton', name: 'Skeleton', hp: 38, dmg: 11, speed: 96, radius: 15, xp: 5, kind: 'melee', reach: 30, atkCd: 1.1, windup: 0.35, minDepth: 2, weight: 8, mass: 1.1, frames: 2, animRate: 6 },
  archer: { id: 'archer', name: 'Skeleton Archer', hp: 26, dmg: 9, speed: 85, radius: 15, xp: 6, kind: 'ranged', reach: 330, atkCd: 2.3, windup: 0.6, minDepth: 3, weight: 5, mass: 1, projSpeed: 330, frames: 2, animRate: 6 },
  shroom: { id: 'shroom', name: 'Grumpshroom', hp: 55, dmg: 7, speed: 0, radius: 18, xp: 6, kind: 'turret', reach: 400, atkCd: 3.0, windup: 0.5, minDepth: 3, weight: 4, mass: 99, projSpeed: 170, frames: 2, animRate: 2 },
  beetle: { id: 'beetle', name: 'Ironshell Beetle', hp: 90, dmg: 14, speed: 70, radius: 20, xp: 9, kind: 'melee', reach: 32, atkCd: 1.4, windup: 0.45, minDepth: 5, weight: 5, mass: 2.5, frames: 2, animRate: 5 },
};

export const ELITE_MODS = [
  { id: 'swift', name: 'Swift', color: 0x6ec6ff },
  { id: 'brutal', name: 'Brutal', color: 0xff5050 },
  { id: 'armored', name: 'Armored', color: 0xc0c8d8 },
  { id: 'vampiric', name: 'Vampiric', color: 0xd04070 },
  { id: 'volatile', name: 'Volatile', color: 0xffa030 },
  { id: 'frenzied', name: 'Frenzied', color: 0xffe040 },
] as const;
export type EliteModId = (typeof ELITE_MODS)[number]['id'];

export type BossId = 'ratking' | 'slimemonarch' | 'lich';
export interface BossDef {
  id: BossId;
  name: string;
  title: string;
  hp: number;
  dmg: number;
  speed: number;
  radius: number;
  xp: number;
  moves: string[];
}
export const BOSSES: Record<BossId, BossDef> = {
  ratking: { id: 'ratking', name: 'THE RAT KING', title: 'Gnawer of Cheese, Lord of Drains', hp: 1300, dmg: 16, speed: 115, radius: 40, xp: 120, moves: ['charge', 'summon', 'tailspin', 'charge'] },
  slimemonarch: { id: 'slimemonarch', name: 'GELATINOUS MONARCH', title: 'Wobbling Sovereign of the Deep', hp: 2600, dmg: 22, speed: 70, radius: 56, xp: 260, moves: ['leap', 'goo', 'leap', 'split'] },
  lich: { id: 'lich', name: 'BONE BARON', title: 'Collector of Unpaid Debts', hp: 3400, dmg: 24, speed: 90, radius: 38, xp: 420, moves: ['spiral', 'curse', 'summon', 'teleport', 'volley'] },
};
export const BOSS_ORDER: BossId[] = ['ratking', 'slimemonarch', 'lich'];

// ---------------------------------------------------------------- perks
export interface PerkDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  classes?: ClassId[];
  apply: (s: Stats, base: Stats) => void;
}

export const PERKS: PerkDef[] = [
  { id: 'teeth', name: 'Sharpened Teeth', desc: '+22% damage', icon: 'sword', apply: (s, b) => (s.damage += b.damage * 0.22) },
  { id: 'zoomies', name: 'The Zoomies', desc: '+20% attack speed', icon: 'bolt', apply: (s, b) => (s.attackSpeed += b.attackSpeed * 0.2) },
  { id: 'fur', name: 'Thick Winter Fur', desc: '+30% max health', icon: 'heart', apply: (s, b) => (s.maxHp += b.maxHp * 0.3) },
  { id: 'bark', name: 'Bark Skin', desc: '+5 armour', icon: 'shield', apply: (s) => (s.armor += 5) },
  { id: 'whiskers', name: 'Lucky Whiskers', desc: '+10% critical chance', icon: 'star', apply: (s) => (s.crit += 0.1) },
  { id: 'eye', name: 'Keen Eye', desc: '+60% critical damage', icon: 'eye', apply: (s) => (s.critMult += 0.6) },
  { id: 'spring', name: 'Hot Spring Soul', desc: '+2 health regenerated per second', icon: 'leaf', apply: (s) => (s.regen += 2) },
  { id: 'nibble', name: 'Vampiric Nibble', desc: 'Heal for 4% of damage dealt', icon: 'fang', apply: (s) => (s.lifesteal += 0.04) },
  { id: 'frost', name: 'Cold Nose', desc: 'Attacks chill enemies (slow 30%)', icon: 'snow', apply: (s) => (s.chill = Math.max(s.chill, 0.3)) },
  { id: 'kindle', name: 'Kindling', desc: 'Attacks set enemies on fire', icon: 'flame', apply: (s) => (s.burn += 0.25) },
  { id: 'split', name: 'Split Shot', desc: '+1 projectile', icon: 'arrow', classes: ['ranger', 'ember', 'herbalist'], apply: (s) => (s.projectiles += 1) },
  { id: 'pierce', name: 'Skewer', desc: 'Projectiles pierce +2 enemies', icon: 'arrow', classes: ['ranger', 'herbalist'], apply: (s) => (s.pierce += 2) },
  { id: 'ricochet', name: 'Ricochet', desc: '+1 bounce / chain', icon: 'bolt', classes: ['ranger', 'storm', 'herbalist'], apply: (s) => (s.bounce += 1) },
  { id: 'reach', name: 'Long Reach', desc: '+25% range', icon: 'eye', apply: (s, b) => (s.range += b.range * 0.25) },
  { id: 'wide', name: 'Mighty Swing', desc: '+35% cleave size, +10% damage', icon: 'sword', classes: ['vanguard'], apply: (s, b) => { s.range += b.range * 0.35; s.damage += b.damage * 0.1; } },
  { id: 'taunt', name: 'Stubborn Stance', desc: '+8 armour, reflect 30% melee damage', icon: 'shield', classes: ['vanguard'], apply: (s) => { s.armor += 8; s.thorns += 0.3; } },
  { id: 'inferno', name: 'Bigger Boom', desc: '+40% explosion radius', icon: 'flame', classes: ['ember'], apply: (s, b) => (s.aoe += b.aoe * 0.4) },
  { id: 'thumb', name: 'Green Thumb', desc: '+50% healing', icon: 'leaf', classes: ['herbalist'], apply: (s) => (s.healPower += 0.5) },
  { id: 'static', name: 'Static Cling', desc: '+2 chain lightning jumps', icon: 'bolt', classes: ['storm'], apply: (s) => (s.bounce += 2) },
  { id: 'boots', name: 'Tiny Boots', desc: '+12% move speed, +8% dodge', icon: 'boot', apply: (s, b) => { s.moveSpeed += b.moveSpeed * 0.12; s.dodge += 0.08; } },
];

// ---------------------------------------------------------------- biomes
export interface Biome {
  name: string;
  floor: [number, number, number];
  floorAlt: [number, number, number];
  wall: [number, number, number];
  wallTop: [number, number, number];
  moss: [number, number, number];
  ambient: number;
  accent: number;
  fog: number;
}

export const BIOMES: Biome[] = [
  { name: 'Mossy Cellars', floor: [74, 72, 78], floorAlt: [64, 66, 70], wall: [92, 84, 88], wallTop: [36, 32, 40], moss: [88, 128, 62], ambient: 0x4a4458, accent: 0xffb060, fog: 0x1a1620 },
  { name: 'Fungal Grotto', floor: [62, 66, 84], floorAlt: [54, 58, 76], wall: [78, 74, 104], wallTop: [30, 28, 46], moss: [70, 150, 150], ambient: 0x3e4468, accent: 0x7af0ff, fog: 0x141628 },
  { name: 'Bone Crypts', floor: [86, 80, 70], floorAlt: [76, 70, 62], wall: [110, 100, 86], wallTop: [40, 34, 30], moss: [120, 110, 70], ambient: 0x4c4450, accent: 0xb0ffb0, fog: 0x1a1614 },
  { name: 'Molten Deep', floor: [76, 58, 56], floorAlt: [66, 50, 50], wall: [100, 66, 58], wallTop: [38, 22, 22], moss: [170, 80, 40], ambient: 0x5a3a40, accent: 0xff6030, fog: 0x200e0e },
];

export function biomeIndex(depth: number): number {
  return Math.floor((depth - 1) / 3) % BIOMES.length;
}

export function isBossDepth(depth: number) {
  return depth % 3 === 0;
}

export function bossForDepth(depth: number): BossId {
  return BOSS_ORDER[(Math.floor(depth / 3) - 1) % BOSS_ORDER.length];
}

export const FLOOR_FLAVOR = [
  'The air smells of wet stone and cheese.',
  'Something skitters in the dark.',
  'Distant squeaking. Many squeaks.',
  'Glowing mushrooms hum a tune.',
  'The walls are sweating. Gross.',
  'Spores drift like snow.',
  'Old bones rattle politely.',
  'A cold draft whispers your name. Mispronounces it.',
  'Somewhere, a skeleton is practicing the trombone.',
  'The floor is warm. Too warm.',
  'The deep rumbles hungrily.',
  'Even the lava looks nervous.',
];
