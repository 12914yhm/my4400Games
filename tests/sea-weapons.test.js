const test=require('node:test');
const assert=require('node:assert/strict');
const Engine=require('../sea-engine');
const Save=require('../sea-save');
const {WEAPONS,unlockWave}=require('../sea-weapons');
function advance(game,seconds){for(let i=0;i<seconds*120;i++)game.step(1/120);}

test('weapons unlock for the next wave during resupply, never before its boundary',()=>{
  const g=Engine.create();assert.equal(g.equip('secondary','twin'),false);assert.equal(g.equip('primary','spread'),false);
  g.start();g.state.spawnLeft=0;advance(g,.02);assert.equal(g.state.phase,'shop');
  assert.equal(unlockWave(g.state),2);assert.equal(g.equip('secondary','twin'),true);assert.equal(g.equip('primary','spread'),false);
  g.nextWave();assert.equal(g.state.loadout.secondary,'twin');g.state.phase='shop';
  assert.equal(g.equip('primary','spread'),true);assert.equal(g.equip('primary','howitzer'),false);
  g.state.wave=4;assert.equal(g.equip('secondary','rapid'),true);assert.equal(g.equip('primary','howitzer'),false);
  g.state.wave=5;assert.equal(g.equip('primary','howitzer'),true);
  assert.equal(g.equip('secondary','howitzer'),false);assert.equal(g.equip('unknown','cannon'),false);
});
test('all six weapons have real shot patterns, damage, speed and resource costs',()=>{
  for(const [slot,weapons] of Object.entries(WEAPONS))for(const weapon of weapons){
    const g=Engine.create();g.state.wave=weapon.wave;
    if(weapon.wave>1)assert.equal(g.equip(slot,weapon.id),true);
    g.start();g.setAim(820,300);g.trigger(slot,true);
    assert.equal(g.state.bullets.length,weapon.count,weapon.id);
    for(const b of g.state.bullets){assert.equal(b.weapon,weapon.id);assert.equal(b.damage,weapon.damage);assert.ok(Math.abs(Math.hypot(b.vx,b.vy)-weapon.speed)<.001);}
    if(weapon.count>1 && slot==='primary')assert.notEqual(g.state.bullets[0].vy,g.state.bullets.at(-1).vy);
    if(weapon.count>1 && slot==='secondary'){
      assert.equal(g.state.bullets[0].vy,g.state.bullets.at(-1).vy);
      assert.notEqual(g.state.bullets[0].y,g.state.bullets.at(-1).y);
    }
    if(slot==='primary'){assert.equal(g.state.cannonCooldown,weapon.interval);assert.equal(g.state.bullets[0].radius,weapon.radius);}
    else {assert.equal(g.state.gunHeat,weapon.heat);assert.equal(g.state.gunCooldown,weapon.interval);}
    assert.equal(g.snapshot().state.bullets[0].weapon,weapon.id);
  }
});
test('switching requires pause and cannot clear cooldown, heat or overheat lock',()=>{
  const g=Engine.create();g.state.wave=6;g.equip('primary','howitzer');g.start();g.trigger('primary',true);
  assert.equal(g.equip('primary','cannon'),false);g.pause(true);const cd=g.state.cannonCooldown;
  g.state.gunHeat=100;g.state.overheated=true;g.state.gunCooldown=.1;
  assert.equal(g.equip('primary','cannon'),true);assert.equal(g.state.cannonCooldown,cd);
  assert.equal(g.equip('secondary','rapid'),true);assert.equal(g.state.gunHeat,100);assert.equal(g.state.overheated,true);assert.equal(g.state.gunCooldown,.1);
  const count=g.state.bullets.length;g.pause(false);g.trigger('primary',true);g.trigger('secondary',true);
  assert.equal(g.state.bullets.length,count);assert.equal(g.snapshot().state.cannonCooldown,3.4);
});
test('upgrades benefit all weapon types and loadout persists through waves and saves',()=>{
  const g=Engine.create();g.state.wave=5;g.state.phase='shop';g.state.credits=1000;
  g.equip('primary','howitzer');g.equip('secondary','rapid');g.purchase('cannon');g.purchase('power');g.purchase('rate');
  assert.equal(g.weaponStats('primary').damage,200);assert.equal(g.weaponStats('primary').radius,115);
  assert.equal(g.weaponStats('secondary').damage,20);assert.ok(g.weaponStats('secondary').interval<.075);
  g.nextWave();assert.deepEqual(g.state.loadout,{primary:'howitzer',secondary:'rapid'});
  g.trigger('primary',true);g.trigger('secondary',true);
  const restored=Engine.create();restored.restore(JSON.parse(JSON.stringify(g.snapshot())));
  assert.deepEqual(restored.state.loadout,g.state.loadout);assert.deepEqual(restored.state.bullets,g.snapshot().state.bullets);
  assert.deepEqual(Engine.create().state.loadout,{primary:'cannon',secondary:'machinegun'});
});
test('legacy saves migrate while forged and premature weapon selections are rejected',()=>{
  const g=Engine.create();g.start();g.trigger('primary',true);
  const old=g.snapshot();delete old.state.loadout;old.state.bullets.forEach(b=>delete b.weapon);
  const restored=Save.clean(old);assert.deepEqual(restored.state.loadout,{primary:'cannon',secondary:'machinegun'});assert.equal(restored.state.bullets[0].weapon,'cannon');
  const bad=g.snapshot();bad.state.loadout.primary='howitzer';assert.throws(()=>Save.clean(bad));
  bad.state.loadout.primary='unknown';assert.throws(()=>Save.clean(bad));
  const wrongBullet=g.snapshot();wrongBullet.state.bullets[0].weapon='rapid';assert.throws(()=>Save.clean(wrongBullet));
});
test('a full campaign using newly unlocked weapons can be completed and saved throughout',()=>{
  let seed=81;const g=Engine.create(()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;});g.start();
  const used=new Set();
  for(let frame=0;frame<120*500&&!['over','victory'].includes(g.state.phase);frame++){
    const s=g.state;
    if(s.phase==='shop'){
      for(const id of ['power','rate','armor','cannon'])g.purchase(id);
      if(s.hp<s.maxHp-60)g.purchase('repair');
      for(const [slot,list] of Object.entries(WEAPONS))g.equip(slot,list.filter(w=>w.wave<=unlockWave(s)).at(-1).id);
      g.nextWave();
    }
    Object.values(s.loadout).forEach(id=>used.add(id));
    const target=[...s.enemies].sort((a,b)=>Math.hypot(a.x-480,a.y-300)-Math.hypot(b.x-480,b.y-300))[0];
    if(target){g.setAim(target.x,target.y);g.trigger('primary',true);g.trigger('secondary',true);}else g.release();
    if(s.hp<s.maxHp-65)g.useItem(0);if(s.hp<70)g.useItem(1);if(s.enemies.length>5)g.useItem(2);
    g.step(1/120);if(frame%120===0)g.snapshot();
  }
  assert.equal(g.state.phase,'victory',`wave ${g.state.wave}, hp ${g.state.hp}`);assert.equal(used.size,6);
});
