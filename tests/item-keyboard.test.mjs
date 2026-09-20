import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

test('real team keyboard handlers charge/fire with item focus and protect text entry',()=>{
 const source=readFileSync(new URL('../app/TeamGame.tsx',import.meta.url),'utf8');
 const start=source.indexOf('const down=(event:KeyboardEvent)=>');
 const end=source.indexOf(';const blur=',start);
 const code=ts.transpile(source.slice(start,end)+';globalThis.handlers={down,up};');
 let fired=0,charged=0;
 const context={myTurn:true,powerRef:{current:0},chargeStart:{current:0},startCharge(){charged++;context.chargeStart.current=1;},stopCharge(){context.chargeStart.current=0;},fire(){fired++;}};
 vm.runInNewContext(code,context);
 const event=(kind,repeat=false)=>({code:'Space',repeat,prevented:false,preventDefault(){this.prevented=true;},target:{closest(selector){if(selector.includes('input'))return kind==='input'?{}:null;if(selector==='button,a')return kind==='item'||kind==='outside'?{}:null;if(selector==='.team-controls')return kind==='item'?{}:null;return null;}}});
 const down=event('item');context.handlers.down(down);assert.equal(charged,1);assert.ok(down.prevented);
 const repeat=event('item',true);context.handlers.down(repeat);assert.equal(charged,1);assert.ok(repeat.prevented);
 context.powerRef.current=50;const up=event('item');context.handlers.up(up);assert.equal(fired,1);assert.ok(up.prevented);
 context.handlers.down(event('item'));assert.equal(fired,2,'ready power fires without restarting charge');
 context.handlers.down(event('input'));context.handlers.down(event('outside'));assert.equal(fired,2);
 context.myTurn=false;context.handlers.down(event('item'));assert.equal(fired,2);
});
