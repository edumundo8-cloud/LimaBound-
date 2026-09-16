/**
 * Escenarios de LimaBound.
 *
 * La lista vive en un solo lugar porque la usan los dos lados del juego: la
 * interfaz elige el fondo y la sala 1v1 necesita el mismo indice para simular
 * el relieve del terreno. Antes cada archivo llevaba su propia cuenta.
 */

export type SceneKind = "plaza" | "faro" | "gamarra" | "costa" | "sanmiguel";

export type Scene = {
  /** Nombre corto del distrito o la zona. */
  label: string;
  /** Fondo nocturno que se dibuja detras del combate. */
  src: string;
  /** Punto de referencia que se anuncia sobre el escenario. */
  landmark: string;
  /** Descripcion corta del punto de referencia. */
  detail: string;
  /** Estilo del marcador (clase CSS y glifo). */
  kind: SceneKind;
};

export const SCENES: readonly Scene[] = [
  {
    label: "Jirón de la Unión",
    src: "/game/jiron-union-night.png",
    landmark: "PLAZA SAN MARTÍN",
    detail: "zona bloqueada",
    kind: "plaza",
  },
  {
    label: "Miraflores",
    src: "/game/miraflores-night.webp",
    landmark: "FARO DE MIRAFLORES",
    detail: "malecón central",
    kind: "faro",
  },
  {
    label: "Gamarra",
    src: "/game/gamarra-night.webp",
    landmark: "GALERÍA GAMARRA",
    detail: "corazón comercial",
    kind: "gamarra",
  },
  {
    label: "Costa Verde",
    src: "/game/costa-verde-night.webp",
    landmark: "MALECÓN COSTA VERDE",
    detail: "acantilado central",
    kind: "costa",
  },
  {
    label: "Plaza San Miguel",
    src: "/game/plaza-san-miguel-night.webp",
    landmark: "ÓVALO SAN MIGUEL",
    detail: "La Marina con Universitaria",
    kind: "sanmiguel",
  },
];

/** Cantidad de escenarios disponibles. */
export const SCENE_COUNT = SCENES.length;

/** Escenario determinista para recuperar partidas antiguas sin campo `scene`. */
export const sceneIndexFor = (roundNo?: number): number => {
  const total = SCENES.length;
  const ronda = Math.trunc(Number(roundNo));
  const base = Number.isFinite(ronda) ? ronda : 1;
  return (((base - 1) % total) + total) % total;
};

/**
 * Elige un escenario al azar. Si recibe el escenario anterior, evita repetirlo
 * para que el cambio de ronda siempre resulte visible.
 */
export const randomSceneIndex = (
  previous?: number,
  random: () => number = Math.random,
): number => {
  const total = SCENES.length;
  if (total <= 1) return 0;
  const sampled = Number(random());
  const normalized = Number.isFinite(sampled)
    ? Math.max(0, Math.min(0.999999999, sampled))
    : 0;
  const previousIndex = Number.isInteger(previous) ? Number(previous) : -1;
  if (previousIndex < 0 || previousIndex >= total) {
    return Math.floor(normalized * total);
  }
  const candidate = Math.floor(normalized * (total - 1));
  return candidate >= previousIndex ? candidate + 1 : candidate;
};
