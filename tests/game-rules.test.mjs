// Pruebas de las reglas puras de LimaBound (`lib/game/rules.ts`).
//
// El motor de reglas antes vivia dentro de `app/page.tsx` y no tenia cobertura.
// Aqui se fijan las reglas centrales del juego: dano, especial SS, disparo
// doble, viento cada cuatro turnos, crateres, turnos y condicion de victoria.
//
// Los modulos se cargan con Vite (igual que `tests/ui-components.test.mjs`) para
// no depender de la version de Node.

import assert from "node:assert/strict";
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

const rules = await vite.ssrLoadModule("/lib/game/rules.ts");
const { blastRadius, craterRadius, groundAt, initial, pick, resolveShot, SCENES } = rules;
const { DUAL_LOCK_MS, MAX_CRATERS, PROJECTILE_LOCK_MS, TURN_MS, TURN_PAUSE_MS, WIND_TURNS } = rules;

/** Partida limpia y determinista (reloj y azar fijos por prueba). */
const freshState = () => ({ ...initial, turnStartedAt: 0 });

let seed = 42;
const fixedRandom = (value) => {
  seed = value;
  Math.random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
};
const originalRandom = Math.random;
after(() => {
  Math.random = originalRandom;
});

test("los tiempos de turno y bloqueo se mantienen", () => {
  assert.equal(TURN_MS, 10_000);
  assert.equal(TURN_PAUSE_MS, 1_500);
  assert.equal(PROJECTILE_LOCK_MS, TURN_PAUSE_MS);
  assert.equal(DUAL_LOCK_MS, 2_900);
  assert.equal(WIND_TURNS, 4);
});

test("cada escenario define un fondo distinto", () => {
  assert.equal(SCENES.length, 4);
  assert.equal(new Set(SCENES.map((s) => s.src)).size, 4);
});

test("la explosion del especial es mayor y el crater depende del jugador", () => {
  assert.equal(blastRadius(0, false), 40);
  assert.equal(blastRadius(1, false), 34);
  assert.equal(blastRadius(0, true), 50);
  assert.equal(blastRadius(1, true), 50);
  assert.equal(craterRadius(0, false), 14);
  assert.equal(craterRadius(1, false), 12);
  assert.equal(craterRadius(1, true), 17);
});

test("el perfil del terreno se repite cada cuatro variantes", () => {
  for (const x of [0, 137.5, 380, 759]) {
    assert.equal(groundAt(x, [], 0), groundAt(x, [], 4));
    assert.equal(groundAt(x, [], -1), groundAt(x, [], 3));
  }
  assert.notEqual(groundAt(137.5, [], 0), groundAt(137.5, [], 1));
});

test("los crateres solo elevan el terreno dentro de su radio", () => {
  const crater = { x: 300, r: 14 };
  const center = groundAt(300, [], 0);
  assert.ok(groundAt(300, [crater], 0) > center);
  assert.equal(groundAt(300 + 20, [crater], 0), groundAt(300 + 20, [], 0));
  // en el borde izquierdo el aporte es nulo
  assert.equal(groundAt(286, [crater], 0), groundAt(286, [], 0));
});

test("la partida empieza con vida completa y el turno del primer jugador", () => {
  assert.deepEqual(initial.hp, [160, 160]);
  assert.deepEqual(initial.positions, [122, 638]);
  assert.equal(initial.turn, 0);
  assert.equal(initial.turnNo, 1);
  assert.equal(initial.roundNo, 1);
  assert.deepEqual(initial.matchWins, [0, 0]);
  assert.equal(initial.winner, null);
  assert.deepEqual(initial.craters, []);
});

test("un golpe basico resta 25 de vida y pasa el turno", () => {
  fixedRandom(7);
  const s = resolveShot(freshState(), 0, 47, 62, false);
  assert.equal(s.lastEvent.hit, true);
  assert.equal(s.lastEvent.damage, 25);
  assert.deepEqual(s.hp, [160, 135]);
  assert.equal(s.turn, 1);
  assert.equal(s.turnNo, 2);
  assert.equal(s.winner, null);
  assert.deepEqual(s.turnsTaken, [1, 0]);
  // el disparo deja crater con el radio del jugador
  assert.equal(s.craters.length, 1);
  assert.equal(s.craters[0].r, craterRadius(0, false));
  // el turno del rival desbloquea despues de la pausa
  assert.ok(s.turnStartedAt - Date.now() > PROJECTILE_LOCK_MS - 2_000);
});

test("el jugador 1 golpea con el angulo y la potencia del bot", () => {
  fixedRandom(7);
  const s = resolveShot(freshState(), 1, 48, 62, false);
  assert.equal(s.lastEvent.hit, true);
  assert.deepEqual(s.hp, [135, 160]);
  assert.equal(s.turn, 0);
  assert.equal(s.turnNo, 2);
});

test("un disparo que falla no resta vida pero consume el turno", () => {
  fixedRandom(7);
  const s = resolveShot(freshState(), 0, 90, 5, false);
  assert.equal(s.lastEvent.hit, false);
  assert.equal(s.lastEvent.damage, 0);
  assert.deepEqual(s.hp, [160, 160]);
  assert.equal(s.turn, 1);
  assert.equal(s.turnNo, 2);
});

test("SS hace mas dano que la bala basica y aplica recarga", () => {
  fixedRandom(7);
  const base = resolveShot(freshState(), 0, 43, 60, false);
  const achorado = resolveShot(freshState(), 0, 43, 60, true);
  assert.equal(achorado.lastEvent.hit, true);
  assert.equal(base.lastEvent.damage, 25);
  assert.equal(achorado.lastEvent.damage, 53);
  assert.deepEqual(achorado.hp, [160, 107]);
  // recarga: cuatro turnos propios desde el turno usado
  assert.deepEqual(achorado.specialReadyAt, [4, 0]);
  assert.equal(achorado.craters[0].r, craterRadius(0, true));
});

test("el especial del jugador 1 usa su propio dano", () => {
  fixedRandom(7);
  const s = resolveShot(freshState(), 1, 46, 60, true);
  assert.equal(s.lastEvent.hit, true);
  assert.equal(s.lastEvent.damage, 44);
  assert.deepEqual(s.hp, [116, 160]);
  assert.deepEqual(s.specialReadyAt, [0, 4]);
});

test("el disparo doble usa el item, deja dos crateres y bloquea mas tiempo", () => {
  fixedRandom(11);
  const before = Date.now();
  const s = resolveShot(freshState(), 0, 43, 60, false, true);
  assert.equal(s.lastEvent.dual, true);
  assert.deepEqual(s.itemUsed, [true, false]);
  assert.equal(s.craters.length, 2);
  assert.ok(s.lastEvent.secondImpactX > s.lastEvent.impactX);
  assert.ok(s.turnStartedAt >= before + DUAL_LOCK_MS);
  assert.ok(s.turnStartedAt > before + PROJECTILE_LOCK_MS);
});

test("el viento solo cambia cada cuatro turnos globales", () => {
  fixedRandom(3);
  const cambia = resolveShot({ ...freshState(), turnNo: 4, wind: 9 }, 0, 30, 50, false);
  assert.equal(cambia.lastEvent.windChanged, true);
  const mantiene = resolveShot({ ...freshState(), turnNo: 3, wind: 9 }, 0, 30, 50, false);
  assert.equal(mantiene.lastEvent.windChanged, false);
  assert.equal(mantiene.wind, 9);
  // el viento usado para simular viaja en el evento para poder dibujarlo
  assert.equal(cambia.lastEvent.wind, 9);
});

test("el terreno conserva como maximo catorce crateres", () => {
  fixedRandom(5);
  const lleno = {
    ...freshState(),
    craters: Array.from({ length: MAX_CRATERS }, (_, i) => ({ x: 20 + i * 50, r: 12 })),
  };
  const s = resolveShot(lleno, 0, 60, 70, false);
  assert.equal(s.craters.length, MAX_CRATERS);
  // los mas antiguos se descartan
  assert.notEqual(s.craters[0].x, lleno.craters[0].x);
  assert.equal(s.craters[s.craters.length - 1].x, s.lastEvent.impactX);
});

test("al llegar a cero de vida hay ganador y el turno se detiene", () => {
  fixedRandom(7);
  const s = resolveShot({ ...freshState(), hp: [160, 25] }, 0, 43, 60, false);
  assert.equal(s.winner, 0);
  assert.deepEqual(s.hp, [160, 0]);
  assert.deepEqual(s.matchWins, [1, 0]);
  assert.equal(s.turn, 0);
  assert.equal(s.turnNo, 1);
});

test("una serie al mejor de tres termina cuando alguien gana dos rondas", () => {
  fixedRandom(13);
  let s = freshState();
  const aciertos = { 0: [43, 60], 1: [46, 60] };
  let golpes = 0;
  while (Math.max(...s.matchWins) < 2 && golpes < 40) {
    const jugador = s.turn;
    const [angulo, potencia] = aciertos[jugador];
    s = resolveShot({ ...s, roundNo: s.roundNo + 1, hp: [160, 18] }, jugador, angulo, potencia, false);
    golpes++;
  }
  assert.ok(golpes < 40, "la serie debe terminar");
  assert.ok(Math.max(...s.matchWins) >= 2);
  assert.notEqual(s.winner, null);
});

test("pick devuelve un elemento de la lista", () => {
  fixedRandom(9);
  const opciones = ["a", "b", "c"];
  for (let i = 0; i < 20; i++) assert.ok(opciones.includes(pick(opciones)));
});

test("las funciones de reglas no mutan el estado recibido", () => {
  fixedRandom(7);
  const antes = freshState();
  const copia = JSON.parse(JSON.stringify(antes));
  resolveShot(antes, 0, 43, 60, true, true);
  assert.deepEqual(antes, copia);
});
