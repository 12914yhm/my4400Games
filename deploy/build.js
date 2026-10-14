const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const release = process.argv[2];
if (!/^\d{8}T\d{6}Z$/.test(release || '')) throw new Error('Supply a UTC release identifier');
const dest = path.join(root, 'deploy', 'builds', release);
fs.mkdirSync(path.join(dest, 'art', 'sea'), { recursive: true });
const files = ['index.html', 'styles.css', 'app.js', 'balls.css', 'balls-engine.js', 'balls.js', 'sea.css', 'sea-engine.js', 'sea-art.js', 'sea-audio.js', 'sea.js', 'accounts.js', 'accounts.css', 'sea-save.js', 'sea-weapons.js'];
const assets = JSON.parse(fs.readFileSync(path.join(root, 'assets/sea/v1/manifest.json'), 'utf8').replace(/^\uFEFF/, '')).assets;
const checksums = [];
const weapons = ['cannon','spread','howitzer','machinegun','twin','rapid'].map(id => 'weapon-' + id + '-v1.png');
for (const [from, to] of files.map(file => [file, file]).concat(assets.map(asset => ['assets/sea/v1/' + asset.file, 'art/sea/' + asset.file]), weapons.map(file => ['assets/sea/weapons-v1/' + file, 'art/sea/' + file]))) {
  const bytes = fs.readFileSync(path.join(root, from));
  fs.writeFileSync(path.join(dest, to), bytes);
  checksums.push(crypto.createHash('sha256').update(bytes).digest('hex') + '  ' + to);
}
fs.writeFileSync(path.join(dest, 'SHA256SUMS'), checksums.join('\n') + '\n');
console.log(JSON.stringify({ release, directory: dest, files: checksums.length }));
