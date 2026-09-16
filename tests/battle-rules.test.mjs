// Las reglas de impacto (radio de explosion, crater, objetivo y dano) vivian
// duplicadas en el cliente y en la sala. Con dos copias, cualquier ajuste de
// balance puede quedar aplicado en una sola punta.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { blastRadius, craterRadius, shotDamage, targetRadiusFor } from "../lib/battle.ts";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const roomSource = await readFile(new URL("../app/api/room/route.ts", import.meta.url), "utf8");

test("las reglas de impacto viven una sola vez, en lib/battle.ts", () => {
  for (const [archivo, fuente] of [["page.tsx", pageSource], ["route.ts", roomSource]]) {
    assert.ok(!/const (blastRadius|craterRadius|targetRadiusFor|shotDamage|damagePerHit)\s*=/.test(fuente),
      `${archivo} no debe volver a definir las reglas de impacto`);
    assert.match(fuente, /from "@\/lib\/battle"/, `${archivo} debe tomar las reglas de lib/battle.ts`);
    assert.match(fuente, /blastRadius,|craterRadius,/, `${archivo} debe importar los radios compartidos`);
  }
  assert.match(pageSource, /targetRadiusFor\(target\)/);
  assert.match(pageSource, /damagePerHit=shotDamage\(player,special\)/);
  assert.match(roomSource, /damagePerHit=shotDamage\(player,special\)/);
});

test("los valores siguen siendo los mismos que antes de unificarlos", () => {
  assert.deepEqual([blastRadius(0, false), blastRadius(1, false), blastRadius(0, true)], [40, 34, 50]);
  assert.deepEqual([craterRadius(0, false), craterRadius(1, false), craterRadius(0, true)], [14, 12, 17]);
  assert.deepEqual([targetRadiusFor(0), targetRadiusFor(1)], [24, 18]);
  assert.deepEqual([shotDamage(0, false), shotDamage(1, false), shotDamage(0, true), shotDamage(1, true)], [25, 25, 53, 44]);
});

test("el SS pega 20% mas que su valor anterior, en cliente y sala", () => {
  const antes = {0: 44, 1: 37};
  for (const player of [0, 1]) {
    const esperado = Math.round(antes[player] * 1.2);
    assert.equal(shotDamage(player, true), esperado, `SS del jugador ${player}`);
    assert.ok(Math.abs(shotDamage(player, true) / antes[player] - 1.2) < 0.02);
  }
});
