import Phaser from 'phaser';
import { makeTilesets } from './tiles';
import { makeMonsterTextures } from './monsters';
import { makePropTextures, makeFxTextures } from './props';
import { makeIconTextures } from './icons';
import { ensureCapyTexture, makeGhostTexture } from './capy';
import { CLASS_IDS } from '../data';

export function generateAllTextures(scene: Phaser.Scene) {
  makeTilesets(scene);
  makeMonsterTextures(scene);
  makePropTextures(scene);
  makeFxTextures(scene);
  makeIconTextures(scene);
  makeGhostTexture(scene);
  for (const c of CLASS_IDS) ensureCapyTexture(scene, c, 0);
}
