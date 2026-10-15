const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../sea-engine');
const Save = require('../sea-save');

function advance(game, seconds) {
  for (let i = 0; i < seconds * 120; i++) game.step(1 / 120);
}

test('difficulty changes enemy strength and limits how many ships arrive together', () => {
  const modes = ['low', 'normal', 'high'].map(mode => {
    const game = Engine.create(() => .1);
    assert.equal(game.setDifficulty(mode), true);
    game.start();
    assert.equal(game.setDifficulty('high'), false);
    advance(game, 1);
    const first = { hp: game.state.enemies[0].hp, damage: game.state.enemies[0].damage };
    advance(game, 7);
    assert.ok(game.state.enemies.length <= Engine.DIFFICULTIES[mode].maxAlive);
    return { game, first };
  });
  assert.ok(modes[0].first.hp < modes[1].first.hp);
  assert.ok(modes[1].first.hp < modes[2].first.hp);
  assert.ok(modes[0].first.damage <= modes[1].first.damage);
  assert.ok(modes[1].first.damage <= modes[2].first.damage);
  assert.ok(modes[0].game.state.spawnLeft > modes[2].game.state.spawnLeft);
});

test('full repair is a priced between-wave service and keeps the rest of the save intact', () => {
  const game = Engine.create();
  game.start(); game.state.phase = 'shop'; game.state.hp = 42; game.state.credits = 200;
  const cost = game.price('fullRepair');
  assert.ok(cost >= 40 && cost <= 200);
  assert.equal(game.purchase('fullRepair'), true);
  assert.equal(game.state.hp, game.state.maxHp);
  assert.equal(game.state.credits, 200 - cost);
  assert.equal(game.purchase('fullRepair'), false);
  assert.equal(game.snapshot().state.hp, game.state.maxHp);
  game.state.phase = 'playing'; game.state.hp = 1;
  assert.equal(game.purchase('fullRepair'), false);
});

test('expanded camera allows aiming at visible outer sea and accepts old saves', () => {
  assert.equal(Engine.VIEW_W, Engine.W * 1.25);
  assert.equal(Engine.VIEW_H, Engine.H * 1.25);
  const game = Engine.create();
  game.setAim(-500, 900);
  assert.deepEqual(game.state.aim, {x:-120,y:675});
  const save = game.snapshot();
  assert.equal(Save.clean(save).state.difficulty, 'normal');
  delete save.state.difficulty;
  assert.equal(Save.clean(save).state.difficulty, 'normal');
  save.state.difficulty = 'impossible';
  assert.throws(() => Save.clean(save), /难度/);
});
