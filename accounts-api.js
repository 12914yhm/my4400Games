'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(crypto.scrypt);
const { clean } = require('./sea-save');
const COOKIE = 'play_island_session', TTL = 7 * 86400000;
function problem(status, message) { return Object.assign(new Error(message), { status }); }
function createAPI(options = {}) {
  const dir = options.dataDir || process.env.DATA_DIR || path.join(__dirname, '.data');
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const accountsFile = path.join(dir, 'accounts.json');
  const users = fs.existsSync(accountsFile) ? JSON.parse(fs.readFileSync(accountsFile, 'utf8')) : [];
  const sessions = new Map(), attempts = new Map();
  const secure = options.secureCookies ?? process.env.SECURE_COOKIE === '1';
  const cookiePath = options.cookiePath || process.env.COOKIE_PATH || '/';
  const origin = options.publicOrigin || process.env.PUBLIC_ORIGIN;
  let queue = Promise.resolve(), hashing = 0;
  function exclusive(fn) { const next = queue.then(fn); queue = next.catch(() => {}); return next; }
  function atomic(file, value) {
    const temp = file + '.' + crypto.randomBytes(6).toString('hex') + '.tmp';
    try { fs.writeFileSync(temp, JSON.stringify(value), { mode: 0o600 }); fs.renameSync(temp, file); }
    finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
  }
  function cookie(res, token, expires = false) {
    res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=${cookiePath}; HttpOnly; SameSite=Lax; Max-Age=${expires ? 0 : TTL / 1000}${secure ? '; Secure' : ''}`);
  }
  function tokenKey(req) {
    const token = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
    return token ? crypto.createHash('sha256').update(token).digest('hex') : null;
  }
  function session(req) {
    const key = tokenKey(req), item = sessions.get(key);
    if (!item || item.expires <= Date.now()) { sessions.delete(key); return null; }
    return users.find(u => u.id === item.userId) || null;
  }
  function login(req, res, user) {
    sessions.delete(tokenKey(req));
    for (const [key, value] of sessions) if (value.expires <= Date.now()) sessions.delete(key);
    // Bound memory even when an authenticated client repeatedly creates sessions.
    if (sessions.size >= 10000) sessions.delete(sessions.keys().next().value);
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(crypto.createHash('sha256').update(token).digest('hex'), { userId: user.id, expires: Date.now() + TTL });
    cookie(res, token);
  }
  function rateLimit(req) {
    const now = Date.now();
    for (const [key, value] of attempts) if (value.until < now) attempts.delete(key);
    const key = process.env.TRUST_PROXY === '1' ? req.headers['x-real-ip'] || req.socket.remoteAddress : req.socket.remoteAddress;
    const item = attempts.get(key) || { count: 0, until: now + 15 * 60000 };
    item.count++; attempts.set(key, item);
    if (item.count > 40 || attempts.size > 10000) throw problem(429, '尝试次数较多，请稍后再试。');
  }
  async function hash(password, salt) {
    if (hashing >= 4) throw problem(503, '服务繁忙，请稍后再试。');
    hashing++;
    try { return await scrypt(password, salt, 64); } finally { hashing--; }
  }
  function publicUser(user) { return user ? { id: user.id, username: user.username } : null; }
  function readSave(user) {
    const file = path.join(dir, user.id + '.json');
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { revision: 0, updatedAt: null, bestScore: 0, snapshot: null };
  }
  async function body(req) {
    if (Number(req.headers['content-length']) > 131072) { req.resume(); throw problem(413, '存档体积过大。'); }
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) throw problem(415, '请求格式不正确。');
    const expected = origin || `http://${req.headers.host}`;
    if (req.headers.origin !== expected) throw problem(403, '请求来源无效，请刷新页面。');
    let size = 0, chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 131072) throw problem(413, '存档体积过大。');
      chunks.push(chunk);
    }
    try {
      const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
      return value;
    } catch { throw problem(400, '请求数据无效。'); }
  }
  function send(res, status, value) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(JSON.stringify(value));
  }
  return async function handle(req, res, url) {
    if (!url.startsWith('/api/')) return false;
    try {
      if (req.method === 'GET' && url === '/api/health') { send(res, 200, { ok: true }); return true; }
      if (req.method === 'GET' && url === '/api/me') { send(res, 200, { user: publicUser(session(req)) }); return true; }
      if (req.method === 'POST' && ['/api/register', '/api/login'].includes(url)) {
        rateLimit(req);
        const data = await body(req);
        if (typeof data.username !== 'string' || typeof data.password !== 'string') throw problem(400, '请输入用户名和密码。');
        const username = data.username.normalize('NFKC').trim(), key = username.toLowerCase(), password = data.password;
        if (!/^[\p{L}\p{N}_-]{3,24}$/u.test(username)) throw problem(400, '用户名需为 3–24 位中文、字母、数字、下划线或短横线。');
        if (password.length < 8 || password.length > 128) throw problem(400, '密码需为 8–128 位。');
        let user;
        if (url === '/api/register') {
          const salt = crypto.randomBytes(16).toString('hex');
          const passwordHash = (await hash(password, salt)).toString('hex');
          user = await exclusive(() => {
            if (users.some(u => u.key === key)) throw problem(409, '这个用户名已被注册，请换一个。');
            const created = { id: crypto.randomUUID(), key, username, salt, passwordHash, createdAt: new Date().toISOString() };
            atomic(accountsFile, [...users, created]); users.push(created); return created;
          });
        } else {
          user = users.find(u => u.key === key);
          const digest = await hash(password, user?.salt || 'play-island-unknown-user');
          if (!user || !crypto.timingSafeEqual(digest, Buffer.from(user.passwordHash, 'hex'))) throw problem(401, '用户名或密码不正确。');
        }
        login(req, res, user); send(res, 200, { user: publicUser(user) }); return true;
      }
      if (req.method === 'POST' && url === '/api/logout') {
        await body(req); sessions.delete(tokenKey(req)); cookie(res, '', true); send(res, 200, { ok: true }); return true;
      }
      if (url === '/api/sea-save' && ['GET','PUT'].includes(req.method)) {
        const user = session(req);
        if (!user) throw problem(401, '登录已失效，请重新登录。');
        if (req.headers['x-account-id'] !== user.id) throw problem(409, '账号已在其他窗口切换，请重新登录后进入游戏。');
        if (req.method === 'GET') { send(res, 200, readSave(user)); return true; }
        const data = await body(req);
        let snapshot;
        try { snapshot = clean(data.snapshot); } catch { throw problem(400, '存档数据无效，未覆盖已有进度。'); }
        if (!Number.isSafeInteger(data.revision) || data.revision < 0) throw problem(400, '存档版本无效。');
        const result = await exclusive(() => {
          const previous = readSave(user);
          if (data.revision !== previous.revision) throw problem(409, '其他窗口已更新存档，请重新进入游戏读取最新进度。');
          const saved = { revision: previous.revision + 1, updatedAt: new Date().toISOString(), bestScore: Math.max(previous.bestScore, snapshot.state.score), snapshot };
          atomic(path.join(dir, user.id + '.json'), saved); return saved;
        });
        send(res, 200, { revision: result.revision, updatedAt: result.updatedAt, bestScore: result.bestScore }); return true;
      }
      throw problem(404, '接口不存在。');
    } catch (error) { send(res, error.status || 500, { error: error.status ? error.message : '服务暂不可用，请稍后再试。' }); }
    return true;
  };
}
module.exports = { createAPI };
