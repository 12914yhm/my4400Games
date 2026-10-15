/* Shared weapon catalog; unlocks follow the current campaign's progress. */
(function(root){
  'use strict';
  const campaign=typeof module!=='undefined'&&module.exports?require('./sea-campaign'):root.SeaCampaign;
  const WEAPONS = {
    primary: [
      {id:'cannon',name:'标准舰炮',wave:1,damage:80,count:1,spread:0,interval:2.2,speed:530,radius:65,color:'#ffdda6',icon:'cannon',description:'均衡的范围轰击，适合精准打击。'},
      {id:'spread',name:'扩散火炮',wave:3,damage:45,count:3,spread:.13,interval:2.6,speed:500,radius:45,color:'#ffb56e',icon:'spread',description:'扇形发射三枚炮弹，清理成群快艇。'},
      {id:'howitzer',name:'重型榴弹炮',wave:6,damage:170,count:1,spread:0,interval:3.4,speed:400,radius:105,color:'#ff826f',icon:'howitzer',description:'大范围重击装甲与旗舰，装填较慢。'},
      {id:'laser',name:'曙光激光炮',wave:4,damage:135,count:1,spread:0,interval:1.5,speed:0,radius:0,mode:'beam',color:'#8bf8fa',icon:'laser',description:'瞬间命中射线上的首个目标，无需预判弹道。'},
      {id:'railgun',name:'雷霆电磁炮',wave:8,damage:270,count:1,spread:0,interval:2.8,speed:0,radius:0,mode:'pierce',color:'#91baff',icon:'railgun',description:'电磁弹贯穿最多 3 艘敌舰，无视护盾。'},
      {id:'plasma',name:'日冕等离子炮',wave:12,damage:240,count:1,spread:0,interval:3.8,speed:340,radius:120,color:'#f5a1ff',icon:'plasma',description:'缓慢的能量球引发大范围爆破，清理密集舰阵。'}
    ],
    secondary: [
      {id:'machinegun',name:'轻型机枪',wave:1,damage:14,count:1,spread:0,interval:.13,speed:900,magazine:36,reload:1.5,color:'#ffe5a6',icon:'machinegun',description:'36 发弹匣，打空后自动换弹；可拦截敌方炮弹。'},
      {id:'twin',name:'双联机枪',wave:2,damage:10,count:2,spread:.035,interval:.17,speed:900,magazine:48,reload:1.7,color:'#98e4df',icon:'twin',description:'双管齐射，每轮消耗 2 发，打空自动换弹。'},
      {id:'rapid',name:'速射机炮',wave:5,damage:15,count:1,spread:0,interval:.075,speed:980,magazine:50,reload:1.9,color:'#c5b2ff',icon:'rapid',description:'50 发弹匣，高射速压制；打空后自动换弹。'},
      {id:'cryo',name:'霜线冷冻机枪',wave:7,damage:12,count:1,spread:0,interval:.15,speed:800,magazine:30,reload:1.6,color:'#9fe6ff',icon:'cryo',description:'30 发冷冻弹，命中减缓移动和开火 2 秒。'},
      {id:'tesla',name:'风暴电弧机枪',wave:10,damage:42,count:1,spread:0,interval:.42,speed:0,magazine:12,reload:2.1,radius:0,mode:'chain',color:'#c7a3ff',icon:'tesla',description:'12 发电弧弹，沿枪口命中后跳跃至附近敌舰。'}
    ]
  };
  Object.values(WEAPONS).forEach(list=>list.sort((a,b)=>a.wave-b.wave));
  function find(slot,id){return WEAPONS[slot]?.find(w=>w.id===id);}
  function unlockWave(state){return Math.min(campaign.WAVES,state.wave+(state.phase==='shop'?1:0));}
  const api={WEAPONS,find,unlockWave};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SeaWeapons=api;
})(typeof window==='undefined'?globalThis:window);
