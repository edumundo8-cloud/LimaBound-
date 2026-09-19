import {FIELD_WIDTH as DUEL_WIDTH, MOVE_BUDGET as DUEL_MOVE, groundAt, stepProjectile, type Crater, type Tornado} from "./battle.ts";
import {CHARACTER_ROSTER, isCharacterId, type CharacterId} from "./characters.ts";
import {randomSceneIndex} from "./scenes.ts";

export const TEAM_WIDTH = DUEL_WIDTH * 1.3;
/** 15% sobre el duelo y un 10% extra: el campo ancho no debe sentirse lento. */
export const TEAM_MOVE = DUEL_MOVE * 1.265;
/** Pasos cortos: se camina en seis tramos por turno en vez de cuatro. */
export const TEAM_STEP = 24;
/** Velocidad de salida del proyectil: un 6% mas que el duelo, para cargar menos. */
export const SHOT_SPEED = .165 * 1.06;
export const TURN_TIME = 10_000;
/** El vortice del 2v2 empuja algo menos que el del duelo, pero se nota. */
export const TORNADO_PULL = .62;
/** El tornado se queda cuatro turnos seguidos: uno para cada jugador. */
export const TORNADO_TURNS = 4;
export const TORNADO_PERIOD = 8;
/** Un tiro casi vertical es mas dificil de calcular y paga mejor. */
export const HIGH_ANGLE = 70, HIGH_ANGLE_BONUS = 1.15;
/** Casi un tercio de los tiros de un bot sale desviado a proposito. */
export const BOT_MISS = .3;
/** El viento aguanta al menos tres turnos antes de cambiar de lado. */
export const WIND_HOLD = 3, WIND_EVERY = 4;
/** Un color por equipo: A azul, B rojo. Los dos companeros comparten el mismo. */
export const TEAM_COLORS = ["#3da5ff", "#ff4d61"] as const;
export const COLORS = [TEAM_COLORS[0], TEAM_COLORS[1], TEAM_COLORS[0], TEAM_COLORS[1]] as const;
export const teamColor = (team:0|1) => TEAM_COLORS[team];
/** El SS abre un crater mucho mas ancho y alcanza a todo el que este dentro. */
export const BLAST = {basic:64, special:96};
export const CRATER = {basic:15*1.1, special:32*1.2};
export const DAMAGE = {basic:25, special:52};
/**
 * El monumento del centro (Plaza San Martin, Faro de Miraflores) es solido: los
 * proyectiles revientan contra el y nadie puede cruzarlo caminando. Las medidas
 * siguen a las del dibujo en `team-game.css`, un poco mas angostas para que el
 * choque nunca ocurra donde no se ve piedra.
 */
export const WALLS: Record<number,{x0:number;x1:number;height:number}> = {
 0: {x0:TEAM_WIDTH/2-52, x1:TEAM_WIDTH/2+52, height:150},
 1: {x0:TEAM_WIDTH/2-75, x1:TEAM_WIDTH/2+75, height:200},
};
export const wallFor = (scene:number) => WALLS[scene] ?? null;
export type Player = {id:number; team:0|1; character:CharacterId; bot:boolean; x:number; hp:number; moved:number; turns:number; specialUsed:boolean; dualUsed:boolean; itemUsed:boolean; facing:1|-1};
export type Point = {x:number;y:number};
export type Shot = {path:Point[]; impact:Point; delay:number; damage:number[]; radius:number; special:boolean; wall:boolean};
export type TeamSignal = {id:string;from:number;to:number;kind:"ready"|"offer"|"answer"|"candidate"|"leave";payload?:string;at:number};
export type TeamState = {
 version:2; players:Player[]; phase:"lobby"|"playing"|"ended"; scene:number; round:number; wins:[number,number];
 turn:number; turnNo:number; turnStartedAt:number; wind:number; windSince:number; seed:number; craters:Crater[]; winner:0|1|2|null;
 event:{id:number;kind:string;at:number;player?:number;special?:boolean;shots?:Shot[];tornado?:Tornado|null;hpBefore?:number[];cratersBefore?:Crater[];duration?:number};
 chat:{player:number;text:string}[]; voice:TeamSignal[];
};
export type GameAction = {type:string; delta?:number; angle?:number;power?:number;direction?:number;special?:boolean;dual?:boolean;character?:unknown;text?:string};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
/**
 * Relieve del 2v2: sobre el perfil del duelo se suman colinas mas marcadas, que
 * es lo que obliga a buscar angulo en un campo tan ancho. El duelo 1v1 sigue
 * con su terreno de siempre.
 */
export const teamRelief=(x:number,scene=0)=>-25*Math.sin(x/118+scene*1.9)-14*Math.sin(x/47+scene*.7)-7*Math.sin(x/23+scene);
export const teamGround=(x:number,craters:Crater[]=[],scene=0)=>{
 const base=groundAt(x/1.3,craters.map(c=>({x:c.x/1.3,r:c.r/1.3})),scene);
 // El hueco de San Miguel no tiene suelo: ahi no hay colina que valga.
 return base>=430?base:clamp(base+teamRelief(x,scene),150,404);
};
/**
 * El duelo 1v1 levanta el tornado dos turnos de cada seis. En el 2v2 son cuatro
 * turnos de cada ocho, asi que la ronda entera lo sufre por igual. La posicion
 * sale del mismo numero de ronda, de modo que todos ven el mismo vortice.
 */
export function teamTornado(turnNo:number,seed:number){
 const cycle=Math.floor((turnNo-1)/TORNADO_PERIOD);
 if(cycle<1||(turnNo-1)%TORNADO_PERIOD>=TORNADO_TURNS)return null;
 let value=(seed^Math.imul(cycle,0x9e3779b9))>>>0;
 value=Math.imul(value^(value>>>16),0x45d9f3b)>>>0;
 value=(value^(value>>>16))>>>0;
 return {x:220+(value/4294967296)*(TEAM_WIDTH-440),radius:64,spin:value%2?1:-1,cycle};
}

/** Four separated random positions on playable terrain; teams can start on either bank. */
export function spawnPositions(random:()=>number=Math.random):number[]{
 const slots=[85+random()*135,275+random()*115,TEAM_WIDTH-390+random()*115,TEAM_WIDTH-220+random()*135];
 for(let i=3;i>0;i--){const j=Math.min(i,Math.floor(random()*(i+1)));[slots[i],slots[j]]=[slots[j],slots[i]]}
 return slots;
}

export function newTeamGame(now=Date.now(),random:()=>number=Math.random,previous?:TeamState):TeamState{
 const xs=spawnPositions(random),over=previous&&Math.max(...previous.wins)>=2,carry=previous&&!over?previous:undefined;
 return {version:2,players:xs.map((x,id)=>({id,team:(id%2) as 0|1,character:previous?.players[id].character??CHARACTER_ROSTER[id].id,bot:previous?.players[id].bot??id!==0,x,hp:160,moved:0,turns:0,
 // SS y Dual Shot duran toda la partida: solo vuelven cuando arranca una serie nueva.
 specialUsed:carry?carry.players[id].specialUsed:false,dualUsed:carry?carry.players[id].dualUsed:false,itemUsed:false,facing:x<TEAM_WIDTH/2?1:-1})),
 phase:previous?.phase==="lobby"?"lobby":"playing",scene:randomSceneIndex(previous?.scene,random),round:(previous?.round??0)+1,wins:carry?[...carry.wins]:[0,0],turn:0,turnNo:1,turnStartedAt:now,wind:Math.round(random()*28-14)||7,windSince:1,seed:Math.floor(random()*2147483647),craters:[],winner:null,event:{id:(previous?.event.id??0)+1,kind:"start",at:now},chat:previous?.chat??[],voice:previous?.voice??[]};
}

export function nextPlayers(s:TeamState,count=3):number[]{
 const result:number[]=[];
 for(let offset=1;offset<=4&&result.length<count;offset++){const id=(s.turn+offset)%4;if(s.players[id].hp>0&&id!==s.turn)result.push(id)}
 return result;
}
function advance(s:TeamState,now:number,pause=1500){
 s.players[s.turn].turns++;
 s.turn=nextPlayers(s,1)[0]??s.turn;s.turnNo++;s.players[s.turn].moved=0;s.turnStartedAt=now+pause;
 // El viento cambia cada cuatro turnos, pero nunca se da la vuelta antes de WIND_HOLD.
 if((s.turnNo-1)%WIND_EVERY===0){
  const next=Math.round(Math.sin(s.seed+s.turnNo)*14)||1;
  const flips=Math.sign(next)!==Math.sign(s.wind);
  if(flips&&s.turnNo-s.windSince<WIND_HOLD)s.wind=Math.abs(next)*Math.sign(s.wind||1);
  else{s.wind=next;if(flips)s.windSince=s.turnNo}
 }
}

export function moveTeamPlayer(s:TeamState,id:number,delta:number):number{
 const p=s.players[id],distance=Math.sign(delta)*Math.min(Math.abs(delta),TEAM_STEP,Math.max(0,TEAM_MOVE-p.moved));
 let x=clamp(p.x+distance,42,TEAM_WIDTH-42);
 if(s.scene===0||s.scene===4){const left=330*1.3,right=506*1.3;x=p.x<TEAM_WIDTH/2?Math.min(x,left):Math.max(x,right)}
 const wall=wallFor(s.scene);
 if(wall)x=p.x<TEAM_WIDTH/2?Math.min(x,wall.x0-24):Math.max(x,wall.x1+24);
 for(const other of s.players){if(other.id===id||other.hp<=0)continue;
  if(distance>0&&other.x>p.x&&x>other.x-48)x=Math.max(p.x,other.x-48);
  if(distance<0&&other.x<p.x&&x<other.x+48)x=Math.min(p.x,other.x+48);
 }
 return x;
}

/** Everyone standing inside the blast is hit: shooter, ally and rivals alike. */
export const angleBonus=(angle:number)=>angle>HIGH_ANGLE?HIGH_ANGLE_BONUS:1;
export function blastDamage(s:TeamState,impact:Point,special:boolean,bonus=1):number[]{
 const radius=special?BLAST.special:BLAST.basic,hit=Math.round((special?DAMAGE.special:DAMAGE.basic)*bonus);
 return s.players.map(target=>target.hp>0&&Math.hypot(impact.x-target.x,impact.y-(teamGround(target.x,s.craters,s.scene)-25))<=radius?hit:0);
}

/** Identical trajectory and collision output is used by server, bots and renderer. */
export function simulateTeamShot(s:TeamState,id:number,angle:number,power:number,direction:number,special=false):Shot{
 const p=s.players[id],a=angle*Math.PI/180,path:Point[]=[],tornado=teamTornado(s.turnNo,s.seed),wall=wallFor(s.scene);
 const wallTop=wall?teamGround(TEAM_WIDTH/2,s.craters,s.scene)-wall.height:0;
 let x=p.x,y=teamGround(x,s.craters,s.scene)-47,dx=Math.cos(a)*power*SHOT_SPEED*(direction<0?-1:1),dy=-Math.sin(a)*power*SHOT_SPEED,hitWall=false;
 for(let i=0;i<420;i++){
  ({x,y,dx,dy}=stepProjectile(x,y,dx,dy,s.wind,tornado,TORNADO_PULL));path.push({x,y});
  if(wall&&x>=wall.x0&&x<=wall.x1&&y>=wallTop){hitWall=true;break}
  if(x<=4||x>=TEAM_WIDTH-4||y>=teamGround(x,s.craters,s.scene))break;
 }
 const landed=clamp(x,4,TEAM_WIDTH-4);
 // Contra la muralla la explosion queda donde pego; en el suelo, sobre el terreno.
 const impact=hitWall?{x:landed,y}:{x:landed,y:Math.min(440,teamGround(landed,s.craters,s.scene))};
 return {path,impact,damage:blastDamage(s,impact,special,angleBonus(angle)),delay:0,radius:special?BLAST.special:BLAST.basic,special,wall:hitWall};
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
  const delta=Number(action.delta);if(!Number.isFinite(delta)||delta===0)throw new Error("Movimiento inválido.");
  // El personaje encara hacia donde lo empujas aunque un aliado o el borde lo frenen.
  p.facing=delta<0?-1:1;
  const x=moveTeamPlayer(s,id,delta);p.moved+=Math.abs(x-p.x);p.x=x;
  s.event={id:s.event.id+1,kind:"move",at:now,player:id};return s;
 }
 if(action.type==="heal"){
  if(p.itemUsed||p.hp>=160)throw new Error("Cura no disponible.");p.itemUsed=true;p.hp=Math.min(160,p.hp+40);
  s.event={id:s.event.id+1,kind:"heal",at:now,player:id};advance(s,now);return s;
 }
 if(action.type!=="fire")throw new Error("Acción desconocida.");
 if(!Number.isFinite(action.power)||!Number.isFinite(action.angle)||Number(action.power)<=0)throw new Error("Carga la potencia antes de disparar.");
 const angle=clamp(Number(action.angle),18,78),power=clamp(Number(action.power),1,100),special=!!action.special,dual=!!action.dual&&!special;
 if(special&&p.specialUsed)throw new Error("El SS ya se usó en esta partida.");
 if(dual&&p.dualUsed)throw new Error("El Dual Shot ya se usó en esta partida.");
 p.facing=action.direction===-1?-1:1;
 const shots=[simulateTeamShot(s,id,angle-(dual?2.5:0),power,p.facing,special)];
 if(dual){const second=simulateTeamShot(s,id,angle+2.5,power,p.facing);second.delay=900;shots.push(second);p.dualUsed=true}
 if(special)p.specialUsed=true;
 const duration=Math.ceil(Math.max(...shots.map(shot=>shot.path.length*1000/60+shot.delay))+600);
 s.event={id:s.event.id+1,kind:"fire",at:now,player:id,special,shots,tornado:teamTornado(s.turnNo,s.seed),hpBefore:s.players.map(t=>t.hp),cratersBefore:[...s.craters],duration};
 for(const shot of shots){s.players.forEach((target,i)=>{target.hp=Math.max(0,target.hp-shot.damage[i])});if(!shot.wall)s.craters.push({x:shot.impact.x,r:shot.special?CRATER.special:CRATER.basic})}
 s.craters=s.craters.slice(-24);
 const alive=[0,1].map(team=>s.players.some(target=>target.team===team&&target.hp>0));
 if(!alive[0]||!alive[1]){s.winner=!alive[0]&&!alive[1]?2:alive[0]?0:1;s.phase="ended";if(s.winner!==2)s.wins[s.winner]++;s.turnStartedAt=now+duration}
 else advance(s,now,duration+700);
 return s;
}

/**
 * Azar reproducible para los bots: depende de la ronda y del turno, de modo que
 * la sala y cualquier copia del estado deciden exactamente el mismo fallo.
 */
export function botChance(s:TeamState):number{
 let value=(s.seed^Math.imul(s.turnNo+1,0x9e3779b9))>>>0;
 value=Math.imul(value^(value>>>15),0x85ebca6b)>>>0;
 return ((value^(value>>>13))>>>0)/4294967296;
}

/** Bots never fire on their own team: an aim that touches an ally is only a last resort. */
export function chooseBotAction(s:TeamState,miss=BOT_MISS):GameAction{
 const p=s.players[s.turn];if(p.hp<=100&&!p.itemUsed)return {type:"heal"};
 const enemies=s.players.filter(t=>t.team!==p.team&&t.hp>0);
 if(!enemies.length)return {type:"timeout"};
 type Aim={score:number;angle:number;power:number;direction:number;special:boolean};
 let clean:Aim|null=null,dirty:Aim|null=null;
 // La reja de busqueda es gruesa a proposito: un bot que prueba cada grado
 // acierta demasiado y no hay forma humana de ganarle.
 for(const direction of [-1,1])for(let angle=22;angle<=76;angle+=7)for(let power=24;power<=100;power+=6){
  const shot=simulateTeamShot(s,p.id,angle,power,direction);
  const nearest=Math.min(...enemies.map(t=>Math.abs(t.x-shot.impact.x)));
  // La trayectoria no cambia con el SS: solo el radio, asi que se reutiliza el mismo vuelo.
  for(const special of p.specialUsed?[false]:[false,true]){
   const damage=special?blastDamage(s,shot.impact,true,angleBonus(angle)):shot.damage;
   const friendly=damage.reduce((sum,hit,i)=>sum+(s.players[i].team===p.team?hit:0),0);
   const enemy=damage.reduce((sum,hit,i)=>sum+(s.players[i].team!==p.team?hit:0),0);
   if(friendly===0){const score=enemy*20-nearest-(special?110:0);if(!clean||score>clean.score)clean={score,angle,power,direction,special}}
   else{const score=-friendly*45-nearest;if(!dirty||score>dirty.score)dirty={score,angle,power,direction,special:false}}
  }
 }
 const pick=clean??dirty??{angle:48,power:60,direction:1,special:false};
 const shoot=(aim:{angle:number;power:number;direction:number;special:boolean})=>({type:"fire",angle:aim.angle,power:aim.power,direction:aim.direction,special:aim.special});
 const roll=botChance(s);
 if(!clean||roll>=miss)return shoot(pick);
 // Falla a proposito: abre el angulo hacia un lado que siga sin tocar al aliado
 // y se guarda el SS, que seria un desperdicio tirarlo a la basura.
 for(const swing of roll<miss/2?[1,-1]:[-1,1]){
  const angle=clamp(pick.angle+swing*(9+Math.floor(roll*40)%8),18,78);
  const shot=simulateTeamShot(s,p.id,angle,pick.power,pick.direction);
  if(shot.damage.every((hit,i)=>s.players[i].team!==p.team||hit===0))return shoot({angle,power:pick.power,direction:pick.direction,special:false});
 }
 return shoot(pick);
}

export function tickTeamGame(s:TeamState,now=Date.now()):TeamState{
 if(s.phase!=="playing")return s;
 // Si el bot se queda sin jugada valida, el turno sigue su curso en vez de tumbar la sala.
 if(s.players[s.turn].bot&&now>=s.turnStartedAt+1100&&now<s.turnStartedAt+TURN_TIME){try{return applyTeamAction(s,s.turn,chooseBotAction(s),now)}catch{return s}}
 if(now>=s.turnStartedAt+TURN_TIME)return applyTeamAction(s,s.turn,{type:"timeout"},now);
 return s;
}
