const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createAPI } = require('./accounts-api');
const root = __dirname;
const routes = { '/': 'index.html', '/index.html': 'index.html', '/styles.css': 'styles.css', '/app.js': 'app.js', '/balls.css': 'balls.css', '/balls-engine.js': 'balls-engine.js', '/balls.js': 'balls.js', '/sea.css': 'sea.css', '/sea-engine.js': 'sea-engine.js', '/sea.js': 'sea.js' };
const artFiles = ['index.html', 'manifest.json', 'PROMPTS.md', 'README.md', 'ocean-battlefield-v1.png', 'battery-base-v1.png', 'battery-turret-v1.png', 'patrol-boat-v1.png', 'fast-boat-v1.png', 'armored-cruiser-v1.png', 'submarine-v1.png', 'enemy-flagship-v1.png', 'explosion-sheet-v1.png', 'explosion-sheet-v2.png'];
routes['/art/sea/'] = 'assets/sea/v1/index.html';
routes['/sea-art.js'] = 'sea-art.js';
routes['/sea-audio.js'] = 'sea-audio.js';
for (const file of ['accounts.js', 'accounts.css', 'sea-save.js', 'sea-weapons.js', 'sea-campaign.js']) routes['/' + file] = file;
routes['/art/sea/ocean-battlefield-v2.png'] = 'assets/sea/v1/ocean-battlefield-v2.png';
for (const file of artFiles) routes['/art/sea/' + file] = 'assets/sea/v1/' + file;
for (const id of ['cannon','spread','howitzer','machinegun','twin','rapid']) {
  const file = 'weapon-' + id + '-v1.png';
  routes['/art/sea/' + file] = 'assets/sea/weapons-v1/' + file;
}
for(const id of ['weapon-laser','weapon-railgun','weapon-plasma','weapon-cryo','weapon-tesla','missile','guardian','tender','dreadnought'])routes['/art/sea/'+id+'-v1.svg']='assets/sea/expansion/'+id+'-v1.svg';
for(const file of ['fuel-boat-v2.png','destroyer-v2.png','battleship-v2.png','carrier-v2.png','fighter-v2.png','missile-v2.png','guardian-v2.png','tender-v2.png'])routes['/art/sea/'+file]='assets/sea/fleet-v2/'+file;
for(const id of ['machinegun','twin','rapid','spread','cannon','howitzer','impact'])routes['/audio/sea/'+id+'.mp3']='assets/sea/audio-v1/'+id+'.mp3';
routes['/audio/sea/CREDITS.md']='assets/sea/audio-v1/CREDITS.md';
const types = { '.mp3':'audio/mpeg', '.svg':'image/svg+xml', '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8' };
function createServer(options = {}) {
const api = createAPI(options);
return http.createServer(async (req, res) => {
  let url;
  try { url = new URL(req.url, 'http://localhost').pathname; }
  catch { res.writeHead(400); res.end('Bad request'); return; }
  if (await api(req, res, url)) return;
  const file = process.env.API_ONLY === '1' ? null : routes[url];
  if (!file) { res.writeHead(404); res.end('Not found'); return; }
  fs.readFile(path.join(root, file), (error, data) => {
    if (error) { res.writeHead(500); res.end('Server error'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});
}
module.exports = { createServer };
if (require.main === module) {
  const port = Number(process.env.PORT || 5173);
  createServer().listen(port, '127.0.0.1', () => console.log(`Local: http://localhost:${port}`));
}
