const test = require('node:test');
const assert = require('node:assert/strict');
const { create, FLOOR } = require('../balls-engine');
const block = (x, y, hp = 1) => ({ x, y, w: 48, h: 48, hp, maxHp: hp, flash: 0 });
function runRound(game) { for (let i = 0; i < 2200 && game.state.phase === 'firing'; i++) game.step(1 / 60); }
test('a shot destroys a brick, awards points and moves to the next round', () => {
  const game = create(() => .4), s = game.state;
  s.blocks = [block(186, 180)]; s.pickups = []; s.ballCount = 1;
  assert.equal(game.shoot(), true); assert.equal(game.shoot(), false);
  runRound(game);
  assert.equal(s.score, 35); assert.equal(s.level, 2); assert.equal(s.phase, 'aiming');
  assert.equal(s.balls.length, 0); assert.equal(s.pending, 0);
});
test('multiple hits decrease durability without duplicate contact damage', () => {
  const game = create(() => .4), s = game.state;
  s.blocks = [block(186, 180, 3)]; s.pickups = []; s.ballCount = 1;
  game.shoot(); runRound(game);
  assert.equal(s.score, 10); assert.equal(s.blocks.find(b => b.y === 236).hp, 2);
});
test('collected pickups add balls only at the end of the round', () => {
  const game = create(() => .4), s = game.state;
  s.blocks = []; s.pickups = [{ x: 210, y: 350 }]; s.ballCount = 1;
  game.shoot(); for (let i = 0; i < 40; i++) game.step(1 / 60);
  assert.equal(s.gained, 1); assert.equal(s.ballCount, 1);
  runRound(game); assert.equal(s.ballCount, 2);
});
test('recall preserves the first landing point and advances exactly one row', () => {
  const game = create(() => .4), s = game.state;
  s.blocks = [block(14, 100, 5)]; game.shoot(); s.landingX = 88;
  assert.equal(game.recall(), true); assert.equal(game.recall(), false);
  assert.equal(s.launchX, 88); assert.equal(s.level, 2);
  assert.equal(s.blocks.find(b => b.hp === 5).y, 156);
});
test('bricks reaching the danger line end the game and prevent firing', () => {
  const game = create(() => .4), s = game.state;
  s.blocks = [block(14, FLOOR - 12 - 48 - 56)];
  game.shoot(); game.recall(); assert.equal(s.phase, 'over'); assert.equal(game.shoot(), false);
});
test('a wall bounce keeps balls in bounds and returns a shallow shot', () => {
  const game = create(() => .4), s = game.state;
  s.blocks = []; s.pickups = []; s.ballCount = 1;
  game.aim(0); game.shoot();
  for (let i = 0; i < 2200 && s.phase === 'firing'; i++) {
    game.step(1 / 60);
    for (const ball of s.balls) { assert.ok(ball.x >= 5 && ball.x <= 415); assert.ok(Number.isFinite(ball.y)); }
  }
  assert.equal(s.phase, 'aiming'); assert.equal(s.level, 2);
});
test('simulation gives the same collision result at different rendering frame rates', () => {
  function play(dt) { const game = create(() => .4); game.state.blocks = [block(186, 180, 20)]; game.state.pickups = []; game.shoot(); for (let i = 0; i < Math.round(4 / dt); i++) game.step(dt); return game.state; }
  const a = play(1 / 30), b = play(1 / 120);
  assert.equal(a.score, b.score); assert.equal(a.level, b.level); assert.equal(a.phase, b.phase);
});
test('several rounds remain finite and eventually reach a valid game over', () => {
  let seed = 42; const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const game = create(random);
  for (let i = 0; i < 60 && game.state.phase !== 'over'; i++) {
    game.aim(-Math.PI + .2 + random() * (Math.PI - .4)); game.shoot(); runRound(game);
    assert.ok(['aiming', 'over'].includes(game.state.phase));
    assert.ok(Number.isFinite(game.state.score)); assert.ok(game.state.blocks.every(b => b.hp > 0));
  }
  assert.equal(game.state.phase, 'over');
});
