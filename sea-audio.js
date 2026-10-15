(function () {
  'use strict';
  const durations = {machinegun:.28,twin:.36,rapid:.24,cannon:1.35,spread:1.1,howitzer:1.85,laser:1.4,railgun:3.2,plasma:3.4,cryo:.9,tesla:1.4};
  const recordings={machinegun:{slot:2.4,count:3},twin:{slot:2.4,count:3},rapid:{slot:2.4,count:3},spread:{slot:3.2,count:2},cannon:{slot:5.4,count:2},howitzer:{slot:6,count:2},impact:{slot:2,count:1}};
  const MAX_VOICES=64;
  // Original synthesized samples: pressure bursts, damped metal and outdoor reflections.
  // Energy weapons are fictional; avoid musical pitch sweeps and use physical transients.
  function weaponBuffer(context, id, variation) {
    const rate=context.sampleRate, length=Math.ceil(durations[id]*rate);
    const dry=new Float32Array(length), buffer=context.createBuffer(2,length,rate);
    let seed=12345+variation*7919;
    for(const c of id)seed=(Math.imul(seed,31)+c.charCodeAt(0))>>>0;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const pitch=.97+random()*.06;
    function burst(at,duration,volume,low=6000,high=120,decay=.2) {
      let lp=0,hp=0;
      const a=1-Math.exp(-2*Math.PI*Math.min(low,rate*.42)/rate),b=1-Math.exp(-2*Math.PI*high/rate);
      const start=Math.round(at*rate),count=Math.min(Math.ceil(duration*rate),length-start);
      for(let i=0;i<count;i++){
        const t=i/rate;lp+=a*(random()*2-1-lp);hp+=b*(lp-hp);
        dry[start+i]+=(lp-hp)*volume*(1-Math.exp(-t/.00035))*Math.exp(-t/(duration*decay))*Math.min(1,(duration-t)/.008);
      }
    }
    function body(at,duration,hz,volume) {
      const start=Math.round(at*rate),count=Math.min(Math.ceil(duration*rate),length-start),f=2*Math.PI*hz*pitch;
      for(let i=0;i<count;i++){
        const t=i/rate,ring=.68*Math.sin(f*t)+.22*Math.sin(f*1.63*t)+.1*Math.sin(f*2.71*t);
        dry[start+i]+=ring*volume*(1-Math.exp(-t/.0015))*Math.exp(-t/(duration*.16))*Math.min(1,(duration-t)/.01);
      }
    }
    function bolt(at,volume=.12,hz=1300){burst(at,.025,volume,7000,900);body(at,.055,hz,volume*.3);}
    function report(at,weight=1,deep=100,tail=.5){
      burst(at,.035,.95*weight,9500,650); // supersonic crack
      burst(at+.002,.19,.7*weight,2400,90,.24);
      body(at+.001,.27,deep,.6*weight);
      burst(at+.025,tail,.42*weight,850,40,.24);
    }
    switch(id){
      case 'machinegun':report(0,.55,175,.16);bolt(.045,.2);break;
      case 'twin':report(0,.48,145,.22);report(.014,.43,155,.2);bolt(.058,.24,1050);break;
      case 'rapid':report(0,.65,125,.13);bolt(.03,.25,850);break;
      case 'cannon':report(0,1.05,78,.85);body(.008,.62,49,.35);bolt(.16,.18,420);break;
      case 'spread':
        [0,.018,.036].forEach(t=>report(t,.55,110,.45));bolt(.14,.22,650);break;
      case 'howitzer':report(0,1.2,58,1.3);body(.012,.9,34,.42);burst(.055,1.2,.5,420,28,.3);bolt(.24,.23,290);break;
      case 'laser':
        burst(0,.018,.9,10000,1800);burst(.007,.23,.55,4400,900,.3);
        body(.002,.14,210,.32);burst(.12,.28,.16,2100,400,.35);bolt(.035,.13,1600);break;
      case 'railgun':
        burst(0,.012,1.35,12000,1900);report(.003,.85,95,.55);
        body(.005,.28,340,.22);burst(.025,.36,.35,5000,1400,.24);bolt(.14,.25,700);break;
      case 'plasma':
        burst(0,.06,.7,3200,120);body(.002,.75,62,.65);body(.004,.4,142,.25);
        burst(.015,.95,.85,1100,55,.35);burst(.08,.55,.22,4700,1800,.4);bolt(.12,.15,480);break;
      case 'cryo':
        burst(0,.025,.6,6500,800);body(.001,.11,240,.26);bolt(.028,.2,1750);
        burst(.018,.22,.38,9500,3300,.38);break;
      case 'tesla':
        [0,.021,.055,.093].forEach((t,i)=>{burst(t,.018,.8-i*.12,11000,1200);body(t,.065,120+i*75,.18);});
        burst(.01,.32,.32,3200,500,.42);bolt(.02,.15,1900);break;
    }
    // Subtle, filtered reflections preserve the dry attack and avoid an indoor echo.
    let peak=0;
    for(let channel=0;channel<2;channel++){
      const output=buffer.getChannelData(channel);let reflection=0;
      const offset=Math.round((channel?.073:.061)*rate),far=Math.round((channel?.139:.153)*rate);
      const echoes=['laser','railgun','plasma','cryo','tesla'].includes(id)
        ? [[.19,.22],[.37,.16],[.61,.11],[.89,.07],[1.21,.04],[1.63,.025]].map(([seconds,gain])=>[Math.round((seconds+channel*.009)*rate),gain]) : [];
      for(let i=0;i<length;i++){
        reflection+=.09*((i>=offset?dry[i-offset]:0)-reflection);
        output[i]=dry[i]+reflection*.15+(i>=far?dry[i-far]*.035:0);
        for(const [shift,gain] of echoes)if(i>=shift)output[i]+=dry[i-shift]*gain;
        output[i]*=Math.min(1,(length-1-i)/(rate*.02));
        peak=Math.max(peak,Math.abs(output[i]));
      }
    }
    const scale=.86/Math.max(.86,peak);
    for(let channel=0;channel<2;channel++){
      const output=buffer.getChannelData(channel);for(let i=0;i<length;i++)output[i]*=scale;
    }
    return buffer;
  }
  // Procedural effects need no downloads; audio is unlocked only by a user gesture.
  function create() {
    let context, master, noise, enabled = true, active = false;
    const voices = new Set(), last = new Map(), samples = new Map(), variations = new Map();
    const encoded=new Map(), decoded=new Map(), decoding=new Map();
    let loading;
    function load() {
      if(typeof fetch!=='function')return Promise.resolve();
      loading ||= Promise.all(Object.keys(recordings).map(async id=>{
        try{const response=await fetch('audio/sea/'+id+'.mp3');if(response.ok)encoded.set(id,await response.arrayBuffer());}catch{}
      }));
      return loading.then(()=>Promise.all([...encoded].map(async([id,bytes])=>{
        if(!context||decoded.has(id))return;
        if(!decoding.has(id))decoding.set(id,context.decodeAudioData(bytes.slice(0)).then(buffer=>{decoded.set(id,buffer);}).catch(()=>{}));
        await decoding.get(id);
      })));
    }
    try { enabled = localStorage.getItem('play-island-sea-sound') !== 'off'; } catch {}
    function unlock() {
      if (!enabled) return;
      try {
        if (!context) {
          const Audio = window.AudioContext || window.webkitAudioContext;
          if (!Audio) return;
          context = new Audio(); master = context.createGain(); master.gain.value = .38;
          const limiter = context.createDynamicsCompressor();
          limiter.threshold.value = -12; limiter.ratio.value = 8;
          master.connect(limiter); limiter.connect(context.destination);
          noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
          const samples = noise.getChannelData(0);
          for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
        }
        active = true;
        void load();
        if (context.state !== 'running') context.resume().catch(() => {});
      } catch { active = false; }
    }
    function stop() {
      active = false; last.clear();
      for (const source of voices) { try { source.stop(); } catch {} }
      voices.clear();
      if (context && context.state === 'running') context.suspend().catch(() => {});
    }
    function shot(id) {
      // Reserve audibility for the latest shot even during a large explosion barrage.
      if(voices.size>=MAX_VOICES){const oldest=voices.values().next().value;try{oldest.stop();}catch{}voices.delete(oldest);}
      const variation=(variations.get(id)||0)%3;variations.set(id,variation+1);
      const key=id+':'+variation;
      if(!samples.has(key))samples.set(key,weaponBuffer(context,id,variation));
      const source=context.createBufferSource(),gain=context.createGain();
      source.buffer=samples.get(key);gain.gain.value=id==='rapid'?.72:id==='twin'?.8:.9;
      source.connect(gain);gain.connect(master);voices.add(source);
      source.onended=()=>{voices.delete(source);source.disconnect();gain.disconnect();};
      source.start(context.currentTime);source.stop(context.currentTime+source.buffer.duration+.01);
    }
    function recorded(id,hit=false) {
      const buffer=decoded.get(id),spec=recordings[id];if(!buffer||!spec)return false;
      if(voices.size>=MAX_VOICES){const oldest=voices.values().next().value;try{oldest.stop();}catch{}voices.delete(oldest);}
      const index=(variations.get('recorded:'+id)||0)%spec.count;
      variations.set('recorded:'+id,index+1);
      const source=context.createBufferSource(),gain=context.createGain(),now=context.currentTime;
      const offset=index*spec.slot,duration=Math.min(spec.slot,buffer.duration-offset);
      source.buffer=buffer;gain.gain.value=id==='impact'?(hit?.35:.5):['machinegun','twin','rapid'].includes(id)?.68:.95;
      source.connect(gain);gain.connect(master);voices.add(source);
      source.onended=()=>{voices.delete(source);source.disconnect();gain.disconnect();};
      // Release keeps the recorded decay; only pause, mute or closing cancels it.
      source.start(now,offset,duration);source.stop(now+duration+.02);return true;
    }
    function voice({ frequency = 100, end = 40, duration = .15, volume = .2, delay = 0, type = 'triangle', noiseVoice = false, cutoff = 1200 }) {
      if (voices.size >= MAX_VOICES) return;
      const now = context.currentTime + delay, gain = context.createGain();
      const source = noiseVoice ? context.createBufferSource() : context.createOscillator();
      let filter;
      if (noiseVoice) {
        source.buffer = noise; filter = context.createBiquadFilter(); filter.type = 'lowpass';
        filter.frequency.setValueAtTime(cutoff, now); filter.frequency.exponentialRampToValueAtTime(160, now + duration);
        source.connect(filter); filter.connect(gain);
      } else {
        source.type = type; source.frequency.setValueAtTime(frequency, now);
        source.frequency.exponentialRampToValueAtTime(end, now + duration); source.connect(gain);
      }
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + .004);
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      gain.connect(master); voices.add(source);
      source.onended = () => { voices.delete(source); source.disconnect(); gain.disconnect(); filter?.disconnect(); };
      source.start(now); source.stop(now + duration + .01);
    }
    function play(kind) {
      if (!enabled || !active || context?.state !== 'running') return;
      const aliases={gun:'machinegun',cannon:'cannon',beam:'laser',pierce:'railgun',chain:'tesla',plasma:'plasma',cryo:'cryo'};
      const weapon=kind.startsWith('weapon:')?kind.slice(7):aliases[kind];
      if(weapon&&!durations[weapon])return;
      const now = context.currentTime, gap = weapon ? .025 : kind === 'explosion' ? .07 : .15;
      if (now - (last.get(kind) ?? -Infinity) < gap) return;
      last.set(kind, now);
      try {
        if (weapon) {
          if(!recorded(weapon))shot(weapon);
        } else if (kind === 'explosion' || kind === 'hit') {
          if(recorded('impact',kind==='hit'))return;
          voice({ noiseVoice:true, duration:.65, volume:.42, cutoff:1200 });
          voice({ frequency:75, end:25, duration:.45, volume:.5, type:'sine' });
        } else if (kind === 'overheat') {
          [0,.16,.32].forEach(delay => voice({ frequency:640, end:400, duration:.12, volume:.17, delay, type:'sawtooth' }));
          voice({ noiseVoice:true, duration:.7, volume:.12, cutoff:2200 });
        } else if (kind === 'ready' || kind === 'cooled' || kind === 'shield') {
          voice({ frequency:kind==='shield'?320:660, end:kind==='shield'?1000:880, duration:.17, volume:.16, type:'sine' });
        } else if (kind === 'wave' || kind === 'victory' || kind === 'defeat') {
          const notes = kind === 'defeat' ? [330,260,165] : kind === 'victory' ? [392,523,659,784] : [392,523];
          notes.forEach((frequency,i) => voice({ frequency, end:frequency, duration:.22, volume:.15, delay:i*.14, type:'sine' }));
        }
      } catch { /* Audio device loss must never interrupt gameplay. */ }
    }
    function setEnabled(value) {
      enabled = Boolean(value);
      try { localStorage.setItem('play-island-sea-sound', enabled ? 'on' : 'off'); } catch {}
      if (enabled) unlock(); else stop();
    }
    void load(); // Fetch early; decode after a gesture, without replaying missed shots.
    return { unlock, stop, play, setEnabled, load, get enabled() { return enabled; } };
  }
  window.SeaAudio = { create };
})();
