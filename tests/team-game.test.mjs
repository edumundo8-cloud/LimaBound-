import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {TEAM_WIDTH,TEAM_MOVE,TEAM_STEP,COLORS,TEAM_COLORS,BLAST,CRATER,DAMAGE,HIGH_ANGLE,HIGH_ANGLE_BONUS,TORNADO_TURNS,TORNADO_PERIOD,WIND_HOLD,wallFor,teamTornado,teamGround,angleBonus,newTeamGame,spawnPositions,nextPlayers,moveTeamPlayer,simulateTeamShot,applyTeamAction,tickTeamGame,chooseBotAction} from "../lib/team-game.ts";
import {stepProjectile} from "../lib/battle.ts";
import {handleTeamRoom} from "../lib/team-room.ts";
const fixed=()=>.43;

test("2v2: campo +30%, movimiento +26.5%, un color por equipo y posiciones seguras",()=>{
 assert.equal(TEAM_WIDTH,836*1.3);assert.equal(TEAM_MOVE,114.4*1.265);
 assert.deepEqual([...COLORS],[TEAM_COLORS[0],TEAM_COLORS[1],TEAM_COLORS[0],TEAM_COLORS[1]]);assert.notEqual(TEAM_COLORS[0],TEAM_COLORS[1]);
 for(let n=0;n<100;n++){
  const xs=spawnPositions();assert.equal(new Set(xs).size,4);
  for(const x of xs){assert.ok(x>=42&&x<=TEAM_WIDTH-42);assert.ok(x<=429||x>=657)}
  for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)assert.ok(Math.abs(xs[a]-xs[b])>=48);
 }
 assert.notDeepEqual(spawnPositions(()=>.1),spawnPositions(()=>.9));
});
test("los turnos recorren los cuatro puestos y omiten eliminados",()=>{
 let s=newTeamGame(1000,fixed);assert.deepEqual(s.players.map(p=>p.team),[0,1,0,1]);
 assert.deepEqual(nextPlayers(s),[1,2,3]);
 for(const expected of [1,2,3,0]){s=applyTeamAction(s,s.turn,{type:"timeout"},s.turnStartedAt+10001);assert.equal(s.turn,expected)}
 s.players[1].hp=0;assert.deepEqual(nextPlayers(s),[2,3]);
});
test("el movimiento consume presupuesto y respeta huecos y otros jugadores",()=>{
 const s=newTeamGame(1000,fixed);s.scene=4;s.players[0].x=420;s.players[2].x=250;s.players[1].x=750;s.players[3].x=950;
 assert.equal(moveTeamPlayer(s,0,37.4),429);s.players[0].x=100;s.players[2].x=160;
 assert.equal(moveTeamPlayer(s,0,37.4),112);s.players[0].moved=TEAM_MOVE-3;
 assert.equal(moveTeamPlayer(s,0,37.4),103);
});
test("explosiones dañan al atacante, aliados y rivales dentro del mismo radio",()=>{
 const s=newTeamGame(1000,fixed);s.scene=1;s.wind=0;s.players.forEach(p=>{p.x=300;p.bot=false});
 const alto=Math.round(DAMAGE.basic*HIGH_ANGLE_BONUS);
 const shot=simulateTeamShot(s,0,78,1,1);assert.deepEqual(shot.damage,[alto,alto,alto,alto]);
 const next=applyTeamAction(s,0,{type:"fire",angle:78,power:1,direction:1},1001);
 assert.deepEqual(next.players.map(p=>p.hp),[160-alto,160-alto,160-alto,160-alto]);assert.equal(s.players[0].hp,160);
 assert.equal(next.event.shots.length,1);assert.ok(next.turnStartedAt>=1001+next.event.duration);
});
test("el fuego amigo puede terminar en empate y no entrega una victoria falsa",()=>{
 const s=newTeamGame(1000,fixed);s.scene=1;s.wind=0;s.players.forEach(p=>{p.x=300;p.hp=25});
 const next=applyTeamAction(s,0,{type:"fire",angle:78,power:1,direction:1},1001);
 assert.equal(next.phase,"ended");assert.equal(next.winner,2);assert.deepEqual(next.wins,[0,0]);
});
test("nueva ronda cambia mapa y posiciones sin requerir caminar; conserva equipos y serie",()=>{
 const s=newTeamGame(1000,fixed);s.phase="ended";s.winner=0;s.wins=[1,0];s.event.duration=0;
 const next=applyTeamAction(s,0,{type:"rematch"},5000);
 assert.notEqual(next.scene,s.scene);assert.notDeepEqual(next.players.map(p=>p.x),s.players.map(p=>p.x));
 assert.equal(next.round,2);assert.deepEqual(next.wins,[1,0]);assert.equal(next.event.kind,"start");
 s.wins=[2,1];const match=applyTeamAction(s,0,{type:"rematch"},5000);assert.deepEqual(match.wins,[0,0]);assert.notEqual(match.scene,s.scene);
});
test("bots actúan sin interacción del humano y no actúan en la sala de espera",()=>{
 const s=newTeamGame(1000,fixed);s.turn=1;s.players[1].hp=80;
 assert.equal(chooseBotAction(s).type,"heal");assert.equal(tickTeamGame(s,2200).players[1].hp,120);
 s.phase="lobby";assert.equal(tickTeamGame(s,99999),s);
});
test("una serie completa con cuatro bots termina y reinicia en otro mapa",()=>{
 let s=newTeamGame(1000,fixed);s.players.forEach(p=>{p.bot=true});let turns=0;
 while(s.phase!=="ended"&&turns<250){s=tickTeamGame(s,s.turnStartedAt+1200);turns++}
 assert.equal(s.phase,"ended",`Partida sin resolver después de ${turns} turnos`);
 const next=applyTeamAction(s,0,{type:"rematch"},s.event.at+s.event.duration+1);assert.notEqual(next.scene,s.scene);
});

test("el personaje encara hacia donde lo empujas aunque algo lo frene",()=>{
 const s=newTeamGame(1000,fixed);s.scene=1;s.players[0].x=300;s.players[0].facing=1;s.players[2].x=300+40;
 const blocked=applyTeamAction(s,0,{type:"move",delta:TEAM_STEP},1001);
 assert.equal(blocked.players[0].facing,1);assert.equal(blocked.players[0].x,300,"un aliado pegado no deja avanzar");
 const back=applyTeamAction(blocked,0,{type:"move",delta:-TEAM_STEP},1002);
 assert.equal(back.players[0].facing,-1);assert.ok(back.players[0].x<300);
 const again=applyTeamAction(back,0,{type:"move",delta:TEAM_STEP},1003);assert.equal(again.players[0].facing,1);
});
test("SS y Dual Shot solo una vez por partida; el crater y el radio del SS son mayores",()=>{
 assert.ok(BLAST.special>BLAST.basic);assert.ok(CRATER.special>CRATER.basic);
 let s=newTeamGame(1000,fixed);s.scene=1;s.wind=0;s.players.forEach(p=>{p.x=200+p.id*260;p.bot=false});
 s=applyTeamAction(s,0,{type:"fire",angle:48,power:70,direction:1,special:true},1001);
 assert.equal(s.players[0].specialUsed,true);assert.equal(s.event.special,true);
 assert.ok(s.craters.at(-1).r===CRATER.special);
 s.turn=0;s.turnStartedAt=2000;s.phase="playing";
 assert.throws(()=>applyTeamAction(s,0,{type:"fire",angle:48,power:70,direction:1,special:true},2001),/SS/);
 s=applyTeamAction(s,0,{type:"fire",angle:48,power:70,direction:1,dual:true},2001);
 assert.equal(s.players[0].dualUsed,true);assert.equal(s.event.shots.length,2);
 s.turn=0;s.turnStartedAt=3000;s.phase="playing";
 assert.throws(()=>applyTeamAction(s,0,{type:"fire",angle:48,power:70,direction:1,dual:true},3001),/Dual/);
 // Una ronda nueva de la misma serie los mantiene gastados; una serie nueva los devuelve.
 s.phase="ended";s.winner=0;s.wins=[1,0];s.event.duration=0;
 const round=applyTeamAction(s,0,{type:"rematch"},5000);
 assert.equal(round.players[0].specialUsed,true);assert.equal(round.players[0].dualUsed,true);
 s.wins=[2,0];const match=applyTeamAction(s,0,{type:"rematch"},5000);
 assert.equal(match.players[0].specialUsed,false);assert.equal(match.players[0].dualUsed,false);
});
test("el SS alcanza a quien el disparo normal no toca",()=>{
 const s=newTeamGame(1000,fixed);s.scene=1;s.wind=0;s.players.forEach(p=>{p.x=300});s.players[1].x=300+(BLAST.basic+BLAST.special)/2;
 assert.equal(simulateTeamShot(s,0,78,1,1).damage[1],0);
 assert.ok(simulateTeamShot(s,0,78,1,1,true).damage[1]>0);
});
test("los bots nunca disparan contra su propio equipo",()=>{
 for(let seed=0;seed<25;seed++){
  const s=newTeamGame(1000,()=>(seed*37%100)/100);s.wind=seed%9-4;s.players.forEach(p=>{p.bot=true});
  for(let turn=0;turn<8;turn++){
   const bot=s.players[s.turn],action=chooseBotAction(s);
   if(action.type!=="fire")break;
   const shot=simulateTeamShot(s,s.turn,action.angle,action.power,action.direction,action.special);
   const friendly=shot.damage.reduce((sum,hit,i)=>sum+(s.players[i].team===bot.team?hit:0),0);
   const anywhere=[-1,1].some(direction=>[22,28,34,40,46,52,58,64,70,76].some(angle=>[24,40,60,80,100].some(power=>
    simulateTeamShot(s,s.turn,angle,power,direction).damage.every((hit,i)=>s.players[i].team!==bot.team||hit===0))));
   if(anywhere)assert.equal(friendly,0,`el bot J${s.turn+1} se disparo a su equipo teniendo una linea limpia`);
   s.turn=(s.turn+1)%4;
  }
 }
});
test("el tornado del 2v2 desvia menos que el del duelo",()=>{
 const vortex={x:418,radius:48,spin:1,cycle:1};
 const fly=pull=>{let p={x:320,y:120,dx:8,dy:-1};for(let i=0;i<50;i++)p=stepProjectile(p.x,p.y,p.dx,p.dy,0,vortex,pull);return p};
 const straight=fly(0),duel=fly(1),team=fly(.45);
 assert.ok(Math.abs(team.x-straight.x)<Math.abs(duel.x-straight.x)/2,"el 2v2 debe desviar menos de la mitad");
 assert.ok(Math.abs(team.x-straight.x)>1,"pero el tornado tiene que seguir notandose");
});

test("los tiros por encima de 70 grados pegan un 15% mas",()=>{
 assert.equal(angleBonus(HIGH_ANGLE),1);assert.equal(angleBonus(HIGH_ANGLE+1),HIGH_ANGLE_BONUS);
 const s=newTeamGame(1000,fixed);s.scene=1;s.wind=0;s.players.forEach(p=>{p.x=300});
 const plano=simulateTeamShot(s,0,HIGH_ANGLE,1,1).damage[1];
 const alto=simulateTeamShot(s,0,HIGH_ANGLE+2,1,1).damage[1];
 assert.equal(plano,DAMAGE.basic);
 assert.equal(alto,Math.round(DAMAGE.basic*HIGH_ANGLE_BONUS));
 assert.ok(alto>plano,"el angulo alto tiene que pagar mejor");
 // El SS tambien cobra el bonus y ya pega un 20% mas que antes.
 assert.equal(DAMAGE.special,58);
 assert.equal(simulateTeamShot(s,0,HIGH_ANGLE+2,1,1,true).damage[1],Math.round(DAMAGE.special*HIGH_ANGLE_BONUS));
});
test("el tornado dura cuatro turnos seguidos, uno por jugador",()=>{
 const seed=987654;
 const vivos=[];
 for(let turno=1;turno<=TORNADO_PERIOD*3;turno++)if(teamTornado(turno,seed))vivos.push(turno);
 assert.ok(vivos.length>=TORNADO_TURNS,"tiene que aparecer al menos una vez");
 // Cada aparicion es un bloque de cuatro turnos consecutivos.
 const bloques=[];
 for(const turno of vivos){
  const ultimo=bloques.at(-1);
  if(ultimo&&turno===ultimo.at(-1)+1)ultimo.push(turno);else bloques.push([turno]);
 }
 for(const bloque of bloques)assert.equal(bloque.length,TORNADO_TURNS,`bloque corto: ${bloque}`);
 // Dentro del bloque es el mismo vortice para todos.
 for(const bloque of bloques)for(const turno of bloque)assert.deepEqual(teamTornado(turno,seed),teamTornado(bloque[0],seed));
 assert.notDeepEqual(teamTornado(bloques[0][0],seed),teamTornado(bloques[1]?.[0]??bloques[0][0],seed+1));
});
test("el monumento central es una muralla: frena disparos y pasos",()=>{
 for(const scene of [0,1]){
  const wall=wallFor(scene);assert.ok(wall,`falta la muralla del escenario ${scene}`);
  const s=newTeamGame(1000,fixed);s.scene=scene;s.wind=0;
  s.players[0].x=wall.x0-120;s.players[1].x=wall.x1+120;s.players[2].x=90;s.players[3].x=TEAM_WIDTH-90;
  // Un tiro tenso contra el monumento revienta antes de cruzarlo.
  const shot=simulateTeamShot(s,0,26,100,1);
  assert.equal(shot.wall,true,"el proyectil tenia que chocar");
  assert.ok(shot.impact.x<=wall.x1+1,"no puede aparecer del otro lado");
  assert.ok(shot.impact.y<teamGround(shot.impact.x,s.craters,scene),"la explosion queda en la pared, no en el suelo");
  assert.ok(shot.path.every(point=>point.x<=wall.x1+1));
  // Y el impacto en la muralla no abre hueco en el terreno.
  const after=applyTeamAction(s,0,{type:"fire",angle:26,power:100,direction:1},1001);
  assert.deepEqual(after.craters,[]);
  // Caminar tampoco lo atraviesa.
  s.players[0].x=wall.x0-10;
  assert.ok(moveTeamPlayer(s,0,TEAM_STEP)<=wall.x0-24+.001);
  s.players[1].x=wall.x1+10;
  assert.ok(moveTeamPlayer(s,1,-TEAM_STEP)>=wall.x1+24-.001);
 }
 assert.equal(wallFor(2),null,"Gamarra no dibuja monumento, no lleva muralla");
});
test("el viento aguanta al menos tres turnos antes de cambiar de lado",()=>{
 for(let seed=0;seed<40;seed++){
  let s=newTeamGame(1000,()=>(seed*17%97)/97);s.players.forEach(p=>{p.bot=false});
  let signo=Math.sign(s.wind),desde=1;
  assert.notEqual(signo,0,"el viento nunca arranca en cero");
  for(let turno=0;turno<24;turno++){
   s=applyTeamAction(s,s.turn,{type:"timeout"},s.turnStartedAt+10001);
   const nuevo=Math.sign(s.wind);
   if(nuevo!==signo){
    assert.ok(s.turnNo-desde>=WIND_HOLD,`el viento giro en ${s.turnNo-desde} turnos`);
    signo=nuevo;desde=s.turnNo;
   }
  }
 }
});

function sqliteDB(){
 const sqlite=new DatabaseSync(":memory:");
 sqlite.exec("CREATE TABLE team_rooms(code TEXT PRIMARY KEY,tokens TEXT NOT NULL,state TEXT NOT NULL,revision INTEGER NOT NULL,updated_at INTEGER NOT NULL)");
 return {sqlite,prepare(sql){return {
  args:[],bind(...args){this.args=args;return this},
  async first(){return sqlite.prepare(sql).get(...this.args)??null},
  async run(){const r=sqlite.prepare(sql).run(...this.args);return {meta:{changes:Number(r.changes)}}}
 }}};
}
const tokens=Array.from({length:5},(_,i)=>`test-player-${i}-token-123456`);
async function request(db,id,type,extra={}){const response=await handleTeamRoom(new Request("http://localhost/api/team-room",{method:"POST",headers:{"content-type":"application/json","x-player-token":tokens[id]},body:JSON.stringify({code:"TEAM22",type,...extra})}),db);return {status:response.status,...await response.json()}}
test("sala: tres uniones simultáneas reciben puestos únicos, el quinto es rechazado",async()=>{
 const db=sqliteDB();assert.equal((await request(db,0,"create")).status,200);
 const joins=await Promise.all([1,2,3].map(i=>request(db,i,"join")));assert.deepEqual(joins.map(j=>j.role).sort(),[1,2,3]);
 assert.equal((await request(db,4,"join")).status,409);
 const rejoin=await request(db,2,"join");assert.equal(rejoin.role,2);assert.ok(rejoin.state.players.every(p=>!p.bot));
 assert.ok(!JSON.stringify(rejoin).includes(tokens[0]));
 assert.equal((await request(db,1,"start")).status,403);assert.equal((await request(db,0,"start")).state.phase,"playing");db.sqlite.close();
});
test("sala: bots completan puestos vacíos, se validan turnos y chat/voz no pisan disparos",async()=>{
 const db=sqliteDB();await request(db,0,"create");await request(db,1,"join");const start=await request(db,0,"start");
 assert.deepEqual(start.state.players.map(p=>p.bot),[false,false,true,true]);
 assert.equal((await request(db,2,"join")).status,409);
 const wrong=await request(db,1,"fire",{round:1,turnNo:1,angle:48,power:60});assert.equal(wrong.status,409);
 const result=await Promise.all([request(db,0,"fire",{round:1,turnNo:1,angle:48,power:60,direction:1}),request(db,1,"chat",{text:"Hola"}),request(db,1,"voice",{to:0,kind:"ready"})]);assert.ok(result.every(r=>r.status===200));
 const state=(await request(db,0,"poll")).state;assert.equal(state.event.kind,"fire");assert.equal(state.chat.at(-1).text,"Hola");assert.equal(state.voice.at(-1).to,0);
 assert.equal((await request(db,0,"fire",{round:1,turnNo:1,angle:48,power:60})).status,409);
 assert.equal((await request(db,4,"poll")).status,403);db.sqlite.close();
});
test("sala: la voz llega al puesto correcto en los dos sentidos y rechaza destinos vacios",async()=>{
 const db=sqliteDB();await request(db,0,"create");await request(db,1,"join");await request(db,0,"start");
 const mine=state=>state.voice.filter(v=>v.to===1),theirs=state=>state.voice.filter(v=>v.to===0);
 assert.equal((await request(db,0,"voice",{to:2,kind:"ready"})).status,400,"no se puede llamar a un puesto sin dueno");
 assert.equal((await request(db,0,"voice",{to:0,kind:"ready"})).status,400,"ni a uno mismo");
 assert.equal((await request(db,0,"voice",{to:1,kind:"saludo"})).status,400,"ni inventar tipos de senal");
 // Apreton de manos completo: J1 avisa, J2 responde, se cruzan oferta, respuesta y candidatos.
 await request(db,0,"voice",{to:1,kind:"ready"});
 const seen=await request(db,1,"poll");
 assert.equal(mine(seen.state).at(-1).kind,"ready");assert.equal(mine(seen.state).at(-1).from,0);
 await request(db,1,"voice",{to:0,kind:"ready"});
 await request(db,0,"voice",{to:1,kind:"offer",payload:JSON.stringify({type:"offer",sdp:"v=0"})});
 await request(db,1,"voice",{to:0,kind:"answer",payload:JSON.stringify({type:"answer",sdp:"v=0"})});
 await request(db,0,"voice",{to:1,kind:"candidate",payload:JSON.stringify({candidate:"candidate:1"})});
 const final=(await request(db,1,"poll")).state;
 assert.deepEqual(mine(final).map(v=>v.kind),["ready","offer","candidate"]);
 assert.deepEqual(theirs(final).map(v=>v.kind),["ready","answer"]);
 assert.equal(JSON.parse(mine(final).at(-1).payload).candidate,"candidate:1");
 assert.equal(new Set(final.voice.map(v=>v.id)).size,final.voice.length,"cada senal necesita un id unico");
 assert.equal((await request(db,0,"voice",{to:1,kind:"offer",payload:"x".repeat(18001)})).status,400);
 assert.equal((await request(db,4,"voice",{to:0,kind:"ready"})).status,403,"un extrano no puede senalizar");
 db.sqlite.close();
});
