import { env } from "cloudflare:workers";

type ChatLine={who:string;text:string;emote?:boolean};
type Crater={x:number;r:number};
type GameState={positions:[number,number];hp:[number,number];turn:0|1;turnNo:number;roundNo:number;matchWins:[number,number];turnStartedAt:number;moved:[number,number];turnsTaken:[number,number];specialReadyAt:[number,number];itemUsed:[boolean,boolean];wind:number;winner:number|null;craters:Crater[];lastEvent:{type:string;player?:number;from?:number;to?:number;impactX?:number;secondImpactX?:number;angle?:number;power?:number;wind?:number;windChanged?:boolean;special?:boolean;dual?:boolean;hit?:boolean;damage?:number;terrain?:number;nonce:number};chat:ChatLine[]};
const TURN_MS=10_000,TURN_PAUSE_MS=1_500,PROJECTILE_LOCK_MS=TURN_PAUSE_MS,DUAL_LOCK_MS=2_900;
const blastRadius=(player:number,special:boolean)=>special?50:player===0?40:34;
const craterRadius=(player:number,special:boolean)=>special?17:player===0?14:12;
const clean=(v:unknown,n=80)=>String(v??"").trim().slice(0,n);
const rivalQuips=["En el Callao primero se apunta. Luego se discute.","No es presión; es ambiente de partido.","La puntería también juega de visitante.","Rosado por fuera. Problemas por dentro."];
const fresh=(matchWins:[number,number]=[0,0],roundNo=1):GameState=>({positions:[122,638],hp:[160,160],turn:0,turnNo:1,roundNo,matchWins,turnStartedAt:Date.now(),moved:[0,0],turnsTaken:[0,0],specialReadyAt:[0,0],itemUsed:[false,false],wind:Math.round(Math.random()*28-14),winner:null,craters:[],lastEvent:{type:"start",nonce:Date.now()},chat:[{who:"El Rosado",text:rivalQuips[Math.floor(Math.random()*rivalQuips.length)]}]});
const groundAt=(x:number,craters:Crater[]=[],variant=0)=>{const profile=((variant%4)+4)%4;let y=profile===0?303+18*Math.sin(x/58)+10*Math.sin(x/27)+5*Math.sin(x/13):profile===1?300+24*Math.sin(x/128+.45)+9*Math.sin(x/31)+4*Math.cos(x/17):profile===2?307+18*Math.sin(x/43+1.2)+11*Math.sin(x/19)+5*Math.cos(x/83):300+25*Math.sin(x/96+1.7)+8*Math.sin(x/25+.5)+4*Math.cos(x/15);for(const c of craters){const d=Math.abs(x-c.x);if(d<c.r)y+=Math.sqrt(c.r*c.r-d*d)*.42}return y};
const db=()=>{if(!env.DB)throw new Error("DB unavailable");return env.DB};

export async function GET(req:Request){
  const code=clean(new URL(req.url).searchParams.get("code"),8).toUpperCase();
  const row=await db().prepare("SELECT code, guest_token, state, revision FROM rooms WHERE code = ?").bind(code).first<{code:string;guest_token:string|null;state:string;revision:number}>();
  if(!row)return Response.json({error:"La sala no existe."},{status:404});
  return Response.json({code:row.code,waiting:!row.guest_token,state:JSON.parse(row.state),revision:row.revision});
}

export async function POST(req:Request){
  const p=await req.json() as Record<string,unknown>;const action=clean(p.action,12);const code=clean(p.code,8).toUpperCase();const token=clean(p.token,80);
  if(action==="create"){
    if(!code||!token)return Response.json({error:"Missing room data"},{status:400});
    const state=fresh();
    try{await db().prepare("INSERT INTO rooms (code, host_token, state, revision, updated_at) VALUES (?, ?, ?, 0, ?)").bind(code,token,JSON.stringify(state),Date.now()).run();}
    catch{return Response.json({error:"Code collision"},{status:409})}
    return Response.json({code,role:0,state,revision:0});
  }
  const row=await db().prepare("SELECT host_token, guest_token, state, revision FROM rooms WHERE code = ?").bind(code).first<{host_token:string;guest_token:string|null;state:string;revision:number}>();
  if(!row)return Response.json({error:"Room no existe, causa."},{status:404});
  if(action==="join"){
    if(row.host_token===token)return Response.json({role:0,state:JSON.parse(row.state),revision:row.revision});
    if(row.guest_token&&row.guest_token!==token)return Response.json({error:"La sala está completa: dos jugadores, una mala decisión."},{status:409});
    const joined=JSON.parse(row.state) as GameState;
    if(!row.guest_token){joined.turnStartedAt=Date.now();await db().prepare("UPDATE rooms SET guest_token=?, state=?, updated_at=? WHERE code=? AND guest_token IS NULL").bind(token,JSON.stringify(joined),Date.now(),code).run()}
    return Response.json({role:1,state:joined,revision:row.revision});
  }
  const player=row.host_token===token?0:row.guest_token===token?1:-1;
  if(player<0)return Response.json({error:"No perteneces a esta partida."},{status:403});
  const s=JSON.parse(row.state) as GameState;
  s.turnStartedAt=s.turnStartedAt??Date.now();
  s.turnsTaken=s.turnsTaken??[0,0];s.specialReadyAt=s.specialReadyAt??[0,0];s.itemUsed=s.itemUsed??[false,false];s.matchWins=s.matchWins??[0,0];s.roundNo=s.roundNo??1;
  if(action==="move"){
    if(s.turn!==player||s.winner!==null)return Response.json({error:"Todavía no es tu turno."},{status:409});
    if(Date.now()<s.turnStartedAt)return Response.json({error:"El siguiente turno aún no empieza."},{status:409});
    if(Date.now()>=s.turnStartedAt+TURN_MS)return Response.json({error:"Tu tiempo terminó."},{status:409});
    const requested=Math.max(-38,Math.min(38,Number(p.delta)||0));const left=104-s.moved[player];const delta=Math.sign(requested)*Math.min(Math.abs(requested),left);
    const min=player===0?50:460,max=player===0?300:710;const before=s.positions[player];s.positions[player]=Math.max(min,Math.min(max,before+delta));s.moved[player]+=Math.abs(s.positions[player]-before);s.lastEvent={type:"move",player,from:before,to:s.positions[player],nonce:Date.now()};
  }else if(action==="fire"){
    if(s.turn!==player||s.winner!==null)return Response.json({error:"Todavía no es tu turno."},{status:409});
    if(Date.now()<s.turnStartedAt)return Response.json({error:"El siguiente turno aún no empieza."},{status:409});
    if(Date.now()>=s.turnStartedAt+TURN_MS)return Response.json({error:"Tu tiempo terminó."},{status:409});
    const special=Boolean(p.special),dual=Boolean(p.dual)&&!special,rawPower=Number(p.power);if(p.charged!==true||!Number.isFinite(rawPower)||rawPower<=0)return Response.json({error:"Mantén presionada la barra de potencia antes de disparar."},{status:409});if(special&&s.turnsTaken[player]<s.specialReadyAt[player])return Response.json({error:"SS todavía está recargando."},{status:409});if(dual&&s.itemUsed[player])return Response.json({error:"Ya usaste tu item en esta partida."},{status:409});
    s.craters=s.craters??[];const angle=Math.max(18,Math.min(78,Number(p.angle)||45)),power=Math.max(1,Math.min(100,rawPower)),shotWind=s.wind,target=(1-player) as 0|1,terrain=((s.roundNo??1)-1)%4;
    const simulate=(shotAngle:number)=>{let x=s.positions[player],y=groundAt(x,s.craters,terrain)-47,dx=Math.cos(shotAngle*Math.PI/180)*power*.145*(player===0?1:-1),dy=-Math.sin(shotAngle*Math.PI/180)*power*.145;for(let i=0;i<420&&y<groundAt(x,s.craters,terrain)&&x>0&&x<760;i++){x+=dx;y+=dy;dy+=.17;dx+=shotWind*.0019}const impactX=Math.max(8,Math.min(752,x)),impactY=groundAt(impactX,s.craters,terrain),targetY=groundAt(s.positions[target],s.craters,terrain)-27,targetRadius=target===0?24:18,hit=Math.hypot(impactX-s.positions[target],impactY-targetY)<=blastRadius(player,special)+targetRadius;return{impactX,hit}};
    const first=simulate(dual?angle-2.5:angle),second=dual?simulate(angle+2.5):null,damagePerHit=special?(player===0?53:44):25,damage=(first.hit?damagePerHit:0)+(second?.hit?damagePerHit:0),hit=damage>0;s.hp[target]=Math.max(0,s.hp[target]-damage);if(special)s.specialReadyAt[player]=s.turnsTaken[player]+4;if(dual)s.itemUsed[player]=true;s.turnsTaken[player]++;
    let windChanged=false;if(s.hp[target]===0){s.winner=player;s.matchWins[player]++}else{s.turn=target;s.turnNo++;s.turnStartedAt=Date.now()+(dual?DUAL_LOCK_MS:PROJECTILE_LOCK_MS);s.moved[target]=0;if((s.turnNo-1)%4===0){s.wind=Math.round(Math.random()*28-14);windChanged=true}}
    const newCraters=[{x:first.impactX,r:craterRadius(player,special)},...(second?[{x:second.impactX,r:craterRadius(player,false)}]:[])];s.craters=[...s.craters.slice(-(14-newCraters.length)),...newCraters];s.lastEvent={type:"fire",player,impactX:first.impactX,secondImpactX:second?.impactX,angle,power,wind:shotWind,windChanged,special,dual,hit,damage,terrain,nonce:Date.now()};
  }else if(action==="item"){
    if(s.turn!==player||s.winner!==null)return Response.json({error:"Todavía no es tu turno."},{status:409});if(Date.now()<s.turnStartedAt||Date.now()>=s.turnStartedAt+TURN_MS)return Response.json({error:"El item no puede usarse fuera de tu tiempo."},{status:409});if(clean(p.item,12)!=="heal")return Response.json({error:"Item desconocido."},{status:400});if(s.itemUsed[player])return Response.json({error:"Ya usaste tu item en esta partida."},{status:409});
    s.itemUsed[player]=true;s.hp[player]=Math.min(160,s.hp[player]+40);s.turnsTaken[player]++;const target=(1-player) as 0|1;s.turn=target;s.turnNo++;s.turnStartedAt=Date.now()+TURN_PAUSE_MS;s.moved[target]=0;let windChanged=false;if((s.turnNo-1)%4===0){s.wind=Math.round(Math.random()*28-14);windChanged=true}s.lastEvent={type:"heal",player,windChanged,nonce:Date.now()};
  }else if(action==="timeout"){
    if(s.winner!==null)return Response.json({state:s,revision:row.revision});
    if(Date.now()<s.turnStartedAt+TURN_MS)return Response.json({error:"El turno todavía tiene tiempo."},{status:409});
    const expired=s.turn,target=(1-expired) as 0|1;s.turnsTaken[expired]++;s.turn=target;s.turnNo++;s.turnStartedAt=Date.now()+TURN_PAUSE_MS;s.moved[target]=0;let windChanged=false;if((s.turnNo-1)%4===0){s.wind=Math.round(Math.random()*28-14);windChanged=true}s.lastEvent={type:"timeout",player:expired,windChanged,nonce:Date.now()};
  }else if(action==="chat"||action==="emote"){
    const text=clean(p.text,80);if(text)s.chat=[...s.chat.slice(-24),{who:player===0?"Chaski":"El Rosado",text,emote:action==="emote"}];
  }else if(action==="rematch"){
    if(s.winner===null)return Response.json({state:s,revision:row.revision});
    const matchOver=Math.max(...s.matchWins)>=2;
    Object.assign(s,matchOver?fresh():fresh([...s.matchWins] as [number,number],s.roundNo+1));
  }else return Response.json({error:"Unknown action"},{status:400});
  const next=row.revision+1;const out=await db().prepare("UPDATE rooms SET state=?, revision=?, updated_at=? WHERE code=? AND revision=?").bind(JSON.stringify(s),next,Date.now(),code,row.revision).run();
  if(!out.meta.changes)return Response.json({error:"sync"},{status:409});
  return Response.json({state:s,revision:next});
}
