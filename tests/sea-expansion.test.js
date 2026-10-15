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
 const h=game('cannon','tesla');h.state.enemies=[ship('patrol',1,700,266)];h.state.hostile=[{x:580,y:266,vx:-100,vy:0,damage:10,torpedo:false}];h.trigger('secondary',true);
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
 assert.equal(ally.hp,528);assert.ok(g.state.effects.some(e=>e.kind==='repair'));
 const h=game(),missile=ship('missile',1,700);missile.cooldown=0;h.state.enemies=[missile];advance(h,.01);assert.equal(h.state.hostile.length,3);assert.equal(new Set(h.state.hostile.map(p=>p.vy)).size,3);
});
test('ramming ships damage the base once and finish the wave without kill rewards',()=>{
 const g=game(),raider=ship('raider',1,530);g.state.enemies=[raider];g.state.hp=100;advance(g,.01);
 assert.equal(g.state.destroyed,1);assert.equal(g.state.kills,0);assert.equal(g.state.enemies.length,0);
 // End-of-wave repair is capped at max health.
 assert.equal(g.state.phase,'victory');assert.equal(g.state.hp,101);
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
