// WarDOGE multiplayer server. Config comes only from environment variables (no secrets in the repo).
'use strict';
const http=require('http');const fs=require('fs');const vm=require('vm');const {WebSocketServer}=require('ws');
const DB=require('./db');
const SIM_SRC=fs.readFileSync(__dirname+'/sim.js','utf8');
// Each room is its own isolated copy of the match simulation.
function makeSim(){const mod={exports:{}};vm.runInNewContext(SIM_SRC,{module:mod,exports:mod.exports,Math,JSON,console,isFinite,Number,String,Array,Object},{filename:'sim.js'});return mod.exports}
const MAX_ROOMS=+process.env.MAX_ROOMS||20;let nextRoom=1;const rooms=[];
function newRoom(){const S=makeSim();S.newMatch();const r={id:nextRoom++,S,restartAt:0,lastWallVer:-1};rooms.push(r);return r}
const humans=r=>r.S.units.filter(u=>!u.bot).length;
const PORT=process.env.PORT||8080;
const ORIGINS=(process.env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean); // e.g. https://wardoge.io
const r1=v=>Math.round(v*10)/10;
const srv=http.createServer((q,s)=>{s.writeHead(200,{'content-type':'application/json','access-control-allow-origin':'*'});s.end(srvStatus())});
const wss=new WebSocketServer({server:srv,maxPayload:4096,verifyClient:i=>!ORIGINS.length||ORIGINS.includes(i.origin)});
newRoom();
function freeBot(S,team){return S.units.find(u=>u.t==team&&u.bot)}
function pickRoom(team){ // fullest running room that still has a bot to replace (keeps rooms lively)
 const open=rooms.filter(r=>r.S.running&&r.S.units.some(u=>u.bot)).sort((a,b)=>humans(b)-humans(a));
 return open.find(r=>freeBot(r.S,team))||open[0]||(rooms.length<MAX_ROOMS?newRoom():null)}
const srvStatus=()=>JSON.stringify({rooms:rooms.map(r=>({id:r.id,players:humans(r),running:r.S.running}))});
wss.on('connection',ws=>{
 ws.u=null;ws.wv=-1;ws.rate=0;
 ws.on('message',buf=>{if(++ws.rate>120)return;let m;try{m=JSON.parse(buf)}catch{return}
  if(m.join&&!ws.u&&!ws.joining){ws.joining=true;doJoin(ws,m.join).catch(e=>console.error(e)).finally(()=>ws.joining=false);return}
  const u=ws.u;if(!u)return;
  if(m.i){const [dx,dy,sp,ang,fire,f]=m.i;u.inp={dx:Math.max(-2,Math.min(2,+dx||0)),dy:Math.max(-2,Math.min(2,+dy||0)),sp:!!sp,ang:+ang||0,fire:!!fire,f:!!f}}
  else if(m.a)ws.room.S.action(u,m)});
 ws.on('close',()=>{const u=ws.u;if(u&&u.ws===ws){saveLeave(u);u.bot=true;u.ws=null;u.inp=null;if(u.dead<0)u.dead=1}})});
let frame=0;
setInterval(()=>{if(++frame%60==0)for(const c of wss.clients)c.rate=0;
 for(const r of rooms){const S=r.S;if(S.running){S.step();if(!S.running)onEnd(r)}else if(r.restartAt&&Date.now()>r.restartAt){r.restartAt=0;S.newMatch();r.lastWallVer=-1}}
 // close extra empty rooms, always keep one warm
 for(let i=rooms.length-1;i>0;i--)if(humans(rooms[i])==0&&![...wss.clients].some(c=>c.room===rooms[i]))rooms.splice(i,1)},1000/60);
function saveLeave(u){if(!u.prof)return;const p=u.prof;p.cash=u.cash;p.kills+=u.kills;p.deaths+=u.deaths;p.revives+=u.revs;p.xp+=u.kills*50+u.revs*80;u.kills=u.deaths=u.revs=0;u.prof=null;DB.saveProfile(p)}
function saveEnd(u,S){const won=u.t==S.winner;u.cash+=won?500:0;if(!u.prof)return;const p=u.prof;p.cash=u.cash;p.matches++;p.wins+=won?1:0;p.kills+=u.kills;p.deaths+=u.deaths;p.revives+=u.revs;p.xp+=u.kills*50+u.revs*80+(won?500:150);
 p.history=[{d:new Date().toISOString().slice(0,10),won,team:S.TEAMS[S.winner].n,k:u.kills,dth:u.deaths,r:u.revs,e:u.earned+(won?500:0)},...(p.history||[])].slice(0,10);u.prof=null;DB.saveProfile(p)}
function onEnd(r){const S=r.S;for(const c of wss.clients){if(c.room!==r)continue;if(c.u){saveEnd(c.u,S);}if(c.u)c.send(JSON.stringify({end:S.winner,score:S.score,board:board(S),me:stats(c.u)}));c.u=null;c.room=null}
 for(const u of S.units){u.bot=true;u.ws=null}r.restartAt=Date.now()+5000}
async function doJoin(ws,j){let prof=null;if(j.token){const user=await DB.userFromToken(j.token);if(!user){ws.send(JSON.stringify({authfail:1}));return}prof=await DB.loadProfile(user);if(!prof){ws.send(JSON.stringify({authfail:1}));return}}
 if(ws.readyState!==1)return;let team=[0,1,2].includes(j.team)?j.team:1;const room=pickRoom(team);if(!room){ws.send(JSON.stringify({full:1}));return}const S=room.S;
   let u=freeBot(S,team);if(!u){team=[0,1,2].sort((a,b)=>S.units.filter(x=>x.t==b&&x.bot).length-S.units.filter(x=>x.t==a&&x.bot).length)[0];u=freeBot(S,team)}
   if(!u){ws.send(JSON.stringify({full:1}));return}
   u.bot=false;u.ws=ws;u.name=String(j.name||'Player').replace(/[<>&"']/g,'').slice(0,16)||'Player';u.prof=prof;u.cash=prof?prof.cash:Math.max(0,Math.min(5000,j.cash|0));if(prof)u.name=prof.name;u.inp={};u.pl=[];
   u.kills=u.deaths=u.revs=u.earned=0;const b=S.bases[u.t];u.x=b.x;u.y=b.y;u.hp=100;u.down=0;u.dead=0;u.tank&&(u.tank.driver=null,u.tank=null);S.buyFor(u,j.load);
   ws.u=u;ws.room=room;ws.wv=-1;ws.send(JSON.stringify({you:u.id,team:u.t,room:room.id,CZ:S.CZ,bases:S.bases,cash:u.cash,name:u.name}));}

const stats=u=>({k:u.kills,d:u.deaths,r:u.revs,e:u.earned,cash:u.cash});
const board=S=>S.units.map(u=>[u.t,u.name,u.kills,u.deaths,u.revs,u.bot?1:0]);
function unitData(S,u){return [r1(u.x),r1(u.y),Math.round(u.ang*100)/100,Math.ceil(u.hp),u.t,u.down,u.dead,u.tank?S.tanks.indexOf(u.tank):-1,u.helmet?1:0,Math.ceil(u.armor),u.w,u.gren,u.med,u.rev,u.revived?1:0,u.bot?1:0,u.id]}
setInterval(()=>{for(const r of rooms){const S=r.S;if(!S.running)continue;const feed=S.drainFeed(),zc=S.zoneCount();
 const tanks=S.tanks.map(k=>[r1(k.x),r1(k.y),Math.round(k.ang*100)/100,Math.ceil(k.hp),k.dead,k.driver?k.driver.id:-1]);
 const bullets=S.bullets.map(b=>[r1(b.x),r1(b.y),b.r,b.boom?1:0,r1(b.vx),r1(b.vy)]),nades=S.nades.map(n=>[r1(n.x),r1(n.y),n.t]),booms=S.booms.map(b=>[r1(b.x),r1(b.y),b.r,b.l]);
 const names=S.units.map(u=>u.name);const wallsJ=S.wallVer!==r.lastWallVer?S.walls.map(w=>[r1(w.x),r1(w.y),r1(w.w),r1(w.h),w.built==null?-1:w.built]):null;
 for(const c of wss.clients){const me=c.u;if(!me||c.room!==r||c.readyState!==1)continue;
  // fog of war on the server: enemies are only sent when this player can actually see them
  const us=[];for(const u of S.units){if(u.t!=me.t){if(me.dead||u.dead||S.d2(u,me)>S.VIS||!S.los(me,u))continue}us.push(unitData(S,u))}
  const msg={tk:S.tick,sc:S.score,zc,hz:[r1(S.HZ.x),r1(S.HZ.y),S.HZ.r],u:us,tn:tanks,b:bullets,n:nades,x:booms,f:feed,pl:me.pl,cash:me.cash,k:me.kills,dth:me.deaths,rv:me.revs,er:me.earned,td:me.tending?me.tending.id:-1};
  if(c.wv!==S.wallVer){msg.w=wallsJ||S.walls.map(w=>[r1(w.x),r1(w.y),r1(w.w),r1(w.h),w.built==null?-1:w.built]);c.wv=S.wallVer;msg.names=names}
  if(c.nv!==S.tick>>8){c.nv=S.tick>>8;msg.names=names}
  me.pl=[];c.send(JSON.stringify(msg))}r.lastWallVer=S.wallVer}},50);
srv.listen(PORT,()=>console.log('WarDOGE server on :'+PORT));
