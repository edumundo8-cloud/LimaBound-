// Pruebas del cliente de salas 1v1 (`lib/game/net.ts`).
//
// Antes estas llamadas vivian dentro de `app/page.tsx` y solo se podian probar
// jugando. Aqui se fijan el contrato del API (metodo, cabeceras, cuerpo, token)
// y el manejo de errores, con `fetch` y `localStorage` simulados.

import assert from "node:assert/strict";
import test, { after, beforeEach } from "node:test";
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

const net = await vite.ssrLoadModule("/lib/game/net.ts");
const { ROOM_FALLBACK_ERROR, fetchRoom, getToken, makeCode, postRoom } = net;

/** Registro de llamadas a fetch. */
let calls = [];
let nextResponse = { ok: true, status: 200, body: { state: { turn: 0 }, role: 0 } };

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.fetch = async (url, init) => {
  calls.push({ url, init });
  return {
    ok: nextResponse.ok,
    status: nextResponse.status,
    json: async () => nextResponse.body,
  };
};

beforeEach(() => {
  calls = [];
  store.clear();
  nextResponse = { ok: true, status: 200, body: { state: { turn: 0 }, role: 0 } };
});

const bodyOf = (call) => JSON.parse(call.init.body);

test("postRoom crea la sala por POST con JSON y token persistente", async () => {
  await postRoom({ action: "create" }, "AB12CD");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/room");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers["content-type"], "application/json");
  const body = bodyOf(calls[0]);
  assert.equal(body.action, "create");
  assert.equal(body.code, "AB12CD");
  assert.equal(typeof body.token, "string");
  assert.ok(body.token.length > 0);
  assert.equal(store.get("oddbound-token"), body.token);

  // el segundo envio reutiliza el mismo token
  await postRoom({ action: "join" }, "AB12CD");
  assert.equal(bodyOf(calls[1]).token, body.token);
  assert.equal(bodyOf(calls[1]).action, "join");
});

test("postRoom envia las acciones extra sin perder codigo ni token", async () => {
  await postRoom({ action: "fire", angle: 47, power: 62 }, "ZZ9999");
  const body = bodyOf(calls[0]);
  assert.equal(body.action, "fire");
  assert.equal(body.angle, 47);
  assert.equal(body.power, 62);
  assert.equal(body.code, "ZZ9999");
  assert.ok(body.token);
});

test("postRoom devuelve la respuesta del API", async () => {
  nextResponse = { ok: true, status: 200, body: { code: "AB12CD", role: 1, waiting: false } };
  const j = await postRoom({ action: "join" }, "AB12CD");
  assert.equal(j.role, 1);
  assert.equal(j.waiting, false);
});

test("postRoom propaga el mensaje de error del API", async () => {
  nextResponse = { ok: false, status: 404, body: { error: "La sala no existe." } };
  await assert.rejects(() => postRoom({ action: "join" }, "NOPE00"), /La sala no existe\./);
});

test("postRoom usa el mensaje de reserva cuando el API no explica", async () => {
  nextResponse = { ok: false, status: 500, body: {} };
  await assert.rejects(
    () => postRoom({ action: "create" }, "AB12CD", ROOM_FALLBACK_ERROR),
    /descanso/,
  );
  // sin mensaje de reserva se conserva el comportamiento anterior
  await assert.rejects(() => postRoom({ action: "join" }, "AB12CD"), (e) => e.message === "");
});

test("fetchRoom consulta la sala por GET sin cachear", async () => {
  await fetchRoom("AB12CD");
  assert.equal(calls[0].url, "/api/room?code=AB12CD");
  assert.equal(calls[0].init.cache, "no-store");
  assert.equal(calls[0].init.method ?? "GET", "GET");
});

test("fetchRoom devuelve la respuesta sin interpretarla", async () => {
  nextResponse = { ok: false, status: 404, body: { error: "La sala no existe." } };
  const r = await fetchRoom("NOPE00");
  assert.equal(r.ok, false);
  assert.equal(r.status, 404);
});

test("makeCode genera un codigo de seis caracteres en mayusculas", () => {
  const originalRandom = Math.random;
  try {
    for (const v of [0.1, 0.9, 0.999999, 0.123456]) {
      Math.random = () => v;
      const code = makeCode();
      assert.equal(code.length, 6);
      assert.match(code, /^[A-Z0-9]{6}$/);
    }
  } finally {
    Math.random = originalRandom;
  }
});

test("makeCode puede acortarse con azar exacto (limitacion preexistente)", () => {
  // (0.5).toString(36) === "0.i": el texto tras el punto tiene un solo caracter,
  // asi que el corte slice(2, 8) devuelve un codigo corto. Math.random() real no
  // produce estos valores (0 de 1.000.000 en una muestra), por eso no se corrige
  // dentro de este refactor; queda anotado en TASKS.md.
  const originalRandom = Math.random;
  try {
    Math.random = () => 0.5;
    assert.equal(makeCode(), "I");
  } finally {
    Math.random = originalRandom;
  }
});

test("getToken es estable entre llamadas", () => {
  const primero = getToken();
  const segundo = getToken();
  assert.equal(primero, segundo);
  assert.equal(store.get("oddbound-token"), primero);
});
