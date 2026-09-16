import assert from 'node:assert/strict';
import test, {after} from 'node:test';
import {createServer} from 'vite';
const vite = await createServer({configFile:false,server:{middlewareMode:true,hmr:false}});
after(()=>vite.close());
const {FIELD_WIDTH,MOVE_BUDGET,MOVE_STEP,GAP,groundAt,movePosition,tornadoForTurn,stepProjectile} = await vite.ssrLoadModule('/lib/battle.ts');

test('field and movement increase exactly ten percent',()=>{
  assert.ok(Math.abs(FIELD_WIDTH-760*1.1)<1e-10);
  assert.ok(Math.abs(MOVE_BUDGET-104*1.1)<1e-10);
  assert.ok(Math.abs(MOVE_STEP-34*1.1)<1e-10);
  let pos=134.2,used=0;
  for(let i=0;i<10;i++){const next=movePosition(0,pos,37.4,used);used+=Math.abs(next-pos);pos=next;}
  assert.ok(Math.abs(used-MOVE_BUDGET)<1e-9);
  assert.equal(movePosition(0,pos,37.4,used),pos);
});

test('San Miguel has no floor in the center and neither bank can be crossed',()=>{
  assert.ok(groundAt(418,[],4)>390);
  assert.ok(groundAt(418,[],0)<390);
  assert.ok(groundAt(GAP.left,[],4)<390);
  assert.ok(groundAt(GAP.right,[],4)<390);
  assert.ok(movePosition(0,330,999,0)<GAP.left);
  assert.ok(movePosition(1,506,-999,0)>GAP.right);
  assert.equal(movePosition(0,55,-999,0),55);
  assert.equal(movePosition(1,781,999,0),781);
});

test('tornado appears after six turns for both players, repeats every six and is synchronized',()=>{
  for(let turn=1;turn<=6;turn++)assert.equal(tornadoForTurn(turn,12345),null);
  assert.deepEqual(tornadoForTurn(7,12345),tornadoForTurn(8,12345));
  for(let turn=9;turn<=12;turn++)assert.equal(tornadoForTurn(turn,12345),null);
  assert.notEqual(tornadoForTurn(7,12345).x,tornadoForTurn(13,12345).x);
  assert.notEqual(tornadoForTurn(7,12345).x,tornadoForTurn(7,789).x);
  for(let seed=0;seed<100;seed++){
    const t=tornadoForTurn(7,seed);
    assert.ok(t.x-t.radius>0&&t.x+t.radius<FIELD_WIDTH);
    assert.ok(t.spin===1||t.spin===-1);
  }
});

test('vortex rotates projectile velocity at all heights and leaves distant shots unchanged',()=>{
  const tornado={x:418,radius:48,spin:1,cycle:1};
  for(const y of [-100,0,150,380]){
    const normal=stepProjectile(410,y,8,-2,5,null);
    const clockwise=stepProjectile(410,y,8,-2,5,tornado);
    const counter=stepProjectile(410,y,8,-2,5,{...tornado,spin:-1});
    assert.notEqual(clockwise.dx,normal.dx);
    assert.ok(clockwise.dy>normal.dy&&counter.dy<normal.dy);
  }
  assert.deepEqual(stepProjectile(50,100,8,-2,5,tornado),stepProjectile(50,100,8,-2,5,null));
  const fly=(vortex)=>{let p={x:320,y:120,dx:8,dy:-1};for(let i=0;i<50;i++)p=stepProjectile(p.x,p.y,p.dx,p.dy,0,vortex);return p;};
  assert.ok(Math.abs(fly(tornado).x-fly(null).x)>20);
  assert.deepEqual(fly(tornado),fly({...tornado}));
});
