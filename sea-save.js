/* Versioned, bounded save format shared by the browser and API. */
(function (root) {
  'use strict';
  const weapons=typeof module!=='undefined'&&module.exports?require('./sea-weapons'):root.SeaWeapons;
  const n = (min, max, integer = false) => v => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max && (!integer || Number.isInteger(v));
  const bool = v => typeof v === 'boolean';
  const one = values => v => values.includes(v);
  function object(value, schema) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('存档格式无效');
    const result = {};
    for (const [key, rule] of Object.entries(schema)) {
      if (!rule(value[key])) throw new Error('存档数据无效：' + key);
      result[key] = value[key];
    }
    return result;
  }
  const position = { x: n(-2000, 3000), y: n(-2000, 3000) };
  function list(value, schema, max) {
    if (!Array.isArray(value) || value.length > max) throw new Error('存档对象过多');
    return value.map(item => object(item, schema));
  }
  function clean(save) {
    if (save?.version !== 1) throw new Error('不支持此存档版本');
    const s = save.state;
    const state = object(s, {
      phase: one(['ready', 'playing', 'shop', 'over', 'victory']), paused: bool,
      wave: n(1, 8, true), hp: n(0, 440), maxHp: n(200, 440, true), credits: n(0, 10000000, true),
      score: n(0, 100000000, true), kills: n(0, 10000, true), angle: n(-100, 100),
      cannonCooldown: n(0, 4), gunCooldown: n(0, 1), recoil: n(0, 1), shield: n(0, 8), freeze: n(0, 7),
      gunHeat: n(0, 100), overheated: bool, spawnLeft: n(0, 21, true), total: n(0, 21, true),
      destroyed: n(0, 21, true), spawnTimer: n(-1000000, 10), elapsed: n(0, 10000000),
      lastReward: n(0, 10000, true), event: n(0, 10000000, true)
    });
    state.upgrades = object(s.upgrades, { power: n(0, 5, true), rate: n(0, 4, true), cannon: n(0, 4, true), armor: n(0, 4, true) });
    if (state.maxHp !== 200 + state.upgrades.armor * 60 || state.hp > state.maxHp) throw new Error('耐久数据无效');
    if (!Array.isArray(s.items) || s.items.length !== 4 || !s.items.every(n(0, 5, true))) throw new Error('道具数据无效');
    state.items = s.items.slice();
    // Saves made before the armory update keep their original standard weapons.
    state.loadout=object(s.loadout===undefined?{primary:'cannon',secondary:'machinegun'}:s.loadout,{
      primary:v=>!!weapons.find('primary',v),secondary:v=>!!weapons.find('secondary',v)
    });
    for(const slot of ['primary','secondary'])if(weapons.find(slot,state.loadout[slot]).wave>weapons.unlockWave(state))throw new Error('武器尚未解锁');
    state.aim = object(s.aim, { x: n(0, 960), y: n(0, 600) });
    state.enemies = list(s.enemies, { ...position, id: n(0, 100000, true), type: one(['patrol','fast','armored','submarine','boss']),
      hp: n(0, 10000), maxHp: n(1, 10000), speed: n(1, 100), radius: n(1, 50), reward: n(0, 1000), damage: n(0, 100),
      interval: n(.1, 10), range: n(0, 500), angle: n(-100, 100), cooldown: n(-1, 10), turn: one([-1, 1]), age: n(0, 10000000), flash: n(0, 1), submerged: bool }, 21);
    if (new Set(state.enemies.map(e => e.id)).size !== state.enemies.length) throw new Error('敌舰编号重复');
    state.bullets = list(s.bullets, { ...position, vx: n(-1000, 1000), vy: n(-1000, 1000), type: one(['primary', 'secondary']), damage: n(0, 1000), remaining: n(0, 2000), radius: n(0, 200) }, 128);
    state.bullets.forEach((bullet,i)=>{
      const id=s.bullets[i].weapon===undefined?(bullet.type==='primary'?'cannon':'machinegun'):s.bullets[i].weapon;
      const weapon=weapons.find(bullet.type,id);
      if(!weapon||weapon.wave>weapons.unlockWave(state))throw new Error('弹药类型无效');
      bullet.weapon=id;
    });
    state.hostile = list(s.hostile, { ...position, vx: n(-1000, 1000), vy: n(-1000, 1000), damage: n(0, 100), torpedo: bool }, 256);
    // Never restore held controls, pending sounds, animations or fractional ticks.
    Object.assign(state, { primary: false, secondary: false, effects: [], accumulator: 0, damageFlash: 0, message: '' });
    return { version: 1, state };
  }
  const api = { clean };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SeaSave = api;
})(typeof window === 'undefined' ? globalThis : window);
