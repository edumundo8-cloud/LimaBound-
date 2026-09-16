import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const page=await readFile(new URL("../app/page.tsx",import.meta.url),"utf8");
const room=await readFile(new URL("../app/api/room/route.ts",import.meta.url),"utf8");
const voice=await readFile(new URL("../app/useVoiceChat.ts",import.meta.url),"utf8");

test("el jugador 2 puede entrar por enlace o código",()=>{
 assert.match(page,/URLSearchParams\(location\.search\)\.get\("room"\)/);
 assert.match(page,/Comparte el enlace/);
 assert.match(page,/Código .* copiado/);
 assert.match(page,/type="submit"/);
 assert.match(page,/attempt<3/);
});

test("la voz requiere activación y permite silenciar o salir",()=>{
 assert.match(voice,/getUserMedia/);
 assert.match(voice,/track\.enabled=!track\.enabled/);
 assert.match(voice,/echoCancellation:true/);
 assert.match(page,/Salir de voz/);
 assert.match(room,/action==="voice"/);
});

test("el chat muestra menos reacciones rápidas",()=>{
 assert.match(page,/\["👋","😂","💀"\]/);
 assert.doesNotMatch(page,/"⚽","🇵🇪"/);
 assert.match(page,/game\.chat\.slice\(-12\)/);
});
