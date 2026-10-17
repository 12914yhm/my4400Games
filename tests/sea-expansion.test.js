const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../sea-engine'),Save=require('../sea-save'),Campaign=require('../sea-campaign');
function ship(type,id,x,y=300){return {...E.TYPES[type],type,id,x,y,hp:1000,maxHp:1000,angle:Math.PI,cooldown:9,turn:1,age:0,flash:0,submerged:false,chill:0,barrier:type==='guardian'?100:0};}
function game(primary='laser',secondary='machinegun'){
 const g=E.create(()=>.5);g.state.wave=16;g.equip('primary',primary);g.equip('secondary',secondary);g.start();g.state.spawnLeft=0;g.setAim(900,300);return g;
}
function advance(g,seconds){for(let i=0;i<seconds*120;i++)g.step(1/120);}
test('sixteen authored levels introduce every ship and end each chapter with a flagship',()=>{
 assert.equal(Campaign.LEVELS.length,16);assert.equal(new Set(Campaign.LEVELS.map(l=>l.chapter)).size,4);
 const types=new Set(Campaign.LEVELS.flatMap(l=>l.fleet));assert.deepEqual([...types].sort(),Object.keys(E.TYPES).sort());
 for(const l of Campaign.LEVELS){assert.ok(l.fleet.length<=Campaign.MAX_ENEMIES);if(l.wave%4===0)assert.equal(l.fleet.at(-1),l.wave===16?'dreadnought':'boss');}
});
test('laser instantly hits only the first ship; electromagnetic shot pierces three and bypasses shields',()=>{
 for(const weapon of ['laser','railgun']){
  const g=game(weapon),ships=[ship('guardian',1,600),ship('armored',2,700),ship('armored',3,800),ship('armored',4,900)];
  g.state.enemies=ships;g.trigger('primary',true);
  if(weapon==='laser'){assert.equal(ships[0].barrier,0);assert.equal(ships[0].hp,965);assert.equal(ships[1].hp,1000);}
  else {assert.equal(ships[0].barrier,100);assert.ok(ships.slice(0,3).every(s=>s.hp===730));assert.equal(ships[3].hp,1000);}
  assert.equal(g.state.bullets.length,0);assert.ok(g.state.effects.some(e=>e.kind==='beam'));
 }
});
test('electric arcs jump at most three times, exclude submerged targets and intercept shells first',()=>{
 const g=game('cannon','tesla'),ships=[ship('patrol',1,600,266),ship('patrol',2,660,320),ship('patrol',3,720,370),ship('patrol',4,770,410),ship('submarine',5,620,280)];
 ships[4].submerged=true;g.state.enemies=ships;g.trigger('secondary',true);
 assert.equal(ships.filter(s=>s.hp<1000).length,3);assert.equal(ships[4].hp,1000);assert.equal(g.state.gunAmmo,11);
 const h=game('cannon','tesla');h.state.enemies=[ship('patrol',1,700,266)];h.state.hostile=[{x:580,y:E.CY-E.SIDE_GUN.lateral,vx:-100,vy:0,damage:10,torpedo:false}];h.trigger('secondary',true);
 assert.equal(h.state.hostile[0].dead,true);assert.equal(h.state.enemies[0].hp,1000);
});
test('freezing bullets slow enemies, persist status and allow thawing',()=>{
 const g=game('cannon','cryo'),target=ship('armored',1,590,266);target.speed=24;target.range=0;g.state.enemies=[target];
 g.trigger('secondary',true);g.release();advance(g,.12);assert.ok(target.chill>0);
 const restored=E.create();restored.restore(g.snapshot());assert.equal(restored.state.enemies[0].chill,target.chill);
 const before=target.x;advance(g,.5);assert.ok(before-target.x<24*.5*.6);
 advance(g,2);assert.equal(target.chill,0);
});
test('repair ships heal nearby living allies and missile ships fire a three-round volley',()=>{
 const g=game(),tender=ship('tender',1,700),ally=ship('armored',2,730);tender.cooldown=0;ally.hp=500;g.state.enemies=[tender,ally];advance(g,.01);
 assert.equal(ally.hp,500);assert.ok(tender.windup>0);
 advance(g,E.GUNSHIP_WINDUP+.02);
 assert.equal(ally.hp,528);assert.ok(g.state.effects.some(e=>e.kind==='repair'&&Math.hypot(e.x-ally.x,e.y-ally.y)<5));
 const h=game(),missile=ship('missile',1,700);missile.cooldown=0;h.state.enemies=[missile];advance(h,.01);
 assert.equal(h.state.hostile.length,0);assert.ok(missile.windup>0);
 assert.ok(h.drainSounds().includes('missile-lock'));
 const saved=h.snapshot(),restored=E.create();restored.restore(saved);
 assert.equal(restored.state.enemies[0].windup,missile.windup);
 advance(h,E.MISSILE_WINDUP+.02);
 assert.equal(h.state.hostile.length,3);assert.ok(h.state.hostile.every(p=>p.missile));
 assert.equal(new Set(h.state.hostile.map(p=>p.vy)).size,3);
 const volley=h.snapshot(),resumed=E.create();resumed.restore(volley);
 assert.ok(resumed.state.hostile.every(p=>p.missile));
 const oldShells=structuredClone(volley);oldShells.state.hostile.forEach(p=>delete p.missile);
 assert.ok(Save.clean(oldShells).state.hostile.every(p=>p.missile===false));
});
test('machinegun rounds intercept a marked missile before it reaches the battery',()=>{
 const g=game('cannon','machinegun'),target=ship('armored',1,900);g.state.enemies=[target];g.state.spawnLeft=1;
 const muzzle=E.secondaryMuzzle(0,-1);
 g.state.hostile=[{x:muzzle.x+80,y:muzzle.y,vx:-80,vy:0,damage:10,torpedo:false,missile:true,dead:false}];
 g.setAim(900,E.CY);g.trigger('secondary',true);g.release();advance(g,.11);
 assert.equal(g.state.hostile.length,0);assert.equal(g.state.hp,200);
});
test('destroying a locking missile ship cancels its volley and old saves default to idle',()=>{
 const g=game('laser'),missile=ship('missile',1,700);missile.hp=35;missile.cooldown=0;g.state.enemies=[missile];
 advance(g,.01);assert.ok(missile.windup>0);
 const old=g.snapshot();delete old.state.enemies[0].windup;
 assert.equal(Save.clean(old).state.enemies[0].windup,0);
 const bad=g.snapshot();bad.state.enemies[0].windup=3;
 assert.throws(()=>Save.clean(bad),/开火预警/);
 g.setAim(missile.x,missile.y);g.trigger('primary',true);g.release();
 advance(g,E.MISSILE_WINDUP+.1);assert.equal(g.state.hostile.length,0);
});
test('guardian aura protects nearby ships until its shared barrier breaks; railgun bypasses it',()=>{
 const g=game('laser'),ally=ship('armored',1,620),guardian=ship('guardian',2,700);
 g.state.enemies=[ally,guardian];g.setAim(ally.x,ally.y);g.trigger('primary',true);g.release();
 assert.equal(ally.hp,1000-g.weaponStats('primary').damage*.5);
 assert.equal(guardian.barrier,100-g.weaponStats('primary').damage*.5);
 assert.ok(g.state.effects.some(e=>e.kind==='hull-hit'&&e.hull==='shield'&&e.type==='armored'));
 const h=game('railgun'),target=ship('armored',1,620),escort=ship('guardian',2,700);
 h.state.enemies=[target,escort];h.setAim(target.x,target.y);h.trigger('primary',true);
 assert.equal(target.hp,1000-h.weaponStats('primary').damage);
 assert.equal(escort.barrier,100);
 const far=game('laser'),distant=ship('armored',1,610),guard=ship('guardian',2,900);
 far.state.enemies=[distant,guard];far.setAim(distant.x,distant.y);far.trigger('primary',true);
 assert.equal(distant.hp,1000-far.weaponStats('primary').damage);
});
test('ramming ships damage the base once and finish the wave without kill rewards',()=>{
 const g=game(),raider=ship('raider',1,530);g.state.enemies=[raider];g.state.hp=100;advance(g,.01);
 assert.equal(g.state.destroyed,1);assert.equal(g.state.kills,0);assert.equal(g.state.enemies.length,0);
 // End-of-wave repair is capped at max health.
 assert.equal(g.state.phase,'victory');assert.equal(g.state.hp,101);
});
test('carriers launch bounded fighters that survive saves without inflating wave progress',()=>{
 const g=game(),carrier=ship('carrier',1,700);carrier.cooldown=0;g.state.enemies=[carrier];
 advance(g,.01);
 const plane=g.state.enemies.find(e=>e.type==='fighter');
 assert.ok(plane);assert.equal(plane.launched,true);assert.ok(plane.x<carrier.x);
 assert.equal(g.state.destroyed,0);
 const saved=g.snapshot(),restored=E.create();restored.restore(saved);
 assert.equal(restored.state.enemies.find(e=>e.type==='fighter').launched,true);
 const old=structuredClone(saved);delete old.state.enemies[0].launched;
 assert.equal(Save.clean(old).state.enemies[0].launched,false);
 const forged=structuredClone(saved);forged.state.enemies.find(e=>e.type==='fighter').launched='yes';
 assert.throws(()=>Save.clean(forged),/舰载机/);
 g.state.enemies=[plane,carrier];g.setAim(plane.x,plane.y);g.trigger('primary',true);
 assert.equal(g.state.kills,1);assert.equal(g.state.destroyed,0);
});
test('launched aircraft dive into the base while the gasoline boat has a larger blast',()=>{
 const g=game(),plane=ship('fighter',1,530);plane.launched=true;g.state.enemies=[plane];g.state.spawnLeft=1;
 advance(g,.01);assert.equal(g.state.hp,200-plane.damage);assert.equal(g.state.destroyed,0);
 const h=game(),boat=ship('raider',1,530);h.state.enemies=[boat];h.state.spawnLeft=1;
 advance(h,.01);assert.equal(h.state.hp,200-boat.damage);
 assert.ok(h.state.effects.some(e=>e.kind==='explosion'&&e.size>plane.radius*E.SHIP_SCALE));
});
test('plasma detonates across a wider area with its own effect',()=>{
 const g=game('plasma'),a=ship('armored',1,700),b=ship('armored',2,700,400);g.state.enemies=[a,b];g.setAim(700,300);g.trigger('primary',true);g.release();advance(g,.5);
 assert.ok(a.hp<1000&&b.hp<1000);assert.ok(g.state.effects.some(e=>e.kind==='plasma'));
});
test('old eight-wave victories continue at chapter three and expanded saves round-trip safely',()=>{
 const old=E.create().snapshot();old.version=1;old.state.wave=8;old.state.phase='victory';const g=E.create();g.restore(old);
 assert.equal(g.state.phase,'shop');assert.equal(g.nextWave(),true);assert.equal(g.state.wave,9);
 const h=game('railgun','cryo');h.state.enemies=[ship('guardian',1,650)];h.state.enemies[0].barrier=34;h.state.enemies[0].chill=1.25;
 const saved=h.snapshot(),r=E.create();r.restore(saved);assert.deepEqual(r.snapshot().state.enemies,saved.state.enemies);assert.equal(saved.version,2);
 const bad=structuredClone(saved);bad.state.enemies[0].barrier=101;assert.throws(()=>Save.clean(bad));
 const final=structuredClone(saved);final.state.phase='victory';assert.equal(Save.clean(final).state.phase,'victory');
});
test('gunships warn before firing, preserve warning through pause and saves, and cancel on sinking',()=>{
 const g=game('laser'),target=ship('patrol',1,700);target.cooldown=0;g.state.enemies=[target];g.state.spawnLeft=1;
 advance(g,.01);assert.equal(g.state.hostile.length,0);assert.ok(target.windup>0&&target.windup<=E.GUNSHIP_WINDUP);
 advance(g,.4);assert.equal(g.state.hostile.length,0);assert.ok(target.windup>0);
 const pending=target.windup;g.pause(true);advance(g,1);assert.equal(target.windup,pending);
 const saved=g.snapshot();assert.equal(saved.state.enemies[0].windup,pending);
 const restored=E.create();restored.restore(saved);assert.equal(restored.state.enemies[0].windup,pending);
 restored.pause(false);advance(restored,pending+.04);assert.equal(restored.state.hostile.length,1);
 assert.ok(restored.state.enemies[0].cooldown>0);
 const old=structuredClone(saved);delete old.state.enemies[0].windup;
 assert.equal(Save.clean(old).state.enemies[0].windup,0);
 const bad=structuredClone(saved);bad.state.enemies[0].windup=1;
 assert.throws(()=>Save.clean(bad),/开火预警/);
 g.pause(false);target.hp=35;g.setAim(target.x,target.y);g.trigger('primary',true);g.release();
 assert.equal(g.state.enemies[0].hp<=0,true);advance(g,E.GUNSHIP_WINDUP+1);assert.equal(g.state.hostile.length,0);
});
test('chill slows warning and missile lock keeps its longer duration',()=>{
 const g=game(),target=ship('armored',1,700);target.cooldown=0;target.chill=2;g.state.enemies=[target];g.state.spawnLeft=1;
 advance(g,.01);assert.ok(target.windup>0&&target.windup<=E.GUNSHIP_WINDUP);
 advance(g,.5);assert.ok(target.windup>.6);assert.equal(g.state.hostile.length,0);
 const h=game(),missile=ship('missile',1,700);missile.cooldown=0;h.state.enemies=[missile];h.state.spawnLeft=1;
 advance(h,.01);assert.ok(missile.windup>2&&missile.windup<=E.MISSILE_WINDUP);
 advance(h,1);assert.equal(h.state.hostile.length,0);assert.ok(missile.windup>1);
});
test('waves eight and nine open with spaced escort pairs at every difficulty without exceeding ship caps',()=>{
 for(const wave of [8,9])for(const mode of ['low','normal','high']){
  const g=E.create(()=>.5);g.state.wave=wave;g.setDifficulty(mode);g.start();
  assert.deepEqual(E.LEVELS[wave-1].fleet.slice(0,2),wave===8?['guardian','armored']:['tender','guardian']);
  const budget=g.state.spawnLeft;advance(g,.85);assert.equal(g.state.enemies.length,1);
  assert.equal(g.state.spawnLeft,budget-1);assert.ok(g.state.spawnTimer<.7);
  advance(g,.7);assert.equal(g.state.enemies.length,2);
  const [a,b]=g.state.enemies,spacing=Math.hypot(a.x-b.x,a.y-b.y);
  assert.ok(spacing>=95&&spacing<=120,`${wave}/${mode}: ${spacing}`);
  assert.ok(wave===8?a.x> E.W&&b.x>E.W:a.y<0&&b.y<0);
  assert.equal(g.state.spawnLeft,budget-2);
  assert.ok(g.state.spawnTimer>.7);
  const cap=E.DIFFICULTIES[mode].maxAlive+Math.floor((wave-1)/4);
  advance(g,7);assert.ok(g.state.enemies.length<=cap,`${wave}/${mode} exceeded cap`);
 }
});
test('an escort pair resumes its second arrival after saving between spawns',()=>{
 const g=E.create(()=>.5);g.state.wave=9;g.setDifficulty('low');g.start();advance(g,.85);
 assert.equal(g.state.enemies.length,1);assert.equal(g.state.enemies[0].type,'tender');
 const resumed=E.create(()=>.1);resumed.restore(g.snapshot());resumed.pause(false);
 advance(resumed,.7);
 assert.deepEqual(resumed.state.enemies.map(e=>e.type),['tender','guardian']);
 const [a,b]=resumed.state.enemies;
 assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<E.GUARDIAN_AURA);
});
test('opening escorts hold support range for nine seconds and release after leader sinks',()=>{
 for(const wave of [8,9]){
  const g=E.create(()=>.5);g.state.wave=wave;g.setDifficulty('low');g.start();advance(g,1.55);
  assert.equal(g.state.enemies.length,2);
  g.state.spawnTimer=9;
  let saved;
  for(let i=0;i<15;i++){
   g.state.spawnTimer=9;
   advance(g,.5);
   const [leader,wing]=g.state.enemies;
   const distance=Math.hypot(leader.x-wing.x,leader.y-wing.y);
   assert.ok(distance>=100&&distance<=115,`${wave} escort separation ${distance} at ${i*.5}s`);
   if(i===7)saved=g.snapshot();
  }
  assert.equal(saved.state.enemies[0].escort,1);
  assert.equal(saved.state.enemies[1].escort,2);
  const resumed=E.create(()=>.1);resumed.restore(saved);resumed.pause(false);resumed.state.spawnTimer=9;
  advance(resumed,2);
  assert.ok(Math.hypot(resumed.state.enemies[0].x-resumed.state.enemies[1].x,
    resumed.state.enemies[0].y-resumed.state.enemies[1].y)<130);
  const wing=g.state.enemies[1],before={x:wing.x,y:wing.y};
  g.state.enemies[0].hp=0;advance(g,.01);
  assert.equal(wing.escort,0);
  assert.ok(Math.hypot(wing.x-before.x,wing.y-before.y)<3,'wing resumes normal independent movement');
 }
});
test('escort fields are optional for old saves and reject forged roles',()=>{
 const g=E.create(()=>.5);g.state.wave=8;g.start();advance(g,1.55);
 const save=g.snapshot();const old=structuredClone(save);
 old.state.enemies.forEach(enemy=>delete enemy.escort);
 assert.ok(Save.clean(old).state.enemies.every(enemy=>enemy.escort===0));
 const forged=structuredClone(save);forged.state.enemies[1].escort=3;
 assert.throws(()=>Save.clean(forged),/护航编队/);
 const wrongWave=structuredClone(save);wrongWave.state.wave=7;
 assert.throws(()=>Save.clean(wrongWave),/护航编队/);
});
test('chilling either escort slows the entire formation without breaking support range',()=>{
 const run=(role,emp=false)=>{
  const g=E.create(()=>.5);g.state.wave=9;g.setDifficulty('low');g.start();advance(g,1.55);
  g.state.spawnTimer=9;
  if(role)g.state.enemies[role-1].chill=2;
  if(emp)g.state.freeze=2;
  const before=g.state.enemies.map(e=>({x:e.x,y:e.y}));advance(g,1);
  const movement=g.state.enemies.map((e,i)=>Math.hypot(e.x-before[i].x,e.y-before[i].y));
  const [leader,wing]=g.state.enemies;
  assert.ok(Math.hypot(leader.x-wing.x,leader.y-wing.y)<130);
  return movement;
 };
 const normal=run(0);
 for(const role of [1,2]){
  const slowed=run(role);
  assert.ok(slowed[0]<normal[0]*.6,`leader ignores chilled role ${role}`);
  assert.ok(slowed[1]<normal[1]*.6,`wing ignores chilled role ${role}`);
 }
 const emp=run(0,true);
 assert.ok(emp[0]<normal[0]*.35&&emp[1]<normal[1]*.35);
});
