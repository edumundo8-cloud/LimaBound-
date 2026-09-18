import {FIELD_WIDTH as DUEL_WIDTH, MOVE_BUDGET as DUEL_MOVE, groundAt, stepProjectile, tornadoForTurn, type Crater} from "./battle.ts";
import {CHARACTER_ROSTER, isCharacterId, type CharacterId} from "./characters.ts";
import {randomSceneIndex} from "./scenes.ts";

export const TEAM_WIDTH = DUEL_WIDTH * 1.3;
export const TEAM_MOVE = DUEL_MOVE * 1.15;
export const TEAM_STEP = 37.4;
export const TURN_TIME = 10_000;
export const COLORS = ["#53e4ff", "#ff729f", "#ffd05c", "#be94ff"] as const;
export type Player = {id:number; team:0|1; character:CharacterId; bot:boolean; x:number; hp:number; moved:number; turns:number; specialAt:number; itemUsed:boolean; facing:1|-1};
export type Point = {x:number;y:number};
export type Shot = {path:Point[]; impact:Point; delay:number; damage:number[]};
export type TeamSignal = {id:string;from:number;to:number;kind:"ready"|"offer"|"answer"|"candidate"|"leave";payload?:string;at:number};
export type TeamState = {
 version:2; players:Player[]; phase:"lobby"|"playing"|"ended"; scene:number; round:number; wins:[number,number];
 turn:number; turnNo:number; turnStartedAt:number; wind:number; seed:number; craters:Crater[]; winner:0|1|2|null;
 event:{id:number;kind:string;at:number;player?:number;special?:boolean;shots?:Shot[];hpBefore?:number[];cratersBefore?:Crater[];duration?:number};
 chat:{player:number;text:string}[]; voice:TeamSignal[];
};
export type GameAction = {type:string; delta?:number; angle?:number;power?:number;direction?:number;special?:boolean;dual?:boolean;character?:unknown;text?:string};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export const teamGround=(x:number,craters:Crater[]=[],scene=0)=>groundAt(x/1.3,craters.map(c=>({x:c.x/1.3,r:c.r/1.3})),scene);

/** Four separated random positions on playable terrain; teams can start on either bank. */
export function spawnPositions(random:()=>number=Math.random):number[]{
 const slots=[85+random()*135,275+random()*115,TEAM_WIDTH-390+random()*115,TEAM_WIDTH-220+random()*135];
 for(let i=3;i>0;i--){const j=Math.min(i,Math.floor(random()*(i+1)));[slots[i],slots[j]]=[slots[j],slots[i]]}
 return slots;
}

export function newTeamGame(now=Date.now(),random:()=>number=Math.random,previous?:TeamState):TeamState{
 const xs=spawnPositions(random),over=previous&&Math.max(...previous.wins)>=2;
 return {version:2,players:xs.map((x,id)=>({id,team:(id%2) as 0|1,character:previous?.players[id].character??CHARACTER_ROSTER[id].id,bot:previous?.players[id].bot??id!==0,x,hp:160,moved:0,turns:0,specialAt:0,itemUsed:false,facing:x<TEAM_WIDTH/2?1:-1})),
 phase:previous?.phase==="lobby"?"lobby":"playing",scene:randomSceneIndex(previous?.scene,random),round:(previous?.round??0)+1,wins:previous&&!over?[...previous.wins]:[0,0],turn:0,turnNo:1,turnStartedAt:now,wind:Math.round(random()*28-14),seed:Math.floor(random()*2147483647),craters:[],winner:null,event:{id:(previous?.event.id??0)+1,kind:"start",at:now},chat:previous?.chat??[],voice:previous?.voice??[]};
}

export function nextPlayers(s:TeamState,count=3):number[]{
 const result:number[]=[];
 for(let offset=1;offset<=4&&result.length<count;offset++){const id=(s.turn+offset)%4;if(s.players[id].hp>0&&id!==s.turn)result.push(id)}
 return result;
}
function advance(s:TeamState,now:number,pause=1500){
 s.players[s.turn].turns++;
 s.turn=nextPlayers(s,1)[0]??s.turn;s.turnNo++;s.players[s.turn].moved=0;s.turnStartedAt=now+pause;
 if((s.turnNo-1)%4===0)s.wind=Math.round(Math.sin(s.seed+s.turnNo)*14);
}

export function moveTeamPlayer(s:TeamState,id:number,delta:number):number{
 const p=s.players[id],distance=Math.sign(delta)*Math.min(Math.abs(delta),TEAM_STEP,Math.max(0,TEAM_MOVE-p.moved));
 let x=clamp(p.x+distance,42,TEAM_WIDTH-42);
 if(s.scene===0||s.scene===4){const left=330*1.3,right=506*1.3;x=p.x<TEAM_WIDTH/2?Math.min(x,left):Math.max(x,right)}
 for(const other of s.players){if(other.id===id||other.hp<=0)continue;
  if(distance>0&&other.x>p.x&&x>other.x-48)x=Math.max(p.x,other.x-48);
  if(distance<0&&other.x<p.x&&x<other.x+48)x=Math.min(p.x,other.x+48);
 }
 return x;
}

/** Identical trajectory and collision output is used by server, bots and renderer. */
export function simulateTeamShot(s:TeamState,id:number,angle:number,power:number,direction:number,special=false):Shot{
 const p=s.players[id],a=angle*Math.PI/180,path:Point[]=[],t=tornadoForTurn(s.turnNo,s.seed);
 const tornado=t?{...t,x:t.x*1.3,radius:t.radius*1.3}:null;
 let x=p.x,y=teamGround(x,s.craters,s.scene)-47,dx=Math.cos(a)*power*.165*(direction<0?-1:1),dy=-Math.sin(a)*power*.165;
 for(let i=0;i<420;i++){
  ({x,y,dx,dy}=stepProjectile(x,y,dx,dy,s.wind,tornado));path.push({x,y});
  if(x<=4||x>=TEAM_WIDTH-4||y>=teamGround(x,s.craters,s.scene))break;
 }
 const impact={x:clamp(x,4,TEAM_WIDTH-4),y:Math.min(440,teamGround(clamp(x,4,TEAM_WIDTH-4),s.craters,s.scene))};
 // No team or shooter exclusion: every living player inside the blast is hit.
 const damage=s.players.map(target=>target.hp>0&&Math.hypot(impact.x-target.x,impact.y-(teamGround(target.x,s.craters,s.scene)-25))<=(special?55:42)+22?(special?48:25):0);
 return {path,impact,damage,delay:0};
}

export function applyTeamAction(input:TeamState,id:number,action:GameAction,now=Date.now()):TeamState{
 const s=structuredClone(input),p=s.players[id];if(!p)throw new Error("Jugador desconocido.");
 if(action.type==="select"){
  if(s.phase!=="lobby")throw new Error("Elige tu personaje antes de empezar.");
  if(!isCharacterId(action.character))throw new Error("Personaje desconocido.");p.character=action.character;return s;
 }
 if(action.type==="chat"){const text=String(action.text??"").trim().slice(0,80);if(text)s.chat=[...s.chat.slice(-23),{player:id,text}];return s}
 if(action.type==="rematch"){
  if(s.phase!=="ended")throw new Error("La ronda sigue en juego.");
  if(now<s.event.at+(s.event.duration??0))throw new Error("Espera a que termine el disparo.");
  return newTeamGame(now,Math.random,s);
 }
 if(s.phase!=="playing")throw new Error("La partida todavía no está en juego.");
 if(action.type==="timeout"){
  if(now<s.turnStartedAt+TURN_TIME)throw new Error("El turno todavía tiene tiempo.");
  s.event={id:s.event.id+1,kind:"timeout",at:now,player:s.turn};advance(s,now);return s;
 }
 if(id!==s.turn||p.hp<=0)throw new Error("Todavía no es tu turno.");
 if(now<s.turnStartedAt||now>=s.turnStartedAt+TURN_TIME)throw new Error("Espera al siguiente turno.");
 if(action.type==="move"){
  const delta=Number(action.delta);if(!Number.isFinite(delta))throw new Error("Movimiento inválido.");
  const x=moveTeamPlayer(s,id,delta);p.moved+=Math.abs(x-p.x);if(x!==p.x)p.facing=x>p.x?1:-1;p.x=x;
  s.event={id:s.event.id+1,kind:"move",at:now,player:id};return s;
 }
 if(action.type==="heal"){
  if(p.itemUsed||p.hp>=160)throw new Error("Cura no disponible.");p.itemUsed=true;p.hp=Math.min(160,p.hp+40);
  s.event={id:s.event.id+1,kind:"heal",at:now,player:id};advance(s,now);return s;
 }
 if(action.type!=="fire")throw new Error("Acción desconocida.");
 if(!Number.isFinite(action.power)||!Number.isFinite(action.angle)||Number(action.power)<=0)throw new Error("Carga la potencia antes de disparar.");
 const angle=clamp(Number(action.angle),18,78),power=clamp(Number(action.power),1,100),special=!!action.special,dual=!!action.dual&&!special;
 if(special&&p.turns<p.specialAt)throw new Error("SS todavía está recargando.");
 if(dual&&p.itemUsed)throw new Error("Ya usaste tu item de esta ronda.");
 p.facing=action.direction===-1?-1:1;
 const shots=[simulateTeamShot(s,id,angle-(dual?2.5:0),power,p.facing,special)];
 if(dual){const second=simulateTeamShot(s,id,angle+2.5,power,p.facing);second.delay=900;shots.push(second);p.itemUsed=true}
 const duration=Math.ceil(Math.max(...shots.map(shot=>shot.path.length*1000/60+shot.delay))+600);
 s.event={id:s.event.id+1,kind:"fire",at:now,player:id,special,shots,hpBefore:s.players.map(t=>t.hp),cratersBefore:[...s.craters],duration};
 for(const shot of shots){s.players.forEach((target,i)=>{target.hp=Math.max(0,target.hp-shot.damage[i])});s.craters.push({x:shot.impact.x,r:special?19:15})}
 s.craters=s.craters.slice(-24);if(special)p.specialAt=p.turns+4;
 const alive=[0,1].map(team=>s.players.some(target=>target.team===team&&target.hp>0));
 if(!alive[0]||!alive[1]){s.winner=!alive[0]&&!alive[1]?2:alive[0]?0:1;s.phase="ended";if(s.winner!==2)s.wins[s.winner]++;s.turnStartedAt=now+duration}
 else advance(s,now,duration+700);
 return s;
}

/** Aim against enemies; strongly penalize friendly and self damage. */
export function chooseBotAction(s:TeamState):GameAction{
 const p=s.players[s.turn];if(p.hp<=100&&!p.itemUsed)return {type:"heal"};
 let best={score:-Infinity,angle:48,power:60,direction:1};
 const enemies=s.players.filter(t=>t.team!==p.team&&t.hp>0);
 for(const direction of [-1,1])for(let angle=22;angle<=76;angle+=6)for(let power=24;power<=100;power+=4){
  const shot=simulateTeamShot(s,p.id,angle,power,direction);
  const nearest=Math.min(...enemies.map(t=>Math.abs(t.x-shot.impact.x)));
  const score=shot.damage.reduce((sum,damage,i)=>sum+damage*(s.players[i].team===p.team?-3:1),0)*20-nearest;
  if(score>best.score)best={score,angle,power,direction};
 }
 return {type:"fire",angle:best.angle,power:best.power,direction:best.direction,special:p.turns>=p.specialAt};
}

export function tickTeamGame(s:TeamState,now=Date.now()):TeamState{
 if(s.phase!=="playing")return s;
 if(s.players[s.turn].bot&&now>=s.turnStartedAt+1100&&now<s.turnStartedAt+TURN_TIME)return applyTeamAction(s,s.turn,chooseBotAction(s),now);
 if(now>=s.turnStartedAt+TURN_TIME)return applyTeamAction(s,s.turn,{type:"timeout"},now);
 return s;
}
