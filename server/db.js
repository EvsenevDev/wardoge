// Supabase access for the game server. Keys come only from env (Fly secrets).
'use strict';
const URL_=process.env.SUPABASE_URL,KEY=process.env.SUPABASE_SERVICE_KEY;
const enabled=!!(URL_&&KEY);
const H={apikey:KEY,Authorization:'Bearer '+KEY,'content-type':'application/json'};
async function userFromToken(token){if(!enabled||!token)return null;
 const r=await fetch(URL_+'/auth/v1/user',{headers:{apikey:KEY,Authorization:'Bearer '+token}});if(!r.ok)return null;const u=await r.json();return u&&u.id?u:null}
async function loadProfile(user){const r=await fetch(`${URL_}/rest/v1/profiles?id=eq.${user.id}&select=*`,{headers:H});const rows=r.ok?await r.json():[];if(rows[0])return rows[0];
 const name=String((user.user_metadata&&(user.user_metadata.full_name||user.user_metadata.name))||'Player').replace(/[<>&"']/g,'').slice(0,14)||'Player';
 const ins=await fetch(`${URL_}/rest/v1/profiles`,{method:'POST',headers:{...H,Prefer:'return=representation'},body:JSON.stringify({id:user.id,name})});const out=ins.ok?await ins.json():[];return out[0]||null}
async function saveProfile(p){if(!enabled||!p)return;const {id,...rest}=p;rest.updated_at=new Date().toISOString();
 const r=await fetch(`${URL_}/rest/v1/profiles?id=eq.${id}`,{method:'PATCH',headers:H,body:JSON.stringify(rest)});if(!r.ok)console.error('save failed',r.status,await r.text())}
module.exports={enabled,userFromToken,loadProfile,saveProfile};
