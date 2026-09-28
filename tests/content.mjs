// Content regression: room distribution and gear rules in a running browser build.
import assert from 'node:assert/strict';
import { launch } from './run.mjs';

const url = process.env.URL || 'http://localhost:5173/?test';
const { b, p, errors } = await launch(url);
try {
  await p.waitForSelector('.go', { timeout: 30000 });
  await p.click('.go');
  await p.waitForFunction(() => window.__game?.leader, null, { timeout: 30000 });

  const result = await p.evaluate(async () => {
    const { generateDungeon } = await import('/src/dungeon.ts');
    const { RNG, reseed } = await import('/src/rng.ts');
    const { makeItem } = await import('/src/items.ts');
    const seen = { armory: 0, gauntlet: 0 };
    for (let seed = 1; seed <= 120; seed++) {
      for (const depth of [1, 2, 4, 7]) {
        const rooms = generateDungeon(depth, false, new RNG(seed * 100 + depth)).rooms;
        if (depth === 1 && rooms.some((room) => room.kind === 'armory' || room.kind === 'gauntlet')) throw Error('Special room on first floor');
        for (const room of rooms) if (room.kind in seen) seen[room.kind]++;
      }
    }
    reseed(12345);
    for (let i = 0; i < 200; i++) {
      const item = makeItem({ depth: 6, rarity: 3, slot: 'weapon', cls: 'ranger' });
      if (item.cls !== 'ranger') throw Error('Wrong weapon class');
      const affixes = item.mods.slice(1).map((mod) => mod.stat);
      if (new Set(affixes).size !== affixes.length) throw Error('Duplicate affix stat');
      const legendary = makeItem({ depth: 6, rarity: 4, slot: 'armor' });
      if (legendary.slot !== 'armor') throw Error('Wrong legendary slot');
    }
    const game = window.__game;
    let armory = null;
    let gauntlet = false;
    for (let i = 0; i < 40 && (!armory || !gauntlet); i++) {
      game.debugJump(4 + (i % 4));
      armory ??= game.props.find((prop) => prop.lootSlot === 'weapon');
      const room = game.dun.rooms.find((candidate) => candidate.kind === 'gauntlet');
      if (room) gauntlet = game.enemies.some((enemy) => enemy.room === room.id && enemy.elite);
      if (armory && gauntlet) break;
    }
    return { seen, armory: armory && { slot: armory.lootSlot, cls: armory.lootClass, rarity: armory.minRarity }, gauntlet };
  });
  assert.ok(result.seen.armory > 0 && result.seen.gauntlet > 0, 'new rooms appear in generated floors');
  assert.equal(result.armory?.slot, 'weapon');
  assert.ok(result.armory?.cls);
  assert.ok(result.armory?.rarity >= 2);
  assert.ok(result.gauntlet);
  const expected = await p.evaluate(() => {
    const game = window.__game;
    let chest;
    for (let i = 0; i < 30 && !chest; i++) {
      game.debugJump(4);
      chest = game.props.find((prop) => prop.lootSlot === 'weapon');
    }
    if (!chest) throw Error('No armory chest generated');
    game.openChest(chest);
    return { cls: chest.lootClass, rarity: chest.minRarity };
  });
  await p.waitForTimeout(500);
  const rewards = await p.evaluate(() => window.__game.drops.map((drop) => ({ slot: drop.item.slot, cls: drop.item.cls, rarity: drop.item.rarity })));
  assert.ok(rewards.length > 0 && rewards.every((item) => item.slot === 'weapon' && item.cls === expected.cls && item.rarity >= expected.rarity), 'armory chest drops targeted gear');
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('PASS content', result);
} finally {
  await b.close();
}
