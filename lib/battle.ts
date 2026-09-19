// Shared by the authoritative room, practice bot and projectile animation.
export const FIELD_WIDTH = 836;
export const MOVE_BUDGET = 114.4;
export const MOVE_STEP = 37.4;
export const GAP = { left: 370, right: 466 };
export type Crater = { x: number; r: number };
export type Tornado = { x: number; radius: number; spin: number; cycle: number };

export function groundAt(x: number, craters: Crater[] = [], variant = 0): number {
  if (variant === 4 && x > GAP.left && x < GAP.right) return 440;
  const px = x / 1.1, profile = ((variant % 4) + 4) % 4;
  let y = profile === 0 ? 303 + 18*Math.sin(px/58) + 10*Math.sin(px/27) + 5*Math.sin(px/13)
    : profile === 1 ? 300 + 24*Math.sin(px/128+.45) + 9*Math.sin(px/31) + 4*Math.cos(px/17)
    : profile === 2 ? 307 + 18*Math.sin(px/43+1.2) + 11*Math.sin(px/19) + 5*Math.cos(px/83)
    : 300 + 25*Math.sin(px/96+1.7) + 8*Math.sin(px/25+.5) + 4*Math.cos(px/15);
  for (const c of craters) {
    const distance = Math.abs(x-c.x);
    if (distance < c.r) y += Math.sqrt(c.r*c.r-distance*distance)*.42;
  }
  return y;
}

export function movePosition(player: number, position: number, delta: number, used: number): number {
  const available = Math.max(0, MOVE_BUDGET-used);
  if (available < 1e-9) return position;
  const distance = Math.sign(delta)*Math.min(Math.abs(delta), MOVE_STEP, available);
  // Each bank grows 10%; the central gap/landmark remains impassable.
  return Math.max(player === 0 ? 55 : 506, Math.min(player === 0 ? 330 : 781, position+distance));
}

export function tornadoForTurn(turnNo: number, seed: number): Tornado | null {
  const cycle = Math.floor((turnNo-1)/6);
  if (cycle < 1 || (turnNo-1)%6 >= 2) return null;
  // A stored round seed keeps both players and replay physics in agreement.
  let value = (seed ^ Math.imul(cycle, 0x9e3779b9)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  value = (value ^ (value >>> 16)) >>> 0;
  return { x: 170 + (value / 4294967296)*(FIELD_WIDTH-340), radius: 48, spin: value%2 ? 1 : -1, cycle };
}

export function stepProjectile(x: number, y: number, dx: number, dy: number, wind: number, tornado: Tornado | null, pull = 1) {
  x += dx; y += dy; dy += .17; dx += wind*.0019;
  if (tornado) {
    const distance = Math.abs(x-tornado.x);
    if (distance < tornado.radius) {
      // `pull` suaviza el vortice sin cambiar su forma; el 2v2 lo usa a media fuerza.
      const rotation = tornado.spin*.075*pull*(1-distance/tornado.radius);
      const cosine = Math.cos(rotation), sine = Math.sin(rotation), oldDx = dx;
      dx = oldDx*cosine-dy*sine;
      dy = oldDx*sine+dy*cosine-.025*pull;
    }
  }
  return { x, y, dx, dy };
}

// Impact rules shared by the authoritative room, practice bot and animation.
export const blastRadius = (player: number, special: boolean) => special ? 50 : player === 0 ? 40 : 34;
export const craterRadius = (player: number, special: boolean) => special ? 17*1.2 : (player === 0 ? 14 : 12)*1.1;
export const targetRadiusFor = (player: number) => player === 0 ? 24 : 18;
export const shotDamage = (player: number, special: boolean) => special ? (player === 0 ? 53 : 44) : 25;
