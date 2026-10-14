/* Shared weapon catalog; unlocks follow the current campaign's progress. */
(function(root){
  'use strict';
  const WEAPONS = {
    primary: [
      {id:'cannon',name:'标准舰炮',wave:1,damage:80,count:1,spread:0,interval:2.2,speed:530,radius:65,color:'#ffdda6',icon:'cannon',description:'均衡的范围轰击，适合精准打击。'},
      {id:'spread',name:'扩散火炮',wave:3,damage:45,count:3,spread:.13,interval:2.6,speed:500,radius:45,color:'#ffb56e',icon:'spread',description:'扇形发射三枚炮弹，清理成群快艇。'},
      {id:'howitzer',name:'重型榴弹炮',wave:6,damage:170,count:1,spread:0,interval:3.4,speed:400,radius:105,color:'#ff826f',icon:'howitzer',description:'大范围重击装甲与旗舰，装填较慢。'}
    ],
    secondary: [
      {id:'machinegun',name:'轻型机枪',wave:1,damage:14,count:1,spread:0,interval:.13,speed:900,heat:4.5,color:'#ffe5a6',icon:'machinegun',description:'精准连续射击，可拦截敌方炮弹。'},
      {id:'twin',name:'双联机枪',wave:2,damage:10,count:2,spread:.035,interval:.17,speed:900,heat:6.5,color:'#98e4df',icon:'twin',description:'双管同时开火，扩大拦截覆盖面。'},
      {id:'rapid',name:'速射机炮',wave:5,damage:15,count:1,spread:0,interval:.075,speed:980,heat:3.8,color:'#c5b2ff',icon:'rapid',description:'高射速压制敌舰，连续开火更易过热。'}
    ]
  };
  function find(slot,id){return WEAPONS[slot]?.find(w=>w.id===id);}
  function unlockWave(state){return Math.min(8,state.wave+(state.phase==='shop'?1:0));}
  const api={WEAPONS,find,unlockWave};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SeaWeapons=api;
})(typeof window==='undefined'?globalThis:window);
