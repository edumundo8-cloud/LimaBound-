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
const roster = await readFile(new URL("../lib/characters.ts", import.meta.url), "utf8");

const contains = (needle) => assert.ok(pageSource.includes(needle), `falta en app/page.tsx: ${needle}`);

test("los personajes empiezan mirandose de frente", () => {
  // jugador 0 a la izquierda mira a la derecha; el rival, al reves
  contains("[facing,setFacing]=useState<[number,number]>([1,-1])");
});

test("al caminar se voltean hacia donde van", () => {
  contains("if(posAntes[0]!==game.positions[0]||posAntes[1]!==game.positions[1]){setFacing(f=>[game.positions[0]>posAntes[0]?1:game.positions[0]<posAntes[0]?-1:f[0],game.positions[1]>posAntes[1]?1:game.positions[1]<posAntes[1]?-1:f[1]] as [number,number])");
});

test("al disparar miran hacia el rival", () => {
  contains("setFacing(f=>f.map((v,i)=>i===shooter?(shooter===0?1:-1):v) as [number,number])");
});

test("al empezar una ronda vuelven a mirarse de frente y el DUAL se desarma", () => {
  contains("if(game.lastEvent.type===\"start\"){setFlightWeather(null);setHpHold(null);setHitCry(null);setFacing([1,-1]);setSelectedItem(\"none\");setSelectedShot(\"basic\");lastPos.current=[...initial.positions] as [number,number]");
});

test("cada ilustracion declara hacia donde mira tal cual viene", () => {
  // comprobado a ojo: las cinco primeras miran a la izquierda y el cocinero a la derecha
  assert.equal((roster.match(/drawnFacing:-1/g) ?? []).length, 5);
  assert.equal((roster.match(/drawnFacing:1/g) ?? []).length, 1);
  assert.match(roster, /maestro-cevichero[^}]*drawnFacing:1/);
});

test("el volteo combina la direccion, la ilustracion y el lado del combatiente", () => {
  contains("[\"--face\" as string]:String(facing[i]*characterById(characters[i]).drawnFacing*(i===0?1:-1))");
  // el volteo va en una capa sin transicion, para que no se aplaste al girar
  assert.ok(cssSource.includes(".fighter-art{scale:var(--face,1) 1}"), "el volteo debe ir en .fighter-art");
  assert.ok(!cssSource.includes("rotate(var(--tilt,0deg)) scaleX"), "el contenedor ya no debe voltear");
  const sacudida = cssSource.match(/@keyframes hurt-shake\{.*?\}\}/s)[0];
  assert.ok(!sacudida.includes("scaleX"), "la sacudida no debe voltear otra vez");
});

test("el DUAL se puede armar en cualquier momento antes de disparar", () => {
  contains("dualArmed=itemAvailable&&selectedItem===\"dual\"");
  contains("disabled={!itemAvailable} onClick={()=>{setSelectedItem(dualArmed?\"none\":\"dual\");setSelectedShot(\"basic\")}}");
  assert.ok(!pageSource.includes("selectedItemTurn"), "el DUAL ya no debe depender del numero de turno");
});

test("al empezar una ronda tambien se desarma el SS y se limpia el clima del disparo", () => {
  contains('setSelectedShot("basic")');
  contains("setFlightWeather(null)");
});
