import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("animates projectiles at one simulation step per frame", () => {
  assert.doesNotMatch(pageSource, /for\(let step=0;step<2;step\+\+\)/);
  assert.match(pageSource, /const tick=\(\)=>\{x\+=dx;y\+=dy;dy\+=\.17;dx\+=shotWind\*\.0019;n\+\+;/);
});

test("fires the ready basic shot with Space on desktop", () => {
  assert.match(pageSource, /e\.code!=="Space"/);
  assert.match(pageSource, /matchMedia\("\(pointer: fine\)"\)/);
  assert.match(pageSource, /act\("fire",\{angle,power,special:false,dual:dualArmed\}\)/);
});

test("supports desktop arrow controls for aim and movement", () => {
  assert.match(pageSource, /e\.code==="ArrowUp"\|\|e\.code==="ArrowDown"/);
  assert.match(pageSource, /setAngle\(current=>Math\.max\(18,Math\.min\(78,current\+/);
  assert.match(pageSource, /e\.code==="ArrowLeft"\|\|e\.code==="ArrowRight"/);
  assert.match(pageSource, /act\("move",\{delta:e\.code==="ArrowLeft"\?-34:34\}\)/);
});

test("charges with Space and fires on release", () => {
  assert.match(pageSource, /spaceCharge\.current=true;startCharge\(\)/);
  assert.match(pageSource, /window\.addEventListener\("keyup",keyboardUp\)/);
  assert.match(pageSource, /const shotPower=chargePower\.current/);
  assert.match(pageSource, /keyboardPower:shotPower/);
});

test("keeps advancing the scene counter for a new match", () => {
  assert.match(pageSource, /roundNo:\(s\.roundNo\?\?1\)\+1/);
  assert.match(pageSource, /roundDisplay=matchWins\[0\]\+matchWins\[1\]\+1/);
});
