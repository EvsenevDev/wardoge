// AUTO-EXTRACTED from index.html game logic, then adapted for the server.
// Authoritative WarDOGE match simulation (runs headless in Node).
'use strict';
let curU=null,globalFeed=[];
const save=()=>{},renderShop=()=>{},showShop=()=>{};
const VIS=600,MW=7000,MH=7000,WIN=20,PER=15,TICK=1800,DOWNT=40*60,RESP=6*60;
const TEAMS=[{n:'Red',c:'#e74c3c'},{n:'Blue',c:'#3498db'},{n:'Green',c:'#2ecc71'}];
const WEAP=[{n:'Rifle',p:0,cd:17,dmg:15,sp:5.6,k:1,spr:.04,life:106,r:3,rng:450},{n:'Shotgun',p:150,cd:66,dmg:12,sp:5.2,k:6,spr:.22,life:52,r:3,rng:220},
{n:'Rocket launcher',p:400,cd:132,dmg:75,sp:4,k:1,spr:0,life:162,r:6,boom:100,rng:500},{n:'Sniper',p:350,cd:120,dmg:110,sp:10.4,k:1,spr:0,life:106,r:2,rng:950}];
const GEAR={helmet:{n:'Helmet',p:150,d:'Takes 20% less damage'},armor:{n:'Body armor',p:250,d:'Absorbs 60% of damage until its 100 points run out'},gren:{n:'Grenades x3',p:120,d:'G to throw where you aim'},med:{n:'Medkits x3',p:90,d:'H heals you, F heals a teammate'}};
// ---------- account (saved in this browser) ----------
let rnd;function seed(s){rnd=()=>(s=(s*16807)%2147483647)/2147483647}
let walls,grid,units,tanks,bullets,nades,booms,score,keys={},mouse={x:0,y:0,down:false},me,running=false,tick=0,feed=[],CZ,HZ,bases,startCash;
const GS=300;const gk=(x,y)=>(x/GS|0)+','+(y/GS|0);
var addWall=function(w){walls.push(w);for(let x=w.x/GS|0;x<=(w.x+w.w)/GS|0;x++)for(let y=w.y/GS|0;y<=(w.y+w.h)/GS|0;y++){const k=x+','+y;(grid[k]=grid[k]||[]).push(w)}}
var delWall=function(w){walls=walls.filter(v=>v!==w);for(let x=w.x/GS|0;x<=(w.x+w.w)/GS|0;x++)for(let y=w.y/GS|0;y<=(w.y+w.h)/GS|0;y++){const k=x+','+y;if(grid[k])grid[k]=grid[k].filter(v=>v!==w)}}
function hitWall(x,y,r){if(x<r||y<r||x>MW-r||y>MH-r)return {edge:1};const l=grid[gk(x,y)];if(!l)return null;for(const w of l)if(x+r>w.x&&x-r<w.x+w.w&&y+r>w.y&&y-r<w.y+w.h)return w;return null}
const d2=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function log(s){feed.unshift({s,l:300});feed=feed.slice(0,6)}
function makeMap(){walls=[];grid={};seed(Math.floor(Math.random()*1e9));
 const a0=rnd()*6.28;bases=[0,1,2].map(i=>({x:MW/2+Math.cos(a0+i*2.094)*2900,y:MH/2+Math.sin(a0+i*2.094)*2900}));
 CZ={x:MW/2+(rnd()-.5)*1400,y:MH/2+(rnd()-.5)*1400,r:850};HZ={x:CZ.x,y:CZ.y,r:200,tx:CZ.x,ty:CZ.y};
 for(let i=0;i<170;i++){const x=100+rnd()*(MW-400),y=100+rnd()*(MH-400);if(bases.some(b=>Math.hypot(b.x-x,b.y-y)<420))continue;
  if(rnd()<.45){const w=120+rnd()*180,h=120+rnd()*180,t=22;addWall({x,y,w,h:t});addWall({x,y:y+h,w:w*.4,h:t});addWall({x:x+w*.65,y:y+h,w:w*.35+t,h:t});addWall({x,y,w:t,h});addWall({x:x+w,y,w:t,h:h*.5})}
  else if(rnd()<.5)addWall({x,y,w:40+rnd()*260,h:30});else addWall({x,y,w:30,h:40+rnd()*260})}
 tanks=[];for(let i=0;i<8;i++){let p;do p={x:400+rnd()*(MW-800),y:400+rnd()*(MH-800)};while(hitWall(p.x,p.y,40));tanks.push(mkTank(p.x,p.y))}}
const mkTank=(x,y)=>({x,y,hp:500,ang:0,driver:null,dead:0});
const BOTN0=['Rex','Ace','Bolt','Fang','Ghost','Hawk','Jinx','Kilo','Lynx','Moose','Nova','Ozzy','Pike','Rook','Scout','Tank','Viper','Wolf','Yeti','Zed','Bear','Duke','Echo','Flint'];
const BOTN=BOTN0;
function equip(u,l){u.w=l.w;u.helmet=l.helmet;u.armor=l.armor?100:0;u.gren=l.gren?3:0;u.med=l.med?3:0}
function spawn(u){const b=bases[u.t];u.x=b.x+(Math.random()-.5)*160;u.y=b.y+(Math.random()-.5)*160;u.hp=100;u.down=0;u.dead=0;u.tank=null;u.revived=false;u.rev=0;u.tgt=null;
 if(u.bot){const l={w:[0,0,1,2,3][Math.floor(Math.random()*5)],helmet:Math.random()<.5,armor:Math.random()<.4,gren:Math.random()<.5,med:Math.random()<.7};equip(u,l)}}
function inHZ(u){return Math.hypot(u.x-HZ.x,u.y-HZ.y)<HZ.r}function inCZ(u){return Math.hypot(u.x-CZ.x,u.y-CZ.y)<CZ.r}
function _pay0(u,v,why){if(inHZ(u))v*=2;u.earned+=v;if(u===me){prof.cash+=v;if(why)log(`+$${v} ${why}`)}}
function _spend0(u,v){if(u!==me)return true;if(prof.cash<v)return false;prof.cash-=v;return true}
function toggleTank(u){if(u.tank){u.tank.driver=null;u.tank=null;u.x+=45;return}for(const k of tanks)if(!k.driver&&!k.dead&&d2(k,u)<75){k.driver=u;u.tank=k;return}}
function buyTank(u){if(Math.hypot(u.x-bases[u.t].x,u.y-bases[u.t].y)>350){log('Tanks can only be bought at your base');return}if(!spend(u,600)){log('Not enough cash for a tank ($600)');return}tanks.push(mkTank(u.x+60,u.y));log('Tank delivered. Press E to get in')}
function build(u,ang){if(u.tank)return;const x=u.x+Math.cos(ang)*60,y=u.y+Math.sin(ang)*60,vert=Math.abs(Math.cos(ang))>Math.abs(Math.sin(ang));const w=vert?24:90,h=vert?90:24;
 const nw={x:x-w/2,y:y-h/2,w,h,hp:250,built:u.t};if(units.some(o=>!o.dead&&o.x+16>nw.x&&o.x-16<nw.x+w&&o.y+16>nw.y&&o.y-16<nw.y+h))return;if(!spend(u,25)){log('Need $25 to build');return}addWall(nw)}
function medkit(u){if(u.hp>=100||u.med<=0){if(u===me&&u.med<=0)log('No medkits left');return}u.med--;u.hp=Math.min(100,u.hp+60);if(u===me)log('Used a medkit')}
function throwNade(u,tx,ty){if(u.gren<=0||u.tank){if(u===me)log('No grenades');return}u.gren--;const a=Math.atan2(ty-u.y,tx-u.x),d=Math.min(420,Math.hypot(tx-u.x,ty-u.y));nades.push({x:u.x,y:u.y,vx:Math.cos(a)*d/62,vy:Math.sin(a)*d/62,t:0,o:u})}
function moveU(u,dx,dy,sprint){const k=u.tank;let sp=k?1.3:(sprint?2.3:1.6);const r=k?28:14;const d=Math.hypot(dx,dy);if(!d)return;dx=dx/d*sp;dy=dy/d*sp;
 const o=k||u;if(!hitWall(o.x+dx,o.y,r))o.x+=dx;if(!hitWall(o.x,o.y+dy,r))o.y+=dy;if(k){u.x=k.x;u.y=k.y;k.ang=Math.atan2(dy,dx)}}
function shoot(u,ang){if(u.cd>0)return;
 if(u.tank){bullets.push({x:u.x+Math.cos(ang)*36,y:u.y+Math.sin(ang)*36,vx:Math.cos(ang)*4.8,vy:Math.sin(ang)*4.8,dmg:85,life:162,r:7,boom:120,o:u});u.cd=108;return}
 const w=WEAP[u.w];for(let i=0;i<w.k;i++){const a=ang+(Math.random()-.5)*w.spr*2;bullets.push({x:u.x+Math.cos(a)*18,y:u.y+Math.sin(a)*18,vx:Math.cos(a)*w.sp,vy:Math.sin(a)*w.sp,dmg:w.dmg,life:w.life,r:w.r,boom:w.boom,o:u})}u.cd=w.cd}
function damage(u,dm,by){if(u.dead||u.down)return; // downed players can't be hurt
 if(u.tank){const k=u.tank;k.hp-=dm;if(k.hp<=0){k.dead=1;k.driver=null;u.tank=null;booms.push({x:k.x,y:k.y,r:140,l:30});if(by&&by.t!=u.t)pay(by,200,'tank destroyed');damage(u,70,by)}return}
 if(u.helmet)dm*=.8;if(u.armor>0){const ab=Math.min(u.armor,dm*.6);u.armor-=ab;dm-=ab}
 u.hp-=dm;if(u.hp<=0){u.hp=0;if(by&&by.t!=u.t){by.kills++;pay(by,100,'enemy down')}
  if(u.revived){kill(u);if(u===me)log('You were taken out (already revived once this life)')}else{u.down=DOWNT;u.cd=0;if(u===me)log('You\'re down! Wait for a revive or hold Space to respawn')}}}
function _kill0(u){u.down=0;u.dead=RESP;u.deaths++;if(u.tank){u.tank.driver=null;u.tank=null}if(u===me){showShop()}}
function bleed(u){if(u.down)kill(u)}
function explode(b){booms.push({x:b.x,y:b.y,r:b.boom,l:20});for(const u of units)if(!u.dead&&u.t!=b.o.t){const d=d2(u,b);if(d<b.boom)damage(u,b.dmg*(1-d/b.boom*.6),b.o)}
 for(const k of tanks)if(!k.dead&&!k.driver&&d2(k,b)<b.boom)k.hp-=b.dmg*.5;
 for(const w of walls.slice())if(w.hp&&Math.hypot(w.x+w.w/2-b.x,w.y+w.h/2-b.y)<b.boom+40){w.hp-=b.dmg*2;if(w.hp<=0)delWall(w)}}
function los(a,b){const n=Math.ceil(d2(a,b)/25);for(let i=1;i<n;i++)if(hitWall(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,2))return false;return true}
function seeL(a,b){if(los(a,b))return true;const d=d2(a,b)||1,px=-(b.y-a.y)/d*12,py=(b.x-a.x)/d*12;return los(a,{x:b.x+px,y:b.y+py})||los(a,{x:b.x-px,y:b.y-py})||los({x:a.x+px,y:a.y+py},b)||los({x:a.x-px,y:a.y-py},b)}
function tend(u){let best=null,bd=55;for(const o of units)if(o!==u&&o.t==u.t&&!o.dead&&(o.down||o.hp<100)){const d=d2(o,u);if(d<bd){bd=d;best=o}}
 if(!best){u.rev=0;return null}
 if(best.down){u.rev++;if(u.rev>=150){best.down=0;best.hp=35;best.revived=true;u.rev=0;u.revs++;pay(u,150,'teammate revived');if(best===me)log('You were revived! (only once per life)')}}
 else if(u.med>0){u.rev++;if(u.rev>=60){u.med--;best.hp=Math.min(100,best.hp+60);u.rev=0;pay(u,40,'healed a teammate')}}
 else{u.rev=0;if(u===me&&tick%120==0)log('Need a medkit to heal teammates')}return best}
function bot(u){
 if(tick%12==u.id%12){let tgt=null,bd=WEAP[u.w].rng*(u.tank?1.2:1);for(const o of units)if(!o.dead&&!o.down&&o.t!=u.t){const d=d2(o,u);if(d<bd&&los(u,o)){bd=d;tgt=o}}u.tgt=tgt;u.td=bd}
 const tgt=u.tgt&&!u.tgt.dead&&!u.tgt.down?u.tgt:null;
 if(u.hp<40)medkit(u);
 let mate=null;if(!tgt||u.td>300)for(const o of units)if(o.t==u.t&&o!==u&&(o.down||(o.hp<50&&u.med>0&&!o.dead))&&!u.tank&&d2(o,u)<400){mate=o;break}
 if(mate){if(d2(mate,u)>40)moveU(u,mate.x-u.x,mate.y-u.y);else tend(u);return}u.rev=0;
 if(!u.tank){for(const k of tanks)if(!k.driver&&!k.dead&&d2(k,u)<80&&Math.random()<.03)toggleTank(u)}
 if(tick%240==(u.id*7)%240||!u.wx){const goal=Math.random()<.6?HZ:CZ;const a=Math.random()*6.28,r=Math.random()*goal.r*.8;u.wx=goal.x+Math.cos(a)*r;u.wy=goal.y+Math.sin(a)*r}
 let dx=u.wx-u.x,dy=u.wy-u.y;if(tgt&&u.td<WEAP[u.w].rng*.5){dx=-(tgt.y-u.y);dy=tgt.x-u.x;if((tick+u.id*40)%200<100){dx=-dx;dy=-dy}}
 if(Math.hypot(dx,dy)>10){const ox=u.x,oy=u.y;moveU(u,dx,dy,!tgt&&!inCZ(u));if(Math.abs(u.x-ox)+Math.abs(u.y-oy)<.3){u.stuck=(u.stuck||0)+1;if(u.stuck>20){const a=Math.random()*6.28;u.wx=u.x+Math.cos(a)*300;u.wy=u.y+Math.sin(a)*300;u.stuck=0}}}
 if(tgt){u.ang=Math.atan2(tgt.y-u.y,tgt.x-u.x)+(Math.random()-.5)*.12;shoot(u,u.ang);if(u.gren>0&&u.td<380&&u.td>120&&Math.random()<.004)throwNade(u,tgt.x,tgt.y);if(inCZ(u)&&Math.random()<.002)build(u,u.ang)}}
function step(){if(!running)return;tick++;
 if(tick%2400==0||Math.hypot(HZ.x-HZ.tx,HZ.y-HZ.ty)<5){const a=Math.random()*6.28,r=Math.random()*(CZ.r-HZ.r);HZ.tx=CZ.x+Math.cos(a)*r;HZ.ty=CZ.y+Math.sin(a)*r}
 {const dx=HZ.tx-HZ.x,dy=HZ.ty-HZ.y,d=Math.hypot(dx,dy);if(d>0.3){HZ.x+=dx/d*.3;HZ.y+=dy/d*.3}}
 units.forEach((u,i)=>{u.id=i;if(u.cd>0)u.cd--;
  if(u.dead){if(u.dead>0){u.dead--;if(u.dead==0){if(u.bot)spawn(u);else{u.dead=-1}}}return}
  if(u.down){if(--u.down<=0)kill(u);return} // downed: can't move, can't be hurt, timer only
  if(u.bot)bot(u);else{humanStep(u);return;let dx=(keys.d?1:0)-(keys.a?1:0)+joy.L.x,dy=(keys.s?1:0)-(keys.w?1:0)+joy.L.y;moveU(u,dx,dy,keys.shift||joy.sprint);if(joy.R.on){if(Math.hypot(joy.R.x,joy.R.y)>.2)u.ang=Math.atan2(joy.R.y,joy.R.x);if(Math.hypot(joy.R.x,joy.R.y)>.55)shoot(u,u.ang)}else if(!isTouch){u.ang=Math.atan2(mouse.y-H/2,mouse.x-W/2)}if(mouse.down&&!isTouch)shoot(u,u.ang);if(keys.f)u.tending=tend(u);else{u.rev=0;u.tending=null}}});
 for(const k of tanks)if(k.dead)k.dead++;tanks=tanks.filter(k=>!k.dead||k.dead<60);
 for(const n of nades){n.t++;if(n.t<62&&!hitWall(n.x+n.vx,n.y+n.vy,5)){n.x+=n.vx;n.y+=n.vy}if(n.t>=110){explode({x:n.x,y:n.y,boom:120,dmg:85,o:n.o});n.done=1}}nades=nades.filter(n=>!n.done);
 for(const b of bullets){b.x+=b.vx;b.y+=b.vy;b.life--;
  const w=hitWall(b.x,b.y,b.r);if(w){b.life=0;if(w.hp){w.hp-=b.dmg;if(w.hp<=0)delWall(w)}if(b.boom)explode(b);continue}
  for(const u of units){if(u.dead||u.down||u.t==b.o.t)continue;const r=u.tank?30:14;if(d2(u,b)<r+b.r){b.life=0;if(b.boom)explode(b);else damage(u,b.dmg,b.o);break}}
  if(b.life==0)continue;for(const k of tanks)if(!k.dead&&!k.driver&&d2(k,b)<30){b.life=0;if(b.boom)explode(b);else k.hp-=b.dmg*.3}
  if(b.life==0&&b.boom)explode(b)}
 for(const k of tanks)if(!k.dead&&k.hp<=0&&!k.driver){k.dead=1;booms.push({x:k.x,y:k.y,r:140,l:30})}
 bullets=bullets.filter(b=>b.life>0);booms=booms.filter(b=>--b.l>0);feed.forEach(f=>f.l--);feed=feed.filter(f=>f.l>0);
 if(tick%TICK==0){const cnt=zoneCount(),mx=Math.max(...cnt),ws=cnt.map((v,i)=>v==mx?i:-1).filter(i=>i>=0);
  if(mx>0&&ws.length==1){score[ws[0]]++;log(`${TEAMS[ws[0]].n} held the zone (${cnt.join(' / ')}) +1 point`);for(const u of units)if(u.t==ws[0]&&!u.dead&&!u.down&&inCZ(u))pay(u,50,'zone held')}
  else log(mx?'Tie in the zone, no point':'Zone empty, no point');save()}
 const w=score.findIndex(s=>s>=WIN);if(w>=0)endMatch(w)}
function zoneCount(){const cnt=[0,0,0];for(const u of units)if(!u.dead&&!u.down&&inCZ(u))cnt[u.t]+=inHZ(u)?2:1;return cnt}
// ---------- server overrides ----------
function log(s){if(curU){(curU.pl=curU.pl||[]).push(s)}else globalFeed.push(s)}
function pay(u,v,why){if(inHZ(u))v*=2;u.earned+=v;if(!u.bot){u.cash=(u.cash||0)+v;if(why)(u.pl=u.pl||[]).push(`+$${v} ${why}`)}}
function spend(u,v){if(u.bot)return true;if((u.cash||0)<v)return false;u.cash-=v;return true}
function kill(u){u.down=0;u.dead=RESP;u.deaths++;if(u.tank){u.tank.driver=null;u.tank=null}}
let winner=-1;
function endMatch(w){running=false;winner=w}
function loadCost(l){return WEAP[l.w].p+['helmet','armor','gren','med'].reduce((a,k)=>a+(l[k]?GEAR[k].p:0),0)}
function cleanLoad(l){l=l||{};return {w:Math.max(0,Math.min(WEAP.length-1,l.w|0)),helmet:!!l.helmet,armor:!!l.armor,gren:!!l.gren,med:!!l.med}}
function buyFor(u,l){l=cleanLoad(l);const c=loadCost(l);if(u.cash>=c){u.cash-=c;equip(u,l)}else{equip(u,{w:0});(u.pl=u.pl||[]).push('Not enough cash for your loadout, spawned with a rifle')}}
const NAMES=[];for(let i=0;i<3*PER;i++)NAMES.push(BOTN[i%BOTN.length]+(i>=BOTN.length?' '+(1+Math.floor(i/BOTN.length)):''));
function newMatch(){makeMap();units=[];score=[0,0,0];bullets=[];nades=[];booms=[];tick=0;feed=[];winner=-1;
 for(let t=0;t<3;t++)for(let i=0;i<PER;i++){const u={t,bot:true,ang:0,kills:0,deaths:0,revs:0,earned:0,name:NAMES[t*PER+i]};spawn(u);units.push(u)}
 units.forEach((u,i)=>u.id=i);running=true;wallVer++}
let wallVer=0;
const _add=addWall,_del=delWall;
addWall=function(w){_add(w);wallVer++};delWall=function(w){_del(w);wallVer++};
// human input: u.inp={dx,dy,sp,ang,fire,f}
function humanStep(u){const p=u.inp||{};moveU(u,+p.dx||0,+p.dy||0,!!p.sp);if(typeof p.ang=='number'&&isFinite(p.ang))u.ang=p.ang;if(p.fire)shoot(u,u.ang);if(p.f)u.tending=tend(u);else{u.rev=0;u.tending=null}}
function action(u,m){if(!running)return;curU=u;try{
 if(m.a=='respawn'){if(u.dead<0){spawn(u);buyFor(u,m.load);u.dead=0}return}
 if(u.dead)return;
 if(m.a=='giveup'){if(u.down)kill(u);return}
 if(u.down)return;
 if(m.a=='e')toggleTank(u);else if(m.a=='q')build(u,u.ang);else if(m.a=='h')medkit(u);else if(m.a=='t')buyTank(u);
 else if(m.a=='g'){const tx=+m.tx,ty=+m.ty;if(isFinite(tx)&&isFinite(ty))throwNade(u,tx,ty)}
 }finally{curU=null}}
module.exports={get units(){return units},get tanks(){return tanks},get bullets(){return bullets},get nades(){return nades},get booms(){return booms},
 get walls(){return walls},get score(){return score},get tick(){return tick},get CZ(){return CZ},get HZ(){return HZ},get bases(){return bases},
 get running(){return running},get winner(){return winner},get wallVer(){return wallVer},
 newMatch,zoneCount:()=>zoneCount(),step:()=>{step()},action,buyFor,los,seeL,d2,VIS,PER,TEAMS,MW,MH,DOWNT,
 drainFeed(){const f=globalFeed;globalFeed=[];return f}};
