import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {TEAM_WIDTH,TEAM_MOVE,newTeamGame,spawnPositions,nextPlayers,moveTeamPlayer,simulateTeamShot,applyTeamAction,tickTeamGame,chooseBotAction} from "../lib/team-game.ts";
import {handleTeamRoom} from "../lib/team-room.ts";
const fixed=()=>.43;

test("2v2: campo +30%, movimiento +15%, cuatro colores y posiciones seguras",()=>{
 assert.equal(TEAM_WIDTH,836*1.3);assert.equal(TEAM_MOVE,114.4*1.15);
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
 const shot=simulateTeamShot(s,0,78,1,1);assert.deepEqual(shot.damage,[25,25,25,25]);
 const next=applyTeamAction(s,0,{type:"fire",angle:78,power:1,direction:1},1001);
 assert.deepEqual(next.players.map(p=>p.hp),[135,135,135,135]);assert.equal(s.players[0].hp,160);
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
