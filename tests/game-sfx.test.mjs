// Pruebas del motor de sonido (`lib/game/sfx.ts`).
//
// El sintetizador vivia dentro de `app/page.tsx` y no se probaba. Aqui se fija
// que cada efecto construya los nodos esperados y que el viento dependa de su
// fuerza, usando un AudioContext simulado.

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

const { playSfx } = await vite.ssrLoadModule("/lib/game/sfx.ts");

/** AudioContext simulado que registra los nodos creados. */
const makeCtx = (state = "running", sampleRate = 44_100) => {
  const registro = {
    osciladores: [],
    buffers: [],
    filtros: [],
    ganancias: [],
    conectados: 0,
    iniciados: 0,
  };
  const param = () => ({
    value: undefined,
    setValueAtTime() {},
    exponentialRampToValueAtTime() {},
  });
  const base = (extra) => ({ ...extra, connect: (n) => (registro.conectados++, n), start() {}, stop() {} });
  const ctx = {
    state,
    sampleRate,
    currentTime: 1,
    destination: {},
    createOscillator() {
      const o = base({ type: "", frequency: param() });
      registro.osciladores.push(o);
      return o;
    },
    createGain() {
      const g = base({ gain: param() });
      registro.ganancias.push(g);
      return g;
    },
    createBufferSource() {
      return base({ buffer: null });
    },
    createBiquadFilter() {
      const f = base({ type: "", frequency: param(), Q: param() });
      registro.filtros.push(f);
      return f;
    },
    createBuffer(channels, length, rate) {
      const data = new Float32Array(Math.floor(length));
      const b = { channels, length, rate, getChannelData: () => data, data };
      registro.buffers.push(b);
      return b;
    },
  };
  return { ctx, registro };
};

test("sin contexto no hace nada ni falla", () => {
  assert.doesNotThrow(() => playSfx(null, "fire", 3));
  assert.doesNotThrow(() => playSfx(null, "wind", -12));
});

test("con el audio suspendido no construye nodos", () => {
  const { ctx, registro } = makeCtx("suspended");
  playSfx(ctx, "impact", 0);
  assert.equal(registro.osciladores.length, 0);
  assert.equal(registro.buffers.length, 0);
});

test("los pasos usan dos tonos y ningun buffer", () => {
  const { ctx, registro } = makeCtx();
  playSfx(ctx, "move", 0);
  assert.equal(registro.osciladores.length, 2);
  assert.equal(registro.buffers.length, 0);
  assert.deepEqual(
    registro.osciladores.map((o) => o.type),
    ["sine", "sine"],
  );
});

test("el disparo usa tres tonos y ningun buffer", () => {
  const { ctx, registro } = makeCtx();
  playSfx(ctx, "fire", 0);
  assert.equal(registro.osciladores.length, 3);
  assert.equal(registro.buffers.length, 0);
  assert.equal(registro.osciladores[0].type, "triangle");
});

test("el impacto anade ruido con filtro paso bajo", () => {
  const { ctx, registro } = makeCtx();
  playSfx(ctx, "impact", 0);
  assert.equal(registro.osciladores.length, 2);
  assert.equal(registro.buffers.length, 1);
  assert.equal(registro.buffers[0].length, Math.floor(44_100 * 0.38));
  assert.equal(registro.filtros.length, 1);
  assert.equal(registro.filtros[0].type, "lowpass");
  assert.equal(registro.filtros[0].frequency.value, 820);
});

test("el viento filtra ruido segun su fuerza", () => {
  const suave = makeCtx();
  playSfx(suave.ctx, "wind", 0);
  assert.equal(suave.registro.buffers.length, 1);
  assert.equal(suave.registro.buffers[0].length, 44_100 * 0.75);
  assert.equal(suave.registro.filtros[0].type, "bandpass");
  assert.equal(suave.registro.filtros[0].frequency.value, 520);
  assert.equal(suave.registro.filtros[0].Q.value, 0.55);

  const fuerte = makeCtx();
  playSfx(fuerte.ctx, "wind", -14);
  // el signo del viento no importa: solo su magnitud
  assert.equal(fuerte.registro.filtros[0].frequency.value, 520 + 14 * 22);
});

test("cada efecto conecta y arranca sus nodos", () => {
  for (const kind of ["move", "fire", "impact", "wind"]) {
    const { ctx, registro } = makeCtx();
    playSfx(ctx, kind, 4);
    assert.ok(registro.conectados > 0, `${kind} debe conectar nodos`);
  }
});
