import test from 'node:test';
import assert from 'node:assert/strict';
import {impactDamage,terrainTilt,groundAt} from '../lib/battle.ts';
import {newTeamGame,blastDamage,teamGround,BLAST,DAMAGE,applyTeamAction} from '../lib/team-game.ts';

test('direct, half-strength, edge and outside impacts for basic and SS',()=>{
 for(const [damage,radius] of [[25,64],[52,96],[53,68],[44,74]]){
  assert.equal(impactDamage(damage,0,radius),damage);
  assert.equal(impactDamage(damage,27,radius),damage);
  assert.equal(impactDamage(damage,(27+radius)/2,radius),Math.round(damage/2));
  assert.equal(impactDamage(damage,radius,radius),0);
  assert.equal(impactDamage(damage,radius+10,radius),0);
  for(let d=0;d<radius;d++)assert.ok(impactDamage(damage,d,radius)>=impactDamage(damage,d+1,radius));
 }
});

test('shared room/practice rules apply falloff to living players and both Dual shots',()=>{
 const s=newTeamGame(1000,()=>.43);s.scene=2;s.wind=0;
 s.players.forEach(p=>{p.x=300;p.bot=false});s.players[3].hp=0;
 const y=teamGround(300,[],2)-25;
 for(const special of [false,true]){
  const radius=special?BLAST.special:BLAST.basic,max=special?DAMAGE.special:DAMAGE.basic;
  assert.deepEqual(blastDamage(s,{x:300,y},special),[max,max,max,0]);
  const half=Math.round(max/2);
  assert.deepEqual(blastDamage(s,{x:300+(radius+27)/2,y},special),[half,half,half,0]);
 }
 const after=applyTeamAction(s,0,{type:'fire',angle:48,power:30,direction:1,dual:true},1001);
 assert.equal(after.event.shots.length,2);
 for(let i=0;i<3;i++)assert.equal(after.players[i].hp,Math.max(0,160-after.event.shots.reduce((sum,shot)=>sum+shot.damage[i],0)));
});

test('craters change height and stance without movement in duel and team terrain',()=>{
 for(const ground of [groundAt,teamGround]){
  const x=200,craters=[{x:x+6,r:20}];
  assert.ok(ground(x,craters,2)>ground(x,[],2));
  assert.notEqual(terrainTilt(x,p=>ground(p,craters,2)),terrainTilt(x,p=>ground(p,[],2)));
 }
 assert.equal(terrainTilt(100,()=>300),0);
 assert.ok(Math.abs(terrainTilt(100,x=>x*10))<=30);
});
