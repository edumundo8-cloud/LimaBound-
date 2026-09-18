// Pruebas de la pantalla del 2v2.
//
// La pantalla se apoya en animaciones y en requestAnimationFrame, asi que en vez
// de montar un navegador estas pruebas leen el componente y la hoja de estilo,
// igual que las pruebas del duelo 1v1.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ui = await readFile(new URL("../app/TeamGame.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/team-game.css", import.meta.url), "utf8");
const voice = await readFile(new URL("../app/useTeamVoice.ts", import.meta.url), "utf8");
const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("el reloj y el viento mandan en el centro de arriba del mapa", () => {
  assert.match(ui, /className=\{`team-wind \$\{game\.wind<0\?"left":"right"\}`\}/);
  // Los dos indicadores viven dentro del escenario, despues del SVG del terreno.
  assert.ok(ui.indexOf("team-hud") > ui.indexOf("className=\"team-terrain\""), "el marcador va dentro del escenario");
  assert.doesNotMatch(ui, /Viento \{game\.wind<0/);
  assert.match(css, /\.team-hud\{position:absolute;[^}]*left:50%;[^}]*transform:translateX\(-50%\)/);
  // La cuenta regresiva es el numero mas grande de la pantalla de juego.
  assert.match(ui, /role="timer" aria-label=\{`\$\{remaining\} segundos de turno`\}/);
  assert.match(css, /\.team-clock b\{font-size:clamp\(19px,3\.4vw,27px\)/);
  assert.match(css, /\.team-clock\.mine\{/, "tu turno se pinta distinto");
  assert.match(css, /\.team-clock\.urgent\{[^}]*animation:team-clock-beat/, "los ultimos segundos laten");
});

test("la mira es una guia punteada con punta de flecha, no una linea gruesa", () => {
  assert.match(ui, /<marker id="team-aim-head"/);
  assert.match(ui, /strokeDasharray="9 7"[^/]*markerEnd="url\(#team-aim-head\)"/);
  assert.doesNotMatch(ui, /strokeWidth="4"\/>\}/);
  assert.match(ui, /aimReach=54\+power\*\.5/, "la mira crece con la potencia cargada");
});

test("el proyectil deja cola de cometa y el SS se dibuja distinto", () => {
  assert.match(ui, /className=\{shot\.special\?"team-orb-ss":"team-orb"\}/);
  assert.ok(ui.includes("const tail=shot.path.slice(Math.max(0,frame-(shot.special?22:16)),frame+1)"), "la cola son los ultimos puntos del vuelo");
  assert.ok(ui.includes("const core=shot.path.slice(Math.max(0,frame-(shot.special?9:7)),frame+1)"), "y la parte reciente arde mas clara");
  assert.match(ui, /<polyline points=\{tail\}[^>]*opacity="\.22"/);
  assert.ok(ui.includes("const r=shot.radius*(.4+age*1.1)"), "el radio del impacto sale de las reglas");
  assert.match(ui, /shot\.special&&<circle[^>]*r=\{r\*1\.95\}/, "el SS suma un tercer anillo");
  assert.match(css, /\.team-orb-ss\{filter:drop-shadow/);
});

test("SS y Dual Shot se anuncian como un uso por partida", () => {
  assert.match(ui, /disabled=\{!myTurn\|\|mine\.specialUsed\}/);
  assert.match(ui, /disabled=\{!myTurn\|\|mine\.dualUsed\}/);
  assert.match(ui, /mine\.specialUsed\?"Usado":"1 por partida"/);
  assert.match(ui, /mine\.dualUsed\?"Usado":"1 por partida"/);
});

test("caminar apunta hacia donde caminas", () => {
  assert.match(ui, /const walk=useCallback\(\(delta:number\)=>\{setDirection\(delta<0\?-1:1\);void act\(\{type:"move",delta\}\)\}/);
  assert.match(ui, /onClick=\{\(\)=>walk\(-TEAM_STEP\)\}/);
  assert.match(ui, /onClick=\{\(\)=>walk\(TEAM_STEP\)\}/);
  assert.doesNotMatch(ui, /act\(\{type:"move",delta:event\.key==="ArrowLeft"/);
});

test("el tornado del 2v2 tiene su propia animacion de embudo", () => {
  assert.match(ui, /className=\{`team-tornado \$\{tornado\.spin<0\?"counterclockwise":""\}`\}/);
  assert.match(css, /@keyframes team-tornado-sway/);
  assert.match(css, /@keyframes team-debris/);
  // El embudo se estrecha hacia abajo: cada anillo es mas angosto que el anterior.
  const widths = [...css.matchAll(/\.team-tornado i:nth-child\(\d+\)\{top:[^;]+;width:(\d+)%/g)].map(m => Number(m[1]));
  assert.ok(widths.length >= 8, "faltan anillos del embudo");
  assert.deepEqual(widths, [...widths].sort((a, b) => b - a), "los anillos deben ir cerrandose");
});

test("el reloj sigue vivo aunque la pestana pase a segundo plano", () => {
  assert.match(ui, /setInterval\(\(\)=>setClock\(Date\.now\(\)\+clockOffset\.current\),250\)/);
  assert.match(ui, /addEventListener\("visibilitychange",wake\)/);
});

test("la voz se puede probar desde la sala de espera y reintenta los enlaces caidos", () => {
  assert.match(ui, /className="team-lobby-voice"/);
  assert.match(ui, /Prueba el micrófono aquí antes de empezar/);
  assert.match(voice, /const stale=useCallback\(\(id:number\)=>/);
  assert.match(voice, /if\(stale\(signal\.from\)\)closePeer\(signal\.from\)/);
  assert.match(voice, /if\(stale\(id\)\)closePeer\(id\);\s*\n?\s*void transmit\(id,"ready"\)/);
});

test("la pantalla se adapta a telefono vertical, telefono acostado y monitor", () => {
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /@media\(max-height:560px\) and \(orientation:landscape\)/);
  // Nada de anchos fijos en el campo: todo escala con clamp().
  assert.match(css, /\.team-stage\{height:clamp\(/);
  assert.match(css, /\.team-fighter\{[^}]*width:clamp\(/);
  assert.match(css, /\.team-aim\{display:flex;flex-wrap:wrap/, "el boton de disparo tiene que poder bajar de fila");
  // El campo y los combatientes escalan: nunca llevan un tamano fijo en pixeles.
  assert.doesNotMatch(css, /.team-(stage|fighter){[^}]*(width|height):d+px/);
});

test("las llaves del CSS del 2v2 quedan equilibradas", () => {
  assert.equal((css.match(/\{/g) ?? []).length, (css.match(/\}/g) ?? []).length);
});

test("la portada manda las salas 1v1 viejas al duelo y declara los imports arriba", () => {
  const home = page.indexOf("export default function Home()");
  const lastImport = page.lastIndexOf("\nimport ");
  assert.ok(home > lastImport, "el componente va despues de los imports, no entre ellos");
  assert.match(page, /location\.replace\(`\/duel\?room=\$\{encodeURIComponent\(oldRoom\)\}`\)/);
});

test("el hueco se abre en el instante del impacto, no al final de la animacion", () => {
  assert.ok(ui.includes("const landedAt=(shot:{delay:number;path:unknown[]})=>shot.delay+shot.path.length*1000/60"));
  assert.ok(ui.includes("filter(shot=>!shot.wall&&elapsed>=landedAt(shot))"), "cada disparo abre su crater al tocar el suelo");
  assert.doesNotMatch(ui, /displayCraters=firing\?\(game\.event\.cratersBefore\?\?game\.craters\):game\.craters/);
});

test("el juego ofrece pantalla completa donde el navegador la soporta", () => {
  assert.match(ui, /setCanFullscreen\(!!document\.fullscreenEnabled&&!!shell\.current\?\.requestFullscreen\)/);
  assert.match(ui, /className="team-fullscreen"/);
  assert.match(ui, /document\.addEventListener\("fullscreenchange",sync\)/);
  assert.match(css, /\.team-app:fullscreen\{padding:4px\}/, "en pantalla completa el borde es minimo");
  assert.match(css, /\.team-app\.is-fullscreen \.team-field[^{]*\{max-width:none\}/, "y nada limita el ancho");
  assert.doesNotMatch(css, /\.team-app\.is-fullscreen[^{]*\{[^}]*max-width:min\(1600px/);
});

test("la flecha de turno apunta a quien juega", () => {
  assert.match(ui, /\{game\.turn===p\.id&&shownHP\(p\.id\)>0&&<u className="team-turn-flag"/);
  assert.match(css, /\.team-turn-flag\{position:absolute[^}]*border-top:9px solid var\(--player-color\)/);
  assert.match(css, /@keyframes team-turn-flag\{/);
});

test("el fondo sopla hacia el mismo lado que el viento", () => {
  assert.match(ui, /className=\{`team-gusts \$\{game\.wind<0\?"left":"right"\}`\}/);
  assert.match(ui, /"--gust":`\$\{Math\.max\(2\.6,7\.4-Math\.abs\(game\.wind\)\*\.3\)\}s`/, "mas viento, rafagas mas rapidas");
  const gusts = ui.match(/team-gusts[^>]*>(<i\/>)+/)?.[0] ?? "";
  assert.equal((gusts.match(/<i\/>/g) ?? []).length, 8, "ocho rafagas cruzando el fondo");
  assert.match(css, /\.team-gusts i:nth-child\(8\)\{/);
  assert.match(css, /@keyframes team-gust\{/);
  assert.match(css, /@keyframes team-gust-left\{/);
  assert.match(css, /\.team-gusts\.left i\{animation-name:team-gust-left\}/);
});

test("el monumento se dibuja como muralla solida", () => {
  assert.match(ui, /\{wall&&<div className="team-wall"/);
  assert.match(ui, /aria-label="Monumento: los disparos no lo atraviesan"/);
  assert.match(css, /\.team-wall\{position:absolute/);
});

test("el bonus por angulo alto se ve en los controles", () => {
  assert.match(ui, /angle>HIGH_ANGLE&&<em className="team-bonus"> \+15%<\/em>/);
  assert.match(css, /\.team-bonus\{/);
});

test("el monumento no lleva recuadro encima, solo su sombra en el suelo", () => {
  assert.match(css, /\.team-wall\{position:absolute;z-index:1;pointer-events:none;background:none;border:0\}/);
  assert.doesNotMatch(css, /\.team-wall\{[^}]*box-shadow:inset/);
  assert.match(css, /\.team-wall:after\{[^}]*radial-gradient/, "queda solo la sombra difusa del pie");
});

test("el personaje da una zancada corta al caminar", () => {
  assert.match(ui, /const walking=\(id:number\)=>game\.event\.kind==="move"&&game\.event\.player===id&&elapsed<430/);
  assert.match(ui, /\$\{walking\(p\.id\)\?"walking":""\}/);
  assert.match(css, /\.team-fighter\.walking img\{animation:team-step/);
  assert.match(css, /@keyframes team-step\{/);
});

test("todo el juego entra en una pantalla, sin subir ni bajar", () => {
  assert.match(ui, /\$\{game\.phase==="lobby"\?"is-lobby":"is-playing"\}/);
  assert.match(css, /\.team-app\.is-playing\{height:100dvh;overflow:hidden;display:flex;flex-direction:column/);
  assert.match(css, /\.team-app\.is-playing \.team-field\{flex:1 1 auto/, "el campo se queda con el espacio que sobra");
  assert.match(css, /\.team-app\.is-playing \.team-chat\{position:fixed/, "el chat flota en vez de empujar");
});

test("el marcador y el orden de turnos viven en una sola columna del campo", () => {
  assert.match(ui, /<aside className="team-board"/);
  assert.match(ui, /const remaining=[^\n]*order=\[game\.turn,\.\.\.next\]/, "la columna arranca por quien juega ahora");
  assert.doesNotMatch(ui, /className="team-roster" aria-label="Jugadores y vida"/, "el marcador de arriba desaparece");
  assert.doesNotMatch(ui, /className="team-turn-queue"/, "la fila de abajo tambien");
  assert.match(css, /\.team-board\{position:absolute;z-index:6/);
});

test("espacio y flechas no mueven la pagina, y el angulo se ajusta esperando turno", () => {
  assert.match(ui, /if\(event\.code==="Space"\)\{event\.preventDefault\(\);startCharge\(\);return\}/);
  assert.match(ui, /if\(event\.key==="ArrowUp"\|\|event\.key==="ArrowDown"\)\{event\.preventDefault\(\);setAngle/, "el angulo se mueve siempre");
  assert.match(ui, /if\(event\.key==="ArrowLeft"\|\|event\.key==="ArrowRight"\)\{event\.preventDefault\(\);if\(myTurn\)walk/, "caminar sigue siendo solo en tu turno");
  assert.match(ui, /className=\{`team-aim-guide \$\{myTurn\?"":"waiting"\}`\}/);
  assert.match(css, /\.team-aim-guide\.waiting\{opacity:/);
});

test("cada item lleva su dibujo", () => {
  assert.match(ui, /const IconSS=\(\)=><svg className="team-icon"/);
  assert.match(ui, /const IconDual=\(\)=><svg className="team-icon"/);
  assert.match(ui, /const IconHeal=\(\)=><svg className="team-icon"/);
  assert.match(ui, /fill="#ff4d5e"/, "la cura es una cruz roja");
  assert.match(ui, /><IconSS\/>SS /);
  assert.match(ui, /><IconDual\/>DUAL SHOT /);
  assert.match(ui, /><IconHeal\/>CURA /);
  assert.match(css, /\.team-icon\{width:clamp/);
});

test("el mapa no deja margenes muertos y la barra de carga vuelve a ser larga", () => {
  assert.match(css, /\.team-app\.is-playing \.team-field\{max-width:none/, "sin barras negras a los lados");
  assert.match(css, /\.team-app\.is-playing\{[^}]*gap:4px;padding:5px/);
  // La carga ocupa la fila entera salvo en horizontal, donde el alto es el problema.
  assert.match(css, /\.team-charge\{grid-column:1\/-1\}/);
  const suelta = css.slice(0, css.indexOf("@media"));
  assert.doesNotMatch(suelta, /\.team-app\.is-playing \.team-charge\{grid-column:auto\}/);
});
