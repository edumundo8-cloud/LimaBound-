import type {CharacterId} from "./characters.ts";

type ProjectileArt = {name:string;body:string;fill:string;detail:string;ink:string;accent?:string};

// Small vector silhouettes stay legible in flight without loading image assets.
export const PROJECTILE_ART:Record<CharacterId,ProjectileArt> = {
 "perro-peruano": {
  name:"Hueso",fill:"#fff2ce",ink:"#b39c73",
  body:"M-7-3C-13-10-17-3-12 0C-17 4-11 10-7 3L7 3C12 10 17 4 12 0C17-4 11-10 7-3Z",
  detail:"M-6-1H6M-11-4L-9-3M9 3L11 4",
 },
 "cocinero-chifa": {
  name:"Wantán",fill:"#ffd36a",ink:"#b97529",
  body:"M-13 5L-5-8Q0-5 4-9L14 5Q7 11 0 7Q-7 11-13 5Z",
  detail:"M-10 5L-4-4L0 4L4-5L11 5M-5 6Q0 1 5 6",
 },
 "churrera-limena": {
  name:"Churro",fill:"#d68a38",ink:"#ffe3a0",
  body:"M-12-4Q-15 0-12 4L11 4Q15 1 12-4Z",
  detail:"M-11-2H10M-12 1H12M-10 3H10",accent:"#fff7d7",
 },
 "mototaxista": {
  name:"Llanta",fill:"#303b49",ink:"#b7d0d9",
  body:"M9 0A9 9 0 1 1-9 0A9 9 0 1 1 9 0Z",
  detail:"M5 0A5 5 0 1 1-5 0A5 5 0 1 1 5 0ZM-4-3L4 3M-4 3L4-3M0-5V5M-7-4L-6-5M6 5L7 4",
 },
 "cobrador-combi": {
  name:"Boleto",fill:"#8ae1be",ink:"#20565b",
  body:"M-13-7H13V-3Q8 0 13 3V7H-13V3Q-8 0-13-3Z",
  detail:"M-6-5V-3M-6-1V1M-6 3V5M-2-3H7M-2 0H5M-2 3H7",
 },
 "maestro-cevichero": {
  name:"Pescado",fill:"#6dd6db",ink:"#164958",
  body:"M-6 0L-14-7L-13 7L-6 1Q3 13 14 0Q3-13-6 0Z",
  detail:"M5-5Q1 0 5 5M-4-2L1-6M-3 3L1 6M9-2h.1",accent:"#e1ffff",
 },
};

const paths=new Map<string,Path2D>();
function path(d:string){let p=paths.get(d);if(!p){p=new Path2D(d);paths.set(d,p)}return p}

export function drawCharacterProjectile(ctx:CanvasRenderingContext2D,character:CharacterId){
 const art=PROJECTILE_ART[character]??PROJECTILE_ART["perro-peruano"];
 ctx.lineJoin="round";ctx.lineCap="round";ctx.lineWidth=1.5;
 ctx.strokeStyle="#172130";ctx.fillStyle=art.fill;
 ctx.stroke(path(art.body));ctx.fill(path(art.body));
 ctx.strokeStyle=art.ink;ctx.lineWidth=1.2;ctx.stroke(path(art.detail));
 if(art.accent){
  ctx.fillStyle=art.accent;
  if(character==="churrera-limena"){
   for(const [x,y] of [[-9,-2],[-5,2],[0,-1],[4,2],[8,-2]])ctx.fillRect(x,y,.9,.9);
  }else{ctx.beginPath();ctx.arc(9,-2,1.3,0,Math.PI*2);ctx.fill()}
 }
}
