// Pruebas de la rotacion de escenarios (`lib/scenes.ts`).
//
// Antes cada archivo llevaba su propia cuenta de mapas: la interfaz usaba
// `%SCENES.length` y la sala 1v1 usaba `%4`. Con un quinto mapa el relieve
// simulado dejaba de coincidir con el fondo dibujado. Aqui se fija que el
// indice sale de un solo lugar y que cada partida elige un mapa aleatorio sin
// repetir inmediatamente el escenario anterior.

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

const { SCENES, SCENE_COUNT, randomSceneIndex, sceneIndexFor } = await vite.ssrLoadModule("/lib/scenes.ts");
const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const cssSourceForFaro = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
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

test("el indice heredado conserva las rondas guardadas anteriormente", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map(sceneIndexFor), [0, 1, 2, 3, 4, 0, 1]);
  assert.equal(sceneIndexFor(10), 4);
  assert.equal(sceneIndexFor(11), 0);
});

test("la seleccion aleatoria nunca sale del rango ni repite el mapa anterior", () => {
  for (let anterior = 0; anterior < SCENE_COUNT; anterior++) {
    for (const muestra of [0, 0.01, 0.24, 0.5, 0.74, 0.99, 1, NaN]) {
      const i = randomSceneIndex(anterior, () => muestra);
      assert.ok(Number.isInteger(i) && i >= 0 && i < SCENE_COUNT, `${anterior}, ${muestra} -> ${i}`);
      assert.notEqual(i, anterior, `se repitio el escenario ${anterior}`);
    }
  }
  assert.equal(randomSceneIndex(undefined, () => 0), 0);
  assert.equal(randomSceneIndex(undefined, () => 0.999), SCENE_COUNT - 1);
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
  assert.match(pageSource, /import \{SCENES,randomSceneIndex,sceneIndexFor\} from "@\/lib\/scenes";/);
  assert.doesNotMatch(pageSource, /const SCENES=\[/);
  assert.match(pageSource, /sceneIndex=roundEnded\?\(game\.nextScene\?\?currentScene\):currentScene/);
  assert.match(pageSource, /variant=Number\.isInteger\(s\.scene\)\?s\.scene:sceneIndexFor\(s\.roundNo\)/);
  // el marcador nuevo tiene su glifo
  assert.match(pageSource, /scene\.kind==="sanmiguel"\?"▣"/);
});

test("la sala 1v1 calcula el terreno con el mismo indice que el fondo", () => {
  assert.match(roomSource, /import \{randomSceneIndex,sceneIndexFor\} from "@\/lib\/scenes";/);
  assert.match(roomSource, /terrain=s\.scene/);
  assert.match(roomSource, /s\.nextScene=randomSceneIndex\(s\.scene\)/);
  // sin cuenta de mapas escrita a mano
  assert.doesNotMatch(roomSource, /\(s\.roundNo\?\?1\)-1\)%4/);
});

test("el lienzo se repinta al cambiar de ronda o de escenario", () => {
  // el fondo se intenta pintar ya y se repinta tanto al cargar como al decodificar
  assert.match(pageSource, /bg\.addEventListener\("load",repaint\)/);
  assert.match(pageSource, /bg\.decode\?\.\(\)\.then\(repaint\)/);
  assert.match(pageSource, /bg\.removeEventListener\("load",repaint\)/);
  assert.match(pageSource, /if\(bg\.complete&&bg\.naturalWidth>0\)paint\(\);else bg\.onload=paint;void bg\.decode\?\.\(\)\.then\(paint\)/);
});

test("el mapa avanza solo al terminar la ronda, sin pulsar nada", () => {
  // la vista usa el siguiente mapa ya elegido 1.6 s despues del golpe final
  assert.match(pageSource, /roundEnded=game\.winner!==null&&now-\(game\.lastEvent\.nonce\|\|0\)>1_600/);
  assert.match(pageSource, /sceneIndex=roundEnded\?\(game\.nextScene\?\?currentScene\):currentScene/);
  // el campo de la ronda terminada deja de mostrarse: mapa nuevo y limpio
  assert.match(pageSource, /viewCraters=roundEnded\?noCraters:craters/);
  assert.match(pageSource, /draw\(undefined,undefined,sceneIndex,viewCraters\)/);
  // los disparos siguen resolviendose con el escenario real del estado
  assert.match(pageSource, /variant=Number\.isInteger\(s\.scene\)\?s\.scene:sceneIndexFor\(s\.roundNo\)/);
});

test("el marcador de Miraflores usa el faro ilustrado, no un dibujo de CSS", () => {
  assert.match(pageSource, /scene\.kind==="faro"\?<img src="\/game\/faro-miraflores\.png"/);
  assert.match(pageSource, /scene\.kind!=="faro"&&<span className="landmark-label">/);
  assert.ok(!pageSource.includes('scene.kind==="faro"?"◒"'), "ya no debe quedar el glifo del faro");
  const css = cssSourceForFaro;
  assert.ok(!/\.scene-landmark\.faro \.landmark-icon/.test(css), "el dibujo CSS del faro debe estar fuera");
  assert.match(css, /\.scene-landmark\.faro img\{max-height:168px/);
});

test("el CSS mantiene las llaves equilibradas", () => {
  const abre = (cssSourceForFaro.match(/\{/g) ?? []).length;
  const cierra = (cssSourceForFaro.match(/\}/g) ?? []).length;
  assert.equal(abre, cierra, "una llave suelta rompe la compilacion de estilos");
});
