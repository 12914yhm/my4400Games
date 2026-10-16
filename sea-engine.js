/* Sea defense simulation: all gameplay uses a fixed timestep, independent of rendering. */
(function (root) {
  'use strict';
  const W = 960, H = 600, CX = W / 2, CY = H / 2, STEP = 1 / 120;
  // Keep saved world coordinates stable while showing 25% more sea around the battery.
  const VIEW_PAD_X = 120, VIEW_PAD_Y = 75, VIEW_W = 1200, VIEW_H = 750;
  const DIFFICULTIES = Object.freeze({
    low: Object.freeze({name:'低',hp:.75,damage:.75,spacing:1.55,maxAlive:2,reward:1.15}),
    normal: Object.freeze({name:'中',hp:.9,damage:.9,spacing:1.3,maxAlive:3,reward:1}),
    high: Object.freeze({name:'高',hp:1.15,damage:1.15,spacing:1,maxAlive:5,reward:1})
  });
  const campaign = typeof module !== 'undefined' && module.exports ? require('./sea-campaign') : root.SeaCampaign;
  const {WAVES,LEVELS,TYPES} = campaign;
  const TURRET_SCALE = .75 * 1.25, SHIP_SCALE = 2 * .75;
  const MAIN_MUZZLE = 49 * TURRET_SCALE;
  // Shared by the renderer and simulation: local forward / lateral muzzle offsets.
  const SIDE_GUN = Object.freeze({ forward: 37 * TURRET_SCALE, lateral: 29 * TURRET_SCALE, size: 44 * TURRET_SCALE });
  const shipRadius = enemy => enemy.radius * SHIP_SCALE;
  const HULL_CLASS = Object.freeze({patrol:'small',fast:'small',raider:'small',submarine:'sub',
    armored:'medium',missile:'medium',guardian:'shield',tender:'medium',boss:'large',dreadnought:'large'});
  // Pixels / seconds: a quick kick followed by a slower spring return.
  const RECOIL = Object.freeze(Object.fromEntries(Object.entries({
    cannon: [12,.32,.028], spread: [14,.30,.025], howitzer: [20,.44,.04],
    laser: [3,.16,.02], railgun: [16,.34,.025], plasma: [11,.38,.035],
    machinegun: [4,.12,.012], twin: [5,.14,.012], rapid: [3.5,.08,.01],
    cryo: [3,.12,.012], tesla: [2.5,.14,.015]
  }).map(([id,[distance,duration,kick]])=>[id,Object.freeze({distance,duration,kick})])));
  function recoilOffset(id, remaining) {
    const profile = RECOIL[id];
    if (!profile || !Number.isFinite(remaining) || remaining <= 0) return 0;
    const age = Math.max(0, profile.duration - remaining);
    return profile.distance * (age < profile.kick ? Math.sin(age / profile.kick * Math.PI / 2)
      : Math.pow(Math.max(0, 1 - (age - profile.kick) / (profile.duration - profile.kick)), 2));
  }
  function secondaryMuzzle(angle, side) {
    return { x: CX + Math.cos(angle) * SIDE_GUN.forward - Math.sin(angle) * SIDE_GUN.lateral * side,
      y: CY + Math.sin(angle) * SIDE_GUN.forward + Math.cos(angle) * SIDE_GUN.lateral * side };
  }
  const weapons = typeof module !== 'undefined' && module.exports ? require('./sea-weapons') : root.SeaWeapons;
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
      phase: 'ready', paused: false, difficulty: 'normal', wave: 1, hp: 200, maxHp: 200, credits: 100, score: 0, kills: 0,
      upgrades: { power: 0, rate: 0, cannon: 0, armor: 0 }, items: [1, 1, 1, 1],
      loadout: { primary: 'cannon', secondary: 'machinegun' },
      aim: { x: CX, y: 80 }, angle: -Math.PI / 2, primary: false, secondary: false,
      cannonCooldown: 0, gunCooldown: 0, gunAmmo: 36, gunReload: 0,
      recoil: 0, gunRecoil: [0,0], shield: 0, freeze: 0,
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
        interval:weapon.interval/(1+state.upgrades.rate*(cannon ? .17 : .2)),
        reload:cannon?weapon.interval/(1+state.upgrades.rate*.17):weapon.reload/(1+state.upgrades.rate*.12),
        radius:cannon?weapon.radius+state.upgrades.cannon*10:0};
    }
    const cannonDelay = () => weaponStats('primary').interval;
    function equip(slot,id) {
      const weapon = weapons.find(slot,id);
      if(!weapon || weapon.wave>weapons.unlockWave(state) || !(['ready','shop'].includes(state.phase) || (state.phase==='playing'&&state.paused)))return false;
      if(state.loadout[slot]===id)return false;
      release();state.loadout[slot]=id;resetRecoil();
      // Changing weapons does not create free ammunition or clear a reload.
      if(slot==='secondary'){
        state.gunAmmo=Math.min(state.gunAmmo,weapon.magazine);
        if(state.gunAmmo<weapon.count && !state.gunReload) startGunReload();
      }
      state.message=`已装备${weapon.name}`;return true;
    }
    function setAim(x, y) {
      state.aim = { x: Math.max(-VIEW_PAD_X, Math.min(W + VIEW_PAD_X, x)), y: Math.max(-VIEW_PAD_Y, Math.min(H + VIEW_PAD_Y, y)) };
      state.angle = Math.atan2(state.aim.y - CY, state.aim.x - CX);
    }
    function setDifficulty(value) {
      if (!['ready','shop'].includes(state.phase) || !DIFFICULTIES[value]) return false;
      state.difficulty = value;
      return true;
    }
    function release() { state.primary = false; state.secondary = false; }
    function resetRecoil() { state.recoil = 0; state.gunRecoil = [0,0]; }
    function startGunReload() {
      state.gunAmmo = 0;
      state.gunReload = weaponStats('secondary').reload;
      state.gunCooldown = 0;
    }
    function trigger(type, down) {
      if (!['primary', 'secondary'].includes(type)) return;
      state[type] = Boolean(down) && state.phase === 'playing' && !state.paused;
      if (state[type] && !(type === 'primary' ? state.cannonCooldown : state.gunCooldown || state.gunReload)) fire(type);
    }
    function pause(value = !state.paused) { state.paused = Boolean(value); release(); drainSounds(); }
    function beginWave() {
      state.phase = 'playing'; state.paused = false; state.total = LEVELS[state.wave-1].fleet.length;
      state.spawnLeft = state.total; state.destroyed = 0; state.spawnTimer = .8;
      state.enemies = []; state.hostile = []; state.bullets = []; state.effects = [];
      state.shield = 0; state.freeze = 0; state.cannonCooldown = 0; state.gunCooldown = 0;
      state.gunAmmo = weaponStats('secondary').magazine; state.gunReload = 0;
      resetRecoil(); drainSounds(); emit('wave');
      release(); state.message = `第 ${state.wave} 波来袭，守住中央炮台！`;
    }
    function start() { if (state.phase !== 'ready') return false; beginWave(); return true; }
    function nextWave() {
      if (state.phase !== 'shop') return false;
      if(state.wave>=WAVES)return false;
      state.wave++; beginWave(); return true;
    }
    function effect(x, y, kind, size = 25, detail = {}) {
      const duration = kind === 'airstrike' ? 1 : kind === 'ship-sink' ?
        ({small:1.25,medium:1.8,large:2.8,sub:1.7,shield:1.9})[detail.hull] :
        kind === 'hull-hit' ? .38 : .6;
      if (state.effects.length >= 180) state.effects.shift();
      const visualOnly=kind==='hull-hit'||kind==='ship-sink'&&detail.hull!=='sub';
      const seed=visualOnly?((x*37+y*91+state.elapsed*17)%6+6)%6:random()*6;
      state.effects.push({ x, y, kind, size, age: 0, duration, seed, ...detail });
    }
    function hitEnemy(enemy, damage, bypassShield = false) {
      if (enemy.hp <= 0) return;
      if(!bypassShield && enemy.barrier>0){const absorbed=Math.min(enemy.barrier,damage);enemy.barrier-=absorbed;damage-=absorbed;}
      if (damage <= 0) {
        if (state.elapsed - (enemy.lastFeedback ?? -Infinity) >= .12) {
          effect(enemy.x,enemy.y,'hull-hit',shipRadius(enemy),{hull:'shield',type:enemy.type,angle:enemy.angle});
          emit('ship-hit:shield');enemy.lastFeedback=state.elapsed;
        }
        return;
      }
      enemy.hp -= damage; enemy.flash = .09;
      const hull=HULL_CLASS[enemy.type], sinking=enemy.hp<=0;
      if (sinking || state.elapsed - (enemy.lastFeedback ?? -Infinity) >= .12) {
        effect(enemy.x,enemy.y,'hull-hit',shipRadius(enemy),{hull,type:enemy.type,angle:enemy.angle});
        if (!sinking) emit('ship-hit:'+hull);
        enemy.lastFeedback=state.elapsed;
      }
      if (enemy.hp <= 0) {
        state.credits += enemy.reward; state.score += enemy.reward * 10; state.kills++; state.destroyed++;
        effect(enemy.x,enemy.y,'ship-sink',shipRadius(enemy),{hull,type:enemy.type,angle:enemy.angle});
        if (hull !== 'sub') effect(enemy.x,enemy.y,'explosion',shipRadius(enemy)*(hull==='large'?2.8:hull==='small'?.95:1.5));
        emit('ship-sink:'+hull);
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
      const fleet=LEVELS[state.wave-1].fleet;
      const type=fleet[Math.max(0,state.total-state.spawnLeft)%fleet.length];
      const config = TYPES[type], side = Math.floor(random() * 4);
      let x, y;
      if (side === 0) { x = -VIEW_PAD_X - 35; y = -VIEW_PAD_Y + 35 + random() * (VIEW_H - 70); }
      else if (side === 1) { x = W + VIEW_PAD_X + 35; y = -VIEW_PAD_Y + 35 + random() * (VIEW_H - 70); }
      else if (side === 2) { x = -VIEW_PAD_X + 35 + random() * (VIEW_W - 70); y = -VIEW_PAD_Y - 35; }
      else { x = -VIEW_PAD_X + 35 + random() * (VIEW_W - 70); y = H + VIEW_PAD_Y + 35; }
      const difficulty=DIFFICULTIES[state.difficulty];
      const hp = Math.round(config.hp * (1 + (Math.min(state.wave,8) - 1) * .1 + Math.max(0,state.wave-8)*.045) * difficulty.hp);
      state.enemies.push({ ...config, radius:config.radius*1.2, damage:Math.round(config.damage*difficulty.damage), reward:Math.round(config.reward*difficulty.reward), id: serial++, type, x, y, hp, maxHp: hp,
        angle: Math.atan2(CY - y, CX - x), cooldown: 1.8 + random() * 1.2,
        turn: random() > .5 ? 1 : -1, age: 0, flash: 0, submerged: false, chill:0, barrier:type==='guardian'?100:0 });
      state.spawnLeft--;
    }
    function fire(type) {
      const cannon = type === 'primary', angle = state.angle;
      if (!cannon && (state.gunReload || state.gunAmmo < weaponStats('secondary').count)) return;
      const weapon = weaponStats(type), speed = weapon.speed;
      const muzzle = MAIN_MUZZLE;
      const distance = Math.max(65, Math.hypot(state.aim.x - CX, state.aim.y - CY));
      for(let i=0;i<weapon.count;i++){
        const spread=(i-(weapon.count-1)/2)*weapon.spread;
        const side = weapon.count > 1 ? (i % 2 ? 1 : -1) : secondarySide;
        const origin=cannon ? {x:CX+Math.cos(angle+spread)*muzzle,y:CY+Math.sin(angle+spread)*muzzle}
          : secondaryMuzzle(angle,side);
        if (!cannon) state.gunRecoil[side === -1 ? 0 : 1] = RECOIL[weapon.id].duration;
        // Side guns fire parallel to their barrels; the pointer only rotates the turret.
        const direction=cannon ? angle+spread : angle;
        if(weapon.mode){fireBeam(origin,direction,weapon);continue;}
        state.bullets.push({ x: origin.x, y: origin.y,
          vx: Math.cos(direction) * speed, vy: Math.sin(direction) * speed, type, weapon:weapon.id,
          damage: weapon.damage, remaining: cannon ? Math.max(8, distance - muzzle) : 1100, radius:weapon.radius });
      }
      if (cannon) { state.cannonCooldown = cannonDelay(); state.recoil = RECOIL[weapon.id].duration; state.event++; emit('weapon:'+weapon.id); }
      else {
        secondarySide *= -1;
        state.gunCooldown = weapon.interval;
        state.gunAmmo -= weapon.count; emit('weapon:'+weapon.id);
        if (state.gunAmmo < weapon.count) startGunReload();
      }
    }
    function fireBeam(origin,angle,weapon) {
      const dx=Math.cos(angle),dy=Math.sin(angle),range=1100;
      const along=p=>(p.x-origin.x)*dx+(p.y-origin.y)*dy;
      const candidates=state.enemies.filter(e=>e.hp>0 && !(weapon.mode==='chain'&&e.submerged)
        && along(e)>0 && along(e)<=range && Math.abs((e.x-origin.x)*dy-(e.y-origin.y)*dx)<shipRadius(e)+3)
        .sort((a,b)=>along(a)-along(b));
      const targets=candidates.slice(0,weapon.mode==='pierce'?3:1);
      const beam=(from,to,width=4)=>state.effects.push({x:from.x,y:from.y,ex:to.x,ey:to.y,kind:'beam',color:weapon.color,size:width,age:0,duration:.22,seed:0});
      if(weapon.mode==='chain'){
        const shell=state.hostile.filter(p=>!p.dead&&along(p)>0&&along(p)<(targets[0]?along(targets[0]):range)
          &&Math.abs((p.x-origin.x)*dy-(p.y-origin.y)*dx)<10).sort((a,b)=>along(a)-along(b))[0];
        if(shell){shell.dead=true;beam(origin,shell);return;}
        if(targets.length){
          let from=origin;
          for(let i=0;i<3;i++){
            const target=targets[i];if(!target)break;
            beam(from,target,3);hitEnemy(target,weapon.damage*Math.pow(.75,i));from=target;
            const next=state.enemies.filter(e=>e.hp>0&&!e.submerged&&!targets.includes(e)&&Math.hypot(e.x-target.x,e.y-target.y)<130)
              .sort((a,b)=>Math.hypot(a.x-target.x,a.y-target.y)-Math.hypot(b.x-target.x,b.y-target.y))[0];
            if(next)targets.push(next);
          }
          return;
        }
      }
      const length=weapon.mode!=='pierce'&&targets.length?along(targets[0]):range;
      beam(origin,{x:origin.x+dx*length,y:origin.y+dy*length},weapon.mode==='pierce'?7:4);
      targets.forEach(e=>hitEnemy(e,weapon.damage,weapon.mode==='pierce'));
    }
    function detonate(bullet) {
      effect(bullet.x, bullet.y, bullet.weapon==='plasma'?'plasma':'explosion', bullet.radius);
      emit('explosion');
      state.enemies.forEach(e => {
        if (Math.hypot(e.x - bullet.x, e.y - bullet.y) < bullet.radius + shipRadius(e)) hitEnemy(e, bullet.damage);
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
      if (id === 'fullRepair') return Math.max(40, Math.ceil((state.maxHp - state.hp) * .65 / 5) * 5);
      if (UPGRADES[id]) return UPGRADES[id].base + UPGRADES[id].step * state.upgrades[id];
      return ITEMS.find(item => item.id === id)?.price ?? Infinity;
    }
    function purchase(id) {
      if (state.phase !== 'shop') return false;
      const cost = price(id), upgrade = UPGRADES[id], index = ITEMS.findIndex(item => item.id === id);
      if (id === 'fullRepair') {
        if (state.hp >= state.maxHp || state.credits < cost) return false;
        state.credits -= cost; state.hp = state.maxHp; state.message = '炮台已完全修复'; return true;
      }
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
      state.gunRecoil = state.gunRecoil.map(remaining => Math.max(0, remaining - dt));
      if (state.phase !== 'playing') return;
      state.shield = Math.max(0, state.shield - dt); state.freeze = Math.max(0, state.freeze - dt);
      const wasCooling = state.cannonCooldown > 0;
      state.cannonCooldown = Math.max(0, state.cannonCooldown - dt); state.gunCooldown = Math.max(0, state.gunCooldown - dt);
      if (wasCooling && !state.cannonCooldown && !state.primary) emit('ready');
      const wasReloading = state.gunReload > 0;
      state.gunReload = Math.max(0, state.gunReload - dt);
      if (wasReloading && !state.gunReload) { state.gunAmmo = weaponStats('secondary').magazine; emit('ready'); }
      if (state.primary && !state.cannonCooldown) fire('primary');
      if (state.secondary && !state.gunCooldown && !state.gunReload) fire('secondary');
      state.spawnTimer -= dt;
      if (state.spawnLeft > 0 && state.spawnTimer <= 0) {
        const difficulty=DIFFICULTIES[state.difficulty];
        const cap=difficulty.maxAlive+Math.floor((state.wave-1)/4);
        if (state.enemies.filter(enemy=>enemy.hp>0).length < cap) {
          spawn(); state.spawnTimer = Math.max(.9, 2.4 - state.wave * .13) * difficulty.spacing;
        } else state.spawnTimer = .25;
      }
      const slow = state.freeze > 0 ? .25 : 1;
      for (const enemy of state.enemies) {
        if (enemy.hp <= 0) continue;
        enemy.chill=Math.max(0,(enemy.chill||0)-dt);
        const movement=slow*(enemy.chill>0?.45:1);
        enemy.age += dt * movement; enemy.flash = Math.max(0, enemy.flash - dt);
        enemy.submerged = enemy.type === 'submarine' && enemy.age % 9 < 4;
        const dx = CX - enemy.x, dy = CY - enemy.y, distance = Math.hypot(dx, dy), angle = Math.atan2(dy, dx);
        if(enemy.type==='raider' && distance<58){hitBase(enemy.damage);enemy.hp=0;state.destroyed++;effect(enemy.x,enemy.y,'explosion',30);continue;}
        if (distance > enemy.range) {
          enemy.angle = angle; enemy.x += Math.cos(angle) * enemy.speed * dt * movement; enemy.y += Math.sin(angle) * enemy.speed * dt * movement;
        } else {
          enemy.angle = angle + enemy.turn * .55;
          enemy.x += Math.cos(angle + enemy.turn * Math.PI / 2) * enemy.speed * .32 * dt * movement;
          enemy.y += Math.sin(angle + enemy.turn * Math.PI / 2) * enemy.speed * .32 * dt * movement;
          enemy.cooldown -= dt * movement;
          if (enemy.cooldown <= 0) {
            if(enemy.type==='tender'){
              for(const ally of state.enemies)if(ally!==enemy&&ally.hp>0&&Math.hypot(ally.x-enemy.x,ally.y-enemy.y)<130)ally.hp=Math.min(ally.maxHp,ally.hp+28);
              effect(enemy.x,enemy.y,'repair',130);
            }
            const velocity=enemy.type==='submarine'?100:enemy.type==='missile'?175:140;
            const count=['missile','dreadnought'].includes(enemy.type)?3:1;
            for(let i=0;i<count && state.hostile.length<240;i++){
              const a=angle+(i-(count-1)/2)*.09;
              state.hostile.push({x:enemy.x,y:enemy.y,vx:Math.cos(a)*velocity,vy:Math.sin(a)*velocity,damage:enemy.damage,torpedo:enemy.type==='submarine',dead:false});
            }
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
          if (distanceToSegment(enemy.x, enemy.y, ox, oy, bullet.x, bullet.y) < shipRadius(enemy) + 3) {
            if (bullet.type === 'primary') detonate(bullet); else { hitEnemy(enemy, bullet.damage);if(bullet.weapon==='cryo')enemy.chill=2; effect(bullet.x, bullet.y, 'spark', 8); }
            hit = true; break;
          }
        }
        if (!hit && bullet.remaining <= 0 && bullet.type === 'primary') detonate(bullet);
        bullet.dead = hit || bullet.remaining <= 0 || bullet.x < -VIEW_PAD_X - 50 || bullet.x > W + VIEW_PAD_X + 50 || bullet.y < -VIEW_PAD_Y - 50 || bullet.y > H + VIEW_PAD_Y + 50;
      }
      for (const shell of state.hostile) {
        if (shell.dead) continue;
        shell.x += shell.vx * dt * slow; shell.y += shell.vy * dt * slow;
        if (Math.hypot(shell.x - CX, shell.y - CY) < (state.shield > 0 ? 65 : 43)) { hitBase(shell.damage); shell.dead = true; }
        if(shell.x<-VIEW_PAD_X-100||shell.x>W+VIEW_PAD_X+100||shell.y<-VIEW_PAD_Y-100||shell.y>H+VIEW_PAD_Y+100)shell.dead=true;
        if (state.phase === 'over') break;
      }
      state.bullets = state.bullets.filter(b => !b.dead); state.hostile = state.hostile.filter(b => !b.dead);
      state.enemies = state.enemies.filter(e => e.hp > 0);
      if (state.phase === 'playing' && state.spawnLeft === 0 && state.enemies.length === 0) {
        state.hp=Math.min(state.maxHp,state.hp+25);
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
      return saves.clean({ version: 2, state: { ...state,
        enemies: state.enemies.filter(e => e.hp > 0), bullets: state.bullets.filter(b => !b.dead), hostile: state.hostile.filter(b => !b.dead)
      } });
    }
    function restore(value) {
      Object.assign(state, saves.clean(value).state);
      serial = Math.max(0, ...state.enemies.map(e => e.id + 1));
      state.paused = state.phase === 'playing'; release(); resetRecoil(); drainSounds();
    }
    return { state, setAim, setDifficulty, trigger, release, pause, start, nextWave, useItem, price, purchase, step, cannonDelay, drainSounds, snapshot, restore, equip, weaponStats };
  }
  const api = { create, W, H, CX, CY, VIEW_PAD_X, VIEW_PAD_Y, VIEW_W, VIEW_H, DIFFICULTIES, TYPES, ITEMS, UPGRADES, WAVES, LEVELS, TURRET_SCALE, SHIP_SCALE, MAIN_MUZZLE, SIDE_GUN, RECOIL, recoilOffset, secondaryMuzzle, distanceToSegment, WEAPONS:weapons.WEAPONS, unlockWave:weapons.unlockWave };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SeaEngine = api;
})(typeof window === 'undefined' ? globalThis : window);
