/* Campaign content shared by gameplay, menus and save validation. */
(function(root){
  'use strict';
  const TYPES = {
    patrol:{name:'巡逻艇',hp:54,speed:37,radius:17,reward:30,damage:10,interval:4.2,range:240},
    fast:{name:'快艇',hp:38,speed:64,radius:13,reward:35,damage:8,interval:3.5,range:185},
    armored:{name:'装甲巡洋舰',hp:160,speed:24,radius:24,reward:70,damage:18,interval:5,range:270},
    submarine:{name:'潜艇',hp:88,speed:32,radius:17,reward:50,damage:16,interval:5.2,range:235},
    boss:{name:'重装旗舰',hp:700,speed:16,radius:37,reward:250,damage:23,interval:2.5,range:230},
    raider:{name:'烈火冲撞艇',hp:45,speed:88,radius:14,reward:45,damage:24,interval:4,range:42},
    missile:{name:'远程导弹舰',hp:120,speed:22,radius:24,reward:80,damage:10,interval:5,range:350},
    guardian:{name:'棱镜护盾舰',hp:170,speed:23,radius:27,reward:100,damage:16,interval:4.8,range:260},
    tender:{name:'曙光维修舰',hp:130,speed:28,radius:23,reward:90,damage:6,interval:5,range:290},
    dreadnought:{name:'深渊无畏舰',hp:1600,speed:14,radius:43,reward:600,damage:16,interval:3.8,range:285}
  };
  const chapters=['近海警戒','烈焰航道','风暴屏障','深渊决战'];
  const specs=[
    ['初次接敌','patrol fast','熟悉机枪与主炮，守住中央平台。'],
    ['高速突袭','fast patrol armored','双联机枪已解锁，小心高速目标。'],
    ['潜航危机','submarine patrol armored','潜航目标需要用主武器攻击。'],
    ['旗舰封锁','armored fast submarine','激光炮已就绪，首艘旗舰正在逼近。'],
    ['烈火航道','raider fast patrol','冲撞艇不会停下，优先拦截。'],
    ['远程封锁','missile armored raider','导弹舰在远处齐射，别只盯着近处。'],
    ['寒潮反击','raider missile submarine','冷冻机枪减缓敌舰移动与开火。'],
    ['钢铁突破','guardian armored missile','电磁炮可以无视护盾贯穿整条航线。'],
    ['护航编队','tender guardian patrol','维修舰会修复附近友舰，优先击沉。'],
    ['雷暴海域','fast tender raider','电弧机枪可在密集敌舰之间跳跃。'],
    ['深水暗流','submarine guardian missile','水下与远程威胁同时来袭。'],
    ['等离子风暴','guardian tender armored','等离子炮的大范围爆破适合打击集群。'],
    ['蜂群来袭','raider fast raider missile','高速目标成群出现，留好空袭支援。'],
    ['不破舰阵','guardian tender armored','护盾与维修互相掩护，调整目标顺序。'],
    ['最后航道','missile submarine raider tender','为最后决战保留维修和护盾。'],
    ['深渊之心','guardian tender missile submarine','击沉深渊无畏舰，夺回整片海域。']
  ];
  const LEVELS=specs.map(([name,pattern,hint],i)=>{
    const wave=i+1,total=wave<=8?5+wave*2:wave+13,pool=pattern.split(' ');
    const fleet=Array.from({length:total},(_,j)=>pool[j%pool.length]);
    if(wave%4===0)fleet[total-1]=wave===16?'dreadnought':'boss';
    return {wave,name,chapter:chapters[Math.floor(i/4)],hint,fleet};
  });
  const api={TYPES,LEVELS,WAVES:LEVELS.length,MAX_ENEMIES:40};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SeaCampaign=api;
})(typeof window==='undefined'?globalThis:window);
