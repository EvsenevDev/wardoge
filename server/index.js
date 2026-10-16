// WarDOGE multiplayer server. Config comes only from environment variables (no secrets in the repo).
'use strict';
const http=require('http');const {WebSocketServer}=require('ws');const S=require('./sim');
const PORT=process.env.PORT||8080;
const ORIGINS=(process.env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean); // e.g. https://wardoge.ai
const r1=v=>Math.round(v*10)/10;
const srv=http.createServer((q,s)=>{s.writeHead(200,{'content-type':'text/plain'});s.end('WarDOGE server ok')});
const wss=new WebSocketServer({server:srv,maxPayload:4096,verifyClient:i=>!ORIGINS.length||ORIGINS.includes(i.origin)});
let restartAt=0,lastWallVer=-1;S.newMatch();
function freeBot(team){return S.units.find(u=>u.t==team&&u.bot)}
wss.on('connection',ws=>{
 ws.u=null;ws.wv=-1;ws.rate=0;
 ws.on('message',buf=>{if(++ws.rate>120)return;let m;try{m=JSON.parse(buf)}catch{return}
  if(m.join&&!ws.u&&S.running){const j=m.join;let team=[0,1,2].includes(j.team)?j.team:1;
   let u=freeBot(team);if(!u){team=[0,1,2].sort((a,b)=>S.units.filter(x=>x.t==a&&x.bot).length<S.units.filter(x=>x.t==b&&x.bot).length?1:-1)[0];u=freeBot(team)}
   if(!u){ws.send(JSON.stringify({full:1}));return}
   u.bot=false;u.ws=ws;u.name=String(j.name||'Player').replace(/[<>&"']/g,'').slice(0,16)||'Player';u.cash=Math.max(0,Math.min(1e6,j.cash|0));u.inp={};u.pl=[];
   u.kills=u.deaths=u.revs=u.earned=0;const b=S.bases[u.t];u.x=b.x;u.y=b.y;u.hp=100;u.down=0;u.dead=0;u.tank&&(u.tank.driver=null,u.tank=null);S.buyFor(u,j.load);
   ws.u=u;ws.send(JSON.stringify({you:u.id,team:u.t,CZ:S.CZ,bases:S.bases}));return}
  const u=ws.u;if(!u)return;
  if(m.i){const [dx,dy,sp,ang,fire,f]=m.i;u.inp={dx:Math.max(-2,Math.min(2,+dx||0)),dy:Math.max(-2,Math.min(2,+dy||0)),sp:!!sp,ang:+ang||0,fire:!!fire,f:!!f}}
  else if(m.a)S.action(u,m)});
 ws.on('close',()=>{const u=ws.u;if(u&&u.ws===ws){u.bot=true;u.ws=null;u.inp=null;if(u.dead<0)u.dead=1}})});
setInterval(()=>{ws_rate_reset();if(S.running){S.step();if(!S.running)onEnd()}else if(restartAt&&Date.now()>restartAt){restartAt=0;S.newMatch()}},1000/60);
function ws_rate_reset(){if(S.tick%60==0)for(const c of wss.clients)c.rate=0}
function onEnd(){const msg=JSON.stringify({end:S.winner,score:S.score,board:board()});for(const c of wss.clients){if(c.u)c.send(JSON.stringify({end:S.winner,score:S.score,board:board(),me:stats(c.u)}));c.u=null}
 for(const u of S.units){u.bot=true;u.ws=null}restartAt=Date.now()+5000}
const stats=u=>({k:u.kills,d:u.deaths,r:u.revs,e:u.earned,cash:u.cash});
const board=()=>S.units.map(u=>[u.t,u.name,u.kills,u.deaths,u.revs,u.bot?1:0]);
function unitData(u){return [r1(u.x),r1(u.y),Math.round(u.ang*100)/100,Math.ceil(u.hp),u.t,u.down,u.dead,u.tank?S.tanks.indexOf(u.tank):-1,u.helmet?1:0,Math.ceil(u.armor),u.w,u.gren,u.med,u.rev,u.revived?1:0,u.bot?1:0,u.id]}
setInterval(()=>{if(!S.running)return;const feed=S.drainFeed(),zc=S.zoneCount();
 const tanks=S.tanks.map(k=>[r1(k.x),r1(k.y),Math.round(k.ang*100)/100,Math.ceil(k.hp),k.dead,k.driver?k.driver.id:-1]);
 const bullets=S.bullets.map(b=>[r1(b.x),r1(b.y),b.r,b.boom?1:0]),nades=S.nades.map(n=>[r1(n.x),r1(n.y),n.t]),booms=S.booms.map(b=>[r1(b.x),r1(b.y),b.r,b.l]);
 const names=S.units.map(u=>u.name);const wallsJ=S.wallVer!==lastWallVer?S.walls.map(w=>[r1(w.x),r1(w.y),r1(w.w),r1(w.h),w.built==null?-1:w.built]):null;
 for(const c of wss.clients){const me=c.u;if(!me||c.readyState!==1)continue;
  // fog of war on the server: enemies are only sent when this player can actually see them
  const us=[];for(const u of S.units){if(u.t!=me.t){if(me.dead||u.dead||S.d2(u,me)>S.VIS||!S.los(me,u))continue}us.push(unitData(u))}
  const msg={tk:S.tick,sc:S.score,zc,hz:[r1(S.HZ.x),r1(S.HZ.y),S.HZ.r],u:us,tn:tanks,b:bullets,n:nades,x:booms,f:feed,pl:me.pl,cash:me.cash,k:me.kills,dth:me.deaths,rv:me.revs,er:me.earned,td:me.tending?me.tending.id:-1};
  if(c.wv!==S.wallVer){msg.w=wallsJ||S.walls.map(w=>[r1(w.x),r1(w.y),r1(w.w),r1(w.h),w.built==null?-1:w.built]);c.wv=S.wallVer;msg.names=names}
  if(c.nv!==S.tick>>8){c.nv=S.tick>>8;msg.names=names}
  me.pl=[];c.send(JSON.stringify(msg))}lastWallVer=S.wallVer},50);
srv.listen(PORT,()=>console.log('WarDOGE server on :'+PORT));
