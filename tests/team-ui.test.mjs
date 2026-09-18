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

test("el viento se lee en el centro del mapa y ya no en la cabecera", () => {
  assert.match(ui, /className=\{`team-wind \$\{game\.wind<0\?"left":"right"\}`\}/);
  // El indicador vive dentro del escenario, despues del SVG del terreno.
  assert.ok(ui.indexOf("team-wind") > ui.indexOf("className=\"team-terrain\""), "el viento va dentro del escenario");
  assert.doesNotMatch(ui, /Viento \{game\.wind<0/);
  assert.match(css, /\.team-wind\{position:absolute;[^}]*left:50%;[^}]*transform:translateX\(-50%\)/);
});

test("la mira es una guia punteada con punta de flecha, no una linea gruesa", () => {
  assert.match(ui, /<marker id="team-aim-head"/);
  assert.match(ui, /strokeDasharray="9 7"[^/]*markerEnd="url\(#team-aim-head\)"/);
  assert.doesNotMatch(ui, /strokeWidth="4"\/>\}/);
  assert.match(ui, /aimReach=54\+power\*\.5/, "la mira crece con la potencia cargada");
});

test("el SS se dibuja distinto y abre una onda mas ancha que el disparo normal", () => {
  assert.match(ui, /shot\.special\s*\n?\s*\?<g key=\{i\} className="team-orb-ss">/);
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
  assert.match(css, /\.team-app:fullscreen\{/);
  assert.match(css, /\.team-app\.is-fullscreen \.team-stage\{height:clamp\(/);
});

test("el fondo sopla hacia el mismo lado que el viento", () => {
  assert.match(ui, /className=\{`team-gusts \$\{game\.wind<0\?"left":"right"\}`\}/);
  assert.match(ui, /"--gust":`\$\{Math\.max\(3\.2,9-Math\.abs\(game\.wind\)\*\.32\)\}s`/, "mas viento, rafagas mas rapidas");
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
