/**
 * Reglas puras de LimaBound.
 *
 * Este modulo no depende de React, del DOM ni de la red: solo describe el
 * estado de la partida y como cambia. Se puede probar con `node --test`
 * (ver `tests/game-rules.test.mjs`).
 *
 * Extraido sin cambios de comportamiento desde `app/page.tsx`
 * (verificado con el arnes de equivalencia descrito en el PR).
 */

export type Line = { who: string; text: string; emote?: boolean };

export type Crater = { x: number; r: number };

export type State = {
  positions: [number, number];
  hp: [number, number];
  turn: 0 | 1;
  turnNo: number;
  roundNo: number;
  matchWins: [number, number];
  turnStartedAt: number;
  moved: [number, number];
  turnsTaken: [number, number];
  specialReadyAt: [number, number];
  itemUsed: [boolean, boolean];
  wind: number;
  winner: number | null;
  craters: Crater[];
  lastEvent: {
    type: string;
    player?: number;
    impactX?: number;
    secondImpactX?: number;
    angle?: number;
    power?: number;
    wind?: number;
    windChanged?: boolean;
    special?: boolean;
    dual?: boolean;
    hit?: boolean;
    damage?: number;
    terrain?: number;
    nonce: number;
  };
  chat: Line[];
};

/** Duracion de un turno. */
export const TURN_MS = 10_000;

/** Pausa bloqueada entre jugadores. */
export const TURN_PAUSE_MS = 1_500;

/** Bloqueo del proyectil; coincide con la pausa. */
export const PROJECTILE_LOCK_MS = TURN_PAUSE_MS;

/** Bloqueo adicional que aplica el disparo doble. */
export const DUAL_LOCK_MS = 2_900;

/** Escenarios nocturnos; rotan con cada ronda. */
export const SCENES = [
  { label: "Jirón de la Unión", src: "/game/jiron-union-night.png" },
  { label: "Miraflores", src: "/game/miraflores-night.webp" },
  { label: "Gamarra", src: "/game/gamarra-night.webp" },
  { label: "Costa Verde", src: "/game/costa-verde-night.webp" },
] as const;

/** Radio de explosion segun jugador y ataque especial. */
export const blastRadius = (player: number, special: boolean) =>
  special ? 50 : player === 0 ? 40 : 34;

/** Radio del crater segun jugador y ataque especial. */
export const craterRadius = (player: number, special: boolean) =>
  special ? 17 : player === 0 ? 14 : 12;

/** Comentarios del juego. */
export const quips = {
  opening: [
    "Tu turno. La confianza también altera la puntería.",
    "Tu turno. El viento ya preparó su coartada.",
    "Apunta con calma; improvisar ya viene incluido.",
    "Tu turno. La geometría espera una explicación.",
  ],
  hit: [
    "Impacto limpio. Hasta la física levantó la ceja.",
    "Buen cálculo. El rival lo verificó personalmente.",
    "Precisión confirmada. La modestia puede esperar.",
    "Golpe directo. El paisaje agradece la excepción.",
    "Eso fue puntería, no suerte. Probablemente.",
  ],
  miss: [
    "El terreno recibió un mensaje que no era para él.",
    "Buen disparo, si estabas negociando con el horizonte.",
    "La trayectoria fue elegante. El resultado, independiente.",
    "Fallaste con suficiente estilo para generar dudas.",
    "El viento acepta felicitaciones, no reclamos.",
    "La intención llegó. El proyectil tomó otra ruta.",
  ],
  special: [
    "El especial fue inolvidable. El objetivo no tanto.",
    "Mucho espectáculo; poca coincidencia geográfica.",
    "La épica ocurrió unos metros fuera de cámara.",
  ],
};

/** Elige un elemento al azar. */
export const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

/** Estado inicial de una partida. */
export const initial: State = {
  positions: [122, 638],
  hp: [160, 160],
  turn: 0,
  turnNo: 1,
  roundNo: 1,
  matchWins: [0, 0],
  turnStartedAt: Date.now(),
  moved: [0, 0],
  turnsTaken: [0, 0],
  specialReadyAt: [0, 0],
  itemUsed: [false, false],
  wind: 5,
  winner: null,
  craters: [],
  lastEvent: { type: "start", nonce: 0 },
  chat: [{ who: "El Rosado", text: "En el Callao primero se apunta. Luego se discute." }],
};

/**
 * Altura del terreno en una coordenada horizontal.
 * Los crateres solo cuentan si su centro esta a menos de `c.r` de `x`.
 */
export const groundAt = (x: number, craters: Crater[] = [], variant = 0) => {
  const profile = ((variant % 4) + 4) % 4;
  let y =
    profile === 0
      ? 303 + 18 * Math.sin(x / 58) + 10 * Math.sin(x / 27) + 5 * Math.sin(x / 13)
      : profile === 1
        ? 300 + 24 * Math.sin(x / 128 + 0.45) + 9 * Math.sin(x / 31) + 4 * Math.cos(x / 17)
        : profile === 2
          ? 307 + 18 * Math.sin(x / 43 + 1.2) + 11 * Math.sin(x / 19) + 5 * Math.cos(x / 83)
          : 300 + 25 * Math.sin(x / 96 + 1.7) + 8 * Math.sin(x / 25 + 0.5) + 4 * Math.cos(x / 15);
  for (const c of craters) {
    const d = Math.abs(x - c.x);
    if (d < c.r) y += Math.sqrt(c.r * c.r - d * d) * 0.42;
  }
  return y;
};

/** Cantidad maxima de crateres conservados en la partida. */
export const MAX_CRATERS = 14;

/** El viento cambia cada cuatro turnos globales (dos jugadas por personaje). */
export const WIND_TURNS = 4;

/**
 * Resuelve un disparo completo: simula la trayectoria de uno o dos proyectiles,
 * aplica dano, crateres, cooldown del especial, item de disparo doble, cambio de
 * viento, cambio de turno y condicion de victoria.
 */
export const resolveShot = (
  s: State,
  player: 0 | 1,
  shotAngle: number,
  shotPower: number,
  special: boolean,
  dual = false,
): State => {
  const terrain = s.craters ?? [];
  const variant = ((s.roundNo ?? 1) - 1) % SCENES.length;
  const shotWind = s.wind;
  const target = (1 - player) as 0 | 1;

  const simulate = (angleValue: number) => {
    const a = (angleValue * Math.PI) / 180;
    let x = s.positions[player];
    let y = groundAt(x, terrain, variant) - 47;
    let dx = Math.cos(a) * shotPower * 0.145 * (player === 0 ? 1 : -1);
    let dy = -Math.sin(a) * shotPower * 0.145;
    for (let i = 0; i < 420 && y < groundAt(x, terrain, variant) && x > 0 && x < 760; i++) {
      x += dx;
      y += dy;
      dy += 0.17;
      dx += shotWind * 0.0019;
    }
    const impactX = Math.max(8, Math.min(752, x));
    const impactY = groundAt(impactX, terrain, variant);
    const targetY = groundAt(s.positions[target], terrain, variant) - 27;
    const targetRadius = target === 0 ? 24 : 18;
    return {
      impactX,
      hit:
        Math.hypot(impactX - s.positions[target], impactY - targetY) <=
        blastRadius(player, special) + targetRadius,
    };
  };

  const first = simulate(dual ? shotAngle - 2.5 : shotAngle);
  const second = dual ? simulate(shotAngle + 2.5) : null;
  const damagePerHit = special ? (player === 0 ? 53 : 44) : 25;
  const damage = (first.hit ? damagePerHit : 0) + (second?.hit ? damagePerHit : 0);

  const nextHp = [...s.hp] as [number, number];
  nextHp[target] = Math.max(0, nextHp[target] - damage);
  const winner = nextHp[target] === 0 ? player : null;
  const nextWins = [...(s.matchWins ?? [0, 0])] as [number, number];
  if (winner !== null) nextWins[player]++;
  const nextTurnNo = winner === null ? s.turnNo + 1 : s.turnNo;

  const nextTurns = [...(s.turnsTaken ?? [0, 0])] as [number, number];
  const nextSpecial = [...(s.specialReadyAt ?? [0, 0])] as [number, number];
  const nextItems = [...(s.itemUsed ?? [false, false])] as [boolean, boolean];
  if (special) nextSpecial[player] = nextTurns[player] + 4;
  if (dual) nextItems[player] = true;
  nextTurns[player]++;

  const windChanged = winner === null && (nextTurnNo - 1) % WIND_TURNS === 0;
  const nextWind = windChanged ? Math.round(Math.random() * 28 - 14) : s.wind;
  const newCraters = [
    { x: first.impactX, r: craterRadius(player, special) },
    ...(second ? [{ x: second.impactX, r: craterRadius(player, false) }] : []),
  ];

  return {
    ...s,
    hp: nextHp,
    winner,
    matchWins: nextWins,
    turn: winner === null ? target : s.turn,
    turnNo: nextTurnNo,
    turnStartedAt: Date.now() + (dual ? DUAL_LOCK_MS : PROJECTILE_LOCK_MS),
    moved:
      winner === null ? (s.moved.map((v, i) => (i === target ? 0 : v)) as [number, number]) : s.moved,
    turnsTaken: nextTurns,
    specialReadyAt: nextSpecial,
    itemUsed: nextItems,
    wind: nextWind,
    craters: [...terrain.slice(-(MAX_CRATERS - newCraters.length)), ...newCraters],
    lastEvent: {
      type: "fire",
      player,
      impactX: first.impactX,
      secondImpactX: second?.impactX,
      angle: shotAngle,
      power: shotPower,
      wind: shotWind,
      windChanged,
      special,
      dual,
      hit: damage > 0,
      damage,
      terrain: variant,
      nonce: Date.now(),
    },
  } as State;
};
