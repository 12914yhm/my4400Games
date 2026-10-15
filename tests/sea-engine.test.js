const test = require('node:test');
const assert = require('node:assert/strict');
const { create, TYPES, CX, CY, WAVES } = require('../sea-engine');
function enemy(type = 'patrol', x = CX + 160, y = CY) {
  return { ...TYPES[type], type, id: 1, x, y, maxHp: TYPES[type].hp, angle: Math.PI,
    cooldown: 100, turn: 1, age: 0, flash: 0, submerged: type === 'submarine' };
}
function advance(game, seconds) { for (let i = 0; i < seconds * 120; i++) game.step(1 / 120); }
function fixture() { const game = create(() => .5); game.start(); game.state.spawnLeft = 0; game.state.enemies = [enemy()]; return game; }
function weaponFixture() {
  const game = fixture(); game.state.enemies[0].hp = game.state.enemies[0].maxHp = 100000;
  game.setAim(CX, 0); game.drainSounds(); return game;
}

test('side guns alternate physical muzzles and fire parallel regardless of aim distance', () => {
  const { secondaryMuzzle, MAIN_MUZZLE } = require('../sea-engine');
  for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2, .73]) {
    for (const weapon of ['machinegun','rapid']) for (const distance of [10,100,220]) {
    const game = fixture(), x = CX + Math.cos(angle) * distance, y = CY + Math.sin(angle) * distance;
    game.state.loadout.secondary=weapon;
    game.setAim(x, y);
    for (const side of [-1, 1, -1, 1]) {
      game.state.gunCooldown = 0; game.trigger('secondary', true); game.release();
      const bullet = game.state.bullets.at(-1), muzzle = secondaryMuzzle(angle, side);
      assert.ok(Math.hypot(bullet.x-muzzle.x,bullet.y-muzzle.y)<1e-9);
      const speed=game.weaponStats('secondary').speed;
      assert.ok(Math.abs(bullet.vx-Math.cos(angle)*speed)<1e-9);
      assert.ok(Math.abs(bullet.vy-Math.sin(angle)*speed)<1e-9);
    }
    game.trigger('primary',true);
    const shell=game.state.bullets.at(-1);
    assert.ok(Math.hypot(shell.x-CX-Math.cos(angle)*MAIN_MUZZLE,shell.y-CY-Math.sin(angle)*MAIN_MUZZLE)<1e-9);
    }
  }
});

test('twin fires one bullet per side; aiming at the base never fires backwards', () => {
  const { secondaryMuzzle } = require('../sea-engine');
  const game=fixture();game.state.loadout.secondary='twin';game.setAim(CX,CY);
  game.trigger('secondary',true);
  assert.equal(game.state.bullets.length,2);
  game.state.bullets.forEach((bullet,index)=>{
    const muzzle=secondaryMuzzle(0,index ? 1 : -1);
    assert.equal(bullet.x,muzzle.x);assert.equal(bullet.y,muzzle.y);assert.ok(bullet.vx>0);assert.equal(bullet.vy,0);
  });
  const [left,right]=game.state.bullets;
  assert.equal(left.vx,right.vx);assert.equal(left.vy,right.vy);
  game.release();advance(game,.1);
  assert.equal(left.y-right.y,-2*require('../sea-engine').SIDE_GUN.lateral);
});
test('the last machine-gun round immediately starts a reload; tapping cannot bypass it', () => {
  const game = weaponFixture(); game.trigger('secondary', true);
  for(let i=0;i<900&&!game.state.gunReload;i++) game.step(1/120);
  assert.equal(game.state.gunAmmo,0);assert.ok(game.state.gunReload>0);
  game.release();game.drainSounds();
  for(let i=0;i<50;i++){game.trigger('secondary',true);game.trigger('secondary',false);}
  assert.equal(game.drainSounds().includes('weapon:machinegun'),false);
  advance(game,game.state.gunReload+.02);
  assert.equal(game.state.gunAmmo,game.weaponStats('secondary').magazine);
  game.trigger('secondary',true);assert.equal(game.state.gunAmmo,35);
});
test('releasing the trigger keeps remaining rounds, and rate upgrades shorten reloads', () => {
  const game=weaponFixture();game.trigger('secondary',true);advance(game,1);game.release();
  const remaining=game.state.gunAmmo;advance(game,.5);assert.equal(game.state.gunAmmo,remaining);
  game.state.upgrades.rate=4;game.state.gunAmmo=1;game.state.gunCooldown=0;
  game.trigger('secondary',true);
  assert.equal(game.state.gunAmmo,0);
  assert.equal(game.state.gunReload,game.weaponStats('secondary').reload);
  assert.ok(game.state.gunReload<1.5);
});
test('cannon loading rejects spam and remains independent of machine-gun reload', () => {
  const game=weaponFixture();game.state.gunAmmo=1;game.trigger('secondary',true);game.release();
  assert.ok(game.state.gunReload>0);
  game.trigger('primary',true);game.trigger('primary',false);
  for(let i=0;i<30;i++){game.trigger('primary',true);game.trigger('primary',false);}
  assert.equal(game.drainSounds().filter(s=>s==='weapon:cannon').length,1);
  advance(game,2);game.trigger('primary',true);game.trigger('primary',false);
  assert.equal(game.drainSounds().filter(s=>s==='weapon:cannon').length,0);
  advance(game,.3);game.trigger('primary',true);assert.ok(game.drainSounds().includes('weapon:cannon'));
});
test('pause freezes ammunition loading; next wave refills both weapons', () => {
  const game=weaponFixture();game.trigger('primary',true);game.trigger('secondary',true);advance(game,.4);game.pause(true);
  const ammo=game.state.gunAmmo,cooldown=game.state.cannonCooldown;advance(game,5);
  assert.equal(game.state.gunAmmo,ammo);assert.equal(game.state.cannonCooldown,cooldown);assert.deepEqual(game.drainSounds(),[]);
  game.state.phase='shop';game.state.credits=500;const oldDelay=game.cannonDelay();game.purchase('rate');assert.ok(game.cannonDelay()<oldDelay);
  game.nextWave();assert.equal(game.state.gunAmmo,36);assert.equal(game.state.gunReload,0);assert.equal(game.state.cannonCooldown,0);
});
test('every weapon kicks quickly then returns; heavy artillery has stronger recoil', () => {
  const {RECOIL,recoilOffset,WEAPONS}=require('../sea-engine');
  for(const weapon of [...WEAPONS.primary,...WEAPONS.secondary]){
    const p=RECOIL[weapon.id];
    assert.equal(recoilOffset(weapon.id,p.duration),0);
    assert.ok(Math.abs(recoilOffset(weapon.id,p.duration-p.kick)-p.distance)<1e-8);
    assert.ok(recoilOffset(weapon.id,(p.duration-p.kick)/2)<p.distance/2);
    assert.equal(recoilOffset(weapon.id,0),0);
    const slot=WEAPONS.primary.includes(weapon)?'primary':'secondary';
    const game=weaponFixture();game.state.loadout[slot]=weapon.id;
    game.trigger(slot,true);game.release();
    assert.equal(slot==='primary'?game.state.recoil:game.state.gunRecoil[0],p.duration);
    advance(game,p.duration+.02);
    assert.equal(game.state.recoil,0);assert.deepEqual(game.state.gunRecoil,[0,0]);
  }
  assert.ok(RECOIL.howitzer.distance>RECOIL.cannon.distance);
  assert.ok(RECOIL.cannon.distance>RECOIL.laser.distance);
});

test('side guns recoil only when fired, alternate independently and twin kicks both mounts', () => {
  const {RECOIL}=require('../sea-engine'),game=weaponFixture();
  game.trigger('secondary',true);game.release();
  assert.deepEqual(game.state.gunRecoil,[RECOIL.machinegun.duration,0]);
  advance(game,.04);
  const before=[...game.state.gunRecoil];
  game.trigger('secondary',true);game.release();assert.deepEqual(game.state.gunRecoil,before);
  game.state.gunCooldown=0;game.trigger('secondary',true);game.release();
  assert.equal(game.state.gunRecoil[0],before[0]);assert.equal(game.state.gunRecoil[1],RECOIL.machinegun.duration);
  advance(game,.2);game.state.gunAmmo=0;game.state.gunReload=1;game.state.gunCooldown=0;
  game.trigger('secondary',true);game.release();assert.deepEqual(game.state.gunRecoil,[0,0]);
  game.state.gunReload=0;game.state.gunAmmo=48;game.state.loadout.secondary='twin';game.trigger('secondary',true);
  assert.deepEqual(game.state.gunRecoil,[RECOIL.twin.duration,RECOIL.twin.duration]);
});

test('recoil freezes on pause, ignores cooldown spam and resets on equip, load and next wave', () => {
  const game=fixture();game.trigger('primary',true);game.trigger('secondary',true);game.release();advance(game,.025);
  const recoil=game.state.recoil,guns=[...game.state.gunRecoil];
  game.trigger('primary',true);game.release();assert.equal(game.state.recoil,recoil);
  game.pause(true);advance(game,2);assert.equal(game.state.recoil,recoil);assert.deepEqual(game.state.gunRecoil,guns);
  game.state.enemies[0].cooldown=2;
  const saved=game.snapshot();game.restore(saved);assert.equal(game.state.recoil,0);assert.deepEqual(game.state.gunRecoil,[0,0]);
  game.state.wave=8;game.state.recoil=.2;game.state.gunRecoil=[.1,.1];
  assert.equal(game.equip('primary','howitzer'),true);assert.equal(game.state.recoil,0);assert.deepEqual(game.state.gunRecoil,[0,0]);
  game.state.phase='shop';game.state.recoil=.2;game.state.gunRecoil=[.1,.1];
  game.nextWave();assert.equal(game.state.recoil,0);assert.deepEqual(game.state.gunRecoil,[0,0]);
});

test('sound events drain once and do not grow without a rendering consumer', () => {
  const game=weaponFixture();game.trigger('primary',true);assert.deepEqual(game.drainSounds(),['weapon:cannon']);assert.deepEqual(game.drainSounds(),[]);
  advance(game,30);assert.ok(game.drainSounds().length<=32);
});
test('start is explicit and guarded; spawning does not exceed the wave budget', () => {
  const game = create(() => .5); advance(game, 2); assert.equal(game.state.enemies.length, 0);
  assert.equal(game.start(), true); assert.equal(game.start(), false);
  advance(game, 1); assert.equal(game.state.enemies.length, 1); assert.equal(game.state.spawnLeft, 6);
});
test('machine gun destroys an enemy and pays exactly one wave reward', () => {
  const game = fixture(); game.setAim(CX + 160, CY); game.trigger('secondary', true); advance(game, 2);
  assert.equal(game.state.phase, 'shop'); assert.equal(game.state.kills, 1);
  assert.equal(game.state.credits, 100 + 30 + 130);
  const credits = game.state.credits; advance(game, 3); assert.equal(game.state.credits, credits);
});
test('submerged submarines resist machine gun rounds but receive cannon damage', () => {
  const game = fixture(); game.state.enemies = [enemy('submarine')]; game.setAim(CX + 160, CY);
  game.trigger('secondary', true); advance(game, .8); assert.equal(game.state.enemies[0].hp, TYPES.submarine.hp);
  game.trigger('secondary', false); game.trigger('primary', true); advance(game, .7);
  assert.ok(game.state.enemies.length === 0 || game.state.enemies[0].hp < TYPES.submarine.hp);
});
test('cannon splash damages nearby ships', () => {
  const game = fixture(); const a = enemy('armored'), b = enemy('armored', CX + 160, CY + 38); b.id = 2;
  game.state.enemies = [a,b]; game.setAim(CX + 160, CY); game.trigger('primary', true); advance(game, .6);
  assert.ok(a.hp < a.maxHp); assert.ok(b.hp < b.maxHp);
});

test('each hull class produces a matching sinking sequence and sound without changing rewards',()=>{
  const classes={patrol:'small',fast:'small',raider:'small',armored:'medium',missile:'medium',tender:'medium',guardian:'shield',submarine:'sub',boss:'large',dreadnought:'large'};
  for(const [type,hull] of Object.entries(classes)){
    const game=fixture(),target=enemy(type,CX+160,CY);target.hp=25;target.maxHp=TYPES[type].hp;
    game.state.enemies=[target];game.setAim(CX+160,CY);game.drainSounds();game.trigger('primary',true);game.release();advance(game,.6);
    assert.equal(game.state.kills,1,type);assert.equal(game.state.credits,100+target.reward+130,type);
    const sink=game.state.effects.find(e=>e.kind==='ship-sink');
    assert.equal(sink?.type,type);assert.equal(sink.hull,hull);assert.equal(sink.size,target.radius);
    assert.ok(game.drainSounds().includes('ship-sink:'+hull),type);
  }
});

test('surviving hulls spark while shields absorb damage with a distinct effect',()=>{
  const game=fixture(),target=enemy('guardian',CX+160,CY);target.barrier=100;game.state.enemies=[target];game.setAim(CX+160,CY);
  game.trigger('primary',true);game.release();advance(game,.3);
  assert.equal(game.state.enemies[0].hp,TYPES.guardian.hp);
  assert.equal(game.state.enemies[0].barrier,20);
  assert.ok(game.state.effects.some(e=>e.kind==='hull-hit'&&e.hull==='shield'));
  assert.ok(game.drainSounds().includes('ship-hit:shield'));
  const armored=fixture();armored.state.enemies=[enemy('armored',CX+160,CY-34)];
  armored.setAim(CX+160,CY);armored.drainSounds();armored.trigger('secondary',true);armored.release();advance(armored,.25);
  assert.ok(armored.state.enemies[0].hp<TYPES.armored.hp);
  assert.ok(armored.state.effects.some(e=>e.kind==='hull-hit'&&e.type==='armored'&&e.hull==='medium'));
  assert.ok(armored.drainSounds().includes('ship-hit:medium'));
});
test('pause freezes projectiles and timers and clears held triggers', () => {
  const game = fixture(); game.trigger('primary', true); advance(game, .1); game.pause(true);
  const before = JSON.stringify(game.state); advance(game, 3); assert.equal(JSON.stringify(game.state), before);
  assert.equal(game.state.primary, false); game.pause(false); advance(game, .1); assert.notEqual(JSON.stringify(game.state), before);
});
test('items respect stock, max health, active effects and combat state', () => {
  const game = fixture(); assert.equal(game.useItem(0), false); assert.equal(game.state.items[0], 1);
  game.state.hp = 150; assert.equal(game.useItem(0), true); assert.equal(game.state.hp, 200); assert.equal(game.useItem(0), false);
  assert.equal(game.useItem(1), true); assert.equal(game.useItem(1), false); assert.equal(game.state.shield, 8);
  game.pause(true); assert.equal(game.useItem(2), false); assert.equal(game.useItem(99), false);
});
test('shield prevents base damage and an unshielded fatal hit ends combat', () => {
  const game = fixture(); const shell = () => ({ x:CX+44,y:CY,vx:-140,vy:0,damage:300,dead:false });
  game.useItem(1); game.state.hostile = [shell()]; advance(game,.1); assert.equal(game.state.hp, 200);
  game.state.shield=0;game.state.hostile=[shell()];advance(game,.1);assert.equal(game.state.phase,'over');assert.equal(game.state.hp,0);
});
test('shop enforces phase, credits, level caps, stock caps and armor healing', () => {
  const game=fixture();assert.equal(game.purchase('power'),false);game.state.phase='shop';game.state.credits=120;
  assert.equal(game.purchase('armor'),true);assert.equal(game.state.credits,0);assert.equal(game.state.hp,260);assert.equal(game.state.maxHp,260);
  assert.equal(game.purchase('power'),false);assert.equal(game.purchase('unknown'),false);
  game.state.credits=9999;game.state.upgrades.power=5;assert.equal(game.purchase('power'),false);
  game.state.items[0]=5;assert.equal(game.purchase('repair'),false);
});
test('next wave keeps equipment and requires shop phase', () => {
  const game=fixture();assert.equal(game.nextWave(),false);game.state.phase='shop';game.state.upgrades.power=2;game.state.items[1]=3;
  assert.equal(game.nextWave(),true);assert.equal(game.state.wave,2);assert.equal(game.state.upgrades.power,2);assert.equal(game.state.items[1],3);assert.equal(game.state.total,9);
});
test('the final wave ends in victory', () => {
  const game=fixture();game.state.wave=WAVES;game.state.enemies=[];advance(game,.02);
  assert.equal(game.state.phase,'victory');assert.equal(game.nextWave(),false);
});
test('the original eight-wave arc remains playable with standard weapons and earned upgrades', () => {
  let seed=81;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const game=create(random);game.start();
  for(let frame=0;frame<120*1200&&!['over','victory'].includes(game.state.phase);frame++){
    const s=game.state;
    if(s.phase==='shop'&&s.wave===8)break;
    if(s.phase==='shop'){
      for(const id of ['power','rate','armor','cannon'])game.purchase(id);
      if(s.hp<s.maxHp-60)game.purchase('repair');game.nextWave();
    }
    const target=[...s.enemies].sort((a,b)=>Math.hypot(a.x-CX,a.y-CY)-Math.hypot(b.x-CX,b.y-CY))[0];
    if(target){game.setAim(target.x,target.y);game.trigger('primary',true);game.trigger('secondary',true);}else game.release();
    if(s.hp<s.maxHp-65)game.useItem(0);
    if(s.hp<70)game.useItem(1);
    if(s.enemies.length>5)game.useItem(2);
    game.step(1/120);
    if (frame % 120 === 0) assert.equal(game.snapshot().version, 2);
  }
  assert.equal(game.state.phase,'shop',`Campaign stopped at wave ${game.state.wave}, hp ${game.state.hp}`);assert.equal(game.state.wave,8);
  assert.ok(game.state.score>0);assert.ok(game.state.credits>=0);assert.ok(game.state.kills>90);
});
