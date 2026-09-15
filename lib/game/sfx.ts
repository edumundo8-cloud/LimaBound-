/**
 * Efectos de sonido sintetizados de LimaBound.
 *
 * Sin React y sin estado: recibe el `AudioContext` y el viento actual, y
 * construye cada sonido con osciladores y ruido filtrado. Ver
 * `tests/game-sfx.test.mjs`, que lo prueba con un contexto simulado.
 *
 * Extraido sin cambios de comportamiento desde `app/page.tsx`
 * (verificado con el arnes de equivalencia descrito en el PR).
 */

export type SfxKind = "wind" | "move" | "fire" | "impact";

export const playSfx = (ctx: AudioContext | null, kind: SfxKind, wind: number) => {
  if (!ctx || ctx.state !== "running") return;

  const t = ctx.currentTime;

  /** Tono corto con envolvente de ataque y caida. */
  const tone = (
    start: number,
    end: number,
    at: number,
    duration: number,
    volume: number,
    type: OscillatorType = "sine",
  ) => {
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(start, at);
    osc.frequency.exponentialRampToValueAtTime(end, at + duration);
    gain.gain.setValueAtTime(0.001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + duration + 0.02);
  };

  if (kind === "move") {
    tone(230, 320, t, 0.09, 0.045, "sine");
    tone(285, 390, t + 0.075, 0.1, 0.036, "sine");
    return;
  }

  if (kind === "fire") {
    tone(760, 185, t, 0.24, 0.085, "triangle");
    tone(118, 72, t + 0.025, 0.16, 0.05, "sine");
    tone(920, 1320, t + 0.17, 0.1, 0.025, "sine");
    return;
  }

  if (kind === "impact") {
    tone(150, 48, t, 0.34, 0.11, "sawtooth");
    tone(72, 38, t + 0.025, 0.46, 0.1, "sine");
    const burst = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.38), ctx.sampleRate),
      noise = burst.getChannelData(0);
    for (let i = 0; i < noise.length; i++)
      noise[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noise.length, 2);
    const source = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter(),
      gain = ctx.createGain();
    source.buffer = burst;
    filter.type = "lowpass";
    filter.frequency.value = 820;
    gain.gain.setValueAtTime(0.13, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(t);
    return;
  }

  // Viento: ruido filtrado cuya frecuencia depende de la fuerza actual.
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.75, ctx.sampleRate),
    data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const source = ctx.createBufferSource(),
    filter = ctx.createBiquadFilter(),
    gain = ctx.createGain();
  source.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.value = 520 + Math.abs(wind) * 22;
  filter.Q.value = 0.55;
  gain.gain.setValueAtTime(0.001, t);
  gain.gain.exponentialRampToValueAtTime(0.065, t + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.74);
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(t);
  source.stop(t + 0.76);
  tone(640, 980, t + 0.09, 0.48, 0.018, "sine");
};
