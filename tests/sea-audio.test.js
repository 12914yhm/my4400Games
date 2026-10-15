const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../sea-audio.js'),'utf8');
function fixture(supported=true,network=null){
  const contexts=[],nodes=[],buffers=[],saved=new Map();
  const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
  function node(){const n={gain:param(),frequency:param(),threshold:param(),ratio:param(),connect(){},disconnect(){},start(time,...args){n.started=true;n.startTime=time;n.startArgs=args;},stop(time){if(time===undefined){n.stopped=true;n.onended?.();}else n.stopTime=time;}};nodes.push(n);return n;}
  class Audio{constructor(){this.currentTime=0;this.sampleRate=48000;this.state='suspended';contexts.push(this);}createGain(){return node();}createDynamicsCompressor(){return node();}createBiquadFilter(){return node();}createOscillator(){return node();}createBufferSource(){return node();}createBuffer(channels,length,rate){const data=Array.from({length:channels},()=>new Float32Array(length)),buffer={duration:length/rate,length,numberOfChannels:channels,getChannelData:c=>data[c]};buffers.push(buffer);return buffer;}resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}}
  const scope={window:supported?{AudioContext:Audio}:{},localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)}};
  if(network){
    scope.fetch=network.fetch;
    Audio.prototype.decodeAudioData=function(bytes){network.decodes=(network.decodes||0)+1;return network.failDecode?Promise.reject(new Error('decode failed')):Promise.resolve(this.createBuffer(2,48000*20,48000));};
  }
  vm.runInNewContext(source,scope);return{audio:scope.window.SeaAudio.create(),contexts,nodes,buffers,saved};
}
test('audio waits for user unlock; mute stops voices and persists preference',()=>{
  const f=fixture();f.audio.play('gun');assert.equal(f.contexts.length,0);
  f.audio.unlock();f.audio.play('gun');assert.equal(f.nodes.filter(n=>n.started).length,1);
  f.audio.setEnabled(false);assert.ok(f.nodes.filter(n=>n.started).every(n=>n.stopped));assert.equal(f.contexts[0].state,'suspended');
  const count=f.nodes.length;f.audio.play('cannon');assert.equal(f.nodes.length,count);assert.equal(f.saved.get('play-island-sea-sound'),'off');
  f.audio.setEnabled(true);f.audio.play('cannon');assert.ok(f.nodes.length>count);
});
test('all effects produce voices, enforce a voice cap, and stop without replaying old sounds',()=>{
  const f=fixture();f.audio.unlock();
  for(const kind of ['gun','cannon','explosion','hit','overheat','ready','cooled','shield','wave','victory','defeat']){f.contexts[0].currentTime++;const count=f.nodes.length;f.audio.play(kind);assert.ok(f.nodes.length>count,kind);}
  for(let i=0;i<100;i++){f.contexts[0].currentTime++;f.audio.play('gun');}
  assert.ok(f.nodes.filter(n=>n.started&&!n.stopped).length<=64);
  f.audio.stop();const count=f.nodes.length;f.audio.play('gun');assert.equal(f.nodes.length,count);
  f.audio.unlock();assert.equal(f.nodes.length,count);
});
test('unsupported browsers keep gameplay usable with no audio exceptions',()=>{
  const f=fixture(false);f.audio.unlock();f.audio.play('cannon');f.audio.stop();f.audio.setEnabled(false);assert.equal(f.audio.enabled,false);
});

test('energy weapons produce bounded voices and stop immediately when paused',()=>{
  const f=fixture();
  for(const kind of ['beam','pierce','chain','plasma','cryo']){
    f.audio.unlock();const before=f.nodes.filter(n=>n.started).length;f.audio.play(kind);
    assert.equal(f.nodes.filter(n=>n.started).length-before,1,kind);
    f.audio.stop();assert.ok(f.nodes.filter(n=>n.started).every(n=>n.stopped));
  }
});

test('cannon sample contains its full tail and is cancelled on pause',()=>{
  const f=fixture();f.audio.unlock();f.audio.play('cannon');
  const voices=f.nodes.filter(n=>n.started);
  assert.equal(voices.length,1);
  assert.ok(voices[0].stopTime>1.3);
  const data=voices[0].buffer.getChannelData(0);
  assert.ok(data.slice(4800).some(v=>Math.abs(v)>.001));
  f.audio.play('cannon');assert.equal(f.nodes.filter(n=>n.started).length,1);
  f.audio.stop();assert.ok(voices.every(n=>n.stopped));
});

test('every equipped weapon emits its own sound event exactly once per volley',()=>{
  const Engine=require('../sea-engine'),{WEAPONS}=require('../sea-weapons');
  for(const [slot,list] of Object.entries(WEAPONS))for(const weapon of list){
    const game=Engine.create();game.state.wave=16;game.equip(slot,weapon.id);game.start();game.drainSounds();
    game.trigger(slot,true);assert.deepEqual(game.drainSounds(),['weapon:'+weapon.id]);
    game.trigger(slot,true);assert.deepEqual(game.drainSounds(),[]);
  }
});

test('eleven weapons render distinct finite stereo samples without clipping or abrupt ends',()=>{
  const f=fixture(),hashes=new Set(),crypto=require('node:crypto'),{WEAPONS}=require('../sea-weapons');f.audio.unlock();
  for(const weapon of Object.values(WEAPONS).flat()){
    f.contexts[0].currentTime++;f.audio.play('weapon:'+weapon.id);
    const sample=f.nodes.filter(n=>n.started).at(-1).buffer;
    assert.equal(sample.numberOfChannels,2);
    const data=sample.getChannelData(0);let energy=0,mean=0,peak=0;
    for(const value of data){assert.ok(Number.isFinite(value));energy+=value*value;mean+=value;peak=Math.max(peak,Math.abs(value));}
    assert.ok(peak<=.861 && peak>.15,weapon.id);assert.ok(energy/data.length>.00001,weapon.id);
    assert.ok(Math.abs(mean/data.length)<.015,weapon.id);assert.ok(data[0]===0);assert.ok(data.at(-1)===0);
    hashes.add(crypto.createHash('sha256').update(Buffer.from(data.buffer)).digest('hex'));
    f.audio.stop();f.audio.unlock();
  }
  assert.equal(hashes.size,11);
});

test('fast fire retains every shot, reuses three variants, and leaves no voices after mute',()=>{
  const f=fixture();f.audio.unlock();
  for(let i=0;i<80;i++){f.contexts[0].currentTime=i*.042;f.audio.play('weapon:rapid');}
  const voices=f.nodes.filter(n=>n.started);
  assert.equal(voices.length,80);assert.equal(new Set(voices.map(n=>n.buffer)).size,3);
  assert.ok(voices.filter(n=>!n.stopped).length<=64);
  assert.notDeepEqual(voices[0].buffer.getChannelData(0),voices[1].buffer.getChannelData(0));
  f.audio.setEnabled(false);assert.ok(voices.every(n=>n.stopped));
});

test('recorded banks preload once, decode after unlock and rotate full-tail shot offsets',async()=>{
  const requests=[],network={fetch:async url=>{requests.push(url);return{ok:true,arrayBuffer:async()=>new ArrayBuffer(1)}}};
  const f=fixture(true,network);await f.audio.load();assert.equal(f.contexts.length,0);assert.equal(requests.length,7);
  f.audio.unlock();await f.audio.load();await f.audio.load();assert.equal(network.decodes,7);assert.equal(requests.length,7);
  for(let i=0;i<3;i++){f.contexts[0].currentTime=i*6;f.audio.play('weapon:cannon');}
  const voices=f.nodes.filter(n=>n.started);assert.deepEqual(voices.map(n=>n.startArgs),[[0,5.4],[5.4,5.4],[0,5.4]]);
  assert.ok(voices.every(n=>n.stopTime-n.startTime>5.4));
  f.audio.stop();assert.ok(voices.every(n=>n.stopped));
});

test('missing files or decode errors fall back without blocking fire or throwing',async()=>{
  for(const network of [{fetch:async()=>{throw new Error('offline')}},{fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)}),failDecode:true}]){
    const f=fixture(true,network);f.audio.unlock();await f.audio.load();f.audio.play('weapon:cannon');
    assert.equal(f.nodes.filter(n=>n.started).length,1);assert.ok(f.nodes.find(n=>n.started).buffer.duration<2);
  }
});

test('finishing a pending download while muted never starts or replays a shot',async()=>{
  let resolve;const gate=new Promise(r=>resolve=r),network={fetch:async()=>{await gate;return{ok:true,arrayBuffer:async()=>new ArrayBuffer(1)}}};
  const f=fixture(true,network);f.audio.unlock();f.audio.play('weapon:cannon');f.audio.setEnabled(false);
  const count=f.nodes.filter(n=>n.started).length;resolve();await f.audio.load();
  assert.equal(f.nodes.filter(n=>n.started).length,count);assert.ok(f.nodes.filter(n=>n.started).every(n=>n.stopped));
});
