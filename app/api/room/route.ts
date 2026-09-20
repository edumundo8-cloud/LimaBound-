import { env } from "cloudflare:workers";

import {randomSceneIndex,sceneIndexFor} from "@/lib/scenes";
import {DEFAULT_CHARACTERS,characterById,isCharacterId,type CharacterId} from "@/lib/characters";

import {FIELD_WIDTH,blastRadius,craterRadius,groundAt,impactDamage,movePosition,shotDamage,stepProjectile,targetRadiusFor,tornadoForTurn,type Tornado} from "@/lib/battle";
type ChatLine={who:string;text:string;emote?:boolean};
type VoiceSignal={id:string;from:0|1;kind:"ready"|"offer"|"answer"|"candidate"|"leave";payload?:string};
type Crater={x:number;r:number};
type GameState={positions:[number,number];hp:[number,number];turn:0|1;turnNo:number;roundNo:number;weatherSeed:number;scene:number;nextScene:number|null;matchWins:[number,number];characters:[CharacterId,CharacterId];turnStartedAt:number;moved:[number,number];turnsTaken:[number,number];specialReadyAt:[number,number];itemUsed:[boolean,boolean];wind:number;winner:number|null;craters:Crater[];lastEvent:{type:string;player?:number;from?:number;to?:number;impactX?:number;secondImpactX?:number;angle?:number;power?:number;wind?:number;windChanged?:boolean;special?:boolean;dual?:boolean;hit?:boolean;damage?:number;terrain?:number;tornado?:Tornado|null;nonce:number};chat:ChatLine[];voiceSignals:VoiceSignal[]};
const TURN_MS=10_000,TURN_PAUSE_MS=1_500,PROJECTILE_LOCK_MS=TURN_PAUSE_MS,DUAL_LOCK_MS=2_900;
const clean=(v:unknown,n=80)=>String(v??"").trim().slice(0,n);
const rivalQuips=["En el Callao primero se apunta. Luego se discute.","No es presión; es ambiente de partido.","La puntería también juega de visitante.","Lima por fuera. Problemas por dentro."];
const fresh=(matchWins:[number,number]=[0,0],roundNo=1,characters:[CharacterId,CharacterId]=[...DEFAULT_CHARACTERS],scene=randomSceneIndex()):GameState=>({positions:[134.2,701.8],hp:[160,160],turn:0,turnNo:1,roundNo,weatherSeed:Math.floor(Math.random()*2147483647),scene,nextScene:null,matchWins,characters:[...characters],turnStartedAt:Date.now(),moved:[0,0],turnsTaken:[0,0],specialReadyAt:[0,0],itemUsed:[false,false],wind:Math.round(Math.random()*28-14),winner:null,craters:[],lastEvent:{type:"start",nonce:Date.now()},chat:[{who:characterById(characters[1]).name,text:rivalQuips[Math.floor(Math.random()*rivalQuips.length)]}],voiceSignals:[]});
const db=()=>{if(!env.DB)throw new Error("DB unavailable");return env.DB};

export async function GET(req:Request){
  const code=clean(new URL(req.url).searchParams.get("code"),8).toUpperCase();
  const row=await db().prepare("SELECT code, guest_token, state, revision FROM rooms WHERE code = ?").bind(code).first<{code:string;guest_token:string|null;state:string;revision:number}>();
  if(!row)return Response.json({error:"La sala no existe."},{status:404});
  const state=JSON.parse(row.state) as GameState;state.roundNo=state.roundNo??1;state.scene=Number.isInteger(state.scene)?state.scene:sceneIndexFor(state.roundNo);state.nextScene=Number.isInteger(state.nextScene)?state.nextScene:null;
  return Response.json({code:row.code,waiting:!row.guest_token,state,revision:row.revision});
}

export async function POST(req:Request){
  const p=await req.json() as Record<string,unknown>;const action=clean(p.action,12);const code=clean(p.code,8).toUpperCase();const token=clean(p.token,80);
  if(action==="create"){
    if(!code||!token)return Response.json({error:"Missing room data"},{status:400});
    const state=fresh();if(isCharacterId(p.character))state.characters[0]=p.character;
    try{await db().prepare("INSERT INTO rooms (code, host_token, state, revision, updated_at) VALUES (?, ?, ?, 0, ?)").bind(code,token,JSON.stringify(state),Date.now()).run();}
    catch{return Response.json({error:"Code collision"},{status:409})}
    return Response.json({code,role:0,state,revision:0});
  }
  const row=await db().prepare("SELECT host_token, guest_token, state, revision FROM rooms WHERE code = ?").bind(code).first<{host_token:string;guest_token:string|null;state:string;revision:number}>();
  if(!row)return Response.json({error:"Room no existe, causa."},{status:404});
  if(action==="join"){
    if(row.host_token===token)return Response.json({role:0,state:JSON.parse(row.state),revision:row.revision});
    if(row.guest_token&&row.guest_token!==token)return Response.json({error:"La sala está completa: dos jugadores, una mala decisión."},{status:409});
    const joined=JSON.parse(row.state) as GameState;joined.characters=joined.characters??[...DEFAULT_CHARACTERS];joined.roundNo=joined.roundNo??1;joined.scene=Number.isInteger(joined.scene)?joined.scene:sceneIndexFor(joined.roundNo);joined.nextScene=Number.isInteger(joined.nextScene)?joined.nextScene:null;if(isCharacterId(p.character))joined.characters[1]=p.character;
    if(!row.guest_token){joined.turnStartedAt=Date.now();await db().prepare("UPDATE rooms SET guest_token=?, state=?, updated_at=? WHERE code=? AND guest_token IS NULL").bind(token,JSON.stringify(joined),Date.now(),code).run()}
    return Response.json({role:1,state:joined,revision:row.revision});
  }
  const player=row.host_token===token?0:row.guest_token===token?1:-1;
  if(player<0)return Response.json({error:"No perteneces a esta partida."},{status:403});
  const s=JSON.parse(row.state) as GameState;
  s.turnStartedAt=s.turnStartedAt??Date.now();
  s.turnsTaken=s.turnsTaken??[0,0];s.specialReadyAt=s.specialReadyAt??[0,0];s.itemUsed=s.itemUsed??[false,false];s.matchWins=s.matchWins??[0,0];s.characters=s.characters??[...DEFAULT_CHARACTERS];s.voiceSignals=s.voiceSignals??[];s.roundNo=s.roundNo??1;s.scene=Number.isInteger(s.scene)?s.scene:sceneIndexFor(s.roundNo);s.nextScene=Number.isInteger(s.nextScene)?s.nextScene:null;
  if(action==="select"){
    if(!isCharacterId(p.character))return Response.json({error:"Personaje desconocido."},{status:400});s.characters[player]=p.character;if(s.turnNo===1&&s.lastEvent.type==="start")s.turnStartedAt=Date.now();
  }else if(action==="move"){
    if(s.turn!==player||s.winner!==null)return Response.json({error:"Todavía no es tu turno."},{status:409});
    if(Date.now()<s.turnStartedAt)return Response.json({error:"El siguiente turno aún no empieza."},{status:409});
    if(Date.now()>=s.turnStartedAt+TURN_MS)return Response.json({error:"Tu tiempo terminó."},{status:409});
    const before=s.positions[player];s.positions[player]=movePosition(player,before,Number(p.delta)||0,s.moved[player]);s.moved[player]+=Math.abs(s.positions[player]-before);s.lastEvent={type:"move",player,from:before,to:s.positions[player],nonce:Date.now()};
  }else if(action==="fire"){
    if(s.turn!==player||s.winner!==null)return Response.json({error:"Todavía no es tu turno."},{status:409});
    if(Date.now()<s.turnStartedAt)return Response.json({error:"El siguiente turno aún no empieza."},{status:409});
    if(Date.now()>=s.turnStartedAt+TURN_MS)return Response.json({error:"Tu tiempo terminó."},{status:409});
    const special=Boolean(p.special),dual=Boolean(p.dual)&&!special,rawPower=Number(p.power);if(p.charged!==true||!Number.isFinite(rawPower)||rawPower<=0)return Response.json({error:"Mantén presionada la barra de potencia antes de disparar."},{status:409});if(special&&s.turnsTaken[player]<s.specialReadyAt[player])return Response.json({error:"SS todavía está recargando."},{status:409});if(dual&&s.itemUsed[player])return Response.json({error:"Ya usaste tu item en esta partida."},{status:409});
    s.craters=s.craters??[];const angle=Math.max(18,Math.min(78,Number(p.angle)||45)),power=Math.max(1,Math.min(100,rawPower)),shotWind=s.wind,shotTornado=tornadoForTurn(s.turnNo,s.weatherSeed??0),target=(1-player) as 0|1,terrain=s.scene;
    const simulate=(shotAngle:number)=>{let x=s.positions[player],y=groundAt(x,s.craters,terrain)-47,dx=Math.cos(shotAngle*Math.PI/180)*power*.145*(player===0?1:-1),dy=-Math.sin(shotAngle*Math.PI/180)*power*.145;for(let i=0;i<420&&y<groundAt(x,s.craters,terrain)&&x>0&&x<FIELD_WIDTH;i++){({x,y,dx,dy}=stepProjectile(x,y,dx,dy,shotWind,shotTornado))}const impactX=Math.max(8,Math.min(FIELD_WIDTH-8,x)),impactY=groundAt(impactX,s.craters,terrain),targetY=groundAt(s.positions[target],s.craters,terrain)-27,targetRadius=targetRadiusFor(target),damage=impactDamage(shotDamage(player,special),Math.hypot(impactX-s.positions[target],impactY-targetY),blastRadius(player,special)+targetRadius);return{impactX,damage}};
    const first=simulate(dual?angle-2.5:angle),second=dual?simulate(angle+2.5):null,damage=first.damage+(second?.damage??0),hit=damage>0;s.hp[target]=Math.max(0,s.hp[target]-damage);if(special)s.specialReadyAt[player]=s.turnsTaken[player]+4;if(dual)s.itemUsed[player]=true;s.turnsTaken[player]++;
    let windChanged=false;if(s.hp[target]===0){s.winner=player;s.matchWins[player]++;s.nextScene=randomSceneIndex(s.scene)}else{s.turn=target;s.turnNo++;s.turnStartedAt=Date.now()+(dual?DUAL_LOCK_MS:PROJECTILE_LOCK_MS);s.moved[target]=0;if((s.turnNo-1)%4===0){s.wind=Math.round(Math.random()*28-14);windChanged=true}}
    const newCraters=[{x:first.impactX,r:craterRadius(player,special)},...(second?[{x:second.impactX,r:craterRadius(player,false)}]:[])];s.craters=[...s.craters.slice(-(14-newCraters.length)),...newCraters];s.lastEvent={type:"fire",player,impactX:first.impactX,secondImpactX:second?.impactX,angle,power,wind:shotWind,windChanged,special,dual,hit,damage,terrain,tornado:shotTornado,nonce:Date.now()};
  }else if(action==="item"){
    if(s.turn!==player||s.winner!==null)return Response.json({error:"Todavía no es tu turno."},{status:409});if(Date.now()<s.turnStartedAt||Date.now()>=s.turnStartedAt+TURN_MS)return Response.json({error:"El item no puede usarse fuera de tu tiempo."},{status:409});if(clean(p.item,12)!=="heal")return Response.json({error:"Item desconocido."},{status:400});if(s.itemUsed[player])return Response.json({error:"Ya usaste tu item en esta partida."},{status:409});
    s.itemUsed[player]=true;s.hp[player]=Math.min(160,s.hp[player]+40);s.turnsTaken[player]++;const target=(1-player) as 0|1;s.turn=target;s.turnNo++;s.turnStartedAt=Date.now()+TURN_PAUSE_MS;s.moved[target]=0;let windChanged=false;if((s.turnNo-1)%4===0){s.wind=Math.round(Math.random()*28-14);windChanged=true}s.lastEvent={type:"heal",player,windChanged,nonce:Date.now()};
  }else if(action==="timeout"){
    if(s.winner!==null)return Response.json({state:s,revision:row.revision});
    if(Date.now()<s.turnStartedAt+TURN_MS)return Response.json({error:"El turno todavía tiene tiempo."},{status:409});
    const expired=s.turn,target=(1-expired) as 0|1;s.turnsTaken[expired]++;s.turn=target;s.turnNo++;s.turnStartedAt=Date.now()+TURN_PAUSE_MS;s.moved[target]=0;let windChanged=false;if((s.turnNo-1)%4===0){s.wind=Math.round(Math.random()*28-14);windChanged=true}s.lastEvent={type:"timeout",player:expired,windChanged,nonce:Date.now()};
  }else if(action==="chat"||action==="emote"){
    const text=clean(p.text,80);if(text)s.chat=[...s.chat.slice(-24),{who:characterById(s.characters[player]).name,text,emote:action==="emote"}];
  }else if(action==="voice"){
    const kind=clean(p.kind,12) as VoiceSignal["kind"],allowed=["ready","offer","answer","candidate","leave"];if(!allowed.includes(kind))return Response.json({error:"Señal de voz desconocida."},{status:400});const payload=String(p.payload??"").slice(0,18_000);s.voiceSignals=[...s.voiceSignals.slice(-39),{id:crypto.randomUUID(),from:player,kind,...(payload?{payload}:{})}];
  }else if(action==="rematch"){
    if(s.winner===null)return Response.json({state:s,revision:row.revision});
    const matchOver=Math.max(...s.matchWins)>=2;
    const nextRound=s.roundNo+1,nextScene=s.nextScene??randomSceneIndex(s.scene);
    Object.assign(s,matchOver?fresh([0,0],nextRound,s.characters,nextScene):fresh([...s.matchWins] as [number,number],nextRound,s.characters,nextScene));
  }else return Response.json({error:"Unknown action"},{status:400});
  const next=row.revision+1;const out=await db().prepare("UPDATE rooms SET state=?, revision=?, updated_at=? WHERE code=? AND revision=?").bind(JSON.stringify(s),next,Date.now(),code,row.revision).run();
  if(!out.meta.changes)return Response.json({error:"sync"},{status:409});
  return Response.json({state:s,revision:next});
}
