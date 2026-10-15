const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const Engine = require('../sea-engine');

// Exercise orchestration with controlled network responses, without a browser.
function fixture(user = null) {
  const elements = new Map(), writes = [], reads = [], frames = new Map(), globals = {}, drawings = [], wakeDrawings = [];
  let sequence = 0, snapshot = null, failRead = false, failWrite = false, storedRevision = 0, activeGame, touch = false;
  class Element {
    constructor() { this.textContent='';this.style={};this.dataset={};this.events={};this.classList={toggle(){}};this.open=false; }
    addEventListener(name, fn) { (this.events[name] ||= []).push(fn); }
    async emit(name, event={}) { for(const fn of this.events[name]||[])await fn(event); }
    setAttribute(){} after(){} focus(){} getContext(){return context;} querySelector(s){return element(s);} querySelectorAll(){return [];}
    setPointerCapture(){} getBoundingClientRect(){return {left:0,top:0,width:100,height:100};}
    showModal(){this.open=true;} close(){this.open=false;return this.emit('close');}
    set innerHTML(value){this.markup=value;} get innerHTML(){return this.markup||'';}
  }
  function element(selector) {if(!elements.has(selector))elements.set(selector,new Element());return elements.get(selector);}
  // Use the older Canvas API deliberately: a catch-all mock masks unsupported calls.
  const context = { globalAlpha: 1 };
  for (const name of ['beginPath','closePath','clearRect','fillRect','strokeRect','save','restore','translate','rotate','scale','setTransform','setLineDash','arc','ellipse','moveTo','lineTo','quadraticCurveTo','fill','stroke','fillText']) {
    context[name] = (...args) => { for (const n of args) if (typeof n === 'number') assert.ok(Number.isFinite(n), name); drawings.push(name); if(name==='ellipse'&&args[0]<-10&&args[1]===0)wakeDrawings.push({x:args[0],rx:args[2],ry:args[3]}); };
  }
  for (const name of ['createRadialGradient','createLinearGradient']) context[name] = () => ({ addColorStop() {} });
  const dialog=new Element();
  const account={user,ready:Promise.resolve(),open(){},async api(route, options={}){
    if(options.method==='PUT'){
      if(failWrite)throw new Error('网络中断');
      const value=JSON.parse(options.body);assert.equal(value.revision,storedRevision);storedRevision++;
      writes.push(value);snapshot=value.snapshot;return{revision:storedRevision,updatedAt:new Date().toISOString(),bestScore:0};
    }
    reads.push(route);if(failRead)throw new Error('读取失败');return{revision:storedRevision,snapshot,bestScore:0,updatedAt:null};
  }};
  const art={status:'ready',load:()=>Promise.resolve(),ocean:()=>true,battery:()=>{drawings.push('battery');return true;},ship:()=>{drawings.push('ship');return true;},explosion:()=>true};
  const window={SeaEngine:{...Engine,create:()=>activeGame=Engine.create()},SeaArt:art,SeaAudio:{create:()=>({stop(){},unlock(){},drainSounds(){},play(){}})},Accounts:account,innerWidth:844,innerHeight:390,matchMedia:()=>({matches:touch}),addEventListener:(n,f)=>globals[n]=f};
  const document={body:{append(){}},createElement:t=>t==='dialog'?dialog:new Element(),addEventListener:(n,f)=>globals[n]=f};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../sea.js'),'utf8'),{window,document,Date,Math,requestAnimationFrame:f=>{frames.set(++sequence,f);return sequence;},cancelAnimationFrame:id=>frames.delete(id)});
  const action=name=>dialog.emit('click',{target:{closest:selector=>selector==='[data-sea-action]'?{dataset:{seaAction:name}}:null}});
  const flush=()=>new Promise(resolve=>setImmediate(resolve));
  function frame(time) { const [id,fn]=frames.entries().next().value;frames.delete(id);fn(time); }
  return {window,document,globals,get game(){return activeGame;},setTouch:v=>touch=v,dialog,element,writes,reads,action,flush,drawings,wakeDrawings,frames,frame,art,setReadFailure:v=>failRead=v,setWriteFailure:v=>failWrite=v,setSnapshot:v=>snapshot=v};
}

test('help pauses combat, releases firing and closes when resuming or opening weapons',async()=>{
  const f=fixture();await f.window.SeaDefense.open();await f.action('start');
  f.game.trigger('secondary',true);
  await f.element('#sea-help-toggle').emit('click');
  assert.equal(f.element('#sea-help-panel').hidden,false);
  assert.equal(f.game.state.paused,true);assert.equal(f.game.state.secondary,false);
  await f.element('#sea-help-close').emit('click');
  assert.equal(f.element('#sea-help-panel').hidden,true);assert.equal(f.game.state.paused,true);
  await f.element('#sea-help-toggle').emit('click');await f.element('#sea-pause').emit('click');
  assert.equal(f.element('#sea-help-panel').hidden,true);assert.equal(f.game.state.paused,false);
  await f.element('#sea-help-toggle').emit('click');await f.element('#sea-armory-toggle').emit('click');
  assert.equal(f.element('#sea-help-panel').hidden,true);assert.equal(f.element('#sea-armory').hidden,false);
  await f.dialog.close();
});

test('two thumbs can steer and fire independently; extra fingers and cancellations cannot stick firing',async()=>{
  const f=fixture();f.setTouch(true);await f.window.SeaDefense.open();await f.action('start');
  const event=(id,x=90,y=50)=>({pointerId:id,button:0,clientX:x,clientY:y,preventDefault(){}});
  await f.element('#sea-stick').emit('pointerdown',event(1));
  await f.element('#sea-cannon').emit('pointerdown',event(2));
  f.game.step(.02);assert.ok(f.game.state.bullets.some(b=>b.type==='primary'));assert.ok(f.game.state.bullets.some(b=>b.type==='secondary'));
  await f.element('#sea-cannon').emit('pointerup',event(3));
  assert.equal(f.game.state.primary,true);
  await f.element('#sea-stick').emit('pointercancel',event(1));
  assert.equal(f.game.state.secondary,false);assert.equal(f.game.state.primary,true);
  await f.element('#sea-cannon').emit('lostpointercapture',event(2));assert.equal(f.game.state.primary,false);
  await f.element('#sea-stick').emit('pointerdown',event(4));
  await f.element('#sea-pause').emit('click');assert.equal(f.game.state.secondary,false);
  await f.element('#sea-stick').emit('pointermove',event(4));assert.equal(f.game.state.secondary,false);
  await f.dialog.close();
});

test('portrait mobile cannot start combat, rotation pauses, rejected fullscreen still permits landscape play',async()=>{
  const f=fixture();f.setTouch(true);f.window.innerWidth=390;f.window.innerHeight=844;
  let requests=0;
  f.element('#sea-surface').requestFullscreen=async()=>{requests++;throw new Error('Unsupported');};
  await f.window.SeaDefense.open();await f.action('start');await f.flush();
  assert.equal(f.game.state.phase,'ready');assert.ok(requests>0);
  f.window.innerWidth=844;f.window.innerHeight=390;f.globals.resize();await f.action('start');
  assert.equal(f.game.state.phase,'playing');assert.equal(f.game.state.paused,false);
  f.window.innerWidth=390;f.window.innerHeight=844;f.globals.resize();assert.equal(f.game.state.paused,true);
  await f.dialog.close();
});

test('a late orientation lock cannot keep the phone locked after leaving the game',async()=>{
  const f=fixture();f.setTouch(true);let finishLock,unlocked=0,exited=0;
  f.document.documentElement={requestFullscreen:async()=>{throw new Error('Never fullscreen the portal');}};
  f.element('#sea-surface').requestFullscreen=async()=>{f.document.fullscreenElement=f.element('#sea-surface');};
  f.document.exitFullscreen=async()=>{exited++;f.document.fullscreenElement=null;};
  f.window.screen={orientation:{lock:async mode=>{assert.equal(mode,'landscape');await new Promise(resolve=>finishLock=resolve);},unlock:()=>unlocked++}};
  await f.window.SeaDefense.open();await f.flush();await f.dialog.close();
  finishLock();await f.flush();assert.equal(exited,1);assert.equal(unlocked,1);
});

test('mobile fullscreen targets only game content inside the open dialog',async()=>{
  const f=fixture();f.setTouch(true);let target;
  f.dialog.requestFullscreen=async()=>{throw new Error('Dialogs cannot enter fullscreen');};
  f.document.documentElement={requestFullscreen:async()=>{throw new Error('Portal must remain behind the game');}};
  f.element('#sea-surface').requestFullscreen=async function(){target=this;f.document.fullscreenElement=this;};
  f.document.exitFullscreen=async()=>{f.document.fullscreenElement=null;};
  await f.window.SeaDefense.open();await f.flush();
  assert.equal(target,f.element('#sea-surface'));assert.equal(f.document.fullscreenElement,target);assert.equal(f.dialog.open,true);
  await f.dialog.close();
});
test('a damaged ship draws its health bar, then the turret, and schedules subsequent frames without roundRect',async()=>{
  const f=fixture({id:'test-user'}),g=Engine.create(()=>.5);g.start();for(let i=0;i<40;i++)g.step(.05);
  const ship=g.state.enemies[0];ship.hp-=14;ship.flash=.09;
  f.setSnapshot(g.snapshot());await f.window.SeaDefense.open();await f.action('start');await f.flush();
  for(let i=0;i<5;i++){
    f.drawings.length=0;f.frame(1000+i*16);
    assert.ok(f.drawings.includes('quadraticCurveTo'),'damaged ship has a health bar');
    assert.ok(f.drawings.lastIndexOf('battery')>f.drawings.indexOf('ship'),'turret still drawn after enemy');
    assert.equal(f.frames.size,1,'animation keeps running');
  }
  await f.dialog.close();await f.flush();
});
test('missing ship and battery textures still render using compatible canvas paths',async()=>{
  const f=fixture();f.art.ship=()=>false;f.art.battery=()=>false;
  await f.window.SeaDefense.open();await f.action('start');f.frame(1000);f.frame(1016);
  assert.ok(f.drawings.includes('quadraticCurveTo'));assert.equal(f.frames.size,1);
  await f.dialog.close();
});
test('guests play and close without reading or writing a save',async()=>{
  const f=fixture();await f.window.SeaDefense.open();await f.action('start');await f.dialog.close();await f.flush();
  assert.equal(f.writes.length,0);assert.equal(f.reads.length,0);
  assert.match(f.element('#sea-save-status').textContent,/游客模式/);
});
test('battle HUD shows the last round, automatic reload and cannon loading',async()=>{
  const f=fixture();await f.window.SeaDefense.open();await f.action('start');
  f.game.state.gunAmmo=1;f.game.trigger('secondary',true);f.game.release();
  f.game.trigger('primary',true);f.game.release();f.frame(1000);
  assert.match(f.element('#sea-ammo-value').textContent,/换弹/);
  assert.match(f.element('#sea-reload-value').textContent,/s$/);
  assert.match(f.element('#sea-cannon-status').textContent,/装填/);
  await f.dialog.close();
});
test('ready screen selects and saves difficulty, and canvas maps the expanded sea to aim',async()=>{
  const f=fixture({id:'test-user'});await f.window.SeaDefense.open();
  assert.match(f.element('.sea-overlay').innerHTML,/选择难度/);
  await f.dialog.emit('click',{target:{closest:selector=>selector==='[data-sea-difficulty]'?{dataset:{seaDifficulty:'low'}}:null}});
  await f.flush();assert.equal(f.game.state.difficulty,'low');
  assert.equal(f.writes.at(-1).snapshot.state.difficulty,'low');
  await f.action('start');
  await f.element('canvas').emit('pointermove',{clientX:0,clientY:0});
  assert.equal(f.game.state.aim.x,-Engine.VIEW_PAD_X);
  assert.equal(f.game.state.aim.y,-Engine.VIEW_PAD_Y);
  await f.dialog.close();await f.flush();
});
test('between-wave shop offers a full repair that immediately restores maximum health',async()=>{
  const g=Engine.create();g.state.phase='shop';g.state.hp=60;g.state.credits=200;
  const account=fixture({id:'test-user'});account.setSnapshot(g.snapshot());
  await account.window.SeaDefense.open();
  assert.match(account.element('.sea-overlay').innerHTML,/全面修复/);
  assert.match(account.element('.sea-overlay').innerHTML,/下一波难度/);
  await account.dialog.emit('click',{target:{closest:selector=>selector==='[data-sea-difficulty]'?{dataset:{seaDifficulty:'low'}}:null}});
  assert.equal(account.game.state.difficulty,'low');
  await account.dialog.emit('click',{target:{closest:selector=>selector==='[data-sea-buy]'?{dataset:{seaBuy:'fullRepair'}}:null}});
  await account.flush();assert.equal(account.game.state.hp,account.game.state.maxHp);
  await account.dialog.close();await account.flush();
});
test('armory shows locked weapons and equips an unlocked choice into the saved loadout',async()=>{
  const f=fixture({id:'test-user'}),g=Engine.create();g.state.wave=2;g.state.phase='shop';f.setSnapshot(g.snapshot());
  await f.window.SeaDefense.open();await f.element('#sea-armory-toggle').emit('click');
  const cards=f.element('#sea-armory-cards').innerHTML;
  assert.match(cards,/第 6 波解锁/);assert.match(cards,/扩散火炮/);assert.match(cards,/双联机枪/);
  await f.dialog.emit('click',{target:{closest:selector=>selector==='[data-sea-weapon]'?{dataset:{seaSlot:'primary',seaWeapon:'spread'}}:null}});await f.flush();
  assert.equal(f.element('#sea-primary-name').textContent,'扩散火炮');assert.equal(f.writes.at(-1).snapshot.state.loadout.primary,'spread');
  await f.dialog.close();await f.flush();
});
test('opening the armory pauses an active fight and continuing closes it',async()=>{
  const f=fixture({id:'test-user'});await f.window.SeaDefense.open();await f.action('start');await f.flush();
  await f.element('#sea-armory-toggle').emit('click');await f.flush();
  assert.equal(f.element('#sea-armory').hidden,false);assert.equal(f.writes.at(-1).snapshot.state.paused,true);
  await f.action('start');await f.flush();assert.equal(f.element('#sea-armory').hidden,true);assert.equal(f.writes.at(-1).snapshot.state.paused,false);
  await f.dialog.close();await f.flush();
});
test('account resumes the exact battle and saves on pause and exit',async()=>{
  const f=fixture({id:'test-user'}),g=Engine.create();g.start();for(let i=0;i<40;i++)g.step(.1);f.setSnapshot(g.snapshot());
  await f.window.SeaDefense.open();assert.match(f.element('.sea-overlay').innerHTML,/继续战斗/);
  await f.action('start');await f.flush();await f.element('#sea-pause').emit('click');await f.flush();
  await f.dialog.close();await f.flush();
  assert.ok(f.writes.length>=2);const state=f.writes.at(-1).snapshot.state;
  assert.equal(state.elapsed,g.state.elapsed);assert.equal(state.enemies.length,g.state.enemies.length);assert.equal(state.paused,true);
});
test('failed reads cannot start a battle or overwrite the cloud save',async()=>{
  const f=fixture({id:'test-user'});f.setReadFailure(true);await f.window.SeaDefense.open();await f.action('start');await f.dialog.close();await f.flush();
  assert.equal(f.writes.length,0);assert.match(f.element('#sea-save-status').textContent,/读取失败/);
});
test('failed writes keep the in-memory game for retry and prevent logout data loss',async()=>{
  const f=fixture({id:'test-user'});await f.window.SeaDefense.open();f.setWriteFailure(true);await f.action('start');await f.flush();
  await f.dialog.close();await f.flush();await f.window.SeaDefense.open();
  assert.equal(f.reads.length,1);assert.match(f.element('#sea-save-status').textContent,/网络中断/);
  await assert.rejects(()=>f.window.SeaDefense.beforeLogout(),/尚未保存/);
  f.setWriteFailure(false);await f.element('#sea-save-action').emit('click');await f.flush();
  assert.equal(f.writes.at(-1).snapshot.state.phase,'playing');assert.match(f.element('#sea-save-status').textContent,/已保存/);
});


test('pending fullscreen requests are deduplicated and closing the game cancels a late entry',async()=>{
  const f=fixture();f.setTouch(true);let complete,requests=0,exits=0;
  const surface=f.element('#sea-surface');
  surface.requestFullscreen=async()=>{requests++;await new Promise(resolve=>complete=resolve);f.document.fullscreenElement=surface;};
  f.document.exitFullscreen=async()=>{exits++;f.document.fullscreenElement=null;};
  await f.window.SeaDefense.open();
  const repeated=f.element('#sea-fullscreen').emit('click');
  assert.equal(requests,1);
  await f.dialog.close();complete();await repeated;await f.flush();
  assert.equal(exits,1);assert.equal(f.document.fullscreenElement,null);
});

test('visible fullscreen button works without touch detection and toggles back without reentering on play',async()=>{
  const f=fixture();const surface=f.element('#sea-surface');let requests=0;
  surface.requestFullscreen=async()=>{requests++;f.document.fullscreenElement=surface;};
  f.document.exitFullscreen=async()=>{f.document.fullscreenElement=null;f.globals.fullscreenchange();};
  await f.window.SeaDefense.open();assert.equal(requests,0);
  await f.element('#sea-fullscreen').emit('click');
  assert.equal(f.document.fullscreenElement,surface);assert.match(f.element('#sea-fullscreen').textContent,/退出全屏/);
  await f.element('#sea-fullscreen').emit('click');await f.action('start');
  assert.equal(f.document.fullscreenElement,null);assert.equal(requests,1);
  assert.equal(f.game.state.phase,'playing');await f.dialog.close();
});

test('manual fullscreen rejection explains the fallback and leaves the game playable',async()=>{
  const f=fixture();f.element('#sea-surface').requestFullscreen=async()=>{throw new Error('Denied');};
  await f.window.SeaDefense.open();await f.element('#sea-fullscreen').emit('click');
  assert.equal(f.element('#sea-display-status').hidden,false);
  assert.match(f.element('#sea-display-status').textContent,/未开启全屏/);
  await f.action('start');assert.equal(f.game.state.phase,'playing');await f.dialog.close();
});

test('wake follows hull size and measured movement, fades when stopped, and stays frozen on pause',async()=>{
  const f=fixture();await f.window.SeaDefense.open();await f.action('start');f.game.pause(true);
  let time=1000;
  function sample(radius,speed){
    const enemy={x:200,y:200,radius,angle:0,age:0,type:'patrol',hp:100,maxHp:100};
    f.game.state.enemies=[enemy];f.frame(time+=50);
    for(let i=0;i<30;i++){
      enemy.x+=speed*.05;f.game.state.elapsed+=.05;f.wakeDrawings.length=0;f.frame(time+=50);
    }
    return {width:Math.max(...f.wakeDrawings.map(p=>p.ry)),length:Math.max(...f.wakeDrawings.map(p=>-p.x+p.rx)),enemy};
  }
  const small=sample(13,37),large=sample(37,37);
  assert.ok(large.width>small.width*2,'larger hull produces a visibly broader wake');
  const fast=sample(17,64),slow=sample(17,16);
  assert.ok(fast.length>slow.length*1.5,'actual slowdown shortens the wake');
  const paused=JSON.stringify(f.wakeDrawings);f.wakeDrawings.length=0;f.frame(time+=50);
  assert.equal(JSON.stringify(f.wakeDrawings),paused,'no foam animation while simulation is paused');
  for(let i=0;i<40;i++){f.game.state.elapsed+=.05;f.wakeDrawings.length=0;f.frame(time+=50);}
  assert.equal(f.wakeDrawings.length,0,'stationary ships stop producing a wake');
  slow.enemy.submerged=true;slow.enemy.x+=20;f.game.state.elapsed+=.05;f.frame(time+=50);
  assert.equal(f.wakeDrawings.length,0,'submerged ships have no surface wake');
  await f.dialog.close();
});
