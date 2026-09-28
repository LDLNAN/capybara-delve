import Phaser from 'phaser';
import { BossDef, ClassId, EliteModId, EnemyDef, Stats } from '../data';
import { Item, Slot } from '../items';
import { CapyData } from '../stats';

export interface Capy extends CapyData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  spr: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  crown: Phaser.GameObjects.Image;
  cd: number;
  healCd: number;
  attackCount: number;
  hurtT: number;
  facing: number;
  walkT: number;
  blinkT: number;
  lunge: number;
  lungeAng: number;
  hop: number;
  poison: number;
  target: Enemy | null;
  retarget: number;
  stuckT: number;
  lastX: number;
  lastY: number;
  dashCd: number;
  dashT: number;
  yuzuT: number;
  trailT: number;
  deathT: number;
  invuln: number;
  texKey: string;
}

export interface Enemy {
  uid: number;
  def: EnemyDef | null;
  boss: BossDef | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  kx: number;
  ky: number;
  r: number;
  hp: number;
  maxHp: number;
  dmg: number;
  speed: number;
  mass: number;
  spr: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  aura: Phaser.GameObjects.Image | null;
  label: Phaser.GameObjects.Text | null;
  elite: EliteModId | null;
  eliteColor: number;
  state: 'idle' | 'chase' | 'windup' | 'recover' | 'move' | 'air' | 'charge' | 'stun' | 'intro' | 'hidden';
  t: number;
  atkCd: number;
  burnDps: number;
  burnT: number;
  chill: number;
  chillT: number;
  flash: number;
  awake: boolean;
  room: number;
  phase: number;
  target: Capy | null;
  losT: number;
  los: boolean;
  animT: number;
  baseScale: number;
  dead: boolean;
  spawnT: number;
  // boss bits
  move: number;
  moveName: string;
  sub: number;
  aimX: number;
  aimY: number;
  hitSet: Set<Capy> | null;
  enraged: boolean;
  xpMul: number;
  fromWave: boolean;
  hgt: number;
  lx: number;
  ly: number;
}

export type ProjKind = 'arrow' | 'fireball' | 'seed' | 'bone' | 'spore' | 'orb' | 'goo' | 'greenorb' | 'branch' | 'bubble' | 'shock' | 'orange';

export interface Proj {
  kind: ProjKind;
  spr: Phaser.GameObjects.Image;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  dmg: number;
  friendly: boolean;
  owner: Capy | null;
  pierce: number;
  bounce: number;
  hit: Set<Enemy>;
  life: number;
  aoe: number;
  crit: number;
  critMult: number;
  burn: number;
  chill: number;
  lifesteal: number;
  spin: number;
  homing: number;
  wall: boolean;
  tx: number;
  ty: number;
  dead: boolean;
  poison?: number;
}

export interface Gem {
  x: number;
  y: number;
  vx: number;
  vy: number;
  val: number;
  spr: Phaser.GameObjects.Image;
  t: number;
  pull: boolean;
  melon?: boolean;
}

export interface ItemDrop {
  item: Item;
  x: number;
  y: number;
  spr: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  beam: Phaser.GameObjects.Image | null;
  t: number;
  ready: boolean;
}

export type PropKind = 'chest' | 'chest_gold' | 'barrel' | 'crate' | 'pot' | 'cage' | 'campfire' | 'barrelcapy' | 'stairs' | 'spring' | 'portal' | 'torch';

export interface Prop {
  kind: PropKind;
  x: number;
  y: number;
  r: number;
  solid: boolean;
  spr: Phaser.GameObjects.Sprite;
  extra: Phaser.GameObjects.GameObject[];
  used: boolean;
  hp: number;
  recruit?: { cls: ClassId; name: string; fur: number; intro: string; spr: Phaser.GameObjects.Sprite };
  light?: { r: number; color: number; flicker: number };
  pool?: number;
  lootSlot?: Slot;
  lootClass?: ClassId;
  minRarity?: number;
}

export interface Telegraph {
  gfx: Phaser.GameObjects.Graphics;
  t: number;
  dur: number;
  draw: (g: Phaser.GameObjects.Graphics, k: number) => void;
  done: () => void;
}

export interface FloatText {
  txt: Phaser.GameObjects.Text;
  t: number;
  life: number;
  vy: number;
  active: boolean;
}

export interface RunStats {
  kills: number;
  bosses: number;
  recruited: number;
  levels: number;
  time: number;
  itemsFound: number;
  notable: Item[];
  fallen: { name: string; cls: ClassId; fur: number; level: number; depth: number; kills: number }[];
  chests: number;
}

export type EquipMap = Record<Slot, Item | null>;
export type { Stats };
