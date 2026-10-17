const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../sea-engine');

function advance(game,seconds){for(let i=0;i<seconds*120;i++)game.step(1/120);}
function trial(){return E.create(()=>.5,{mode:'trial'});}

test('trial is three isolated objectives while default campaign stays sixteen waves and saveable',()=>{
 const formal=E.create(()=>.5),g=trial();
 assert.equal(formal.mode,'campaign');assert.equal(formal.waveCount,16);
 assert.equal(formal.levels,E.LEVELS);assert.equal(formal.snapshot().version,2);
 assert.equal(g.mode,'trial');assert.equal(g.waveCount,3);assert.equal(g.levels,E.TRIAL_LEVELS);
 assert.deepEqual(g.levels.map(level=>level.fleet.length),[6,8,3]);
 assert.throws(()=>g.snapshot(),/试玩进度不保存/);
 assert.throws(()=>g.restore(formal.snapshot()),/不能载入/);
 g.start();assert.equal(g.state.total,6);
 g.state.spawnLeft=1;g.state.enemies=[];g.state.spawnTimer=9;advance(g,.01);
 assert.equal(g.state.phase,'playing','wave one cannot end before the last scheduled ship');
 g.state.spawnLeft=0;advance(g,.01);assert.equal(g.state.phase,'shop');
 assert.equal(formal.state.phase,'ready');
});

test('trial perks require one choice per stop and can each be taken only once',()=>{
 const g=trial();g.start();g.state.spawnLeft=0;advance(g,.01);
 assert.equal(g.nextWave(),false);
 const normalReload=g.cannonDelay();
 assert.equal(g.choosePerk('reload'),true);assert.equal(g.choosePerk('reload'),false);
 assert.equal(g.choosePerk('magazine'),false);
 assert.ok(Math.abs(g.cannonDelay()-normalReload*.8)<1e-9);
 assert.equal(g.nextWave(),true);assert.equal(g.state.wave,2);
 g.state.trialWaveTime=34.99;advance(g,.02);assert.equal(g.state.phase,'shop');
 assert.equal(g.choosePerk('reload'),false);
 assert.equal(g.choosePerk('magazine'),true);
 assert.equal(g.weaponStats('secondary').magazine,48);
 assert.equal(g.nextWave(),true);assert.equal(g.state.gunAmmo,48);
 const repaired=trial();repaired.start();repaired.state.hp=100;repaired.state.spawnLeft=0;advance(repaired,.01);
 assert.equal(repaired.choosePerk('repair'),true);assert.equal(repaired.state.hp,150);
 assert.equal(repaired.choosePerk('repair'),false);
});

test('survival wave counts only unpaused play time and ends before a simultaneous hit',()=>{
 const g=trial();g.state.wave=2;g.start();g.state.spawnLeft=0;g.state.spawnTimer=9;
 for(let i=0;i<10;i++){g.state.enemies=[];g.state.hostile=[];advance(g,1);}
 const elapsed=g.state.trialWaveTime;g.pause(true);advance(g,20);
 assert.equal(g.state.trialWaveTime,elapsed);g.pause(false);
 for(let i=0;i<25&&g.state.phase==='playing';i++){g.state.enemies=[];g.state.hostile=[];advance(g,1);}
 assert.equal(g.state.phase,'shop');assert.ok(g.state.trialWaveTime>=35);
 assert.equal(g.state.hp,200);assert.equal(g.state.kills,0);
 assert.equal(g.state.enemies.length,0);assert.equal(g.state.hostile.length,0);
 const edge=trial();edge.state.wave=2;edge.start();edge.state.trialWaveTime=35-1/120;
 edge.state.hp=1;edge.state.spawnTimer=9;
 edge.state.hostile=[{x:E.CX+43.5,y:E.CY,vx:-140,vy:0,damage:10,torpedo:false,missile:false,dead:false}];
 advance(edge,.01);
 assert.equal(edge.state.phase,'shop');assert.equal(edge.state.hp,1,'the 35-second objective wins the boundary frame');
 assert.equal(edge.state.hostile.length,0);
});

test('a marked commander arrives after both escorts and its sinking immediately wins',()=>{
 const g=trial();g.state.wave=3;g.start();
 for(let i=0;i<3;i++){g.state.spawnTimer=0;advance(g,.02);}
 assert.deepEqual(g.state.enemies.map(enemy=>enemy.type),['guardian','armored','armored']);
 const command=g.state.enemies[2];assert.equal(command.command,true);
 assert.ok(command.maxHp>=250&&command.maxHp<=300);
 assert.equal(g.state.phase,'playing');command.hp=1;
 g.useItem(2);
 assert.equal(g.state.phase,'victory');assert.equal(g.state.enemies.length,0);
 assert.equal(g.nextWave(),false);
});

test('intercepts count once, award optional score, and use a wider trial hit area',()=>{
 const g=trial();g.start();g.state.spawnLeft=1;g.state.spawnTimer=9;
 const muzzle=E.secondaryMuzzle(0,-1);
 g.state.hostile=[{x:muzzle.x+65,y:muzzle.y+12,vx:-60,vy:0,damage:10,torpedo:false,missile:false,dead:false}];
 g.setAim(900,E.CY);g.trigger('secondary',true);g.release();advance(g,.1);
 assert.equal(g.state.trialInterceptions,1);assert.equal(g.state.score,20);
 advance(g,.1);assert.equal(g.state.trialInterceptions,1);
});
test('low difficulty can complete all three trial objectives in sequence',()=>{
 const g=trial();g.setDifficulty('low');g.start();
 g.state.spawnLeft=0;advance(g,.02);assert.equal(g.state.phase,'shop');
 assert.equal(g.choosePerk('reload'),true);assert.equal(g.nextWave(),true);
 g.state.trialWaveTime=34.99;advance(g,.02);assert.equal(g.state.phase,'shop');
 assert.equal(g.choosePerk('magazine'),true);assert.equal(g.nextWave(),true);
 for(let i=0;i<3;i++){g.state.spawnTimer=0;advance(g,.02);}
 assert.equal(g.state.enemies.length,3);
 g.state.enemies.find(enemy=>enemy.command).hp=1;
 assert.equal(g.useItem(2),true);
 assert.equal(g.state.phase,'victory');assert.equal(g.state.hp>0,true);
});
