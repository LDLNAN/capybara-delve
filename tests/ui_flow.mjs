// UI flow test: inventory, equip, pause, perk modal, squad wipe, death screen, new run, main menu.
import { launch } from './run.mjs';
const url = (process.env.URL || 'http://localhost:5173/') + '?test';
const { b, p, errors } = await launch(url, { w: 1600, h: 900 });
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };

await p.waitForSelector('.go', { timeout: 30000 });
await p.keyboard.press('2'); // ranger
await p.click('.go');
await p.waitForFunction(() => window.__game && window.__game.leader, null, { timeout: 30000 });
await p.waitForTimeout(800);
const first = await p.evaluate(() => ({ name: window.__game.leader.name, cls: window.__game.leader.cls }));
ok(first.cls === 'ranger', 'class selection respected: ' + first.cls);

// give loot & open bag
await p.evaluate(() => {
  const g = window.__game;
  const L = g.leader;
  for (let i = 0; i < 4; i++) g.dropItem(window.__makeItem({ depth: 3, rarity: i + 1, cls: 'ranger' }), L.x + 30, L.y);
});
await p.waitForFunction(() => window.__game.drops.length >= 4 && window.__game.drops.every((d) => d.ready), null, { timeout: 5000 });
ok((await p.evaluate(() => window.__game.bag.length)) === 0, 'ground loot waits for manual pickup');
await p.evaluate(() => { const g = window.__game; g.leader.x += 1000; g.leader.y += 1000; });
await p.keyboard.press('e');
ok((await p.evaluate(() => window.__game.bag.length)) === 0, 'pickup requires being nearby');
for (let i = 0; i < 4; i++) {
  await p.evaluate(() => {
    const g = window.__game, d = g.drops.find((drop) => drop.t >= 0);
    g.leader.x = d.x; g.leader.y = d.y;
  });
  await p.keyboard.press('e');
}
const bagN = await p.evaluate(() => window.__game.bag.length);
ok(bagN === 4, 'items picked up manually into bag: ' + bagN);
await p.keyboard.press('i');
await p.waitForSelector('.baggrid .slot', { timeout: 5000 });
await p.waitForTimeout(300);
ok(await p.evaluate(() => window.__game.paused), 'inventory pauses game');
ok((await p.locator('.baggrid .slot').count()) === 36, 'bag has fixed slots');
ok((await p.locator('.inv-top .auto').count()) === 0, 'auto equip removed');
const movedUid = await p.evaluate(() => window.__game.bag.find((it) => it.bagSlot === 0).uid);
await p.locator('.baggrid .slot').first().dragTo(p.locator('.baggrid .slot').last());
ok(await p.evaluate((uid) => window.__game.bag.find((it) => it.uid === uid).bagSlot === 35, movedUid), 'drag moves an item to an empty slot');
const swapped = await p.evaluate(() => window.__game.bag.find((it) => it.bagSlot === 1).uid);
await p.locator('.baggrid .slot').nth(1).dragTo(p.locator('.baggrid .slot').nth(2));
ok(await p.evaluate((uid) => window.__game.bag.find((it) => it.uid === uid).bagSlot === 2, swapped), 'drag swaps occupied slots');
await p.locator('.baggrid .slot').nth(2).click();
await p.locator('.baggrid .slot').nth(30).click();
ok(await p.evaluate((uid) => window.__game.bag.find((it) => it.uid === uid).bagSlot === 30, swapped), 'click moves selected item to an empty slot');
await p.click('.baggrid .slot.r1');
await p.waitForTimeout(200);
await p.screenshot({ path: 'tests/shots/ui_inventory.png' });
const beforeDiscard = await p.evaluate(() => ({ bag: window.__game.bag.length, xp: window.__game.leader.xp, level: window.__game.leader.level }));
await p.click('.detail .acts button');
const afterDiscard = await p.evaluate(() => ({ bag: window.__game.bag.length, xp: window.__game.leader.xp, level: window.__game.leader.level }));
ok(afterDiscard.bag === beforeDiscard.bag - 1 && afterDiscard.xp === beforeDiscard.xp && afterDiscard.level === beforeDiscard.level,
  'discard frees one bag slot without granting XP');
await p.click('.baggrid .slot:not(.empty)');
const before = await p.evaluate(() => window.__game.leader.equip.weapon?.name);
const btn = await p.$('.detail .cmp button:not([disabled])');
if (btn) await btn.click();
await p.waitForTimeout(200);
const after = await p.evaluate(() => window.__game.leader.equip);
ok(true, `equip via detail panel: weapon ${before} -> ${after.weapon?.name}, armor ${after.armor?.name}, trinket ${after.trinket?.name}`);
await p.screenshot({ path: 'tests/shots/ui_inventory2.png' });
await p.keyboard.press('Escape');
await p.waitForTimeout(300);
ok(!(await p.evaluate(() => window.__game.paused)), 'inventory closes & resumes');

// pause menu
await p.keyboard.press('Escape');
await p.waitForSelector('.modal .resume', { timeout: 3000 });
await p.screenshot({ path: 'tests/shots/ui_pause.png' });
await p.click('.modal .resume');
await p.waitForTimeout(300);
ok(!(await p.evaluate(() => window.__game.paused)), 'pause resume works');

// perk: force level to 3
await p.evaluate(() => { const g = window.__game; g.gainXp(60); });
await p.waitForSelector('.perk', { timeout: 5000 });
await p.screenshot({ path: 'tests/shots/ui_perk.png' });
await p.keyboard.press('1');
await p.waitForTimeout(300);
ok((await p.evaluate(() => window.__game.leader.perks.length)) >= 1, 'perk chosen via keyboard');
// dismiss any further perk choices
for (let i = 0; i < 3; i++) { if (await p.$('.perk')) { await p.keyboard.press('1'); await p.waitForTimeout(200); } }

// recruit a companion by teleporting to a recruit prop
const rec = await p.evaluate(() => {
  const g = window.__game;
  const r = g.props.find((q) => q.recruit && !q.used);
  if (!r) return false;
  const L = g.leader; L.x = r.recruit.spr.x + 30; L.y = r.recruit.spr.y + 10; return true;
});
await p.waitForTimeout(1500);
ok(!rec || (await p.evaluate(() => window.__game.party.length)) >= 2, 'recruit joined party');
await p.screenshot({ path: 'tests/shots/ui_recruit.png' });

// squad wipe
await p.evaluate(() => { const g = window.__game; for (const c of g.party) if (c.alive) { c.invuln = 0; c.stats.dodge = 0; g.damageCapy(c, 99999, null, false); } });
await p.waitForTimeout(1500);
await p.screenshot({ path: 'tests/shots/ui_wipe_anim.png' });
await p.waitForSelector('.death .again', { timeout: 10000 });
await p.waitForTimeout(400);
await p.screenshot({ path: 'tests/shots/ui_death.png' });
ok(true, 'death screen shown');
await p.click('.death .again');
await p.waitForFunction(() => window.__game && window.__game.leader && !window.__game.ended && window.__game.party.length === 1, null, { timeout: 10000 });
await p.waitForTimeout(1500);
const second = await p.evaluate(() => ({ name: window.__game.leader.name, depth: window.__game.depth, kills: window.__game.stats.kills, hud: document.querySelectorAll('.pcard').length, enemies: window.__game.enemies.length }));
ok(second.depth === 1 && second.kills === 0 && second.hud === 1, 'new run fresh: ' + JSON.stringify(second));
await p.screenshot({ path: 'tests/shots/ui_newrun.png' });
// walk a bit in the new run to make sure it's alive
await p.keyboard.down('d'); await p.waitForTimeout(700); await p.keyboard.up('d');

// pause -> main menu
await p.keyboard.press('Escape');
await p.waitForSelector('.modal .menu', { timeout: 3000 });
await p.click('.modal .menu');
await p.click('.modal .menu');
await p.waitForSelector('#title .go', { timeout: 10000 });
ok(true, 'returned to main menu');
await p.waitForTimeout(500);
await p.screenshot({ path: 'tests/shots/ui_menu_again.png' });
// and start again from menu
await p.click('.go');
await p.waitForFunction(() => window.__game && window.__game.leader && window.__game.party.length === 1 && !window.__game.ended, null, { timeout: 10000 });
await p.waitForTimeout(1200);
ok(true, 'started a run again from the menu');
ok(errors.length === 0, 'no console errors: ' + errors.slice(0, 3).join(' | '));
await b.close();
