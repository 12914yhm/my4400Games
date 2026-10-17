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
  assert.equal(game.setDifficulty('low'), true);
  const cost = game.price('fullRepair');
  assert.ok(cost >= 40 && cost <= 200);
  assert.equal(game.purchase('fullRepair'), true);
  assert.equal(game.state.hp, game.state.maxHp);
  assert.equal(game.state.credits, 200 - cost);
  assert.equal(game.purchase('fullRepair'), false);
  assert.equal(game.snapshot().state.hp, game.state.maxHp);
  game.state.phase = 'playing'; game.state.hp = 1;
  assert.equal(game.purchase('fullRepair'), false);
  assert.equal(game.setDifficulty('high'), false);
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

test('new ships have larger matching hit areas and remain valid in cloud saves', () => {
  const game=Engine.create(() => .1);game.start();advance(game,1);
  const ship=game.state.enemies[0];
  assert.equal(ship.radius,Engine.TYPES[ship.type].radius*1.2);
  assert.equal(Save.clean(game.snapshot()).state.enemies[0].radius,ship.radius);
});

test('gunships enter the visible sea, hold a firing lane, and attack before reaching the base', () => {
  for (const type of ['patrol', 'armored', 'missile', 'battleship', 'tender']) {
    const game=Engine.create(()=>.5);game.start();game.state.spawnLeft=1;game.state.spawnTimer=999;
    const config=Engine.TYPES[type],enemy={...config,id:1,type,x:Engine.CX+config.range+30,y:Engine.CY,
      hp:1000,maxHp:1000,angle:Math.PI,cooldown:0,turn:1,age:0,flash:0,submerged:false,chill:0,barrier:0};
    game.state.enemies=[enemy];advance(game,10);
    assert.ok(Math.hypot(enemy.x-Engine.CX,enemy.y-Engine.CY)>config.range*.75,type+' approached the battery');
    assert.ok(game.state.hp<200,type+' did not fire from its lane');
    assert.equal(game.state.destroyed,0);
  }
  const game=Engine.create(()=>.5);game.start();game.state.spawnLeft=1;game.state.spawnTimer=999;
  const config=Engine.TYPES.missile,enemy={...config,id:1,type:'missile',x:Engine.CX,y:-Engine.VIEW_PAD_Y-35,
    hp:1000,maxHp:1000,angle:Math.PI/2,cooldown:0,turn:1,age:0,flash:0,submerged:false,chill:0,barrier:0};
  game.state.enemies=[enemy];advance(game,.02);assert.equal(game.state.hostile.length,0);
  advance(game,5);assert.ok(enemy.y>=-Engine.VIEW_PAD_Y+enemy.radius*Engine.SHIP_SCALE*.45);
  assert.ok(game.state.hostile.length>0||game.state.hp<200);
});

test('an old active save adopts current gunship ranges without moving ships or changing their damage', () => {
  const game=Engine.create(()=>.5);game.start();advance(game,1);
  const saved=game.snapshot(),before=saved.state.enemies[0];before.range=185;
  const restored=Engine.create();restored.restore(saved);
  const enemy=restored.state.enemies[0];
  assert.equal(enemy.range,Engine.TYPES[enemy.type].range);
  assert.equal(enemy.x,before.x);assert.equal(enemy.y,before.y);
  assert.equal(enemy.hp,before.hp);assert.equal(enemy.damage,before.damage);
});

test('the opening wave still gives time to react despite longer enemy firing ranges', () => {
  const game=Engine.create(()=>.5);game.start();
  let firstHit=-1;
  for(let frame=0;frame<120*13;frame++){
    game.step(1/120);
    if(game.state.hp<200){firstHit=frame/120;break;}
  }
  assert.ok(firstHit>=8&&firstHit<13,`first hit after ${firstHit}s`);
});
