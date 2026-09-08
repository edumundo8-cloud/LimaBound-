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
