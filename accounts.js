(function () {
  'use strict';
  let user = null, mode = 'login', busy = false, available = true;
  const button = document.querySelector('#account-button');
  const dialog = document.createElement('dialog');
  dialog.id = 'account-dialog'; dialog.setAttribute('aria-labelledby', 'account-title');
  dialog.innerHTML = `<button class="account-close" aria-label="关闭账号窗口">×</button><div class="account-emblem">P<span>✦</span></div><span class="account-kicker">PLAY ISLAND · 玩岛账号</span><h2 id="account-title">欢迎回来</h2><p class="account-copy">登录后，海战进度会为你保留。</p><div class="account-tabs"><button type="button" data-auth-mode="login">登录</button><button type="button" data-auth-mode="register">注册</button></div><form id="account-form"><label for="account-username">用户名</label><input id="account-username" name="username" autocomplete="username" minlength="3" maxlength="24" required placeholder="3–24 位中文、字母或数字"><label for="account-password">密码</label><input id="account-password" name="password" type="password" autocomplete="current-password" minlength="8" maxlength="128" required placeholder="至少 8 位"><div id="account-confirm-field" hidden><label for="account-confirm">确认密码</label><input id="account-confirm" name="confirm" type="password" autocomplete="new-password" minlength="8" maxlength="128" placeholder="再输入一次密码"></div><p id="account-feedback" role="status" aria-live="polite"></p><button class="account-submit" type="submit">登录</button></form><div id="account-profile" hidden><div class="account-feature"><b>☁ 海战进度自动保存</b><p>波次、资金、升级和战场状态，跟随你的账号。换一台设备，也能继续。</p></div><button id="account-logout" class="account-submit">退出登录</button><p id="account-profile-feedback" role="status"></p></div><button id="account-guest">先以游客身份游玩 →</button><small class="account-note">游客可直接游玩，本局进度不会保存。</small>`;
  document.body.append(dialog);
  const $ = s => dialog.querySelector(s);
  async function api(endpoint, options = {}) {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(new URL('./api/' + endpoint, document.baseURI), {
        credentials: 'same-origin', cache: 'no-store', ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers }, signal: controller.signal
      });
      const result = await response.json();
      if (!response.ok) throw Object.assign(new Error(result.error || '操作失败，请重试。'), { status: response.status });
      return result;
    } catch (error) {
      if (error.status) throw error;
      throw new Error('暂时连接不上服务器，请检查网络后重试。');
    } finally { clearTimeout(timeout); }
  }
  function render() {
    button.textContent = user ? user.username : '登录 / 注册';
    button.title = user ? '管理账号：' + user.username : '登录并保存海战进度';
    button.classList.toggle('signed-in', !!user);
    $('#account-title').textContent = user ? '你好，' + user.username : mode === 'register' ? '加入玩岛' : '欢迎回来';
    $('.account-copy').textContent = user ? '你的下一场海战，随时可以继续。' : mode === 'register' ? '创建账号，把每一次进步留下来。' : '登录后，海战进度会为你保留。';
    $('.account-tabs').hidden = $('#account-form').hidden = !!user;
    $('#account-profile').hidden = !user; $('#account-guest').hidden = !!user;
    $('.account-note').textContent = user ? '每个账号拥有独立存档 · 暂停或退出时自动保存' : '游客可直接游玩，本局进度不会保存。';
    $('#account-confirm-field').hidden = mode !== 'register';
    $('#account-confirm').required = mode === 'register';
    $('#account-confirm').disabled = mode !== 'register';
    $('#account-password').autocomplete = mode === 'register' ? 'new-password' : 'current-password';
    $('#account-form .account-submit').textContent = busy ? '请稍候…' : mode === 'register' ? '注册并登录' : '登录';
    dialog.querySelectorAll('button, input').forEach(el => { if (el.id !== 'account-confirm') el.disabled = busy; });
    dialog.querySelectorAll('[data-auth-mode]').forEach(el => { el.classList.toggle('active', el.dataset.authMode === mode); el.setAttribute('aria-pressed', String(el.dataset.authMode === mode)); });
  }
  function changed(value) { user = value; available = true; render(); window.dispatchEvent(new Event('accountchange')); }
  const ready = api('me').then(data => changed(data.user)).catch(() => { available = false; render(); });
  async function open() {
    await ready; $('#account-feedback').textContent = ''; $('#account-profile-feedback').textContent = '';
    render(); dialog.showModal();
    if (!available) $('#account-feedback').textContent = '服务器暂不可用，可稍后重试或先以游客游玩。';
  }
  button.addEventListener('click', open);
  $('.account-close').addEventListener('click', () => dialog.close());
  $('#account-guest').addEventListener('click', () => dialog.close());
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  dialog.addEventListener('close', () => { $('#account-password').value = ''; $('#account-confirm').value = ''; });
  dialog.querySelectorAll('[data-auth-mode]').forEach(el => el.addEventListener('click', () => { mode = el.dataset.authMode; $('#account-feedback').textContent = ''; render(); }));
  $('#account-form').addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    const username = $('#account-username').value.trim(), password = $('#account-password').value;
    if (mode === 'register' && password !== $('#account-confirm').value) { $('#account-feedback').textContent = '两次输入的密码不一致。'; return; }
    busy = true; render(); $('#account-feedback').textContent = '';
    try { const data = await api(mode, { method: 'POST', body: JSON.stringify({ username, password }) }); changed(data.user); dialog.close(); }
    catch (error) { $('#account-feedback').textContent = error.message; }
    finally { busy = false; render(); }
  });
  $('#account-logout').addEventListener('click', async () => {
    if (busy) return; busy = true; render();
    try {
      if (window.SeaDefense?.beforeLogout) await window.SeaDefense.beforeLogout();
      await api('logout', { method: 'POST', body: '{}' }); changed(null); dialog.close();
    } catch (error) { $('#account-profile-feedback').textContent = error.message; }
    finally { busy = false; render(); }
  });
  window.Accounts = { api, ready, open, get user() { return user; }, get available() { return available; } };
  render();
})();
