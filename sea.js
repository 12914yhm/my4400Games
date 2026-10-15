(function () {
  'use strict';
  const { W, H, CX, CY, WAVES, LEVELS, TYPES, ITEMS, UPGRADES, WEAPONS, SIDE_GUN, RECOIL, recoilOffset, unlockWave } = window.SeaEngine;
  const art = window.SeaArt;
  const audio = window.SeaAudio.create();
  const dialog = document.createElement('dialog');
  dialog.id = 'sea-dialog'; dialog.setAttribute('aria-labelledby', 'sea-title');
  dialog.innerHTML = `<div id="sea-surface">
    <header class="sea-header"><div class="sea-brand-symbol" aria-hidden="true">⌖</div><div><h2 id="sea-title">海上保卫战</h2></div><div class="sea-header-actions"><button id="sea-help-toggle" aria-expanded="false" aria-controls="sea-help-panel">玩法</button><button id="sea-fullscreen" aria-pressed="false">⛶ 全屏</button><button id="sea-sound" aria-pressed="false">音效：关</button><button id="sea-pause">Ⅱ 暂停</button><button id="sea-close" aria-label="关闭海上保卫战">×</button></div></header>
    <div id="sea-display-status" role="status" hidden></div><div class="sea-layout"><section class="sea-main" aria-label="海战战场"><div class="sea-hud"><div class="sea-hp"><span>基地耐久 <b id="sea-hp-number">200 / 200</b></span><div class="sea-health-track"><i id="sea-hp-bar"></i></div></div><div><span>波次</span><strong id="sea-wave">01 <small>/ ${WAVES}</small></strong></div><div><span>资金</span><strong id="sea-credits">100</strong></div><div><span>得分</span><strong id="sea-score">0</strong></div></div>
      <div class="sea-stage"><canvas width="960" height="600" tabindex="0" aria-label="海战画布：鼠标瞄准，按住左键副武器射击，空格发射主武器。触屏按住目标射击。"></canvas><div class="sea-corner-label">NORTH SEA / SECTOR 07</div><div class="sea-wave-label" id="sea-wave-label">防御系统已就绪</div><div class="sea-overlay"></div></div>
      <div class="sea-weapons"><div class="sea-weapon" id="sea-heat-meter"><span>机枪热量 <b id="sea-heat-value">热量 0%</b></span><div class="sea-weapon-track" id="sea-heat-track" role="progressbar" aria-label="副武器热量" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i id="sea-heat-bar"></i></div><small>松手散热 · 降至 30% 解除过热</small></div><div class="sea-weapon"><span>主炮装填 <b id="sea-reload-value">可发射</b></span><div class="sea-weapon-track" id="sea-reload-track" role="progressbar" aria-label="主炮装填进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><i id="sea-reload-bar"></i></div><small>空格 / 主炮按钮 · 按住持续发射</small></div></div><div class="sea-battle-controls"><button id="sea-cannon" aria-label="按住发射主炮"><span>◎ 主炮</span><small id="sea-cannon-status">就绪 · 按住发射</small><i id="sea-cannon-bar"></i></button><div class="sea-items">${ITEMS.map((item,i)=>`<button data-sea-item="${i}" title="${item.description}"><kbd>${i+1}</kbd><span>${item.name}</span><b id="sea-item-${i}">1</b></button>`).join('')}</div></div>
      <p class="sea-message" role="status">守住中央炮台，抵御来自四面八方的敌舰。</p>
    </section><aside class="sea-sidebar" id="sea-help-panel" aria-label="玩法与战绩" hidden><div class="sea-help-heading"><h3>玩法与战绩</h3><button id="sea-help-close" aria-label="关闭玩法说明">×</button></div><div class="sea-manual"><p><kbd>鼠标 / 摇杆</kbd> 转动炮台，瞄准敌舰</p><p><kbd>按住 / 拖动</kbd> 机枪连射，松手散热</p><p><kbd>空格 / 主炮</kbd> 发射当前装备的主武器</p><p><kbd>1–4 / 道具</kbd> 维修、护盾、空袭与干扰</p><small>机枪从左右枪口平行射击；潜航的潜艇需要用主炮攻击。守住 ${WAVES} 波进攻，每 4 波有旗舰来袭。</small></div><details class="sea-route-panel"><summary>战役航线 · ${WAVES} 关</summary><ol id="sea-route"></ol></details><div class="sea-intel"><dl><div><dt>剩余敌舰</dt><dd id="sea-remaining">—</dd></div><div><dt>累计击沉</dt><dd id="sea-kills">0</dd></div><div><dt>最高分</dt><dd id="sea-best">0</dd></div></dl></div><button id="sea-restart">重新开始本局</button></aside></div></div>`;
  document.body.append(dialog);
  const surface = dialog.querySelector('#sea-surface');
  const saveStrip = document.createElement('div');
  saveStrip.className = 'sea-save-strip';
  saveStrip.innerHTML = '<span id="sea-save-status" role="status">游客模式 · 本局进度不保存</span><button id="sea-save-action">登录保存进度</button>';
  dialog.querySelector('.sea-header').after(saveStrip);
  const arsenal = document.createElement('section');
  arsenal.className = 'sea-arsenal'; arsenal.setAttribute('aria-label','武器装备');
  arsenal.innerHTML = `<div class="sea-loadout"><div><small>主炮</small><strong id="sea-primary-name">标准舰炮</strong></div><div><small>机枪</small><strong id="sea-secondary-name">轻型机枪</strong></div><button id="sea-armory-toggle" aria-expanded="false" aria-controls="sea-armory">武器库 <span>↗</span></button></div><div id="sea-armory" hidden><p id="sea-unlock-note" class="sea-unlock-note"></p><div class="sea-armory-heading"><span class="sea-kicker">ARSENAL / 武器库</span><small>解锁后免费装备 · 换装保留热量与冷却</small></div><div id="sea-armory-cards"></div></div>`;
  dialog.querySelector('.sea-hud').after(arsenal);
  const touchPanel = document.createElement('div');
  touchPanel.className = 'sea-touch-panel';
  touchPanel.innerHTML = '<small>拖动瞄准 · 自动连射</small><div id="sea-stick" role="group" aria-label="触控瞄准摇杆，拖动方向并连射副武器"><i id="sea-stick-knob"></i><span>瞄准</span></div><small>松手停火散热</small>';
  arsenal.after(touchPanel);
  const rotatePanel = document.createElement('div');
  rotatePanel.className = 'sea-rotate'; rotatePanel.hidden = true;
  rotatePanel.innerHTML = '<div><span aria-hidden="true">↻ ▱</span><h3>横过手机，准备开战</h3><p>左手拖动瞄准，右手发射主炮。<br>若没有自动旋转，请开启手机自动旋转并横放。</p><button id="sea-rotate-start">全屏横屏</button><button id="sea-rotate-close">返回大厅</button></div>';
  dialog.querySelector('.sea-header').after(rotatePanel);
  const $ = selector => dialog.querySelector(selector);
  const canvas = $('canvas'), ctx = canvas.getContext('2d');
  let game, raf = 0, lastTime = 0, uiTime = 0, lastPhase = '', overlayKey = '', onPlay, played = false;
  let best = 0, pointer = null, restartConfirm = false;
  let stickPointer = null, cannonPointer = null, ownsFullscreen = false, ownsOrientation = false, displayRequest = 0, displayPromise = null;
  const mobile = () => !!window.matchMedia?.('(pointer: coarse)').matches && Math.min(window.innerWidth,window.innerHeight) <= 900;
  const portrait = () => mobile() && window.innerHeight > window.innerWidth;
  function mobileDisplay(manual = false) {
    if ((!mobile() && !manual) || !dialog.open || displayPromise) return displayPromise;
    const request = ++displayRequest;
    $('#sea-display-status').hidden = true;
    displayPromise = (async () => {
      try {
        // Only game content enters the top layer. Dialog elements themselves
        // cannot request fullscreen, and fullscreening the portal covers the modal.
        if (!document.fullscreenElement && surface.requestFullscreen) {
          await surface.requestFullscreen();
          if (request !== displayRequest || !dialog.open) {
            if (document.fullscreenElement === surface) await document.exitFullscreen?.();
            return;
          }
          ownsFullscreen = true;
        }
        if (request !== displayRequest || !dialog.open) return;
        if (mobile() && window.screen?.orientation?.lock) {
          await window.screen.orientation.lock('landscape');
          if (request !== displayRequest || !dialog.open) { window.screen.orientation.unlock?.(); return; }
          ownsOrientation = true;
        }
      } catch { /* Keep the game usable if fullscreen or rotation is denied. */ }
      if (manual && dialog.open && request === displayRequest && document.fullscreenElement !== surface) {
        text('#sea-display-status', '浏览器未开启全屏，请横放手机游玩，或用浏览器菜单进入全屏。');
        $('#sea-display-status').hidden = false;
      }
    })().finally(() => { displayPromise = null; syncFullscreen(); });
    return displayPromise;
  }
  function syncFullscreen() {
    const active = document.fullscreenElement === surface;
    text('#sea-fullscreen', active ? '⤢ 退出全屏' : '⛶ 全屏');
    $('#sea-fullscreen').setAttribute('aria-pressed', String(active));
  }
  async function toggleFullscreen() {
    if (document.fullscreenElement === surface) {
      try { await document.exitFullscreen(); } catch { /* Retry remains available. */ }
      syncFullscreen();
    } else return mobileDisplay(true);
  }
  function mobileLayout() {
    dialog.classList.toggle('sea-touch',mobile());
    rotatePanel.hidden = !portrait();
    $('.sea-layout').inert=portrait();saveStrip.inert=portrait();$('.sea-header').inert=portrait();
    if (portrait() && game?.state.phase === 'playing' && !game.state.paused) autoPause();
  }
  let armoryOpen = false, armoryKey = '';
  function showHelp(open) {
    $('#sea-help-panel').hidden = !open;
    $('#sea-help-toggle').setAttribute('aria-expanded', String(open));
    if (open) {
      armoryOpen = false;
      if (game?.state.phase === 'playing') { game.pause(true); release(); audio.stop(); persist(); }
      update(true); $('#sea-help-close').focus();
    }
  }
  const account = window.Accounts;
  let owner = null, revision = 0, loadingSave = false, loadError = '', saveError = '', conflict = false;
  let canSave = false, saving = null, lastSave = 0, generation = 0, savedAt = null;
  function saveBest() { if (game) best = Math.max(best, game.state.score); }
  function saveStatus() {
    let label = '游客模式 · 不保存进度', action = '登录存档';
    if (owner) {
      label = loadingSave ? '正在读取账号存档…' : loadError || saveError || (saving ? '正在保存进度…' : savedAt ? `已保存 · ${new Date(savedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : '账号存档已就绪 · 游玩时自动保存');
      action = loadError || conflict ? '重新读取' : saveError ? '重试保存' : '保存进度';
    }
    text('#sea-save-status', label); text('#sea-save-action', action);
    saveStrip.dataset.error = String(!!(loadError || saveError));
    $('#sea-save-action').disabled = loadingSave || !!saving;
  }
  async function persist() {
    if (saving) { await saving; return persist(); }
    if (!owner || !canSave || owner !== account.user?.id || conflict) return false;
    const current = generation;
    let snapshot;
    try { snapshot = game.snapshot(); } catch { saveError = '当前进度无法保存，请重试。'; saveStatus(); return false; }
    saveBest(); lastSave = Date.now(); saveError = '';
    saving = account.api('sea-save', { method: 'PUT', headers: { 'X-Account-ID': owner }, body: JSON.stringify({ revision, snapshot }), keepalive: true })
      .then(result => {
        if (current !== generation) return false;
        revision = result.revision; savedAt = result.updatedAt; best = Math.max(best, result.bestScore); return true;
      }).catch(error => {
        if (current === generation) {
          conflict = error.status === 409 || error.status === 401;
          saveError = error.status === 401 ? '登录已失效，请退出游戏后重新登录。' : error.message;
        }
        return false;
      }).finally(() => { saving = null; saveStatus(); });
    saveStatus(); return saving;
  }
  async function readProgress() {
    if (saving) await saving;
    const current = ++generation;
    loadingSave = true; canSave = false; loadError = ''; saveError = ''; conflict = false;
    owner = account.user?.id || null; revision = 0; savedAt = null; best = 0;
    game = null; reset(); saveStatus();
    try {
      if (owner) {
        const data = await account.api('sea-save', { headers: { 'X-Account-ID': owner } });
        if (current !== generation || owner !== account.user?.id) return;
        if (data.snapshot) game.restore(data.snapshot);
        revision = data.revision; savedAt = data.updatedAt; best = data.bestScore; canSave = true;
      }
    } catch (error) { loadError = error.message || '存档读取失败，请重试。'; }
    finally { if (current === generation) { loadingSave = false; lastTime = 0; lastSave = Date.now(); update(true); saveStatus(); } }
  }
  function text(selector, value) { const element = $(selector); if (element.textContent !== String(value)) element.textContent = value; }
  function notify(value) { text('.sea-message', value); }
  function release() { pointer = stickPointer = cannonPointer = null; $('#sea-stick-knob').style.transform='translate(0,0)'; game?.release(); }
  function resize() {
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * scale; canvas.height = H * scale; ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }
  function reset() {
    saveBest(); release(); audio.stop(); game = window.SeaEngine.create(); restartConfirm = false;
    showHelp(false);armoryOpen=false;armoryKey='';lastPhase = ''; overlayKey = ''; lastTime = 0; update(true);
  }
  function startPlay() {
    if(portrait()){mobileLayout();return;}
    if (art.status === 'loading' || loadingSave || loadError) return;
    showHelp(false);armoryOpen=false;
    audio.unlock();
    if (game.state.phase === 'ready') {
      game.start(); if (!played) { played = true; onPlay?.(); }
    } else if (game.state.phase === 'shop') game.nextWave();
    else if (game.state.phase === 'over' || game.state.phase === 'victory') { reset(); return; }
    else { restartConfirm = false; game.pause(false); }
    overlayKey = ''; update(true); persist(); canvas.focus({ preventScroll: true });
  }
  function shopMarkup() {
    const s = game.state;
    const cards = Object.entries(UPGRADES).map(([id, item]) => {
      const maxed = s.upgrades[id] >= item.max, cost = game.price(id);
      return `<button class="sea-shop-card" data-sea-buy="${id}" ${maxed || s.credits < cost ? 'disabled' : ''}><span>${item.name}<small>Lv.${s.upgrades[id]}</small></span><p>${item.description}</p><b>${maxed ? '已满级' : `◈ ${cost}`}</b></button>`;
    }).concat(ITEMS.map((item, i) => `<button class="sea-shop-card consumable" data-sea-buy="${item.id}" ${s.credits < item.price || s.items[i] >= 5 ? 'disabled' : ''}><span>${item.name}<small>持有 ${s.items[i]}/5</small></span><p>${item.description}</p><b>${s.items[i] >= 5 ? '已满库存' : `◈ ${item.price}`}</b></button>`));
    return `<div class="sea-shop"><span class="sea-kicker">WAVE ${String(s.wave).padStart(2,'0')} COMPLETE</span><h3>海域肃清，整备再出发。</h3><p class="sea-overlay-copy">奖励 +${s.lastReward} · 自动修复 25 · 资金 <strong>${s.credits}</strong> · 当前耐久 ${Math.ceil(s.hp)}/${s.maxHp}</p><div class="sea-shop-grid">${cards.join('')}</div><button class="sea-primary" data-sea-action="start">开始第 ${s.wave + 1} 波 <span>→</span></button><small class="sea-shop-note">下一关 · ${LEVELS[Math.min(s.wave,WAVES-1)].name}：${LEVELS[Math.min(s.wave,WAVES-1)].hint}</small></div>`;
  }
  function weaponIcon(id) {
    return `<img class="sea-weapon-art" src="./art/sea/weapon-${id}-v1${['laser','railgun','plasma','cryo','tesla'].includes(id)?'.svg':'.png'}" alt="" width="160" height="160" decoding="async">`;
  }
  function updateArsenal() {
    const s=game.state, available=unlockWave(s), all=Object.values(WEAPONS).flat();
    const key=[armoryOpen,s.phase,s.paused,s.wave,s.loadout.primary,s.loadout.secondary,...Object.values(s.upgrades),loadingSave,loadError].join(':');
    if(key===armoryKey)return;armoryKey=key;
    $('#sea-route').innerHTML=LEVELS.map(level=>`<li class="${level.wave<s.wave?'complete':level.wave===s.wave?'current':''}" title="${level.hint}"><small>${level.wave<10?'0':''}${level.wave} · ${level.chapter}</small><strong>${level.name}</strong><span>${level.wave<s.wave?'已通过':level.wave===s.wave?'当前关卡':level.wave%4===0?'旗舰战':'待挑战'}</span></li>`).join('');
    text('#sea-primary-name',game.weaponStats('primary').name);text('#sea-secondary-name',game.weaponStats('secondary').name);
    text('#sea-cannon span','◎ '+game.weaponStats('primary').name);
    const next=all.filter(w=>w.wave>available).sort((a,b)=>a.wave-b.wave)[0];
    const fresh=all.filter(w=>w.wave===available&&w.wave>1);
    text('#sea-unlock-note',`${all.filter(w=>w.wave<=available).length} / ${all.length} 已解锁${fresh.length?' · '+fresh.map(w=>w.name).join('、')+'已解锁':''}${next?' · 第 '+next.wave+' 波解锁'+next.name:' · 全部武器已开放'}`);
    $('#sea-armory').hidden=!armoryOpen;
    dialog.classList.toggle('sea-armory-open',armoryOpen);
    text('#sea-armory-toggle',armoryOpen?'收起武器库 ↑':'武器库 ↗');
    $('#sea-armory-toggle').setAttribute('aria-expanded',String(armoryOpen));
    $('#sea-armory-toggle').disabled=loadingSave||!!loadError;
    if(!armoryOpen)return;
    const canEquip=['ready','shop'].includes(s.phase)||(s.phase==='playing'&&s.paused);
    $('#sea-armory-cards').innerHTML=Object.entries(WEAPONS).map(([slot,list])=>`<div class="sea-armory-group"><h4>${slot==='primary'?'主武器 <small>重火力 · 可攻击潜航潜艇</small>':'副武器 <small>持续射击 · 可拦截炮弹</small>'}</h4><div class="sea-armory-grid">${list.map(w=>{
      const locked=w.wave>available,selected=s.loadout[slot]===w.id,stats=game.weaponStats(slot,w.id);
      const label=locked?`第 ${w.wave} 波解锁`:selected?'已装备':canEquip?'装备':'已解锁';
      return `<button class="sea-armory-card ${selected?'equipped':''} ${locked?'locked':''}" data-sea-weapon="${w.id}" data-sea-slot="${slot}" aria-pressed="${selected}" ${locked||selected||!canEquip?'disabled':''} style="--weapon-color:${w.color}"><div class="sea-armory-card-top">${weaponIcon(w.icon)}<span>${locked?'未解锁':w.wave===available&&w.wave>1?'新解锁':'已解锁'}</span></div><strong>${w.name}</strong><p>${w.description}</p><div class="sea-armory-stats">伤害 ${Math.round(stats.damage*10)/10}${w.count>1?' × '+w.count:''}<span>${Number(stats.interval.toFixed(slot==='primary'?1:3))} 秒 / 次</span></div><b>${label}${!locked&&!selected&&canEquip?' →':''}</b></button>`;
    }).join('')}</div></div>`).join('');
  }
  function update(force = false) {
    const s = game.state;
    dialog.classList.toggle('sea-resupply',s.phase==='shop');
    updateArsenal();
    if (lastPhase !== s.phase) { if (['shop','over','victory'].includes(s.phase)) { saveBest(); if (!loadingSave) persist(); } lastPhase = s.phase; force = true; const unlocked=s.phase==='shop'?Object.values(WEAPONS).flat().filter(w=>w.wave===s.wave+1):[];notify(unlocked.length?'新武器已解锁：'+unlocked.map(w=>w.name).join('、')+'。打开武器库装备后再出发。':s.message); }
    text('#sea-hp-number', `${Math.ceil(s.hp)} / ${s.maxHp}`); $('#sea-hp-bar').style.width = `${s.hp / s.maxHp * 100}%`;
    $('#sea-hp-bar').classList.toggle('critical', s.hp / s.maxHp < .3);
    const waveLabel = `${String(s.wave).padStart(2,'0')} <small>/ ${WAVES}</small>`;
    if ($('#sea-wave').innerHTML !== waveLabel) $('#sea-wave').innerHTML = waveLabel;
    text('#sea-credits', s.credits); text('#sea-score', s.score); text('#sea-remaining', s.phase === 'playing' ? s.spawnLeft + s.enemies.length : '—');
    text('#sea-kills', s.kills); text('#sea-best', Math.max(best, s.score));
    text('#sea-pause', s.paused ? '▶ 继续' : 'Ⅱ 暂停'); $('#sea-pause').disabled = s.phase !== 'playing';
    text('#sea-sound', `音效：${audio.enabled ? '开' : '关'}`); $('#sea-sound').setAttribute('aria-pressed',String(audio.enabled));
    $('#sea-cannon').disabled = s.phase !== 'playing' || s.paused;
    const cannonReady = Math.max(0, Math.min(100, (1 - s.cannonCooldown / game.cannonDelay()) * 100));
    $('#sea-cannon-bar').style.width = `${cannonReady}%`;
    const cooling = s.cannonCooldown > 0;
    text('#sea-cannon-status', cooling ? `冷却 ${s.cannonCooldown.toFixed(1)}s` : '就绪 · 按住发射');
    $('#sea-cannon').classList.toggle('cooling',cooling);
    const heatText = s.overheated ? `过热锁定 · ${Math.ceil((s.gunHeat-30)/25*10)/10}s` : `热量 ${Math.round(s.gunHeat)}%`;
    text('#sea-heat-value', heatText); text('#sea-reload-value', cooling ? `${s.cannonCooldown.toFixed(1)}s` : '可发射');
    $('#sea-heat-meter').classList.toggle('hot',s.gunHeat>=70||s.overheated);
    $('#sea-heat-meter').classList.toggle('locked',s.overheated);
    $('#sea-heat-bar').style.width=`${s.gunHeat}%`; $('#sea-reload-bar').style.width=`${cannonReady}%`;
    $('#sea-heat-track').setAttribute('aria-valuenow',String(Math.round(s.gunHeat)));
    $('#sea-heat-track').setAttribute('aria-valuetext',heatText);
    $('#sea-reload-track').setAttribute('aria-valuenow',String(Math.round(cannonReady)));
    dialog.querySelectorAll('[data-sea-item]').forEach(button => {
      const i = Number(button.dataset.seaItem); text(`#sea-item-${i}`, s.items[i]);
      button.disabled = s.phase !== 'playing' || s.paused || s.items[i] === 0 || (i === 0 && s.hp >= s.maxHp) || (i === 1 && s.shield > 0) || (i === 3 && s.freeze > 0);
    });
    $('#sea-wave').title=LEVELS[s.wave-1].name;
    text('#sea-wave-label', s.phase === 'playing' ? `第 ${s.wave} 关 · ${LEVELS[s.wave-1].name} · ${s.destroyed} / ${s.total}${s.shield ? `  /  护盾 ${Math.ceil(s.shield)}s` : ''}${s.freeze ? `  /  干扰 ${Math.ceil(s.freeze)}s` : ''}` : `${LEVELS[s.wave-1].chapter} · ${LEVELS[s.wave-1].name}`);
    const key = s.phase + ':' + s.paused + ':' + restartConfirm + ':' + art.status + ':' + loadingSave + ':' + loadError;
    if (!force && key === overlayKey) return;
    overlayKey = key;
    const overlay = $('.sea-overlay'); overlay.hidden = s.phase === 'playing' && !s.paused && !loadingSave && !loadError;
    overlay.classList.toggle('sea-ready', s.phase === 'ready');
    if (overlay.hidden) { overlay.innerHTML = ''; return; }
    if (loadingSave || loadError) {
      overlay.innerHTML = `<div class="sea-intro-panel"><span class="sea-kicker">CLOUD SAVE</span><h3>${loadingSave ? '正在读取进度' : '暂时无法读取存档'}</h3><p>${loadingSave ? '准备好后，即可继续守卫海域。' : '已有存档不会被覆盖。请点击“重新读取”重试。'}</p></div>`;
      return;
    }
    if (art.status === 'loading') {
      overlay.innerHTML = `<div class="sea-intro-panel"><span class="sea-kicker">PREPARING THE FLEET</span><h3>正在部署海域</h3><p>正在载入战舰与海面素材…</p><div class="sea-loading" aria-label="美术素材加载中"></div></div>`;
      return;
    }
    if (restartConfirm) {
      overlay.innerHTML = `<div class="sea-intro-panel"><span class="sea-kicker">REDEPLOY</span><h3>重新部署防线？</h3><p>本局进度和升级会重置，最高分会保留。</p><button class="sea-primary" data-sea-action="reset">重新开始</button><button class="sea-quiet" data-sea-action="cancel">返回战场</button></div>`;
    } else if (s.paused) {
      overlay.innerHTML = `<div class="sea-intro-panel"><span class="sea-kicker">STAND BY</span><h3>战场已暂停</h3><p>${owner ? '账号进度已载入，准备好再继续。' : '喘口气，准备好再继续。'}</p><button class="sea-primary" data-sea-action="start">继续战斗 →</button></div>`;
    } else if (s.phase === 'ready') {
      overlay.innerHTML = `<div class="sea-intro-panel"><span class="sea-kicker">THE LAST LINE OF DEFENSE</span><div class="sea-intro-emblem">⌖</div><h3>守住这片海</h3><p>击退 ${WAVES} 波敌舰，解锁未来科技武器。</p><div class="sea-intro-instructions"><span><kbd>左键</kbd> 副武器连射</span><span><kbd>空格</kbd> 主炮轰击</span><span><kbd>1–4</kbd> 战术支援</span></div><button class="sea-primary" data-sea-action="start">开始战斗 <span>→</span></button><small>触屏：按住目标射击，下方按钮发射主炮 · 横屏体验更佳</small></div>`;
    } else if (s.phase === 'shop') overlay.innerHTML = shopMarkup();
    else {
      const won = s.phase === 'victory';
      overlay.innerHTML = `<div class="sea-intro-panel"><span class="sea-kicker">${won ? 'MISSION ACCOMPLISHED' : 'MISSION ENDED'}</span><div class="sea-intro-emblem">${won ? '✦' : '⌖'}</div><h3>${won ? '海域已安全，任务完成！' : '防线失守，下次再战。'}</h3><p>击沉 ${s.kills} 艘敌舰 · ${s.score} 分<br>${won ? `成功抵御全部 ${WAVES} 波进攻` : `坚持至第 ${s.wave} 波`} · 最高分 ${best}</p><button class="sea-primary" data-sea-action="start">重新部署 →</button></div>`;
    }
  }
  function circle(x,y,r,fill,stroke,width=1) { ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();} }
  function rect(x,y,w,h,r,fill) {
    if(w<=0||h<=0)return;
    // Older mobile/embedded browsers lack roundRect. A failed health-bar draw
    // would otherwise abort the frame before the battery and next animation tick.
    r=Math.max(0,Math.min(r,w/2,h/2));
    ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();
  }
  // Presentation-only motion history: measure displacement so circling and EMP
  // slowdown affect foam without adding fields to saved enemy state.
  const shipMotion = new WeakMap();
  function wakeMotion(e) {
    const time=game.state.elapsed;
    let motion=shipMotion.get(e);
    if(!motion || time<motion.time){
      motion={x:e.x,y:e.y,time,speed:0,phase:0};shipMotion.set(e,motion);
    }
    const dt=time-motion.time;
    if(dt>0){
      const distance=Math.hypot(e.x-motion.x,e.y-motion.y);
      const speed=distance/dt;
      motion.speed+=(speed-motion.speed)*(1-Math.exp(-dt/.25));
      motion.phase=(motion.phase+distance/Math.max(1,e.radius)*.18)%1;
      motion.x=e.x;motion.y=e.y;motion.time=time;
    }
    return motion;
  }
  function ship(e) {
    ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.angle);
    const r=e.radius;
    // Hull size sets breadth; measured speed sets length and foam strength.
    const motion=wakeMotion(e), speed=motion.speed;
    const thrust=Math.min(1,speed/65), length=r*.55+speed*.9;
    const breadth=r*(.18+.14*thrust), strength=Math.min(1,speed/10);
    if (!e.submerged && speed>.3) for (let i=0;i<8;i++) {
      const p=(i/8+motion.phase)%1, x=-r*1.4-p*length;
      const rx=r*.22+length*.12, ry=breadth*(.45+p*.9);
      const foam=ctx.createRadialGradient(x,0,0,x,0,Math.max(rx,ry));
      foam.addColorStop(0,`rgba(218,244,237,${strength*(.1+.22*thrust)*(1-p)*(1-p)})`);
      foam.addColorStop(1,'rgba(218,244,237,0)');
      ctx.fillStyle=foam;ctx.beginPath();
      ctx.ellipse(x,0,rx,ry,0,0,Math.PI*2);ctx.fill();
    }
    if(e.submerged)ctx.globalAlpha=.42;
    if (!art.ship(ctx,e)) {
    ctx.save();ctx.translate(4,5);ctx.fillStyle='#163b4555';ctx.beginPath();ctx.ellipse(0,0,r*1.5,r*.7,0,0,Math.PI*2);ctx.fill();ctx.restore();
    const fill=e.flash?'#fff5cc':e.type==='fast'?'#b4976f':e.type==='armored'||e.type==='boss'?'#82908b':e.type==='submarine'?'#567985':'#b0afa0';
    ctx.fillStyle=fill;ctx.strokeStyle='#293f45';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(r*1.55,0);ctx.lineTo(r*.65,-r*.55);ctx.lineTo(-r*1.3,-r*.55);ctx.lineTo(-r*1.5,0);ctx.lineTo(-r*1.3,r*.55);ctx.lineTo(r*.65,r*.55);ctx.closePath();ctx.fill();ctx.stroke();
    rect(-r*.75,-r*.36,r*1.2,r*.72,3,e.flash?'#fff4c6':'#536c6d');
    rect(-r*.1,-r*.26,r*.6,r*.52,2,'#b5b6a4');rect(-r*.65,-r*.22,r*.37,r*.44,2,'#2c4650');
    if(e.type==='submarine'){rect(-3,-3,18,6,2,'#9aac9f');circle(9,0,3,'#dae0bd');}
    else{circle(r*.67,0,r*.23,'#52615f','#b0b7a4',1);rect(r*.6,-2,r*.8,4,1,'#343f40');}
    if(e.type==='boss'){circle(-r*.9,0,9,'#b3ada0');rect(-r*.9,-3,22,6,1,'#374f53');rect(-r*.1,-r*.63,14,5,1,'#be7158');}
    }
    ctx.restore();
    if(e.barrier>0){circle(e.x,e.y,e.radius+9,'#75cfff0c','#83dcff99',2);}
    if(e.chill>0){circle(e.x,e.y,e.radius+5,null,'#b1efff99',2);}
    if(e.hp<e.maxHp||e.type==='boss'||e.type==='dreadnought') {rect(e.x-22,e.y-e.radius-16,44,4,2,'#183b44');rect(e.x-22,e.y-e.radius-16,44*Math.max(0,e.hp/e.maxHp),4,2,e.type==='boss'?'#e4ac71':'#d5bb82');}
    if(['raider','missile','guardian','tender','dreadnought'].includes(e.type)){ctx.fillStyle=e.type==='tender'?'#9aefb8':'#d6e8ed';ctx.font='10px sans-serif';ctx.textAlign='center';ctx.fillText(TYPES[e.type].name,e.x,e.y+e.radius+22);}
    if(e.submerged){ctx.fillStyle='#bddbd9';ctx.font='9px sans-serif';ctx.textAlign='center';ctx.fillText('潜航',e.x,e.y+e.radius+18);}
  }
  function hullImpact(e) {
    const a=e.age/e.duration,r=e.size,h=e.hull,type=e.type;
    ctx.save();ctx.globalAlpha=1-a;
    if(h==='shield') {
      circle(e.x,e.y,r*(.8+a*.65),null,'#8beeff',3*(1-a)+1);
      for(let i=0;i<6;i++){const t=e.seed+i*Math.PI/3;circle(e.x+Math.cos(t)*r*(.5+a),e.y+Math.sin(t)*r*(.5+a),2.5*(1-a),'#d6ffff');}
    } else if(h==='sub') {
      circle(e.x,e.y,r*(.45+a),null,'#b5e9e4aa',2);
      for(let i=0;i<8;i++){const t=e.seed+i*2.4;circle(e.x+Math.cos(t)*r*(.2+a*.6),e.y-Math.sin(t)*r*a*1.3,Math.max(1,3.5*(1-a)),'#b5eced77','#d9ffffaa');}
    } else {
      const heavy=h==='large'||h==='medium';
      circle(e.x,e.y,r*(.2+a*.72),null,'#d5e9df99',heavy?3:2);
      circle(e.x,e.y,r*(heavy?.48:.32)*(1-a*.6),type==='tender'?'#9ef2b7aa':type==='raider'?'#ff9b5199':heavy?'#ffd09599':'#e6f7e1aa');
      for(let i=0;i<(heavy?10:6);i++){
        const t=e.seed+i*2.4,dist=r*(.18+a*(heavy?1.25:.85));
        ctx.strokeStyle=i%3?'#ffe5a6':'#8caaaf';ctx.lineWidth=(heavy?3:2)*(1-a);
        ctx.beginPath();ctx.moveTo(e.x+Math.cos(t)*dist,e.y+Math.sin(t)*dist);
        ctx.lineTo(e.x+Math.cos(t)*(dist+r*.2),e.y+Math.sin(t)*(dist+r*.2));ctx.stroke();
      }
      if(heavy)for(let i=0;i<3;i++)circle(e.x+(i-1)*r*.27,e.y-r*a*(.55+i*.16),r*(.14+a*.19),type==='guardian'?'#558bb088':'#273d4299');
      if(type==='raider'||type==='missile')for(let i=0;i<4;i++)circle(e.x+Math.cos(e.seed+i*2)*r*a,e.y+Math.sin(e.seed+i*2)*r*a,2.8*(1-a),'#ffad65');
    }
    ctx.restore();
  }
  function sinkingShip(e) {
    const a=e.age/e.duration,r=e.size,h=e.hull,underwater=h==='sub';
    ctx.save();
    for(let i=0;i<3;i++){
      const p=Math.max(0,(a-i*.16)/(1-i*.16));if(p<=0)continue;
      ctx.globalAlpha=(1-p)*(underwater?.72:.85);
      ctx.strokeStyle=underwater?'#90d8d6':'#d9f3e6';ctx.lineWidth=(h==='large'?4:2.5)*(1-p)+.5;
      ctx.beginPath();ctx.ellipse(e.x,e.y,r*(.8+p*2+i*.24),r*(.3+p*.95+i*.12),e.angle,0,Math.PI*2);ctx.stroke();
    }
    ctx.globalAlpha=(1-a)*(underwater?.65:1);
    ctx.translate(e.x,e.y+r*a*(underwater?.65:.38));
    ctx.rotate(e.angle+(underwater?0:(h==='large'?.16:.3)*a*a));
    ctx.scale(1-a*(underwater?.34:.16),1-a*(underwater?.45:.3));
    if(!art.ship(ctx,{type:e.type,radius:r,flash:0})){
      ctx.fillStyle=underwater?'#527c82':'#76878a';
      ctx.beginPath();ctx.moveTo(r*1.5,0);ctx.lineTo(r*.4,-r*.55);ctx.lineTo(-r*1.3,-r*.5);
      ctx.lineTo(-r*1.5,0);ctx.lineTo(-r*1.3,r*.5);ctx.lineTo(r*.4,r*.55);ctx.closePath();ctx.fill();
    }
    ctx.restore();
    ctx.save();ctx.globalAlpha=1-a;
    const droplets=underwater?11:h==='large'?14:8;
    for(let i=0;i<droplets;i++){
      const t=e.seed+i*2.4,spread=r*(.35+a*(underwater?1.6:2));
      circle(e.x+Math.cos(t)*spread,e.y+Math.sin(t)*spread*.56-r*a*(underwater?.35:.95),
        Math.max(1,(underwater?3:4)*(1-a)),underwater?'#a4e0dd88':'#edf7dfaa');
    }
    if(!underwater){
      const smoke=h==='large'?8:h==='medium'||h==='shield'?5:2;
      for(let i=0;i<smoke;i++){
        const t=e.seed+i*2.6,p=Math.max(0,a-i*.025);
        circle(e.x+Math.cos(t)*r*.4*(1+p),e.y-r*(.35+p*(h==='large'?2.4:1.5)),r*(.14+p*.36),e.type==='guardian'?'#497f9388':'#253b4099');
      }
      if(['raider','missile','boss','dreadnought'].includes(e.type))for(let i=0;i<(h==='large'?5:3);i++){
        const t=e.seed+i*2.4,x=e.x+Math.cos(t)*r*.46,y=e.y-r*(.1+a*(.6+i*.15));
        circle(x,y,r*(.12+.08*Math.sin(a*12+i))*(1-a),'#ffad58bb');
      }
      if(e.type==='tender'||e.type==='guardian')circle(e.x,e.y,r*(.35+a*1.4),null,e.type==='tender'?'#9cdbbc88':'#83d7f6aa',2*(1-a));
    }
    ctx.restore();
  }
  function draw() {
    const s=game.state,t=s.elapsed;
    ctx.clearRect(0,0,W,H);
    if (!art.ocean(ctx,W,H)) {
    const ocean=ctx.createLinearGradient(0,0,W,H);ocean.addColorStop(0,'#34636d');ocean.addColorStop(.5,'#25545f');ocean.addColorStop(1,'#193f50');ctx.fillStyle=ocean;ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='#a4c9bd0b';ctx.lineWidth=1;
    for(let x=0;x<W;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    for(let i=0;i<90;i++){const x=(i*137.51)%W,y=(i*73.73)%H;ctx.strokeStyle=`rgba(164,214,206,${.05+.025*Math.sin(t*1.4+i)})`;ctx.beginPath();ctx.ellipse(x+Math.sin(t*.5+i)*6,y,13+i%8,2,0,0,Math.PI);ctx.stroke();}

    } else {
      // Low-cost moving highlights leave the detailed sea texture visible.
      ctx.strokeStyle='#bcece512';ctx.lineWidth=1;
      for(let i=0;i<26;i++){const x=(i*137.51)%W,y=(i*73.73)%H;ctx.beginPath();ctx.ellipse(x+Math.sin(t*.5+i)*5,y,10+i%8,1.2,0,0,Math.PI);ctx.stroke();}
      const vignette=ctx.createRadialGradient(CX,CY,160,CX,CY,570);vignette.addColorStop(0,'transparent');vignette.addColorStop(1,'#061c3238');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
    }
    ctx.setLineDash([3,8]);circle(CX,CY,155,null,'#bed9b51c');circle(CX,CY,260,null,'#bed9b513');ctx.setLineDash([]);
    if(s.phase==='ready'){ship({x:210,y:170,radius:22,angle:.3,age:t,type:'armored',hp:1,maxHp:1});ship({x:800,y:400,radius:17,angle:3.2,age:t,type:'patrol',hp:1,maxHp:1});ship({x:710,y:120,radius:13,angle:2.4,age:t,type:'fast',hp:1,maxHp:1});}
    s.enemies.forEach(ship);
    for(const shell of s.hostile){ctx.strokeStyle=shell.torpedo?'#93d7cf99':'#eeb18299';ctx.lineWidth=shell.torpedo?4:2;ctx.beginPath();ctx.moveTo(shell.x-shell.vx*.08,shell.y-shell.vy*.08);ctx.lineTo(shell.x,shell.y);ctx.stroke();circle(shell.x,shell.y,shell.torpedo?4:3,shell.torpedo?'#d1e1bd':'#ffd0a0');}
    // Concrete octagonal battery and independently rotating gun assembly.
    if (!art.battery(ctx,CX,CY,s.angle,s.recoil,s.loadout,s.gunRecoil)) {
    circle(CX,CY+8,60,'#0f354458');circle(CX,CY,59,'#c1c2a1','#789c96',3);
    ctx.save();ctx.translate(CX,CY);ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4+Math.PI/8;ctx.lineTo(Math.cos(a)*50,Math.sin(a)*50);}ctx.closePath();ctx.fillStyle='#737e73';ctx.fill();ctx.strokeStyle='#d1cab0';ctx.lineWidth=3;ctx.stroke();
    ctx.strokeStyle='#465f5b';ctx.lineWidth=2;for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*35,Math.sin(a)*35);ctx.lineTo(Math.cos(a)*48,Math.sin(a)*48);ctx.stroke();}
    circle(0,0,32,'#334f4f','#a0ad94',3);circle(0,0,25,'#8a9680');
    ctx.rotate(s.angle);
    for(const side of [-1,1]){const y=side*SIDE_GUN.lateral,back=recoilOffset(s.loadout.secondary,s.gunRecoil[side===-1?0:1]);rect(-9-back,y-9,25,18,4,'#7b8d80');rect(9-back,y-3,SIDE_GUN.forward-9,6,1,'#30484b');}
    ctx.translate(-recoilOffset(s.loadout.primary,s.recoil),0);rect(-19,-18,40,36,8,'#a7af98');rect(-13,-13,22,26,4,'#7b8d80');rect(7,-8,46,16,3,'#344f51');rect(17,-6,31,4,1,'#9ba995');rect(48,-10,10,20,2,'#4b6160');circle(-9,0,6,'#596f63');
    ctx.restore();
    }
    // Flashes follow the moving muzzle and end before the slower return stroke.
    const muzzleFlash=(id,remaining,x,y,length,width,duration)=>{
      if(remaining<=0||RECOIL[id].duration-remaining>=duration)return;
      ctx.save();ctx.translate(CX,CY);ctx.rotate(s.angle);ctx.translate(x-recoilOffset(id,remaining),y);
      ctx.fillStyle=(WEAPONS.primary.find(w=>w.id===id)||WEAPONS.secondary.find(w=>w.id===id)).color;
      ctx.beginPath();ctx.moveTo(0,-width);ctx.lineTo(length,0);ctx.lineTo(0,width);ctx.fill();ctx.restore();
    };
    muzzleFlash(s.loadout.primary,s.recoil,57,0,27,7,.06);
    s.gunRecoil.forEach((remaining,index)=>muzzleFlash(s.loadout.secondary,remaining,SIDE_GUN.forward,(index?1:-1)*SIDE_GUN.lateral,14,3,.03));
    if(s.shield>0) {circle(CX,CY,66,'#a1e0cd18','#a0e6d7aa',3);circle(CX,CY,72,null,'#9edace36');}
    if(s.freeze>0){ctx.fillStyle='#98dce00b';ctx.fillRect(0,0,W,H);}
    for(const b of s.bullets){const color=(WEAPONS[b.type].find(w=>w.id===b.weapon)||WEAPONS[b.type][0]).color;ctx.strokeStyle=color+'88';ctx.lineWidth=b.weapon==='howitzer'?6:b.type==='primary'?4:2;ctx.beginPath();ctx.moveTo(b.x-b.vx*.022,b.y-b.vy*.022);ctx.lineTo(b.x,b.y);ctx.stroke();circle(b.x,b.y,b.weapon==='howitzer'?7:b.type==='primary'?5:2,color);}
    for(const e of s.effects){const a=e.age/e.duration;if(e.kind==='hull-hit'){hullImpact(e);continue;}if(e.kind==='ship-sink'){sinkingShip(e);continue;}if(e.kind==='beam'){ctx.save();ctx.globalAlpha=1-a;ctx.strokeStyle=e.color;ctx.lineWidth=e.size*(1-a)+1;ctx.shadowColor=e.color;ctx.shadowBlur=12;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.ex,e.ey);ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle='#ffffff';ctx.lineWidth=1;ctx.stroke();ctx.restore();continue;}if(e.kind==='plasma'){ctx.globalAlpha=1-a;circle(e.x,e.y,e.size*(.3+a),'#c17cff18','#eea5ff',4*(1-a));circle(e.x,e.y,e.size*(1-a)*.6,'#f4caff99');ctx.globalAlpha=1;continue;}if(e.kind==='repair'){ctx.globalAlpha=1-a;circle(e.x,e.y,e.size*a,null,'#83efb3',2);ctx.globalAlpha=1;continue;}if(e.kind==='explosion'&&art.explosion(ctx,e))continue;ctx.globalAlpha=1-a;if(e.kind==='airstrike'){circle(e.x,e.y,e.size*a,null,'#fff0b5',12*(1-a));}else if(e.kind==='shield'){circle(e.x,e.y,e.size+a*15,null,'#bdf2dc',4);}else{circle(e.x,e.y,e.size*(.2+a*.8),null,'#edba8666',3);circle(e.x,e.y,e.size*(1-a)*.65,'#efb47699');circle(e.x,e.y,e.size*(1-a)*.3,'#ffe6a9');for(let i=0;i<7;i++){const angle=e.seed+i*Math.PI*2/7;circle(e.x+Math.cos(angle)*e.size*a,e.y+Math.sin(angle)*e.size*a,2*(1-a),'#ffe1a8');}}ctx.globalAlpha=1;}
    if(s.phase==='playing'&&!s.paused){const a=s.aim;ctx.strokeStyle='#e5d29c';ctx.lineWidth=1.5;circle(a.x,a.y,14,null,'#e5d29c');ctx.beginPath();ctx.moveTo(a.x-21,a.y);ctx.lineTo(a.x-8,a.y);ctx.moveTo(a.x+8,a.y);ctx.lineTo(a.x+21,a.y);ctx.moveTo(a.x,a.y-21);ctx.lineTo(a.x,a.y-8);ctx.moveTo(a.x,a.y+8);ctx.lineTo(a.x,a.y+21);ctx.stroke();circle(a.x,a.y,2,'#f6ddb1');}
    if(s.damageFlash>0){ctx.strokeStyle=`rgba(219,116,84,${s.damageFlash*2})`;ctx.lineWidth=15;ctx.strokeRect(0,0,W,H);}
  }
  function frame(time) {
    if(!dialog.open)return;
    const dt=lastTime?Math.min(.05,(time-lastTime)/1000):0;lastTime=time;
    game.step(dt);draw();audio.syncFlight?.(game.state.bullets);
    if(time-uiTime>100||lastPhase!==game.state.phase){update();uiTime=time;}
    for(const kind of game.drainSounds()) audio.play(kind);
    if(owner && canSave && !saving && !loadingSave && !conflict && game.state.phase === 'playing' && Date.now()-lastSave>5000) persist();
    raf=requestAnimationFrame(frame);
  }
  function aim(event){const r=canvas.getBoundingClientRect();game.setAim((event.clientX-r.left)/r.width*W,(event.clientY-r.top)/r.height*H);}
  canvas.addEventListener('pointermove',event=>{if(game.state.phase==='playing'&&!game.state.paused&&stickPointer===null&&(pointer===null||pointer===event.pointerId))aim(event);});
  canvas.addEventListener('pointerdown',event=>{if(game.state.phase!=='playing'||game.state.paused||event.button!==0||pointer!==null||stickPointer!==null)return;event.preventDefault();pointer=event.pointerId;canvas.setPointerCapture(pointer);canvas.focus({preventScroll:true});aim(event);game.trigger('secondary',true);});
  canvas.addEventListener('pointerup',event=>{if(pointer===event.pointerId){game.trigger('secondary',false);pointer=null;}});
  ['pointercancel','lostpointercapture'].forEach(type=>canvas.addEventListener(type,event=>{if(pointer===event.pointerId){game.trigger('secondary',false);pointer=null;}}));
  canvas.addEventListener('contextmenu',event=>event.preventDefault());
  const cannon=$('#sea-cannon');
  cannon.addEventListener('pointerdown',event=>{if(event.button!==0||cannonPointer!==null||game.state.phase!=='playing'||game.state.paused)return;event.preventDefault();cannonPointer=event.pointerId;cannon.setPointerCapture(event.pointerId);game.trigger('primary',true);});
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>cannon.addEventListener(type,event=>{if(cannonPointer===event.pointerId){game.trigger('primary',false);cannonPointer=null;}}));
  const stick=$('#sea-stick');
  function steer(event){
    const r=stick.getBoundingClientRect(),dx=event.clientX-r.left-r.width/2,dy=event.clientY-r.top-r.height/2;
    const distance=Math.hypot(dx,dy),limit=r.width*.3,factor=Math.min(1,limit/(distance||1));
    $('#sea-stick-knob').style.transform=`translate(${dx*factor}px,${dy*factor}px)`;
    if(distance>8)game.setAim(CX+dx/distance*260,CY+dy/distance*260);
    game.trigger('secondary',distance>8);
  }
  stick.addEventListener('pointerdown',event=>{if(event.button!==0||pointer!==null||stickPointer!==null||game.state.phase!=='playing'||game.state.paused)return;event.preventDefault();stickPointer=event.pointerId;stick.setPointerCapture(stickPointer);steer(event);});
  stick.addEventListener('pointermove',event=>{if(stickPointer===event.pointerId){event.preventDefault();steer(event);}});
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>stick.addEventListener(type,event=>{if(stickPointer===event.pointerId){stickPointer=null;game.trigger('secondary',false);$('#sea-stick-knob').style.transform='translate(0,0)';}}));
  stick.addEventListener('contextmenu',event=>event.preventDefault());
  $('#sea-fullscreen').addEventListener('click',toggleFullscreen);
  $('#sea-rotate-start').addEventListener('click',()=>mobileDisplay(true));
  $('#sea-rotate-close').addEventListener('click',()=>dialog.close());
  cannon.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();game.trigger('primary',true);}});
  cannon.addEventListener('keyup',event=>{if(event.key==='Enter')game.trigger('primary',false);});
  function togglePause(){if(game.state.phase!=='playing'||portrait())return;restartConfirm=false;game.pause();release();if(game.state.paused){audio.stop();persist();}else {showHelp(false);armoryOpen=false;audio.unlock();}lastTime=0;update(true);}
  dialog.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!$('#sea-help-panel').hidden){event.preventDefault();showHelp(false);$('#sea-help-toggle').focus();return;}
    if(event.key.toLowerCase()==='p'){event.preventDefault();if(!event.repeat)togglePause();return;}
    if(game.state.phase!=='playing'||game.state.paused)return;
    if(event.code==='Space'){event.preventDefault();game.trigger('primary',true);}
    if(['1','2','3','4'].includes(event.key)&&!event.repeat){event.preventDefault();const ok=game.useItem(Number(event.key)-1);notify(ok?game.state.message:'道具暂不可用：检查库存、耐久或生效状态。');update();}
    if(event.target===canvas&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();const angle=game.state.angle+(event.key==='ArrowLeft'?-.09:.09);game.setAim(CX+Math.cos(angle)*280,CY+Math.sin(angle)*280);}
    if(event.target===canvas&&event.key.toLowerCase()==='f'){event.preventDefault();game.trigger('secondary',true);}
  });
  dialog.addEventListener('keyup',event=>{if(event.code==='Space')game.trigger('primary',false);if(event.key.toLowerCase()==='f')game.trigger('secondary',false);});
  dialog.addEventListener('click',async event=>{
    const weapon=event.target.closest('[data-sea-weapon]');if(weapon){if(game.equip(weapon.dataset.seaSlot,weapon.dataset.seaWeapon)){notify(game.state.message);update(true);persist();}return;}
    const item=event.target.closest('[data-sea-item]');if(item){const ok=game.useItem(Number(item.dataset.seaItem));notify(ok?game.state.message:'当前无法使用该道具');update();return;}
    const buy=event.target.closest('[data-sea-buy]');if(buy){if(game.purchase(buy.dataset.seaBuy)){notify('补给完成，准备迎接下一波。');update(true);persist();}return;}
    const action=event.target.closest('[data-sea-action]')?.dataset.seaAction;
    if(action==='start')startPlay();
    if(action==='reset'){if(owner && !(await persist()))return;reset();persist();}
    if(action==='cancel'){restartConfirm=false;game.pause(false);audio.unlock();overlayKey='';update(true);}
  });
  $('#sea-help-toggle').addEventListener('click',()=>showHelp($('#sea-help-panel').hidden));
  $('#sea-help-close').addEventListener('click',()=>{showHelp(false);$('#sea-help-toggle').focus();});
  $('#sea-pause').addEventListener('click',togglePause);
  $('#sea-armory-toggle').addEventListener('click',()=>{
    showHelp(false);armoryOpen=!armoryOpen;
    if(armoryOpen&&game.state.phase==='playing'){game.pause(true);release();audio.stop();persist();}
    update(true);
  });
  $('#sea-close').addEventListener('click',()=>dialog.close());
  $('#sea-restart').addEventListener('click',()=>{showHelp(false);if(game.state.phase==='ready'){reset();return;}restartConfirm=true;game.pause(true);audio.stop();release();update(true);});
  $('#sea-sound').addEventListener('click',()=>{audio.setEnabled(!audio.enabled);update();});
  dialog.addEventListener('close',()=>{release();cancelAnimationFrame(raf);saveBest();audio.stop();game?.drainSounds();persist();displayRequest++;if(ownsOrientation){ownsOrientation=false;try{window.screen?.orientation?.unlock?.();}catch{}}if(ownsFullscreen){ownsFullscreen=false;document.exitFullscreen?.().catch(()=>{});}});
  function autoPause(){if(dialog.open){audio.stop();game.drainSounds();if(game.state.phase==='playing'){game.pause(true);release();update(true);}persist();}}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)autoPause();});
  window.addEventListener('blur',autoPause);window.addEventListener('resize',()=>{if(dialog.open){release();mobileLayout();resize();}});
  document.addEventListener('fullscreenchange',()=>{
    syncFullscreen();
    if(!document.fullscreenElement&&ownsFullscreen){
      ownsFullscreen=false;
      if(ownsOrientation){ownsOrientation=false;try{window.screen?.orientation?.unlock?.();}catch{}}
      autoPause();
    }
    if(dialog.open){mobileLayout();resize();}
  });
  window.addEventListener('pagehide', autoPause);
  $('#sea-save-action').addEventListener('click',async()=>{
    if(!owner){dialog.close();account.open();return;}
    if(loadError||conflict){await readProgress();return;}
    await persist();
  });
  window.addEventListener('accountchange',()=>{
    if(owner && owner!==account.user?.id){canSave=false;owner=null;generation++;if(dialog.open)dialog.close();game=null;best=0;}
  });
  window.SeaDefense={async open(callback){
    await account.ready;if(saving)await saving;
    onPlay=callback;played=false;
    art.load().then(()=>{if(dialog.open){update(true);if(art.status==='partial')notify('部分画面素材暂未载入，已使用简化画面，可正常游玩。');}});
    let reading;
    if(!(game && owner===account.user?.id && saveError)){reading=readProgress();}
    else {game.pause(true);update(true);saveStatus();}
    if(!dialog.open)dialog.showModal();mobileDisplay();mobileLayout();resize();draw();cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);
    await reading;
  },async beforeLogout(){
    if(saving)await saving;
    if(owner && canSave && !conflict && !(await persist()))throw new Error('进度尚未保存成功，请恢复网络后再退出登录。');
    canSave=false;if(dialog.open)dialog.close();
  }};
})();
