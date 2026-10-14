const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../sea-audio.js'),'utf8');
function fixture(supported=true){
  const contexts=[],nodes=[],saved=new Map();
  const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
  function node(){const n={gain:param(),frequency:param(),threshold:param(),ratio:param(),connect(){},disconnect(){},start(){n.started=true;},stop(time){if(time===undefined){n.stopped=true;n.onended?.();}}};nodes.push(n);return n;}
  class Audio{constructor(){this.currentTime=0;this.sampleRate=8000;this.state='suspended';contexts.push(this);}createGain(){return node();}createDynamicsCompressor(){return node();}createBiquadFilter(){return node();}createOscillator(){return node();}createBufferSource(){return node();}createBuffer(){return{getChannelData:()=>new Float32Array(8000)};}resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}}
  const scope={window:supported?{AudioContext:Audio}:{},localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)}};
  vm.runInNewContext(source,scope);return{audio:scope.window.SeaAudio.create(),contexts,nodes,saved};
}
test('audio waits for user unlock; mute stops voices and persists preference',()=>{
  const f=fixture();f.audio.play('gun');assert.equal(f.contexts.length,0);
  f.audio.unlock();f.audio.play('gun');assert.equal(f.nodes.filter(n=>n.started).length,2);
  f.audio.setEnabled(false);assert.ok(f.nodes.filter(n=>n.started).every(n=>n.stopped));assert.equal(f.contexts[0].state,'suspended');
  const count=f.nodes.length;f.audio.play('cannon');assert.equal(f.nodes.length,count);assert.equal(f.saved.get('play-island-sea-sound'),'off');
  f.audio.setEnabled(true);f.audio.play('cannon');assert.ok(f.nodes.length>count);
});
test('all effects produce voices, enforce a voice cap, and stop without replaying old sounds',()=>{
  const f=fixture();f.audio.unlock();
  for(const kind of ['gun','cannon','explosion','hit','overheat','ready','cooled','shield','wave','victory','defeat']){f.contexts[0].currentTime++;const count=f.nodes.length;f.audio.play(kind);assert.ok(f.nodes.length>count,kind);}
  for(let i=0;i<100;i++){f.contexts[0].currentTime++;f.audio.play('gun');}
  assert.ok(f.nodes.filter(n=>n.started&&!n.stopped).length<=32);
  f.audio.stop();const count=f.nodes.length;f.audio.play('gun');assert.equal(f.nodes.length,count);
  f.audio.unlock();assert.equal(f.nodes.length,count);
});
test('unsupported browsers keep gameplay usable with no audio exceptions',()=>{
  const f=fixture(false);f.audio.unlock();f.audio.play('cannon');f.audio.stop();f.audio.setEnabled(false);assert.equal(f.audio.enabled,false);
});
