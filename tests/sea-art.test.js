const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'sea-art.js'), 'utf8');

function fixture() {
  const requests = [], timers = new Map(), draws = [];
  let serial = 0;
  const context = () => ({
    globalAlpha: 1, save() {}, restore() {}, translate() {}, rotate() {}, fillRect() {},
    drawImage(...args) { assert.ok(args[0]); args.slice(1).forEach(n => assert.ok(Number.isFinite(n))); draws.push(args); },
    createRadialGradient() { return { addColorStop() {} }; }
  });
  class Image {
    constructor() { this.width = 1254; this.height = 1254; requests.push(this); }
    set src(url) { this.url = url; }
  }
  const scope = { window: {}, Image, document: { createElement() { return { getContext: context }; } },
    setTimeout(fn) { timers.set(++serial, fn); return serial; }, clearTimeout(id) { timers.delete(id); } };
  vm.runInNewContext(source, scope);
  return { art: scope.window.SeaArt, requests, timers, draws, context };
}

test('art is lazy, shares one load and renders every enemy and explosion endpoint', async () => {
  const f = fixture(); assert.equal(f.requests.length, 0);
  const pending = f.art.load(); assert.equal(f.art.load(), pending);
  assert.equal(f.requests.length, 15);
  f.requests.forEach(image => image.onload()); await pending;
  assert.equal(f.art.status, 'ready'); assert.equal(f.art.loaded, 15); assert.equal(f.timers.size, 0);
  const ctx = f.context();
  assert.equal(f.art.ocean(ctx, 960, 600), true);
  assert.equal(f.art.battery(ctx, 480, 300, Math.PI, .18), true);
  for (const type of ['patrol', 'fast', 'armored', 'submarine', 'boss']) {
    assert.equal(f.art.ship(ctx, { type, radius: 24, flash: .09 }), true);
  }
  for (const age of [0, .3, .599, .6, .8]) {
    assert.equal(f.art.explosion(ctx, { x: 100, y: 100, size: 65, age, duration: .6 }), true);
  }
});

test('a failed sprite permits play and requests fallback only for missing art', async () => {
  const f = fixture(), pending = f.art.load();
  f.requests.forEach(image => image.url.includes('patrol-boat') ? image.onerror() : image.onload());
  await pending;
  assert.equal(f.art.status, 'partial'); assert.equal(f.art.loaded, 14);
  assert.equal(f.art.ship(f.context(), { type: 'patrol', radius: 17 }), false);
  assert.equal(f.art.ship(f.context(), { type: 'boss', radius: 37 }), true);
  assert.equal(f.timers.size, 0);
});

test('stalled requests settle and late responses cannot change the active art set', async () => {
  const f = fixture(), pending = f.art.load(), late = f.requests[0].onload;
  for (const timeout of [...f.timers.values()]) timeout();
  await pending; late();
  assert.equal(f.art.status, 'partial'); assert.equal(f.art.loaded, 0);
  assert.equal(f.art.ocean(f.context(), 960, 600), false);
  assert.equal(f.art.battery(f.context(), 480, 300, 0, 0), false);
  assert.equal(f.art.explosion(f.context(), {}), false);
  assert.equal(f.timers.size, 0);
});

test('equipped primary and secondary choose distinct textures; missing new art retains original turret', async () => {
  const f = fixture(), pending = f.art.load();
  f.requests.forEach(image => image.onload()); await pending;
  const selected = [];
  for (const [primary,secondary] of [['cannon','machinegun'],['spread','twin'],['howitzer','rapid']]) {
    f.draws.length = 0;
    assert.equal(f.art.battery(f.context(),480,300,.5,.1,{primary,secondary}),true);
    assert.equal(f.draws.length,3);
    selected.push(f.draws[1][0],f.draws[2][0]);
  }
  assert.equal(new Set(selected).size,6);
  const failed = fixture(), loading = failed.art.load();
  failed.requests.forEach(image => image.url.includes('weapon-') ? image.onerror() : image.onload());
  await loading; failed.draws.length = 0;
  assert.equal(failed.art.battery(failed.context(),480,300,0,0,{primary:'howitzer',secondary:'rapid'}),true);
  assert.equal(failed.draws.length,2);
});
