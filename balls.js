(function () {
  'use strict';
  const { W, H, FLOOR, R } = window.BallsEngine;
  const dialog = document.createElement('dialog');
  dialog.id = 'breaker-dialog'; dialog.setAttribute('aria-labelledby', 'breaker-title');
  dialog.innerHTML = `
    <header class="breaker-header"><div><span class="breaker-eyebrow">PLAY ISLAND ORIGINAL · 01</span><h2 id="breaker-title">弹珠打砖块 <span>BOUNCE!</span></h2></div><button class="breaker-close" aria-label="关闭弹珠游戏">×</button></header>
    <div class="breaker-layout"><section class="breaker-main" aria-label="游戏区域">
      <div class="breaker-stats"><div><span>得分</span><strong id="breaker-score">0</strong></div><div><span>回合</span><strong id="breaker-level">01</strong></div><div><span>弹珠</span><strong id="breaker-balls">10</strong></div><div><span>最高分</span><strong id="breaker-best">0</strong></div></div>
      <div class="breaker-canvas-wrap"><canvas width="420" height="560" tabindex="0" aria-label="弹珠游戏画布：拖动瞄准，松开发射。也可用左右方向键瞄准，空格发射。"></canvas><div class="breaker-overlay" hidden><span class="breaker-overlay-icon">✦</span><h3></h3><p></p><button class="breaker-action" id="breaker-overlay-action">继续游戏</button></div></div>
      <p class="breaker-status" aria-live="polite">拖动瞄准，松手发射。试试利用墙壁反弹！</p>
      <div class="breaker-controls"><button id="breaker-pause">Ⅱ 暂停</button><button id="breaker-speed" aria-pressed="false">1× 速度</button><button id="breaker-recall" disabled>↓ 提前收球</button><button id="breaker-restart">↻ 重来</button></div>
    </section><aside class="breaker-guide"><span class="breaker-guide-tag">小小弹珠，大大解压</span><h3>找准角度，<br>一击连消。</h3><div class="breaker-mini-art" aria-hidden="true"><span>8</span><span>12</span><i></i><b>↗</b></div><ol><li><b>瞄准 & 发射</b><p>按住画面拖动瞄准，松开就发射。点击目标方向也可以。</p></li><li><b>反弹 & 击碎</b><p>方块数字就是剩余耐久。利用墙壁，让一颗弹珠多打几次。</p></li><li><b>收集 & 生存</b><p>碰到绿色 + 号增加弹珠。每轮方块下移，别让它们触及底线。</p></li></ol><div class="breaker-keyboard">键盘也能玩 <kbd>←</kbd> <kbd>→</kbd> 瞄准<br><kbd>Space</kbd> 发射 · <kbd>P</kbd> 暂停</div><p class="breaker-local-note">最高分保存在当前浏览器</p></aside></div>`;
  document.body.append(dialog);
  const find = selector => dialog.querySelector(selector);
  const canvas = find('canvas'), ctx = canvas.getContext('2d');
  let game, paused = false, speed = 1, raf = 0, lastTime = 0, pointer = null, validAim = false;
  let onPlay = null, reported = false, best = 0, summary = '', previousPhase = '', confirmRestart = false;
  try { best = Math.max(0, Number(localStorage.getItem('play-island-bricks-best')) || 0); } catch { /* Storage is optional. */ }
  function saveBest() {
    if (game.state.score <= best) return;
    best = game.state.score;
    try { localStorage.setItem('play-island-bricks-best', String(best)); } catch { /* Keep the session best. */ }
  }
  function resize() {
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * scale; canvas.height = H * scale; ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }
  function reset() {
    saveBest(); game = window.BallsEngine.create(); paused = false; speed = 1; pointer = null;
    confirmRestart = false; previousPhase = ''; summary = ''; lastTime = 0;
    find('#breaker-speed').textContent = '1× 速度'; find('#breaker-speed').setAttribute('aria-pressed', 'false');
    update(); draw(); canvas.focus({ preventScroll: true });
  }
  function launch() {
    if (paused || !game.shoot()) return;
    if (!reported) { reported = true; onPlay?.(); }
    update();
  }
  function update() {
    const s = game.state;
    if (previousPhase === 'firing' && s.phase !== 'firing') {
      saveBest(); summary = `上一轮命中 ${s.hits} 次${s.gained ? `，收集 +${s.gained} 颗弹珠` : ''}。`;
    }
    previousPhase = s.phase;
    function text(selector, value) { const element = find(selector); if (element.textContent !== String(value)) element.textContent = value; }
    text('#breaker-score', s.score);
    text('#breaker-level', String(s.level).padStart(2, '0'));
    text('#breaker-balls', s.ballCount + (s.gained && s.phase === 'firing' ? ` +${s.gained}` : ''));
    text('#breaker-best', Math.max(best, s.score));
    find('#breaker-recall').disabled = s.phase !== 'firing' || paused;
    find('#breaker-pause').disabled = s.phase === 'over';
    find('#breaker-pause').textContent = paused ? '▶ 继续' : 'Ⅱ 暂停';
    const over = s.phase === 'over', overlay = find('.breaker-overlay');
    overlay.hidden = !paused && !over;
    find('.breaker-overlay h3').textContent = over ? '再来一次，再高一点' : confirmRestart ? '重新开始这一局？' : '休息一下，快乐不急';
    find('.breaker-overlay p').textContent = over ? `本局 ${s.score} 分 · 坚持了 ${s.level} 回合` : confirmRestart ? '当前进度会重置，最高分会保留。点击「继续」可取消。' : '准备好后，继续你的弹珠连击。';
    find('#breaker-overlay-action').textContent = over || confirmRestart ? '↻ 开始新一局' : '▶ 继续游戏';
    const status = over ? '方块碰到底线了。本局结束！' : paused ? '游戏已暂停' : s.phase === 'firing' ? '弹珠发射中 · 可切换 2× 加速，或提前收球结束本轮' : summary + '拖动瞄准，松手发射。';
    if (find('.breaker-status').textContent !== status) find('.breaker-status').textContent = status;
  }
  function rounded(x, y, w, h, radius) { ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); }
  function dot(x, y, radius, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); }
  function draw() {
    const s = game.state;
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#152d32'; ctx.fillRect(0, 0, W, H);
    for (let y = 18; y < FLOOR - 12; y += 24) for (let x = 18; x < W; x += 24) dot(x, y, .75, '#294047');
    ctx.fillStyle = '#20373a'; ctx.fillRect(0, FLOOR - 12, W, H - FLOOR + 12);
    ctx.setLineDash([5, 7]); ctx.strokeStyle = '#cda17c80'; ctx.beginPath(); ctx.moveTo(0, FLOOR - 12); ctx.lineTo(W, FLOOR - 12); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#b69c84'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right'; ctx.fillText('守住底线', W - 14, H - 12);
    for (const b of s.blocks) {
      const color = b.hp <= 5 ? '#89cbb5' : b.hp <= 12 ? '#ead096' : b.hp <= 25 ? '#eaa47d' : b.hp <= 50 ? '#d7949d' : '#ae9acb';
      ctx.fillStyle = '#071e2355'; rounded(b.x, b.y + 4, b.w, b.h, 8); ctx.fill();
      ctx.fillStyle = b.flash ? '#fff8df' : color; rounded(b.x, b.y, b.w, b.h, 8); ctx.fill();
      ctx.fillStyle = '#ffffff38'; rounded(b.x + 5, b.y + 4, b.w - 10, 3, 2); ctx.fill();
      ctx.fillStyle = '#29433f'; ctx.font = 'bold 19px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(b.hp, b.x + 24, b.y + 31);
    }
    for (const p of s.pickups) { dot(p.x, p.y, 14, '#85e4b718'); ctx.strokeStyle = '#91edbb'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(p.x - 4, p.y); ctx.lineTo(p.x + 4, p.y); ctx.moveTo(p.x, p.y - 4); ctx.lineTo(p.x, p.y + 4); ctx.stroke(); }
    if (s.phase === 'aiming' && !paused) {
      // Preview wall bounces and stop at the first block; dots never promise a path through bricks.
      let x = s.launchX, y = FLOOR - R, dx = Math.cos(s.angle), dy = Math.sin(s.angle);
      for (let i = 0; i < 150; i++) {
        x += dx * 4; y += dy * 4;
        if (x < R || x > W - R) { dx *= -1; x = Math.max(R, Math.min(W - R, x)); }
        if (y < R) { dy *= -1; y = R; }
        if (y > FLOOR || s.blocks.some(b => x > b.x - R && x < b.x + b.w + R && y > b.y - R && y < b.y + b.h + R)) break;
        if (i % 4 === 0) dot(x, y, 2, `rgba(182,232,206,${.7 - i / 240})`);
      }
      dot(s.launchX, FLOOR - R, 12, '#b3ebc926'); dot(s.launchX, FLOOR - R, R + 1, '#fff8db');
      ctx.font = 'bold 12px sans-serif'; ctx.textAlign = s.launchX > W - 45 ? 'right' : 'left'; ctx.fillStyle = '#cfdfcf'; ctx.fillText(`×${s.ballCount}`, s.launchX > W - 45 ? s.launchX - 13 : s.launchX + 13, FLOOR + 3);
    }
    for (const ball of s.balls) { dot(ball.x - ball.vx / 75, ball.y - ball.vy / 75, R - 1, '#fff6d82c'); dot(ball.x, ball.y, R, '#fff7de'); }
    if (s.phase === 'firing' && s.landingX !== null) dot(s.landingX, FLOOR - R, R, '#a6dfbd');
    for (const p of s.particles) { ctx.globalAlpha = p.life / .4; dot(p.x, p.y, 2.5, p.hue); } ctx.globalAlpha = 1;
  }
  function frame(time) {
    if (!dialog.open) return;
    const elapsed = lastTime ? (time - lastTime) / 1000 : 0; lastTime = time;
    if (!paused) { game.step(Math.min(elapsed, .05) * speed); update(); }
    draw(); raf = requestAnimationFrame(frame);
  }
  function point(event) {
    const bounds = canvas.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width * W, y = (event.clientY - bounds.top) / bounds.height * H;
    validAim = y < FLOOR - 12;
    if (validAim) game.aim(Math.atan2(y - (FLOOR - R), x - game.state.launchX));
  }
  canvas.addEventListener('pointerdown', event => {
    if (paused || game.state.phase !== 'aiming' || pointer !== null || event.button !== 0) return;
    event.preventDefault(); pointer = event.pointerId; canvas.setPointerCapture(pointer); canvas.focus({ preventScroll: true }); point(event);
  });
  canvas.addEventListener('pointermove', event => { if (event.pointerId === pointer) point(event); });
  canvas.addEventListener('pointerup', event => {
    if (event.pointerId !== pointer) return;
    point(event); pointer = null; if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (validAim) launch();
  });
  canvas.addEventListener('pointercancel', () => { pointer = null; validAim = false; });
  function togglePause() { if (game.state.phase === 'over') return; paused = !paused; confirmRestart = false; pointer = null; lastTime = 0; update(); }
  dialog.addEventListener('keydown', event => {
    if (event.key.toLowerCase() === 'p') { event.preventDefault(); togglePause(); }
    if (event.target !== canvas) return;
    if (['ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
    if (paused) return;
    if (event.key === 'ArrowLeft') game.aim(game.state.angle - .04);
    if (event.key === 'ArrowRight') game.aim(game.state.angle + .04);
    if (event.key === ' ') launch();
  });
  find('.breaker-close').addEventListener('click', () => dialog.close());
  find('#breaker-pause').addEventListener('click', togglePause);
  find('#breaker-speed').addEventListener('click', () => { speed = speed === 1 ? 2 : 1; find('#breaker-speed').textContent = `${speed}× 速度`; find('#breaker-speed').setAttribute('aria-pressed', String(speed === 2)); });
  find('#breaker-recall').addEventListener('click', () => { if (!paused) { game.recall(); update(); } });
  find('#breaker-restart').addEventListener('click', () => { if (game.state.phase === 'over') reset(); else { paused = true; confirmRestart = true; update(); } });
  find('#breaker-overlay-action').addEventListener('click', () => { if (game.state.phase === 'over' || confirmRestart) reset(); else { togglePause(); canvas.focus({ preventScroll: true }); } });
  dialog.addEventListener('close', () => { cancelAnimationFrame(raf); saveBest(); pointer = null; });
  document.addEventListener('visibilitychange', () => { if (document.hidden && dialog.open && game.state.phase !== 'over') { paused = true; pointer = null; update(); } });
  window.addEventListener('resize', () => { if (dialog.open) resize(); });
  window.BrickBreaker = {
    open(callback) {
      onPlay = callback; reported = false; game = window.BallsEngine.create();
      dialog.showModal(); resize(); reset(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    }
  };
})();
