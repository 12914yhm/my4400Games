from pathlib import Path
folder=Path('assets/sea/expansion')
def svg(body,w=512,h=512,accent='#8bf8fa'):
 return f'''<svg xmlns="http://www.w3.org/2000/svg" style="--accent:{accent}" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><defs><linearGradient id="metal" x2="0" y2="1"><stop stop-color="#c7d6d8"/><stop offset=".3" stop-color="#607d8a"/><stop offset=".55" stop-color="#203d50"/><stop offset="1" stop-color="#9cafb3"/></linearGradient><linearGradient id="deck" x2="0" y2="1"><stop stop-color="#5b7780"/><stop offset="1" stop-color="#183443"/></linearGradient><radialGradient id="core"><stop stop-color="#f3ffff"/><stop offset=".35" stop-color="var(--accent)"/><stop offset="1" stop-color="#183344"/></radialGradient></defs>{body}</svg>'''
colors={'laser':'#72f7f4','railgun':'#8aafff','plasma':'#e9a2ff','cryo':'#9eeaff','tesla':'#c6a0ff'}
for kind,c in colors.items():
 end=502 if kind in ['cryo','tesla'] else 484
 body=f'<g style="--accent:{c}" stroke="#122737" stroke-width="5" stroke-linejoin="round"><circle cx="180" cy="256" r="108" fill="#162b39"/><circle cx="180" cy="256" r="92" fill="url(#metal)"/><path d="M91 190L150 156H228L274 205V307L228 356H150L91 322Z" fill="url(#deck)"/>'
 for y in [189,310]:
  body+=f'<rect x="130" y="{y}" width="106" height="12" rx="4" fill="{c}" stroke="none"/>'
 if kind=='railgun':
  body+=f'<path d="M220 210H{end}V235H260V277H{end}V302H220Z" fill="url(#metal)"/><path d="M260 243H{end}M260 269H{end}" stroke="{c}" stroke-width="8"/>'
  for x in range(280,450,32):body+=f'<path d="M{x} 206V236M{x} 276V306" stroke="#bbcccf" stroke-width="7"/>'
 elif kind=='laser':
  body+=f'<path d="M218 223H{end-14}L{end} 240V272L{end-14} 289H218Z" fill="url(#metal)"/><path d="M260 245H{end-20}M260 267H{end-20}" stroke="{c}" stroke-width="7"/><ellipse cx="{end-3}" cy="256" rx="9" ry="26" fill="url(#core)"/>'
 elif kind=='plasma':
  body+=f'<path d="M214 210H{end-30}L{end} 232V280L{end-30} 302H214Z" fill="url(#metal)"/><ellipse cx="330" cy="256" rx="63" ry="37" fill="url(#core)"/><ellipse cx="{end-5}" cy="256" rx="12" ry="32" fill="{c}"/>'
  for x in [260,285,390,415]:body+=f'<rect x="{x}" y="212" width="12" height="88" rx="4" fill="url(#metal)"/>'
 elif kind=='cryo':
  body+=f'<rect x="235" y="238" width="{end-235}" height="36" rx="6" fill="url(#metal)"/>'
  for x in [272,315,358,401]:body+=f'<rect x="{x}" y="222" width="18" height="68" rx="7" fill="{c}"/>'
  body+=f'<path d="M135 220L180 192L220 220V292L180 320L135 292Z" fill="url(#core)"/>'
 else:
  body+=f'<rect x="240" y="246" width="{end-240}" height="20" fill="url(#metal)"/>'
  for x,r in [(280,40),(340,32),(400,24),(460,17)]:body+=f'<ellipse cx="{x}" cy="256" rx="13" ry="{r}" fill="url(#metal)"/><ellipse cx="{x}" cy="256" rx="6" ry="{r-5}" fill="{c}" stroke="none"/>'
  body+=f'<circle cx="{end-7}" cy="256" r="12" fill="url(#core)"/>'
 body+='<circle cx="180" cy="256" r="35" fill="url(#metal)"/><circle cx="180" cy="256" r="19" fill="url(#core)"/>'
 for x,y in [(115,202),(115,310),(238,202),(238,310)]:body+=f'<circle cx="{x}" cy="{y}" r="6" fill="#d3e0da" stroke-width="2"/>'
 body+='</g>';(folder/f'weapon-{kind}-v1.svg').write_text(svg(body,accent=c),encoding='utf-8')
ships={'raider':'#ff9165','missile':'#e9bc75','guardian':'#80dbff','tender':'#8befba','dreadnought':'#b5a0f4'}
for kind,c in ships.items():
 body=f'<g style="--accent:{c}" stroke="#152c38" stroke-width="4" stroke-linejoin="round"><path d="M20 92L94 45H359L497 128L359 211H94L20 164Z" fill="url(#metal)"/><path d="M42 97L103 65H351L459 128L351 191H103L42 159Z" fill="url(#deck)"/><path d="M78 83H350M78 173H350" stroke="#b4c7c6" stroke-width="3"/><rect x="165" y="88" width="111" height="80" rx="12" fill="url(#metal)"/><rect x="215" y="101" width="45" height="54" rx="5" fill="#1e3c53"/>'
 if kind=='raider':
  body+=f'<path d="M315 91L455 128L315 165Z" fill="{c}"/><rect x="50" y="99" width="99" height="58" rx="15" fill="#d2a478"/><path d="M65 112H135M65 144H135" stroke="#ffbf81" stroke-width="8"/>'
 elif kind=='missile':
  for x in [95,145,305,355]:
   for y in [102,138]:body+=f'<rect x="{x}" y="{y}" width="36" height="19" rx="4" fill="#394f59"/><path d="M{x+8} {y+9}H{x+29}" stroke="{c}" stroke-width="5"/>'
 elif kind=='guardian':
  body+=f'<path d="M305 87L351 103V150L305 170L280 150V103Z" fill="url(#core)"/><ellipse cx="115" cy="128" rx="38" ry="38" fill="url(#metal)"/><circle cx="115" cy="128" r="24" fill="url(#core)"/>'
 elif kind=='tender':
  body+='<rect x="70" y="88" width="78" height="80" rx="7" fill="#cadad1"/><path d="M108 100V156M81 128H135" stroke="#64bc94" stroke-width="16"/>'
  for x in [300,345]:body+=f'<rect x="{x}" y="96" width="32" height="64" rx="5" fill="{c}"/>'
 else:
  for x in [95,310,390]:body+=f'<circle cx="{x}" cy="128" r="29" fill="url(#metal)"/><path d="M{x} 118H{x+58}M{x} 138H{x+58}" stroke="{c}" stroke-width="9"/>'
  body+='<path d="M160 60H270M160 196H270" stroke="#b5a0f4" stroke-width="9"/>'
 body+='</g>';(folder/f'{kind}-v1.svg').write_text(svg(body,512,256,c),encoding='utf-8')
