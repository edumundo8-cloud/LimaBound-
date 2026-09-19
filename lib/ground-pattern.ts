/**
 * El piso por donde caminan los personajes.
 *
 * Antes era un gris plano en los dos modos. Ahora lleva un dibujo limeno con
 * tres colores y nada mas: tierra de noche, arena y terracota. Debajo corre el
 * tejido de rombos de una manta; pegada a la superficie, una greca escalonada,
 * la misma cenefa de los frisos de las huacas y de las celosias de los balcones
 * del centro. Se ve poco a proposito: es piso, no decorado, y no debe competir
 * con los personajes ni con la trayectoria.
 *
 * El 2v2 dibuja su terreno en SVG y lleva estos mismos motivos escritos como
 * `<pattern>` en `app/TeamGame.tsx`. Aqui vive la version de canvas que usa el
 * duelo 1v1; si cambias uno, cambia el otro.
 */

/** Arena: la linea del suelo y el trazo de la greca. */
export const GROUND_SAND = "#e8d6ac";
/** Terracota: el fondo de la cenefa y el corazon de cada rombo. */
export const GROUND_CLAY = "#c9683f";
/** Tierra de noche, de la superficie hacia abajo. */
export const GROUND_TOP = "#4a4144", GROUND_MID = "#272637", GROUND_BOTTOM = "#141a2b";
/** Alto de la cenefa y cuanto baja su centro respecto del suelo. */
export const FRIEZE_BAND = 22, FRIEZE_DROP = 14;

const tiles: Record<string, CanvasPattern | null> = {};

/** Un mosaico se pinta una sola vez y se reparte entre todos los cuadros. */
function tile(key: string, width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void): CanvasPattern | null {
  if (key in tiles) return tiles[key];
  let pattern: CanvasPattern | null = null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      paint(ctx);
      pattern = ctx.createPattern(canvas, "repeat");
    }
  } catch {
    pattern = null;
  }
  tiles[key] = pattern;
  return pattern;
}

/** Tejido de rombos: el fondo del terreno, apenas insinuado. */
export const weavePattern = () => tile("weave", 34, 34, ctx => {
  ctx.strokeStyle = "rgba(232,214,172,.06)";
  ctx.lineWidth = .9;
  ctx.beginPath();
  ctx.moveTo(17, 0); ctx.lineTo(34, 17); ctx.lineTo(17, 34); ctx.lineTo(0, 17); ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = "rgba(201,104,63,.1)";
  ctx.beginPath();
  ctx.moveTo(17, 12); ctx.lineTo(22, 17); ctx.lineTo(17, 22); ctx.lineTo(12, 17); ctx.closePath();
  ctx.fill();
});

/**
 * Greca escalonada. El trazo empieza antes del mosaico y termina despues para
 * que la cenefa siga de largo sin cortes de una repeticion a la siguiente.
 */
export const grecaPattern = () => tile("greca", 44, 24, ctx => {
  ctx.fillStyle = "rgba(201,104,63,.13)";
  ctx.fillRect(0, 0, 44, 24);
  ctx.strokeStyle = "rgba(232,214,172,.34)";
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.moveTo(-2, 18); ctx.lineTo(7, 18); ctx.lineTo(7, 12); ctx.lineTo(2, 12); ctx.lineTo(2, 6);
  ctx.lineTo(16, 6); ctx.lineTo(16, 18); ctx.lineTo(25, 18); ctx.lineTo(25, 12); ctx.lineTo(20, 12);
  ctx.lineTo(20, 6); ctx.lineTo(34, 6); ctx.lineTo(34, 18); ctx.lineTo(44, 18);
  ctx.stroke();
});
