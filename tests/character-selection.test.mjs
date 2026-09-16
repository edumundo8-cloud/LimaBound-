import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const roster=await readFile(new URL("../lib/characters.ts",import.meta.url),"utf8");
const page=await readFile(new URL("../app/page.tsx",import.meta.url),"utf8");
const room=await readFile(new URL("../app/api/room/route.ts",import.meta.url),"utf8");

test("incluye los seis personajes peruanos con sus nombres",()=>{
  for(const name of ["Perro Peruano","Cocinero Chifa","Churrera Limeña","Mototaxista","Cobrador de Combi","Maestro Cevichero"])assert.ok(roster.includes(name),`falta ${name}`);
  assert.match(roster,/DEFAULT_CHARACTERS:\[CharacterId,CharacterId\]=\["perro-peruano","cobrador-combi"\]/);
});

test("obliga a elegir personaje al comenzar",()=>{
  assert.ok(page.includes('useState(true)'));
  assert.ok(page.includes('className="character-select"'));
  assert.ok(page.includes('CHARACTER_ROSTER.map'));
  assert.ok(page.includes('JUGAR CON {selectedCharacter.name.toUpperCase()}'));
  assert.ok(page.includes('if(choosingCharacter||waiting||game.winner!==null'));
});

test("sincroniza la seleccion en las salas 1v1",()=>{
  assert.ok(room.includes('if(action==="select")'));
  assert.ok(room.includes('s.characters[player]=p.character'));
  assert.ok(page.includes('void act("select",{character:characterChoice})'));
});
