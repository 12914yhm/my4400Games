const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const paths = {
  home: '<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
  flame: '<path d="M13 3c1 6-5 5-3 10-2 0-3-2-3-4-5 6-3 12 5 12 8 0 10-10 1-18Z"/>',
  spark: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  casual: '<path d="M5 8h14l2 10a2 2 0 0 1-3 2l-4-3h-4l-4 3a2 2 0 0 1-3-2Z"/><path d="M6 12h5m-2.5-2.5v5m7-2h.1m2-2h.1"/>',
  puzzle: '<path d="M9 3H3v6c5-3 5 7 0 4v8h7c-3-5 7-5 4 0h7v-7c-5 3-5-7 0-4V3h-7c3 5-7 5-5 0Z"/>',
  adventure: '<path d="m3 20 6-14 4 8 3-5 5 11Z"/><path d="M16 9V2l5 2-5 2"/>',
  racing: '<path d="m4 11 3-7h10l3 7v9h-3v-3H7v3H4Z"/><path d="M4 11h16M7 14h2m6 0h2"/>',
  sport: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 0 2 5-5 4-5-4Zm0 0L7 4m8 5 2-5m0 10 4 1M7 14l-4 1m9 3v3"/>',
  duo: '<circle cx="8" cy="8" r="3"/><path d="M2 21v-3a6 6 0 0 1 12 0v3m2-16a3 3 0 0 1 0 6m1 3a5 5 0 0 1 5 5v2"/>',
  heart: '<path d="M20 4c-3-3-7 0-8 2-1-2-5-5-8-2s-1 7 8 15c9-8 11-12 8-15Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/>',
  search: '<circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/>',
  dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M7 7h.1M12 12h.1M17 17h.1M7 17h.1M17 7h.1"/>',
  target: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v6m0 10v6M1 12h6m10 0h6"/>'
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.casual}</svg>`;
$$('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));
const categories = [ ['all','全部游戏','grid'], ['casual','休闲解压','casual'], ['puzzle','益智烧脑','puzzle'], ['adventure','冒险闯关','adventure'], ['shooting','射击防守','target'], ['racing','赛车竞速','racing'], ['sport','体育竞技','sport'], ['duo','双人同乐','duo'] ];
const games = [
  { id:'sea', name:'海上保卫战', category:'shooting', description:'坚守海上炮台，击沉敌舰，升级你的防线', score:'9.8', art:'sea', bg:'#b8d4d2', tag:'可试玩', heat:102 },
  { id:'bricks', name:'弹珠打砖块', category:'casual', description:'找准角度，一击连消！收集弹珠挑战高分', score:'9.8', art:'bricks', bg:'#d3e8dc', tag:'可试玩', heat:101 },
  { id:'pixel', name:'像素冒险岛', category:'adventure', description:'向前跳跃，开启你的奇妙冒险', score:'9.6', art:'island', bg:'#c7dce0', tag:'编辑推荐', heat:96 },
  { id:'2048', name:'2048 经典版', category:'puzzle', description:'简单的数字，不简单的挑战', score:'9.8', art:'numbers', bg:'#eee3ca', tag:'HOT', heat:100 },
  { id:'racing', name:'极速公路', category:'racing', description:'踩下油门，把烦恼甩在身后', score:'9.3', art:'car', bg:'#c9d1e7', tag:'', heat:92 },
  { id:'match', name:'缤纷消消乐', category:'casual', description:'消除一点烦恼，收获满分治愈', score:'9.5', art:'candy', bg:'#ebd7d9', tag:'HOT', heat:97 },
  { id:'basket', name:'街头篮球', category:'sport', description:'瞄准，投篮！享受完美空心球', score:'9.2', art:'basket', bg:'#e6ccab', tag:'', heat:89 },
  { id:'duo', name:'森林双人行', category:'duo', description:'叫上好朋友，一起默契闯关', score:'9.7', art:'forest', bg:'#cbdac1', tag:'双人', heat:98 },
  { id:'memory', name:'记忆翻翻乐', category:'puzzle', description:'翻一翻，找出藏起来的好朋友', score:'9.4', art:'memory', bg:'#d6e4d9', tag:'可试玩', heat:91 },
  { id:'cat', name:'猫咪下午茶', category:'casual', description:'和猫咪一起，慢慢度过好时光', score:'9.6', art:'cat', bg:'#e5d6bd', tag:'NEW', heat:94 },
  { id:'space', name:'星际小飞船', category:'adventure', description:'穿过星海，寻找未知的惊喜', score:'9.1', art:'space', bg:'#ccd2df', tag:'NEW', heat:88 },
  { id:'soccer', name:'绿茵小将', category:'sport', description:'来一场充满活力的绿茵对决', score:'9.0', art:'soccer', bg:'#c8dec3', tag:'', heat:87 },
  { id:'drift', name:'弯道漂移', category:'racing', description:'每一个弯道，都是新的挑战', score:'9.2', art:'car', bg:'#ddcedc', tag:'NEW', heat:90 },
  { id:'duel', name:'欢乐双人赛', category:'duo', description:'同屏比一比，看看谁更有默契', score:'9.3', art:'forest', bg:'#d5dfc6', tag:'双人', heat:93 }
];
// Self-contained SVG illustrations keep the prototype independent of image services.
function artwork(type, background, hero = false) {
  let scene = '';
  const star = (x,y,s=1,color='#fff7ca') => `<path transform="translate(${x} ${y}) scale(${s})" d="M0-8 3-3 8 0 3 3 0 8-3 3-8 0-3-3Z" fill="${color}"/>`;
  if (type === 'sea') {
    scene = `<rect width="320" height="240" fill="#3c7077"/><g stroke="#8fc0b733" fill="none"><circle cx="161" cy="126" r="77"/><circle cx="161" cy="126" r="112"/><path d="M15 42h27m20 156h27m139-44h28m-41-119h26M45 106h23m-48 54h20"/></g><path d="M0 0h68Q103 40 55 57T0 85" fill="#c4c194"/><path d="M0 0h58Q90 36 47 45T0 72" fill="#768b68"/><circle cx="161" cy="130" r="43" fill="#163a4766"/><circle cx="161" cy="124" r="40" fill="#bfc6a4" stroke="#879f8e" stroke-width="4"/><path d="m145 91 35 4 20 29-17 32-37 3-25-33Z" fill="#76897a"/><circle cx="161" cy="124" r="25" fill="#3d615e"/><g transform="translate(161 124) rotate(-30)"><rect x="-18" y="-15" width="37" height="30" rx="7" fill="#a4b499"/><rect x="8" y="-7" width="44" height="14" rx="2" fill="#2b494d"/><rect x="16" y="-5" width="30" height="3" fill="#a8b599"/><rect x="46" y="-9" width="9" height="18" fill="#546e67"/></g><g transform="translate(267 55) rotate(140)"><path d="m30 0-16-12h-35l-10 12 10 12h35Z" fill="#b6b8a4" stroke="#334f54" stroke-width="2"/><rect x="-13" y="-7" width="22" height="14" fill="#667f7c"/></g><g transform="translate(63 179) rotate(-25)"><path d="m26 0-15-9h-32l-9 9 9 9h32Z" fill="#a99e7b" stroke="#334f54" stroke-width="2"/><rect x="-11" y="-5" width="18" height="10" fill="#526c6a"/></g><path d="m216 92 18-10" stroke="#f0d69f" stroke-width="3"/><circle cx="242" cy="75" r="7" fill="#e7b578aa"/>`;
  } else if (type === 'bricks') {
    scene = `<rect x="53" y="16" width="215" height="211" rx="17" fill="#254848"/><g font-family="Arial,sans-serif" text-anchor="middle" font-size="20" font-weight="bold"><rect x="67" y="32" width="48" height="48" rx="7" fill="#8dcbb0"/><text x="91" y="63" fill="#315a4c">8</text><rect x="125" y="32" width="48" height="48" rx="7" fill="#e6ca91"/><text x="149" y="63" fill="#78623d">12</text><rect x="183" y="32" width="48" height="48" rx="7" fill="#e5a07c"/><text x="207" y="63" fill="#7e523b">24</text><rect x="125" y="90" width="48" height="48" rx="7" fill="#8dcbb0"/><text x="149" y="121" fill="#315a4c">6</text><rect x="183" y="90" width="48" height="48" rx="7" fill="#b1a0c7"/><text x="207" y="121" fill="#665475">32</text></g><path d="m94 198 33-49-56-40 18-22" stroke="#b1dcc4" stroke-width="3" stroke-dasharray="3 8" fill="none"/><circle cx="94" cy="198" r="7" fill="#fff4d2"/><circle cx="107" cy="180" r="5" fill="#fff4d2"/><circle cx="120" cy="163" r="4" fill="#fff4d2"/><circle cx="215" cy="184" r="13" fill="none" stroke="#8cddb3" stroke-width="2"/><path d="M209 184h12m-6-6v12" stroke="#8cddb3" stroke-width="2"/>${star(34,77,.8,'#89b8a0')}${star(287,169,1,'#89b8a0')}`;
  } else if (type === 'island' || type === 'forest') {
    scene = `<circle cx="235" cy="53" r="29" fill="#f7f3cc"/><path d="M0 119 60 60 108 112 183 42 259 126 320 83v157H0Z" fill="#94b3a5" opacity=".38"/><path d="M0 153 88 97 153 161 231 101 320 152v88H0Z" fill="#719a80" opacity=".26"/>
    <ellipse cx="172" cy="205" rx="109" ry="15" fill="#7b9d68" opacity=".18"/>
    <path d="m50 142 116-49 107 54-104 58Z" fill="#a1bd67"/><path d="m50 142 119 58v31L50 176Z" fill="#9d9364"/><path d="m169 200 104-53v31l-104 53Z" fill="#778b50"/><path d="m50 142 119 54 104-49v13l-104 52L50 154Z" fill="#719b4a"/>
    <path d="m50 142 116-49 107 54-104 53Z" fill="#b5cf7d"/>
    <path d="m114 149 44-20 49 24-45 21Z" fill="#dce1a6"/><path d="m147 132 33-14 14 8-33 16Z" fill="#e8e8bd"/>
    <g fill="#7b8a4f" opacity=".5"><path d="m79 178 12 5v10l-12-5Z"/><path d="m132 205 12 5v9l-12-5Z"/><path d="m200 198 11-6v10l-11 6Z"/></g>
    <path d="M222 112v38" stroke="#807853" stroke-width="8"/><path d="m199 119 23-53 26 54Z" fill="#4a8958"/><path d="m202 101 20-45 21 45Z" fill="#6a9f62"/>
    <path d="M84 123v25" stroke="#8d7956" stroke-width="6"/><path d="m63 127 21-48 24 48Z" fill="#699b5f"/><path d="m68 108 16-35 18 35Z" fill="#89b474"/>
    <g transform="translate(146 95)"><path d="M0 21h28v31H0Z" fill="#edb665"/><path d="M5 42h8v16H5m11-16h8v16h-8" fill="#567965"/><path d="M-4 0h35v29H-4Z" fill="#f5d7a2"/><path d="M-6-3h38v12H-6Zm3-6h27v8H-3" fill="#d9875c"/><path d="M5 12h4v5H5m13-5h4v5h-4" fill="#405844"/><path d="M10 23h9" stroke="#b48359" stroke-width="2"/><path d="M-6 29h7v15h-7m34-15h7v15h-7" fill="#f0cc8b"/></g>
    <g fill="#f3d376" stroke="#c3a551" stroke-width="2"><ellipse cx="113" cy="82" rx="7" ry="10"/><ellipse cx="143" cy="69" rx="7" ry="10"/><ellipse cx="173" cy="56" rx="7" ry="10"/></g>
    ${star(258,85,.6)}${star(104,53,.5)}<path d="M230 156v-19m0 0c-12-10-21-2-14 4 5 5 14-4 14-4m0 0c9-13 19-6 13 1-5 5-13-1-13-1" fill="#7da65f" stroke="#7da65f" stroke-width="2"/>`;
    if(type === 'forest') scene += `<g transform="translate(194 138)"><path d="m-12 0 12-20L12 0v19h-24Z" fill="#91bfc5"/><circle cx="-4" cy="3" r="2" fill="#3e655c"/><circle cx="5" cy="3" r="2" fill="#3e655c"/></g>`;
  } else if(type === 'numbers') {
    scene = `<g transform="translate(77 22) rotate(-8 80 80)"><rect x="0" y="0" width="169" height="176" rx="14" fill="#c5b691"/><g fill="#eee8d6"><rect x="9" y="9" width="70" height="70" rx="8"/><rect x="88" y="9" width="70" height="70" rx="8"/><rect x="9" y="89" width="70" height="70" rx="8"/></g><rect x="88" y="89" width="70" height="70" rx="8" fill="#d79060"/><g font-family="Arial,sans-serif" font-weight="bold" font-size="39" text-anchor="middle"><text x="44" y="57" fill="#9d967c">2</text><text x="124" y="57" fill="#a38e61">4</text><text x="44" y="137" fill="#a38e61">8</text><text x="123" y="137" fill="#fff4d8">16</text></g></g>${star(48,54,.8,'#c7b681')}${star(270,163,1,'#b7a36f')}`;
  } else if(type === 'car') {
    scene = `<path d="m35 240 88-240h76l90 240Z" fill="#6d798f"/><path d="m45 240 84-240m64 0 84 240" stroke="#eee8d9" stroke-width="4"/><path d="M161 0v240" stroke="#e9dcaa" stroke-width="3" stroke-dasharray="22 18"/><path d="m0 114 95-55m-95 93 83-37m237-16-96-43m96 82-81-34" stroke="#afbbcd" stroke-width="10"/><g transform="translate(110 69) rotate(-12 45 65)"><rect x="-5" y="26" width="16" height="35" rx="5" fill="#455166"/><rect x="74" y="26" width="16" height="35" rx="5" fill="#455166"/><rect x="-5" y="83" width="16" height="35" rx="5" fill="#455166"/><rect x="74" y="83" width="16" height="35" rx="5" fill="#455166"/><rect width="84" height="135" rx="22" fill="#d58772"/><rect x="10" y="40" width="64" height="57" rx="13" fill="#536a7c"/><path d="m17 43 12-29h28l10 29m-49 59 8 22h36l6-22" fill="#a8c4cb"/><path d="M8 12h15m39 0h14" stroke="#f5e7bd" stroke-width="7"/><path d="M42 2v29m0 80v23" stroke="#f3cdb1" stroke-width="5"/></g>`;
  } else if(type === 'candy') {
    const colors=['#de997a','#9bb786','#e6c275','#9dbbc9','#bc9cc1','#dbacb6'];
    scene = `<g transform="translate(59 18) rotate(-9 100 90)"><rect width="202" height="199" rx="17" fill="#fff5ed" opacity=".48"/>`;
    for(let i=0;i<9;i++){let x=15+i%3*62,y=14+Math.floor(i/3)*62;scene+=`<rect x="${x}" y="${y+4}" width="49" height="49" rx="15" fill="${colors[i%6]}" opacity=".5"/><rect x="${x}" y="${y}" width="49" height="49" rx="15" fill="${colors[i%6]}"/><ellipse cx="${x+14}" cy="${y+11}" rx="7" ry="4" fill="#fff" opacity=".38"/>`;}
    scene+=`</g>${star(38,83,.9)}${star(281,165,1.1)}`;
  } else if(type === 'basket') {
    scene=`<circle cx="105" cy="122" r="90" fill="#f0ddba" opacity=".55"/><path d="M255 63v177" stroke="#788d8e" stroke-width="12"/><rect x="188" y="24" width="108" height="77" rx="7" fill="#ede5d4" stroke="#8d9e9b" stroke-width="5"/><path d="M220 53h44v38h-44Z" fill="none" stroke="#b69072" stroke-width="3"/><path d="m214 94 10 45h40l11-45m-53 0 22 44 23-44m-46 20h47" fill="none" stroke="#fff9e8" stroke-width="3"/><ellipse cx="244" cy="94" rx="34" ry="7" fill="none" stroke="#ac7151" stroke-width="5"/><circle cx="109" cy="146" r="49" fill="#cc895c" stroke="#ad724e" stroke-width="3"/><path d="M65 125q58 6 63 66m-61-17q32-64 83-63m-85 20 89 37m-55-69 20 92" fill="none" stroke="#915e42" stroke-width="3"/><path d="M30 206h260" stroke="#f7ead3" stroke-width="3"/>`;
  } else if(type === 'memory') {
    scene=`<g transform="translate(63 24) rotate(-8 96 90)"><rect width="87" height="122" rx="12" fill="#83a88c"/><rect x="10" y="10" width="67" height="102" rx="7" fill="none" stroke="#c0d4b7" stroke-width="2"/><text x="43" y="79" text-anchor="middle" font-size="45" fill="#e0ebcf" font-family="Arial">?</text><rect x="99" y="39" width="87" height="122" rx="12" fill="#fff4da"/><path d="M122 72 125 55l16 15 19-10 5 25v27h-45Z" fill="#dca777"/><circle cx="134" cy="87" r="3" fill="#755f44"/><circle cx="154" cy="87" r="3" fill="#755f44"/><path d="m140 97 5 5 5-5" fill="#a56f57"/></g>${star(271,60,1,'#8bab84')}${star(50,185,.8,'#8bab84')}`;
  } else if(type === 'cat') {
    scene=`<ellipse cx="160" cy="195" rx="106" ry="13" fill="#c9b18d" opacity=".4"/><path d="M90 176q-44-10-28-48 9-14 17 0-9 22 23 25" fill="none" stroke="#c9976f" stroke-width="15"/><ellipse cx="144" cy="153" rx="61" ry="40" fill="#d7ad80"/><path d="m100 87 0-40 34 24 28 0 30-24v45q8 50-45 50-53 0-47-55" fill="#ddb789"/><path d="m107 68 1-10 13 12m53 0 12-13v13" fill="#c58c73"/><path d="m119 98 10 0m30 0h10m-31 14 7 5 7-5" stroke="#80664e" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M212 146h41v39h-41Z" fill="#fff5de"/><path d="M252 151q27 0 15 23h-15" stroke="#fff5de" stroke-width="7" fill="none"/><path d="M226 130q-8-10 0-20m12 20q-8-10 0-20" stroke="#f8eed8" stroke-width="3" fill="none"/>${star(245,53,.7,'#bba77e')}`;
  } else if(type === 'space') {
    scene=`<circle cx="249" cy="160" r="51" fill="#adb4cc"/><ellipse cx="249" cy="160" rx="75" ry="14" fill="none" stroke="#e2d3b5" stroke-width="9" transform="rotate(-20 249 160)"/><g transform="translate(134 107) rotate(35)"><path d="m-17 50 17 41 17-41" fill="#e4b87f"/><path d="M-23 9-43 56l28-8h32l29 8-21-47" fill="#8c9fba"/><path d="M0-65q-40 40-24 108h48Q40-25 0-65" fill="#ece9dc"/><circle cy="-2" r="16" fill="#8caeb8" stroke="#b6c4c4" stroke-width="5"/></g>${star(46,58,.8)}${star(253,40,1)}${star(58,178,.5)}${star(202,73,.4)}`;
  } else {
    scene=`<path d="M38 21h244v198H38Z" fill="#98b78e" stroke="#e5edcf" stroke-width="3"/><path d="M38 120h244M106 21v42h108V21M106 219v-42h108v42" fill="none" stroke="#e5edcf" stroke-width="3"/><circle cx="160" cy="120" r="40" fill="none" stroke="#e5edcf" stroke-width="3"/><circle cx="160" cy="122" r="56" fill="#f2eedb"/><path d="m143 104 31-1 12 29-26 20-27-19Z" fill="#617c66"/><path d="m143 104-15-24m46 23 19-24m-7 53 27 5m-80-4-26 5m53 14v26" stroke="#617c66" stroke-width="8"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${hero ? 400 : 320} 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="400" height="240" fill="${background}"/>${hero ? '<g transform="translate(80 -7) scale(1.05)">' : '<g>'}${scene}</g></svg>`;
}

function readStored(key) { try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value.filter(id => games.some(g=>g.id===id)) : []; } catch { return []; } }
let favorites = new Set(readStored('play-island-favorites'));
let recent = readStored('play-island-recent');
let view = 'home', category = 'all', query = '', sort = 'recommended', limit = 9, selectedGame = null;
let toastTimer, flipTimer, memoryRound = 0;
function persist() { try { localStorage.setItem('play-island-favorites', JSON.stringify([...favorites])); localStorage.setItem('play-island-recent', JSON.stringify(recent)); } catch { toast('浏览器未允许保存，本次会话中仍可使用'); } }
function toast(message) { $('.toast').textContent = message; $('.toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(()=>$('.toast').classList.remove('visible'),2400); }
$('.category-nav').innerHTML = categories.slice(1).map(([id,label,glyph])=>`<button class="nav-item" data-category="${id}">${icon(glyph)}${label}</button>`).join('');
$('.category-strip').innerHTML = categories.map(([id,label,glyph])=>`<button class="category-chip ${id==='all'?'active':''}" data-category="${id}">${icon(glyph)}${label}</button>`).join('');
function card(game) {
  return `<article class="game-card"><button class="game-cover" style="--cover:${game.bg}" data-game="${game.id}" aria-label="查看${game.name}">${artwork(game.art,game.bg)}${game.tag ? `<span class="card-tag ${game.tag==='HOT'?'hot':game.tag==='NEW'?'new':''}">${game.tag}</span>` : ''}</button><div class="card-details"><div class="card-title-row"><button class="card-title" data-game="${game.id}">${game.name}</button><button class="favorite-button ${favorites.has(game.id)?'saved':''}" data-favorite="${game.id}" aria-label="${favorites.has(game.id)?'取消收藏':'收藏'}${game.name}" aria-pressed="${favorites.has(game.id)}">${icon('heart')}</button></div><p class="card-description">${game.description}</p><div class="card-bottom"><span class="genre-label">${categories.find(c=>c[0]===game.category)[1]}</span><span>${['memory','bricks','sea'].includes(game.id)?'可试玩':'示例'}</span><span class="rating">★<b>${game.score}</b></span></div></div></article>`;
}
function render() {
  let list = [...games];
  if(view==='favorites') list=list.filter(g=>favorites.has(g.id));
  if(view==='recent') list=recent.map(id=>games.find(g=>g.id===id)).filter(Boolean);
  if(category!=='all') list=list.filter(g=>g.category===category);
  if(query) list=list.filter(g=>(g.name+' '+g.description+' '+categories.find(c=>c[0]===g.category)[1]).toLowerCase().includes(query.toLowerCase()));
  if(view==='hot') list.sort((a,b)=>b.heat-a.heat);
  else if(view==='new'||sort==='new') {
    const arrival = game => game.id === 'sea' ? games.length + 1 : game.id === 'bricks' ? games.length : games.indexOf(game);
    list.sort((a,b)=>arrival(b)-arrival(a));
  }
  $('.game-grid').innerHTML=list.slice(0,limit).map(card).join('');
  $('.empty-state').hidden=list.length>0;
  $('.empty-state p').textContent=query?'换个关键词试试，比如「记忆」或「赛车」。':view==='favorites'?'点击游戏卡片上的爱心，收藏喜欢的游戏。':view==='recent'?'玩一局「记忆翻翻乐」，这里就会留下足迹。':'试试其他分类，发现新的快乐。';
  $('.load-more').hidden=list.length<=limit;
  const titles={home:'为你推荐',hot:'人气热榜',new:'新游上架',favorites:'我的收藏',recent:'最近玩过'};
  $('#game-section-title').textContent=query?`「${query}」的搜索结果`:category!=='all'?categories.find(c=>c[0]===category)[1]:titles[view];
  $('#section-description').textContent=query?`找到 ${list.length} 款游戏`:view==='home'&&category==='all'?'好玩的都在这里，总有一款让你上头':`${list.length} 款游戏 · 发现属于你的快乐`;
  $('#breadcrumb-label').textContent=view==='home'?'游戏大厅':titles[view];
  $('.favorite-count').textContent=favorites.size;
  $$('.nav-item[data-view]').forEach(el=>el.classList.toggle('active',el.dataset.view===view&&category==='all'));
  $$('[data-category]').forEach(el=>{const active=el.dataset.category===category;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));});
  $$('.sort-tabs button').forEach(el=>{el.classList.toggle('selected',el.dataset.sort===sort);el.setAttribute('aria-pressed',String(el.dataset.sort===sort));});
  $('.sort-tabs').hidden=view==='hot'||view==='recent'||view==='new';
  $('.featured').hidden=view!=='home'||category!=='all'||Boolean(query);
}
$('.ranking-list').innerHTML=[...games].sort((a,b)=>b.heat-a.heat).slice(0,5).map((g,i)=>`<button class="rank-item" data-game="${g.id}"><span class="rank-number">${i+1}</span><span class="rank-cover">${artwork(g.art,g.bg)}</span><span class="rank-info"><strong>${g.name}</strong><small>${categories.find(c=>c[0]===g.category)[1]} · ★ ${g.score}</small></span><span class="rank-trend ${i===3?'flat':''}">${i===3?'−':'↗'}</span></button>`).join('');
const slides=[{id:'bricks',title:'一颗弹珠，<br>连击快乐。',description:'找准角度，向满屏方块发起弹珠挑战。',meta:'全新上线，现在就能玩',bg:'#dfefdf'},{id:'sea',title:'四面来敌，<br>坚守这片海。',description:'经典海上炮台玩法，重新集结你的火力。',meta:'主副武器 · 波次升级',bg:'#dfefdf'},{id:'memory',title:'翻开惊喜，<br>配对快乐。',description:'把可爱的图案，一对一对装进记忆。',meta:'现在就能玩一局',bg:'#e3ecd9'}];
function setSlide(index) { const slide=slides[index], game=games.find(g=>g.id===slide.id);$('.hero-copy h2').innerHTML=slide.title;$('.hero-copy>p').textContent=slide.description;$('.hero-copy .primary-button').dataset.game=game.id;$('.hero-copy .primary-button').innerHTML=`${['memory','bricks','sea'].includes(game.id)?'立即试玩':'探索游戏'} <span>↗</span>`;$('.hero-meta').innerHTML=`<span>${categories.find(c=>c[0]===game.category)[1]}</span><i></i>${slide.meta}`;$('.hero-art').innerHTML=artwork(game.art,slide.bg,true);$('.hero-card').style.background=slide.bg;$('.hero-index').innerHTML=`0${index+1} <span>/ 03</span>`;$$('[data-slide]').forEach(el=>{el.classList.toggle('selected',Number(el.dataset.slide)===index);el.setAttribute('aria-pressed',String(Number(el.dataset.slide)===index));}); }
function closeMenu() { $('.sidebar-content').classList.remove('open');$('.mobile-menu').setAttribute('aria-expanded','false'); }
document.addEventListener('click',event=>{
  const favorite=event.target.closest('[data-favorite]');if(favorite){toggleFavorite(favorite.dataset.favorite);return;}
  const game=event.target.closest('[data-game]');if(game){openGame(game.dataset.game);return;}
  const nav=event.target.closest('[data-view]');if(nav){view=nav.dataset.view;category='all';query='';$('.search input').value='';limit=9;render();closeMenu();return;}
  const cat=event.target.closest('[data-category]');if(cat){category=cat.dataset.category;view='home';limit=9;render();closeMenu();return;}
  const sortButton=event.target.closest('[data-sort]');if(sortButton){sort=sortButton.dataset.sort;render();return;}
  const slide=event.target.closest('[data-slide]');if(slide){setSlide(Number(slide.dataset.slide));return;}
  if(event.target.closest('.surprise-button'))openGame(games[Math.floor(Math.random()*games.length)].id);
});
$('.search').addEventListener('submit',event=>event.preventDefault());
$('.search input').addEventListener('input',event=>{query=event.target.value.trim();limit=9;render();});
document.addEventListener('keydown',event=>{if(event.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){event.preventDefault();$('.search input').focus();}});
$('.load-more').addEventListener('click',()=>{limit+=9;render();});
$('#reset-filter').addEventListener('click',()=>{view='home';category='all';query='';$('.search input').value='';render();});
$('.mobile-menu').addEventListener('click',()=>{const open=$('.sidebar-content').classList.toggle('open');$('.mobile-menu').setAttribute('aria-expanded',String(open));});
function toggleFavorite(id){favorites.has(id)?favorites.delete(id):favorites.add(id);persist();render();if(selectedGame)updateDialogFavorite();toast(favorites.has(id)?'已加入我的收藏':'已取消收藏');}
function updateDialogFavorite(){$('#favorite-game').textContent=favorites.has(selectedGame.id)?'♥ 已收藏':'♡ 收藏游戏';$('#favorite-game').setAttribute('aria-pressed',String(favorites.has(selectedGame.id)));}
function openGame(id){if(id==='sea'){window.SeaDefense.open(()=>{recent=['sea',...recent.filter(item=>item!=='sea')].slice(0,12);persist();render();});return;}if(id==='bricks'){window.BrickBreaker.open(()=>{recent=['bricks',...recent.filter(item=>item!=='bricks')].slice(0,12);persist();render();});return;}selectedGame=games.find(g=>g.id===id);if(!selectedGame)return;clearTimeout(flipTimer);memoryRound++;$('.dialog-art').innerHTML=artwork(selectedGame.art,selectedGame.bg);$('.dialog-category').textContent=categories.find(c=>c[0]===selectedGame.category)[1];$('.dialog-body h2').textContent=selectedGame.name;$('.dialog-description').textContent=selectedGame.description;$('.game-stage').hidden=true;$('#play-game').disabled=selectedGame.id!=='memory';$('#play-game').innerHTML=selectedGame.id==='memory'?'开始游戏 <span>▶</span>':'游戏待接入';$('.demo-note').textContent=selectedGame.id==='memory'?'操作说明：点击两张卡片，找到全部 6 对相同图案即可过关。':'这是框架中的示例游戏，完整游戏尚未接入。可在「益智烧脑」分类中试玩「记忆翻翻乐」。';updateDialogFavorite();$('#game-dialog').showModal();}
$('#favorite-game').addEventListener('click',()=>toggleFavorite(selectedGame.id));
$('.dialog-close').addEventListener('click',()=>$('#game-dialog').close());
$('#game-dialog').addEventListener('click',event=>{if(event.target===$('#game-dialog')){const bounds=event.target.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)event.target.close();}});
$('#game-dialog').addEventListener('close',()=>{clearTimeout(flipTimer);memoryRound++;});
$('#play-game').addEventListener('click',()=>{if(selectedGame.id!=='memory')return;recent=[selectedGame.id,...recent.filter(id=>id!==selectedGame.id)].slice(0,12);persist();render();$('.game-stage').hidden=false;startMemory();});
$('#restart-game').addEventListener('click',startMemory);
function startMemory(){
  clearTimeout(flipTimer);const round=++memoryRound;
  const deck=['🍓','🍋','🥑','🍒','🍇','🍊'].flatMap(symbol=>[symbol,symbol]);
  for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
  let open=[],pairs=0,moves=0,locked=false;
  $('#pair-count').textContent='0';$('#move-count').textContent='0';$('.game-message').textContent='翻开卡片，找到相同的图案。';
  $('.memory-board').innerHTML=deck.map((_,i)=>`<button class="memory-card" data-index="${i}" aria-label="翻开第 ${i+1} 张卡片">✦</button>`).join('');
  $$('.memory-card').forEach(card=>card.addEventListener('click',()=>{
    if(locked||card.classList.contains('revealed')||card.classList.contains('matched'))return;
    const index=Number(card.dataset.index);card.textContent=deck[index];card.classList.add('revealed');card.setAttribute('aria-label',deck[index]);open.push(card);
    if(open.length<2)return;moves++;$('#move-count').textContent=moves;
    if(deck[Number(open[0].dataset.index)]===deck[Number(open[1].dataset.index)]){
      open.forEach(el=>{el.classList.add('matched');el.disabled=true;});open=[];pairs++;$('#pair-count').textContent=pairs;
      if(pairs===6)$('.game-message').textContent=`🎉 全部找到了！你用了 ${moves} 次翻牌，太棒了。`;
    }else{locked=true;flipTimer=setTimeout(()=>{if(round!==memoryRound)return;open.forEach(el=>{el.classList.remove('revealed');el.textContent='✦';el.setAttribute('aria-label',`翻开第 ${Number(el.dataset.index)+1} 张卡片`);});open=[];locked=false;},800);}
  }));
}
setSlide(1);
render();
