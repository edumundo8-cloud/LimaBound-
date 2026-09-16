// Pruebas de la orientacion de los personajes y del item DUAL.
//
// Los combatientes se dibujaban siempre mirando al rival, asi que al caminar
// hacia atras quedaban de espaldas al movimiento. Y el DUAL quedaba atado al
// numero de turno, de modo que solo se podia armar en el turno exacto en curso.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

const contains = (needle) => assert.ok(pageSource.includes(needle), `falta en app/page.tsx: ${needle}`);

test("los personajes empiezan mirandose de frente", () => {
  // jugador 0 a la izquierda mira a la derecha; el rival, al reves
  contains("[facing,setFacing]=useState<[number,number]>([1,-1])");
});

test("al caminar se voltean hacia donde van", () => {
  contains("const posAntes=lastPos.current;if(posAntes[0]!==game.positions[0]||posAntes[1]!==game.positions[1]){setFacing(f=>[game.positions[0]>posAntes[0]?1:game.positions[0]<posAntes[0]?-1:f[0],game.positions[1]>posAntes[1]?1:game.positions[1]<posAntes[1]?-1:f[1]] as [number,number])");
});

test("al disparar miran hacia el rival", () => {
  contains("const shooter=(game.lastEvent.player??0) as 0|1;setFacing(f=>f.map((v,i)=>i===shooter?(shooter===0?1:-1):v) as [number,number])");
});

test("al empezar una ronda vuelven a mirarse de frente", () => {
  contains("if(game.lastEvent.type===\"start\"){setHpHold(null);setHitCry(null);setFacing([1,-1]);setSelectedItem(\"none\")");
});

test("el volteo se aplica en el estilo del combatiente y en la sacudida", () => {
  contains("[\"--face\" as string]:String(facing[i])");
  assert.ok(cssSource.includes("transform:translateX(-50%) rotate(var(--tilt,0deg)) scaleX(var(--face,1))"), "el combatiente debe voltearse con --face");
  const sacudida = cssSource.match(/@keyframes hurt-shake\{.*?\}\}/s)[0];
  assert.ok(sacudida.includes("scaleX(var(--face,1))"), "la sacudida no debe enderezar al golpeado");
});

test("el DUAL se puede armar en cualquier momento antes de disparar", () => {
  contains("dualArmed=itemAvailable&&selectedItem===\"dual\"");
  contains("className={`dual-item ${dualArmed?\"selected\":\"\"}`} disabled={!itemAvailable} onClick={()=>setSelectedItem(dualArmed?\"none\":\"dual\")}");
  assert.ok(!pageSource.includes("selectedItemTurn"), "el DUAL ya no debe depender del numero de turno");
});

test("el DUAL tambien se desarma al empezar la ronda", () => {
  contains("if(game.lastEvent.type===\"start\"){setHpHold(null);setHitCry(null);setFacing([1,-1]);setSelectedItem(\"none\")");
});
