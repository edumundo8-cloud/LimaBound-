// Pruebas de la reaccion al golpe.
//
// El dano se aplicaba al estado en el instante del disparo, asi que la barra de
// vida bajaba con el proyectil todavia en el aire y el personaje no reaccionaba.
// Ahora la barra retiene el valor anterior y el golpeado grita al recibir el
// impacto.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

const contains = (needle) => assert.ok(pageSource.includes(needle), `falta en app/page.tsx: ${needle}`);

test("la vida se retiene desde el disparo y no baja antes del impacto", () => {
  contains("if(game.lastEvent.type===\"fire\"&&game.lastEvent.hit)setHpHold({player:(1-(game.lastEvent.player??0)) as 0|1,amount:game.lastEvent.damage??0})");
  contains("shownHp=[0,1].map(i=>Math.min(160,game.hp[i]+(hpHold&&hpHold.player===i?hpHold.amount:0))) as [number,number]");
  contains("<div className=\"hp\"><i style={{width:`${shownHp[mine]/1.6}%`}}/></div>");
  contains("<div className=\"hp foe\"><i style={{width:`${shownHp[theirs]/1.6}%`}}/></div>");
});

test("el valor retenido se libera justo al tocar el objetivo", () => {
  contains("if(ev.hit){setHitCry({player:(1-player) as 0|1,damage:ev.damage??0,text:pick(quips.cry),nonce:fx.nonce})");
  contains("setHpHold(null);");
});

test("al empezar una ronda se limpia cualquier reaccion pendiente", () => {
  contains("if(game.lastEvent.type===\"start\"){setFlightWeather(null);setHpHold(null);setHitCry(null)");
});

test("el golpeado se sacude y suelta el grito", () => {
  contains("${hitCry?.player===0?\"hurt\":\"\"}");
  contains("${hitCry?.player===1?\"hurt\":\"\"}");
  contains("{hitCry?.player===0&&<i key={hitCry.nonce} className=\"hit-cry\">{hitCry.text}</i>}");
  assert.match(cssSource, /\.hit-cry\{[^}]*animation:hit-cry-pop/);
  assert.match(cssSource, /\.fighter\.hurt\{animation:hurt-shake/);
  assert.match(cssSource, /@keyframes hurt-shake/);
  assert.match(cssSource, /@keyframes hit-cry-pop/);
});

test("las frases de reaccion se eligen una sola vez, al crear la reaccion", () => {
  contains("cry:[\"¡Auch!\",\"¡Uy, eso dolió!\",\"¡Ese entró!\",\"¡Auch! Directo al orgullo.\"]");
  contains("text:pick(quips.cry),nonce:fx.nonce");
  assert.ok(!pageSource.includes('className="hit-cry">{pick('), "el texto no debe sortearse en cada render");
});
