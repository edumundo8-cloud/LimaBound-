// Pruebas de la rotacion de escenarios (`lib/scenes.ts`).
//
// Antes cada archivo llevaba su propia cuenta de mapas: la interfaz usaba
// `%SCENES.length` y la sala 1v1 usaba `%4`. Con un quinto mapa el relieve
// simulado dejaba de coincidir con el fondo dibujado. Aqui se fija que el
// indice sale de un solo lugar y que siempre avanza al pasar de ronda.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
});

after(async () => {
  await vite.close();
});

const { SCENES, SCENE_COUNT, sceneIndexFor } = await vite.ssrLoadModule("/lib/scenes.ts");
const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const roomSource = await readFile(new URL("../app/api/room/route.ts", import.meta.url), "utf8");

test("la rotacion incluye las cinco zonas de Lima", () => {
  assert.equal(SCENE_COUNT, 5);
  assert.deepEqual(
    SCENES.map((s) => s.label),
    ["Jirón de la Unión", "Miraflores", "Gamarra", "Costa Verde", "Plaza San Miguel"],
  );
});

test("Plaza San Miguel entra con fondo propio y marcador propio", () => {
  const sanMiguel = SCENES.find((s) => s.label === "Plaza San Miguel");
  assert.ok(sanMiguel);
  assert.equal(sanMiguel.src, "/game/plaza-san-miguel-night.webp");
  assert.equal(sanMiguel.kind, "sanmiguel");
  assert.match(sanMiguel.landmark, /SAN MIGUEL/);
  assert.ok(sanMiguel.detail.length > 0);
});

test("cada escenario tiene fondo, marcador y estilo distintos", () => {
  assert.equal(new Set(SCENES.map((s) => s.src)).size, SCENE_COUNT);
  assert.equal(new Set(SCENES.map((s) => s.kind)).size, SCENE_COUNT);
  for (const scene of SCENES) {
    assert.match(scene.src, /^\/game\/[a-z0-9-]+\.(png|webp)$/);
    assert.ok(scene.landmark.length > 0 && scene.detail.length > 0);
  }
});

test("cada ronda avanza a la siguiente zona y vuelve al empezar la vuelta", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map(sceneIndexFor), [0, 1, 2, 3, 4, 0, 1]);
  assert.equal(sceneIndexFor(10), 4);
  assert.equal(sceneIndexFor(11), 0);
});

test("el fondo cambia despues de cada juego y ninguno se repite antes de la vuelta", () => {
  const vistas = [];
  for (let ronda = 1; ronda <= 20; ronda++) {
    const i = sceneIndexFor(ronda);
    assert.ok(i >= 0 && i < SCENE_COUNT, `indice fuera de rango en la ronda ${ronda}`);
    if (vistas.length) {
      assert.notEqual(i, vistas[vistas.length - 1], `la ronda ${ronda} repite el fondo anterior`);
    }
    vistas.push(i);
  }
  // en 20 rondas cada zona aparece exactamente cuatro veces
  for (const i of [0, 1, 2, 3, 4]) assert.equal(vistas.filter((v) => v === i).length, 4);
});

test("el indice tolera rondas raras sin salirse de la lista", () => {
  for (const entrada of [0, -1, -7, 2.9, NaN, undefined, null]) {
    const i = sceneIndexFor(entrada);
    assert.ok(Number.isInteger(i) && i >= 0 && i < SCENE_COUNT, `${entrada} -> ${i}`);
  }
  assert.equal(sceneIndexFor(undefined), 0);
  assert.equal(sceneIndexFor(NaN), 0);
});

test("la interfaz toma la lista de escenarios del modulo compartido", () => {
  assert.match(pageSource, /import \{SCENES,sceneIndexFor\} from "@\/lib\/scenes";/);
  assert.doesNotMatch(pageSource, /const SCENES=\[/);
  assert.match(pageSource, /sceneIndex=sceneIndexFor\(game\.roundNo\)/);
  assert.match(pageSource, /variant=sceneIndexFor\(s\.roundNo\)/);
  // el marcador nuevo tiene su glifo
  assert.match(pageSource, /scene\.kind==="sanmiguel"\?"▣"/);
});

test("la sala 1v1 calcula el terreno con el mismo indice que el fondo", () => {
  assert.match(roomSource, /import \{sceneIndexFor\} from "@\/lib\/scenes";/);
  assert.match(roomSource, /terrain=sceneIndexFor\(s\.roundNo\)/);
  // sin cuenta de mapas escrita a mano
  assert.doesNotMatch(roomSource, /\(s\.roundNo\?\?1\)-1\)%4/);
});
