(function () {
  'use strict';
  // Procedural effects need no downloads; audio is unlocked only by a user gesture.
  function create() {
    let context, master, noise, enabled = true, active = false;
    const voices = new Set(), last = new Map();
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
        if (context.state !== 'running') context.resume().catch(() => {});
      } catch { active = false; }
    }
    function stop() {
      active = false; last.clear();
      for (const source of voices) { try { source.stop(); } catch {} }
      voices.clear();
      if (context && context.state === 'running') context.suspend().catch(() => {});
    }
    function voice({ frequency = 100, end = 40, duration = .15, volume = .2, delay = 0, type = 'triangle', noiseVoice = false, cutoff = 1200 }) {
      if (voices.size >= 32) return;
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
      const now = context.currentTime, gap = kind === 'gun' ? .045 : kind === 'explosion' ? .07 : .15;
      if (now - (last.get(kind) ?? -Infinity) < gap) return;
      last.set(kind, now);
      try {
        if (kind === 'gun') {
          voice({ noiseVoice:true, duration:.075, volume:.27, cutoff:3800 });
          voice({ frequency:180, end:65, duration:.065, volume:.13, type:'square' });
        } else if (kind === 'cannon' || kind === 'explosion' || kind === 'hit') {
          const cannon = kind === 'cannon';
          voice({ noiseVoice:true, duration:cannon ? .5 : .65, volume:cannon ? .55 : .42, cutoff:cannon ? 2300 : 1200 });
          voice({ frequency:cannon?120:75, end:25, duration:.45, volume:.5, type:'sine' });
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
    return { unlock, stop, play, setEnabled, get enabled() { return enabled; } };
  }
  window.SeaAudio = { create };
})();
