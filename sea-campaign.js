/* Campaign content shared by gameplay, menus and save validation. */
(function(root){
  'use strict';
  const TYPES = {
    patrol:{name:'巡逻艇',hp:54,speed:37,radius:17,reward:30,damage:10,interval:4.2,range:325},
    fast:{name:'快艇',hp:38,speed:64,radius:13,reward:35,damage:8,interval:3.5,range:285},
    armored:{name:'装甲巡洋舰',hp:160,speed:24,radius:24,reward:70,damage:18,interval:5,range:370},
    submarine:{name:'潜艇',hp:88,speed:32,radius:17,reward:50,damage:16,interval:5.2,range:330},
    boss:{name:'重装旗舰',hp:700,speed:16,radius:37,reward:250,damage:23,interval:2.5,range:390},
    raider:{name:'汽油自爆艇',hp:45,speed:88,radius:14,reward:45,damage:24,interval:4,range:42},
    destroyer:{name:'舰队驱逐舰',hp:115,speed:42,radius:20,reward:65,damage:13,interval:4.1,range:385},
    battleship:{name:'重炮战列舰',hp:440,speed:17,radius:33,reward:190,damage:27,interval:3.4,range:430},
    carrier:{name:'舰队航母',hp:390,speed:18,radius:35,reward:220,damage:12,interval:5.8,range:440},
    fighter:{name:'舰载攻击机',hp:32,speed:92,radius:10,reward:28,damage:11,interval:4.5,range:35},
    missile:{name:'远程导弹舰',hp:120,speed:22,radius:24,reward:80,damage:10,interval:5,range:455},
    guardian:{name:'棱镜护盾舰',hp:170,speed:23,radius:27,reward:100,damage:16,interval:4.8,range:360},
    tender:{name:'曙光维修舰',hp:130,speed:28,radius:23,reward:90,damage:6,interval:5,range:390},
    dreadnought:{name:'深渊无畏舰',hp:1600,speed:14,radius:43,reward:600,damage:16,interval:3.8,range:420}
  };
  const chapters=['近海警戒','烈焰航道','风暴屏障','深渊决战'];
  const specs=[
    ['初次接敌','patrol fast','熟悉机枪与主炮，守住中央平台。'],
    ['高速突袭','fast patrol destroyer','双联机枪已解锁，小心驱逐舰护航。'],
    ['潜航危机','submarine patrol armored','潜航目标需要用主武器攻击。'],
    ['旗舰封锁','armored destroyer submarine','激光炮已就绪，首艘旗舰正在逼近。'],
    ['烈火航道','raider fast patrol','汽油艇会冲撞自爆，优先拦截。'],
    ['远程封锁','missile destroyer raider','导弹舰在远处齐射，别只盯着近处。'],
    ['寒潮反击','raider missile submarine','冷冻机枪减缓敌舰移动与开火。'],
    ['钢铁突破','guardian armored missile destroyer','战列舰压阵，电磁炮可无视护盾。'],
    ['护航编队','tender guardian patrol destroyer','维修舰会修复附近友舰，优先击沉。'],
    ['雷暴海域','fast tender fighter raider','舰载攻击机速度很快，电弧机枪可连锁拦截。'],
    ['深水暗流','submarine guardian missile fighter','水下与空中威胁同时来袭。'],
    ['等离子风暴','guardian tender armored destroyer','航母将放飞舰载机，优先压制。'],
    ['蜂群来袭','raider fast fighter missile','海空高速目标成群出现，留好空袭支援。'],
    ['不破舰阵','guardian tender armored destroyer','战列舰、护盾与维修互相掩护。'],
    ['最后航道','missile submarine raider tender fighter','为最后决战保留维修和护盾。'],
    ['深渊之心','guardian tender missile submarine fighter','击沉深渊无畏舰，夺回整片海域。']
  ];
  const LEVELS=specs.map(([name,pattern,hint],i)=>{
    const wave=i+1,total=wave<=8?5+wave*2:wave+13,pool=pattern.split(' ');
    const fleet=Array.from({length:total},(_,j)=>pool[j%pool.length]);
    if(wave%4===0)fleet[total-1]=wave===16?'dreadnought':'boss';
    if([8,14,15,16].includes(wave))fleet[total-(wave%4===0?2:1)]='battleship';
    if([12,15,16].includes(wave))fleet[total-(wave%4===0?3:2)]='carrier';
    return {wave,name,chapter:chapters[Math.floor(i/4)],hint,fleet};
  });
  const api={TYPES,LEVELS,WAVES:LEVELS.length,MAX_ENEMIES:40};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SeaCampaign=api;
})(typeof window==='undefined'?globalThis:window);
