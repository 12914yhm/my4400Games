(function () {
  'use strict';
  const sources = {
    ocean: 'ocean-battlefield-v2', base: 'battery-base-v1', turret: 'battery-turret-v1',
    patrol: 'patrol-boat-v1', fast: 'fast-boat-v1', armored: 'armored-cruiser-v1',
    submarine: 'submarine-v1', boss: 'enemy-flagship-v1', explosion: 'explosion-sheet-v2'
  };
  for (const id of ['cannon','spread','howitzer','machinegun','twin','rapid']) sources['weapon_' + id] = 'weapon-' + id + '-v1';
  const textures = {}, flashes = {}, frames = [];
  let pending, status = 'idle', loaded = 0;
  function surface(w, h) {
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    return canvas;
  }
  function prepare(id, image) {
    if (id === 'explosion') {
      for (let i = 0; i < 16; i++) {
        const col = i % 4, row = Math.floor(i / 4);
        const x = Math.round(col * image.width / 4), y = Math.round(row * image.height / 4);
        const w = Math.round((col + 1) * image.width / 4) - x;
        const h = Math.round((row + 1) * image.height / 4) - y;
        const tile = surface(192, 192), c = tile.getContext('2d');
        c.drawImage(image, x + 3, y + 3, w - 6, h - 6, 0, 0, 192, 192);
        // Feather cell edges so neighboring sparks cannot create hard-edged squares.
        c.globalCompositeOperation = 'destination-in';
        const mask = c.createRadialGradient(96, 96, 72, 96, 96, 96);
        mask.addColorStop(0, '#fff'); mask.addColorStop(1, 'transparent');
        c.fillStyle = mask; c.fillRect(0, 0, 192, 192); frames.push(tile);
      }
      return;
    }
    const width = id === 'ocean' ? 1600 : id === 'base' || id === 'turret' ? 384 : 512;
    const tile = surface(width, Math.round(width * image.height / image.width));
    const c = tile.getContext('2d'); c.imageSmoothingQuality = 'high';
    c.drawImage(image, 0, 0, tile.width, tile.height); textures[id] = tile;
    if (['patrol', 'fast', 'armored', 'submarine', 'boss'].includes(id)) {
      const flash = surface(tile.width, tile.height), f = flash.getContext('2d');
      f.drawImage(tile, 0, 0); f.globalCompositeOperation = 'source-in';
      f.fillStyle = '#fff0c7'; f.fillRect(0, 0, flash.width, flash.height); flashes[id] = flash;
    }
  }
  function load() {
    if (pending) return pending;
    status = 'loading';
    pending = Promise.all(Object.entries(sources).map(([id, filename]) => new Promise(resolve => {
      const image = new Image(); let done = false;
      const finish = ok => {
        if (done) return; done = true; clearTimeout(timeout);
        image.onload = image.onerror = null;
        if (ok) { try { prepare(id, image); loaded++; } catch { /* Retain vector fallback. */ } }
        resolve();
      };
      const timeout = setTimeout(() => finish(false), 30000);
      image.onload = () => finish(true); image.onerror = () => finish(false);
      image.src = './art/sea/' + filename + '.png';
    }))).then(() => { status = loaded === Object.keys(sources).length ? 'ready' : 'partial'; });
    return pending;
  }
  function ocean(ctx, w, h) {
    const image = textures.ocean; if (!image) return false;
    const scale = Math.max(w / image.width, h / image.height);
    ctx.drawImage(image, (w - image.width * scale) / 2, (h - image.height * scale) / 2, image.width * scale, image.height * scale);
    return true;
  }
  // The caller supplies a context translated and rotated to the enemy.
  function ship(ctx, enemy) {
    const image = textures[enemy.type]; if (!image) return false;
    const w = enemy.radius * 3.8, h = w * image.height / image.width;
    ctx.drawImage(image, -w / 2, -h / 2, w, h);
    if (enemy.flash > 0) {
      ctx.save(); ctx.globalAlpha *= .65 * Math.min(1, enemy.flash / .09);
      ctx.drawImage(flashes[enemy.type], -w / 2, -h / 2, w, h); ctx.restore();
    }
    return true;
  }
  function battery(ctx, x, y, angle, recoil, loadout = {}) {
    const primary = textures['weapon_' + (loadout.primary || 'cannon')] || textures.turret;
    const secondary = textures['weapon_' + (loadout.secondary || 'machinegun')];
    if (!textures.base || !primary) return false;
    ctx.save(); ctx.translate(x, y);
    ctx.drawImage(textures.base, -70, -70, 140, 140);
    ctx.rotate(angle); ctx.translate(-recoil * 20, 0);
    // Bearing is left of center; muzzle aligns with the simulation's 57 px origin.
    ctx.drawImage(primary, -33.6, -47.04, 96, 96);
    // Smaller coaxial mount sits on the near edge of the rotating armored housing.
    if (secondary) ctx.drawImage(secondary, -15, -5, 68, 68);
    ctx.restore(); return true;
  }
  function explosion(ctx, effect) {
    if (frames.length !== 16) return false;
    const progress = Math.max(0, Math.min(.999, effect.age / effect.duration));
    const frame = frames[Math.floor(progress * 16)], size = effect.size * 2.3;
    ctx.save(); ctx.globalAlpha *= Math.min(1, (1 - progress) / .3);
    ctx.drawImage(frame, effect.x - size / 2, effect.y - size / 2, size, size);
    ctx.restore(); return true;
  }
  window.SeaArt = { load, ocean, ship, battery, explosion, get status() { return status; }, get loaded() { return loaded; } };
})();
