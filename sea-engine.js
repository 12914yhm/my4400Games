/* Sea defense simulation: all gameplay uses a fixed timestep, independent of rendering. */
(function (root) {
  'use strict';
  const W = 960, H = 600, CX = W / 2, CY = H / 2, STEP = 1 / 120, WAVES = 8;
  const HEAT = { perShot: 4.5, cooling: 25, resume: 30 };
  // Shared by the renderer and simulation: local forward / lateral muzzle offsets.
  const SIDE_GUN = Object.freeze({ forward: 44, lateral: 34, size: 52 });
  function secondaryMuzzle(angle, side) {
    return { x: CX + Math.cos(angle) * SIDE_GUN.forward - Math.sin(angle) * SIDE_GUN.lateral * side,
      y: CY + Math.sin(angle) * SIDE_GUN.forward + Math.cos(angle) * SIDE_GUN.lateral * side };
  }
  const weapons = typeof module !== 'undefined' && module.exports ? require('./sea-weapons') : root.SeaWeapons;
  const TYPES = {
    patrol: { hp: 54, speed: 37, radius: 17, reward: 30, damage: 10, interval: 4.2, range: 240 },
    fast: { hp: 38, speed: 64, radius: 13, reward: 35, damage: 8, interval: 3.5, range: 185 },
    armored: { hp: 160, speed: 24, radius: 24, reward: 70, damage: 18, interval: 5, range: 270 },
    submarine: { hp: 88, speed: 32, radius: 17, reward: 50, damage: 16, interval: 5.2, range: 235 },
    boss: { hp: 700, speed: 16, radius: 37, reward: 250, damage: 23, interval: 2.5, range: 230 }
  };
  const ITEMS = [
    { id: 'repair', name: '紧急维修', price: 75, description: '立即恢复 70 点耐久' },
    { id: 'shield', name: '能量护盾', price: 85, description: '抵挡伤害，持续 8 秒' },
    { id: 'airstrike', name: '空袭支援', price: 130, description: '全场敌舰受到 180 伤害' },
    { id: 'freeze', name: '电磁干扰', price: 90, description: '敌舰与敌方炮弹减速 7 秒' }
  ];
  const UPGRADES = {
    power: { name: '副武器威力', description: '每级增加 5 点副武器齐射伤害', base: 100, step: 90, max: 5 },
    rate: { name: '装填系统', description: '提升机枪射速与主炮装填速度', base: 120, step: 100, max: 4 },
    cannon: { name: '主武器强化', description: '齐射伤害 +30，爆炸范围 +10', base: 130, step: 110, max: 4 },
    armor: { name: '基地装甲', description: '耐久上限 +60，同时恢复 60 点', base: 120, step: 90, max: 4 }
  };
  function distanceToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, length = dx * dx + dy * dy;
    const t = length ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length)) : 0;
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
  }
  function create(random = Math.random) {
    const state = {
      phase: 'ready', paused: false, wave: 1, hp: 200, maxHp: 200, credits: 100, score: 0, kills: 0,
      upgrades: { power: 0, rate: 0, cannon: 0, armor: 0 }, items: [1, 1, 1, 1],
      loadout: { primary: 'cannon', secondary: 'machinegun' },
      aim: { x: CX, y: 80 }, angle: -Math.PI / 2, primary: false, secondary: false,
      cannonCooldown: 0, gunCooldown: 0, recoil: 0, shield: 0, freeze: 0,
      gunHeat: 0, overheated: false,
      enemies: [], bullets: [], hostile: [], effects: [], spawnLeft: 0, total: 0, destroyed: 0,
      spawnTimer: 0, elapsed: 0, accumulator: 0, lastReward: 0, damageFlash: 0, message: '', event: 0
    };
    let serial = 0, secondarySide = -1;
    const sounds = [];
    function emit(kind) { if (sounds.length < 32) sounds.push(kind); }
    function drainSounds() { return sounds.splice(0); }
    function weaponStats(slot, id = state.loadout[slot]) {
      const weapon = weapons.find(slot,id); if(!weapon)return null;
      const cannon = slot === 'primary';
      return {...weapon, damage:weapon.damage + state.upgrades[cannon?'cannon':'power']*(cannon?30:5)/weapon.count,
        interval:weapon.interval/(1+state.upgrades.rate*(cannon ? .17 : .2)), radius:cannon?weapon.radius+state.upgrades.cannon*10:0};
    }
    const cannonDelay = () => weaponStats('primary').interval;
    function equip(slot,id) {
      const weapon = weapons.find(slot,id);
      if(!weapon || weapon.wave>weapons.unlockWave(state) || !(['ready','shop'].includes(state.phase) || (state.phase==='playing'&&state.paused)))return false;
      if(state.loadout[slot]===id)return false;
      release();state.loadout[slot]=id;
      // Heat and remaining cooldown survive switching; swapping never grants a free shot.
      state.message=`已装备${weapon.name}`;return true;
    }
    function setAim(x, y) {
      state.aim = { x: Math.max(0, Math.min(W, x)), y: Math.max(0, Math.min(H, y)) };
      state.angle = Math.atan2(state.aim.y - CY, state.aim.x - CX);
    }
    function release() { state.primary = false; state.secondary = false; }
    function trigger(type, down) {
      if (!['primary', 'secondary'].includes(type)) return;
      state[type] = Boolean(down) && state.phase === 'playing' && !state.paused;
      if (state[type] && !(type === 'primary' ? state.cannonCooldown : state.gunCooldown)) fire(type);
    }
    function pause(value = !state.paused) { state.paused = Boolean(value); release(); drainSounds(); }
    function beginWave() {
      state.phase = 'playing'; state.paused = false; state.total = 5 + state.wave * 2;
      state.spawnLeft = state.total; state.destroyed = 0; state.spawnTimer = .65;
      state.enemies = []; state.hostile = []; state.bullets = []; state.effects = [];
      state.shield = 0; state.freeze = 0; state.cannonCooldown = 0; state.gunCooldown = 0;
      state.gunHeat = 0; state.overheated = false; drainSounds(); emit('wave');
      release(); state.message = `第 ${state.wave} 波来袭，守住中央炮台！`;
    }
    function start() { if (state.phase !== 'ready') return false; beginWave(); return true; }
    function nextWave() {
      if (state.phase !== 'shop') return false;
      state.wave++; beginWave(); return true;
    }
    function effect(x, y, kind, size = 25) {
      state.effects.push({ x, y, kind, size, age: 0, duration: kind === 'airstrike' ? 1 : .6, seed: random() * 6 });
    }
    function hitEnemy(enemy, damage) {
      if (enemy.hp <= 0) return;
      enemy.hp -= damage; enemy.flash = .09;
      if (enemy.hp <= 0) {
        state.credits += enemy.reward; state.score += enemy.reward * 10; state.kills++; state.destroyed++;
        effect(enemy.x, enemy.y, 'explosion', enemy.radius * 2.2);
        emit('explosion');
      }
    }
    function hitBase(damage) {
      if (state.shield > 0) { effect(CX, CY, 'shield', 65); emit('shield'); return; }
      state.hp = Math.max(0, state.hp - damage); state.damageFlash = .3;
      effect(CX, CY, 'explosion', 44);
      emit('hit');
      if (state.hp <= 0) { state.phase = 'over'; release(); emit('defeat'); }
    }
    function spawn() {
      let type = 'patrol'; const choice = random();
      if (state.wave % 4 === 0 && state.spawnLeft === 1) type = 'boss';
      else if (state.wave >= 3 && choice > .78) type = 'submarine';
      else if (state.wave >= 2 && choice > .53) type = 'armored';
      else if (state.wave >= 1 && choice < .28) type = 'fast';
      const config = TYPES[type], side = Math.floor(random() * 4);
      let x, y;
      if (side === 0) { x = -35; y = 35 + random() * (H - 70); }
      else if (side === 1) { x = W + 35; y = 35 + random() * (H - 70); }
      else if (side === 2) { x = 35 + random() * (W - 70); y = -35; }
      else { x = 35 + random() * (W - 70); y = H + 35; }
      const hp = Math.round(config.hp * (1 + (state.wave - 1) * .12));
      state.enemies.push({ ...config, id: serial++, type, x, y, hp, maxHp: hp,
        angle: Math.atan2(CY - y, CX - x), cooldown: 1.8 + random() * 1.2,
        turn: random() > .5 ? 1 : -1, age: 0, flash: 0, submerged: false });
      state.spawnLeft--;
    }
    function fire(type) {
      const cannon = type === 'primary', angle = state.angle;
      if (!cannon && state.overheated) return;
      const weapon = weaponStats(type), speed = weapon.speed;
      const muzzle = 57;
      const distance = Math.max(65, Math.hypot(state.aim.x - CX, state.aim.y - CY));
      for(let i=0;i<weapon.count;i++){
        const spread=(i-(weapon.count-1)/2)*weapon.spread;
        const origin=cannon ? {x:CX+Math.cos(angle+spread)*muzzle,y:CY+Math.sin(angle+spread)*muzzle}
          : secondaryMuzzle(angle,weapon.count>1 ? (i%2 ? 1 : -1) : secondarySide);
        // Converge on the crosshair; keep very close aim points in front of the barrels.
        const targetDistance=Math.max(100,distance);
        const direction=cannon ? angle+spread : Math.atan2(CY+Math.sin(angle)*targetDistance-origin.y,CX+Math.cos(angle)*targetDistance-origin.x)+spread;
        state.bullets.push({ x: origin.x, y: origin.y,
          vx: Math.cos(direction) * speed, vy: Math.sin(direction) * speed, type, weapon:weapon.id,
          damage: weapon.damage, remaining: cannon ? Math.max(8, distance - muzzle) : 1100, radius:weapon.radius });
      }
      if (cannon) { state.cannonCooldown = cannonDelay(); state.recoil = .18; state.event++; emit('cannon'); }
      else {
        secondarySide *= -1;
        state.gunCooldown = weapon.interval;
        state.gunHeat = Math.min(100, state.gunHeat + weapon.heat); emit('gun');
        if (state.gunHeat >= 100) { state.overheated = true; emit('overheat'); }
      }
    }
    function detonate(bullet) {
      effect(bullet.x, bullet.y, 'explosion', bullet.radius);
      emit('explosion');
      state.enemies.forEach(e => {
        if (Math.hypot(e.x - bullet.x, e.y - bullet.y) < bullet.radius + e.radius) hitEnemy(e, bullet.damage);
      });
      state.hostile.forEach(p => { if (Math.hypot(p.x - bullet.x, p.y - bullet.y) < bullet.radius) p.dead = true; });
    }
    function useItem(index) {
      if (state.phase !== 'playing' || state.paused || !Number.isInteger(index) || index < 0 || index > 3 || state.items[index] < 1) return false;
      if (index === 0 && state.hp >= state.maxHp) return false;
      if (index === 1 && state.shield > 0) return false;
      if (index === 3 && state.freeze > 0) return false;
      state.items[index]--;
      if (index === 0) state.hp = Math.min(state.maxHp, state.hp + 70);
      if (index === 1) state.shield = 8;
      if (index === 2) { state.enemies.forEach(e => hitEnemy(e, 180)); state.hostile = []; effect(CX, CY, 'airstrike', 600); }
      if (index === 3) state.freeze = 7;
      state.message = `${ITEMS[index].name}已启用`; return true;
    }
    function price(id) {
      if (UPGRADES[id]) return UPGRADES[id].base + UPGRADES[id].step * state.upgrades[id];
      return ITEMS.find(item => item.id === id)?.price ?? Infinity;
    }
    function purchase(id) {
      if (state.phase !== 'shop') return false;
      const cost = price(id), upgrade = UPGRADES[id], index = ITEMS.findIndex(item => item.id === id);
      if (state.credits < cost || (upgrade && state.upgrades[id] >= upgrade.max) || (!upgrade && index < 0)) return false;
      if (index >= 0 && state.items[index] >= 5) return false;
      state.credits -= cost;
      if (upgrade) {
        state.upgrades[id]++;
        if (id === 'armor') { state.maxHp += 60; state.hp = Math.min(state.maxHp, state.hp + 60); }
      } else state.items[index]++;
      return true;
    }
    function tick(dt) {
      state.elapsed += dt;
      state.effects.forEach(e => { e.age += dt; }); state.effects = state.effects.filter(e => e.age < e.duration);
      state.recoil = Math.max(0, state.recoil - dt); state.damageFlash = Math.max(0, state.damageFlash - dt);
      if (state.phase !== 'playing') return;
      state.shield = Math.max(0, state.shield - dt); state.freeze = Math.max(0, state.freeze - dt);
      const wasCooling = state.cannonCooldown > 0;
      state.cannonCooldown = Math.max(0, state.cannonCooldown - dt); state.gunCooldown = Math.max(0, state.gunCooldown - dt);
      if (wasCooling && !state.cannonCooldown && !state.primary) emit('ready');
      if (!state.secondary || state.overheated) state.gunHeat = Math.max(0, state.gunHeat - HEAT.cooling * dt);
      if (state.overheated && state.gunHeat <= HEAT.resume) { state.overheated = false; emit('cooled'); }
      if (state.primary && !state.cannonCooldown) fire('primary');
      if (state.secondary && !state.gunCooldown) fire('secondary');
      state.spawnTimer -= dt;
      if (state.spawnLeft > 0 && state.spawnTimer <= 0) { spawn(); state.spawnTimer = Math.max(.9, 2.4 - state.wave * .13); }
      const slow = state.freeze > 0 ? .25 : 1;
      for (const enemy of state.enemies) {
        if (enemy.hp <= 0) continue;
        enemy.age += dt * slow; enemy.flash = Math.max(0, enemy.flash - dt);
        enemy.submerged = enemy.type === 'submarine' && enemy.age % 9 < 4;
        const dx = CX - enemy.x, dy = CY - enemy.y, distance = Math.hypot(dx, dy), angle = Math.atan2(dy, dx);
        if (distance > enemy.range) {
          enemy.angle = angle; enemy.x += Math.cos(angle) * enemy.speed * dt * slow; enemy.y += Math.sin(angle) * enemy.speed * dt * slow;
        } else {
          enemy.angle = angle + enemy.turn * .55;
          enemy.x += Math.cos(angle + enemy.turn * Math.PI / 2) * enemy.speed * .32 * dt * slow;
          enemy.y += Math.sin(angle + enemy.turn * Math.PI / 2) * enemy.speed * .32 * dt * slow;
          enemy.cooldown -= dt * slow;
          if (enemy.cooldown <= 0) {
            const velocity = enemy.type === 'submarine' ? 100 : 140;
            state.hostile.push({ x: enemy.x, y: enemy.y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity,
              damage: enemy.damage, torpedo: enemy.type === 'submarine', dead: false });
            enemy.cooldown = enemy.interval / (1 + (state.wave - 1) * .04);
          }
        }
      }
      for (const bullet of state.bullets) {
        const ox = bullet.x, oy = bullet.y;
        bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt; bullet.remaining -= Math.hypot(bullet.vx, bullet.vy) * dt;
        let hit = false;
        if (bullet.type === 'secondary') {
          for (const shell of state.hostile) {
            if (!shell.dead && distanceToSegment(shell.x, shell.y, ox, oy, bullet.x, bullet.y) < 10) { shell.dead = true; hit = true; effect(shell.x, shell.y, 'spark', 10); break; }
          }
        }
        if (!hit) for (const enemy of state.enemies) {
          if (enemy.hp <= 0 || (enemy.submerged && bullet.type === 'secondary')) continue;
          if (distanceToSegment(enemy.x, enemy.y, ox, oy, bullet.x, bullet.y) < enemy.radius + 3) {
            if (bullet.type === 'primary') detonate(bullet); else { hitEnemy(enemy, bullet.damage); effect(bullet.x, bullet.y, 'spark', 8); }
            hit = true; break;
          }
        }
        if (!hit && bullet.remaining <= 0 && bullet.type === 'primary') detonate(bullet);
        bullet.dead = hit || bullet.remaining <= 0 || bullet.x < -50 || bullet.x > W + 50 || bullet.y < -50 || bullet.y > H + 50;
      }
      for (const shell of state.hostile) {
        if (shell.dead) continue;
        shell.x += shell.vx * dt * slow; shell.y += shell.vy * dt * slow;
        if (Math.hypot(shell.x - CX, shell.y - CY) < (state.shield > 0 ? 65 : 43)) { hitBase(shell.damage); shell.dead = true; }
        if (state.phase === 'over') break;
      }
      state.bullets = state.bullets.filter(b => !b.dead); state.hostile = state.hostile.filter(b => !b.dead);
      state.enemies = state.enemies.filter(e => e.hp > 0);
      if (state.phase === 'playing' && state.spawnLeft === 0 && state.enemies.length === 0) {
        state.lastReward = 100 + state.wave * 30; state.credits += state.lastReward; state.score += 200 * state.wave;
        state.phase = state.wave === WAVES ? 'victory' : 'shop'; state.hostile = []; state.bullets = []; release();
        emit(state.phase === 'victory' ? 'victory' : 'wave');
      }
    }
    function step(seconds) {
      if (state.paused) return;
      state.accumulator += Math.max(0, Math.min(.1, seconds));
      while (state.accumulator >= STEP) { tick(STEP); state.accumulator -= STEP; }
    }
    const saves = typeof module !== 'undefined' && module.exports ? require('./sea-save') : root.SeaSave;
    function snapshot() {
      return saves.clean({ version: 1, state: { ...state,
        enemies: state.enemies.filter(e => e.hp > 0), bullets: state.bullets.filter(b => !b.dead), hostile: state.hostile.filter(b => !b.dead)
      } });
    }
    function restore(value) {
      Object.assign(state, saves.clean(value).state);
      serial = Math.max(0, ...state.enemies.map(e => e.id + 1));
      state.paused = state.phase === 'playing'; release(); drainSounds();
    }
    return { state, setAim, trigger, release, pause, start, nextWave, useItem, price, purchase, step, cannonDelay, drainSounds, snapshot, restore, equip, weaponStats };
  }
  const api = { create, W, H, CX, CY, TYPES, ITEMS, UPGRADES, WAVES, HEAT, SIDE_GUN, secondaryMuzzle, distanceToSegment, WEAPONS:weapons.WEAPONS, unlockWave:weapons.unlockWave };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SeaEngine = api;
})(typeof window === 'undefined' ? globalThis : window);
