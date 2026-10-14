'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { createServer } = require('../server');
const Engine = require('../sea-engine');
const Save = require('../sea-save');
test('battle snapshot restores ships, upgrades, weapons and inventory with released controls', () => {
  const game = Engine.create(() => .5); game.start(); game.setAim(250, 230);
  for (let i = 0; i < 80; i++) game.step(.05);
  game.trigger('secondary', true); game.trigger('primary', true); game.useItem(1);
  const snapshot = JSON.parse(JSON.stringify(game.snapshot()));
  assert.ok(snapshot.state.enemies.length > 0); assert.ok(snapshot.state.bullets.length > 0);
  const restored = Engine.create(); restored.restore(snapshot);
  for (const key of ['wave','credits','score','upgrades','items','enemies','bullets','hostile','shield','gunHeat','cannonCooldown','spawnLeft']) assert.deepEqual(restored.state[key], game.snapshot().state[key]);
  assert.equal(restored.state.paused, true); assert.equal(restored.state.primary, false); assert.equal(restored.state.secondary, false);
  const before = restored.state.elapsed; restored.step(.1); assert.equal(restored.state.elapsed, before);
  restored.pause(false); for(let i=0;i<60;i++)restored.step(.05);
  assert.equal(new Set(restored.state.enemies.map(e=>e.id)).size, restored.state.enemies.length);
  const bad = JSON.parse(JSON.stringify(snapshot)); bad.state.enemies[0].x = Infinity;
  assert.throws(() => Save.clean(bad)); assert.throws(() => Save.clean({ version: 999 }));
  bad.state.enemies = new Array(1000).fill(snapshot.state.enemies[0]); assert.throws(() => Save.clean(bad));
  restored.useItem(2);
  assert.ok(restored.snapshot().state.enemies.every(e => e.hp > 0), 'airstrike deaths must be savable before next physics tick');
});
test('accounts persist securely, isolate progress, reject conflicting or invalid writes and survive restart', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'play-island-test-'));
  let server;
  const start = async () => { server = createServer({ dataDir: dir }); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); };
  const stop = () => new Promise(resolve => server.close(resolve));
  function request(route, { method = 'GET', data, cookie, id, origin = true, raw } = {}) {
    const port = server.address().port;
    return new Promise((resolve, reject) => {
      const req = http.request({ hostname: '127.0.0.1', port, path: '/api/' + route, method, headers: {
        'Content-Type': 'application/json', ...(origin ? { Origin: 'http://127.0.0.1:' + port } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(id ? { 'X-Account-ID': id } : {})
      } }, res => { let body=''; res.on('data', chunk=>body+=chunk); res.on('end',()=>resolve({ status:res.statusCode, data:JSON.parse(body), cookie:res.headers['set-cookie']?.[0] })); });
      req.on('error', reject); req.end(raw ?? (data ? JSON.stringify(data) : undefined));
    });
  }
  try {
    await start();
    assert.equal((await request('sea-save')).status,401);
    assert.equal((await request('register',{method:'POST',data:{username:'玩家甲',password:'example-pass-123'},origin:false})).status,403);
    assert.equal((await request('register',{method:'POST',data:{username:'玩家甲',password:'short'}})).status,400);
    const a=await request('register',{method:'POST',data:{username:'玩家甲',password:'example-pass-123'}});
    assert.equal(a.status,200); assert.match(a.cookie,/HttpOnly/); assert.match(a.cookie,/SameSite=Lax/); assert.equal(a.data.user.passwordHash,undefined);
    const authA={cookie:a.cookie,id:a.data.user.id};
    assert.equal((await request('register',{method:'POST',data:{username:'玩家甲',password:'example-pass-123'}})).status,409);
    assert.equal((await request('login',{method:'POST',data:{username:'玩家甲',password:'incorrect-pass'}})).status,401);
    const b=await request('register',{method:'POST',data:{username:'玩家乙',password:'example-pass-456'}});
    const authB={cookie:b.cookie,id:b.data.user.id};
    const game=Engine.create();game.state.wave=6;game.equip('primary','howitzer');game.equip('secondary','rapid');game.start();for(let i=0;i<20;i++)game.step(.1);game.trigger('primary',true);game.trigger('secondary',true);
    const snapshot=game.snapshot();
    const saved=await request('sea-save',{...authA,method:'PUT',data:{revision:0,snapshot}});assert.equal(saved.status,200);assert.equal(saved.data.revision,1);
    assert.deepEqual((await request('sea-save',authA)).data.snapshot,snapshot);
    assert.equal((await request('sea-save',authB)).data.snapshot,null);
    assert.equal((await request('sea-save',{...authB,id:authA.id,method:'PUT',data:{revision:0,snapshot}})).status,409);
    assert.equal((await request('sea-save',{...authA,method:'PUT',data:{revision:0,snapshot}})).status,409);
    const bad=JSON.parse(JSON.stringify(snapshot));bad.state.hp=-1;
    assert.equal((await request('sea-save',{...authA,method:'PUT',data:{revision:1,snapshot:bad}})).status,400);
    assert.equal((await request('sea-save',{...authA,method:'PUT',raw:'{broken'})).status,400);
    const concurrent=await Promise.all([1,2].map(()=>request('sea-save',{...authA,method:'PUT',data:{revision:1,snapshot}})));
    assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
    assert.ok(!fs.readFileSync(path.join(dir,'accounts.json'),'utf8').includes('example-pass'));
    const stored=JSON.parse(fs.readFileSync(path.join(dir,'accounts.json'),'utf8'));assert.notEqual(stored[0].salt,stored[1].salt);assert.equal(stored[0].passwordHash.length,128);
    assert.equal((await request('logout',{...authA,method:'POST',data:{}})).status,200);assert.equal((await request('sea-save',authA)).status,401);
    await stop();await start();
    const again=await request('login',{method:'POST',data:{username:'玩家甲',password:'example-pass-123'}});assert.equal(again.status,200);
    const reloaded=await request('sea-save',{cookie:again.cookie,id:again.data.user.id});assert.equal(reloaded.data.revision,2);assert.deepEqual(reloaded.data.snapshot,snapshot);
    assert.equal((await request('me')).data.user,null);
  } finally { if(server?.listening)await stop();fs.rmSync(dir,{recursive:true,force:true}); }
});
