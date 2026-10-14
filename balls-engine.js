/* Deterministic, rendering-independent simulation. Coordinates are in game units. */
(function (root) {
  'use strict';
  const W = 420, H = 560, FLOOR = 522, R = 5, SPEED = 450, STEP = 1 / 240;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  function create(random = Math.random) {
    const state = { phase: 'aiming', level: 1, score: 0, ballCount: 10, launchX: W / 2,
      angle: -Math.PI / 2, blocks: [], pickups: [], balls: [], particles: [],
      pending: 0, shotTime: 0, nextLaunch: 0, landingX: null, hits: 0, gained: 0, accumulator: 0 };
    function row(y, starter = false) {
      const columns = [0, 1, 2, 3, 4, 5, 6];
      for (let i = columns.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [columns[i], columns[j]] = [columns[j], columns[i]];
      }
      const count = 3 + Math.floor(random() * 3);
      columns.slice(0, count).forEach(col => {
        const hp = starter ? 2 + Math.floor(random() * 4) : state.level * 2 + Math.floor(random() * (state.level + 3));
        state.blocks.push({ x: 14 + col * 56, y, w: 48, h: 48, hp, maxHp: hp, flash: 0 });
      });
      if (state.ballCount < 80) state.pickups.push({ x: 38 + columns[count] * 56, y: y + 24 });
    }
    row(46, true); row(102, true);
    function aim(angle) { if (state.phase === 'aiming') state.angle = clamp(angle, -Math.PI + .14, -.14); }
    function shoot() {
      if (state.phase !== 'aiming') return false;
      state.phase = 'firing'; state.pending = state.ballCount; state.nextLaunch = 0;
      state.shotTime = 0; state.landingX = null; state.hits = 0; state.gained = 0;
      return true;
    }
    function finishRound() {
      state.balls = []; state.pending = 0;
      state.launchX = clamp(state.landingX ?? state.launchX, R + 1, W - R - 1);
      state.ballCount = Math.min(80, state.ballCount + state.gained);
      state.blocks.forEach(block => { block.y += 56; });
      state.pickups = state.pickups.map(p => ({ x: p.x, y: p.y + 56 })).filter(p => p.y < FLOOR - 20);
      if (state.blocks.some(block => block.y + block.h >= FLOOR - 12)) { state.phase = 'over'; return; }
      state.level++; row(46); state.phase = 'aiming';
    }
    function recall() {
      if (state.phase !== 'firing') return false;
      finishRound(); return true;
    }
    function burst(x, y, hue) {
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;
        state.particles.push({ x, y, vx: Math.cos(angle) * 75, vy: Math.sin(angle) * 75, life: .4, hue });
      }
    }
    function tick(dt) {
      state.particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
      state.particles = state.particles.filter(p => p.life > 0);
      state.blocks.forEach(b => { b.flash = Math.max(0, b.flash - dt); });
      if (state.phase !== 'firing') return;
      state.shotTime += dt;
      while (state.pending > 0 && state.shotTime >= state.nextLaunch) {
        state.balls.push({ x: state.launchX, y: FLOOR - R, vx: Math.cos(state.angle) * SPEED, vy: Math.sin(state.angle) * SPEED });
        state.pending--; state.nextLaunch += .065;
      }
      for (const ball of state.balls) {
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        if (ball.x < R) { ball.x = R; ball.vx = Math.abs(ball.vx); }
        if (ball.x > W - R) { ball.x = W - R; ball.vx = -Math.abs(ball.vx); }
        if (ball.y < R) { ball.y = R; ball.vy = Math.abs(ball.vy); }
        if (ball.y >= FLOOR - R && ball.vy > 0) { ball.returned = true; state.landingX ??= ball.x; continue; }
        for (let i = state.pickups.length - 1; i >= 0; i--) {
          const p = state.pickups[i];
          if (Math.hypot(ball.x - p.x, ball.y - p.y) < R + 11) {
            state.pickups.splice(i, 1); state.gained++; burst(p.x, p.y, '#8de9c1');
          }
        }
        for (const block of state.blocks) {
          if (block.hp <= 0) continue;
          const cx = clamp(ball.x, block.x, block.x + block.w), cy = clamp(ball.y, block.y, block.y + block.h);
          let nx = ball.x - cx, ny = ball.y - cy, distance = Math.hypot(nx, ny);
          if (distance >= R) continue;
          if (distance === 0) {
            const sides = [
              { d: ball.x - block.x, x: -1, y: 0 }, { d: block.x + block.w - ball.x, x: 1, y: 0 },
              { d: ball.y - block.y, x: 0, y: -1 }, { d: block.y + block.h - ball.y, x: 0, y: 1 }
            ].sort((a, b) => a.d - b.d);
            nx = sides[0].x; ny = sides[0].y; distance = -sides[0].d;
          } else { nx /= distance; ny /= distance; }
          ball.x += nx * (R - distance + .01); ball.y += ny * (R - distance + .01);
          const dot = ball.vx * nx + ball.vy * ny;
          if (dot < 0) {
            ball.vx -= 2 * dot * nx; ball.vy -= 2 * dot * ny;
            // Avoid virtually horizontal trajectories trapping a ball indefinitely.
            if (Math.abs(ball.vy) < SPEED * .08) {
              ball.vy = (ball.vy < 0 ? -1 : 1) * SPEED * .08;
              ball.vx = Math.sign(ball.vx) * Math.sqrt(SPEED * SPEED - ball.vy * ball.vy);
            }
            block.hp--; block.flash = .11; state.score += 10; state.hits++;
            if (block.hp === 0) { state.score += 25; burst(block.x + 24, block.y + 24, '#ffc788'); }
          }
          break;
        }
      }
      state.blocks = state.blocks.filter(block => block.hp > 0);
      state.balls = state.balls.filter(ball => !ball.returned);
      if ((!state.pending && !state.balls.length) || state.shotTime > 35) finishRound();
    }
    function step(seconds) {
      state.accumulator += clamp(seconds, 0, .1);
      while (state.accumulator >= STEP) { tick(STEP); state.accumulator -= STEP; }
    }
    return { state, aim, shoot, recall, step };
  }
  const api = { create, W, H, FLOOR, R };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BallsEngine = api;
})(typeof window === 'undefined' ? globalThis : window);
