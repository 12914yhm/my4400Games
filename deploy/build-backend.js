// Package only the API and its shared validation catalogs, never local accounts.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const release=process.argv[2];
if(!/^\d{8}T\d{6}Z$/.test(release||''))throw new Error('Supply a UTC release identifier');
const root=path.resolve(__dirname,'..'),dest=path.join(__dirname,'builds',release+'-backend');
fs.mkdirSync(dest,{recursive:true});
const files=['server.js','accounts-api.js','sea-save.js','sea-weapons.js','sea-campaign.js'];
const hashes=files.map(file=>{const bytes=fs.readFileSync(path.join(root,file));fs.writeFileSync(path.join(dest,file),bytes);return crypto.createHash('sha256').update(bytes).digest('hex')+'  '+file;});
fs.writeFileSync(path.join(dest,'SHA256SUMS'),hashes.join('\n')+'\n');
console.log(JSON.stringify({release,directory:dest,files:files.length}));
