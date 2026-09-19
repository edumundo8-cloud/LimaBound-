/** Deterministic, bounded canvas effects shared by the duel and team battle.
 * Positions come from the simulation; these particles never affect collisions. */
export type EffectPoint = {x:number;y:number};
const TAU=Math.PI*2;
const noise=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v)};
function glow(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,center:string,edge:string){
 const g=ctx.createRadialGradient(x,y,0,x,y,Math.max(.1,r));
 g.addColorStop(0,center);g.addColorStop(.4,edge);g.addColorStop(1,"#0000");
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,Math.max(.1,r),0,TAU);ctx.fill();
}

export function drawProjectile(ctx:CanvasRenderingContext2D,path:EffectPoint[],color:string,special=false,time=0){
 const head=path.at(-1);if(!head)return;
 const size=special?1.4:1,tail=path.slice(-28),previous=path.at(-2)??{x:head.x-1,y:head.y};
 ctx.save();
 // Expanding smoke follows the actual curved path and disperses behind it.
 for(let i=0;i<tail.length-1;i+=2){
  const age=(tail.length-1-i)/28,p=tail[i],drift=Math.sin(i*1.7+time*.002)*age*4;
  ctx.globalAlpha=(1-age)*.32;
  glow(ctx,p.x+drift,p.y-age*8,(2+age*8)*size,"#a1a8ac99","#727a8055");
 }
 ctx.globalCompositeOperation="lighter";
 for(let i=Math.max(1,tail.length-14);i<tail.length;i++){
  const strength=(i-(tail.length-14))/14;
  ctx.globalAlpha=Math.max(0,strength)*.8;ctx.strokeStyle=i>tail.length-5?"#fff3c4":color;
  ctx.lineWidth=(.6+Math.max(0,strength)*3.5)*size;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(tail[i-1].x,tail[i-1].y);ctx.lineTo(tail[i].x,tail[i].y);ctx.stroke();
 }
 ctx.globalAlpha=.75;glow(ctx,head.x,head.y,15*size,"#fff0bd",color);
 ctx.globalCompositeOperation="source-over";ctx.globalAlpha=1;
 ctx.translate(head.x,head.y);ctx.rotate(Math.atan2(head.y-previous.y,head.x-previous.x));
 const metal=ctx.createLinearGradient(0,-3*size,0,3*size);
 metal.addColorStop(0,"#273140");metal.addColorStop(.28,"#fff8dc");metal.addColorStop(.55,color);metal.addColorStop(1,"#17202c");
 ctx.fillStyle=metal;ctx.beginPath();ctx.ellipse(0,0,6.5*size,3*size,0,0,TAU);ctx.fill();
 ctx.fillStyle="#fffbed";ctx.beginPath();ctx.ellipse(3*size,-.7*size,2.5*size,.9*size,0,0,TAU);ctx.fill();
 ctx.restore();
}

/** age is normalized to the existing impact window, keeping turn timing intact. */
export function drawExplosion(ctx:CanvasRenderingContext2D,p:EffectPoint,radius:number,age:number,color:string,special=false,wall=false){
 if(age<0||age>=1)return;
 const fade=1-age,scale=radius/64,burst=Math.sin(Math.min(1,age*3)*Math.PI/2);
 ctx.save();
 // Smoke billows rise while the fire cools. Stable seeds avoid frame-to-frame flicker.
 for(let i=0;i<11;i++){
  const a=-Math.PI+noise(i+3)*Math.PI,travel=(10+noise(i+22)*25)*age*scale;
  const x=p.x+Math.cos(a)*travel,y=p.y+Math.sin(a)*travel-age*24*scale;
  ctx.globalAlpha=Math.sin(Math.PI*Math.min(.98,age+.06))*.62;
  glow(ctx,x,y,(5+age*21)*(0.7+noise(i+50)*.6)*scale,"#34383dce","#77716a80");
 }
 ctx.globalCompositeOperation="lighter";ctx.globalAlpha=Math.pow(fade,4)*.25;
 glow(ctx,p.x,p.y,32*scale,"#fff7db",color);
 ctx.globalAlpha=Math.pow(fade,3);
 glow(ctx,p.x,p.y-5*scale,(12+burst*40)*scale,"#fffce1",special?"#ffad36":"#ff842d");
 for(let i=0;i<7;i++){
  const a=-Math.PI+noise(i+91)*Math.PI,d=burst*(12+noise(i+5)*18)*scale;
  glow(ctx,p.x+Math.cos(a)*d,p.y+Math.sin(a)*d,(7+burst*11)*scale,"#fff2b8","#e66016");
 }
 ctx.globalAlpha=Math.pow(fade,4)*.8;
 ctx.strokeStyle="#ffe6b0";ctx.lineWidth=Math.max(.5,2*fade);
 ctx.beginPath();ctx.ellipse(p.x,p.y,Math.max(1,radius*burst),Math.max(1,radius*burst*(wall?.85:.26)),0,0,TAU);ctx.stroke();
 ctx.globalCompositeOperation="source-over";
 for(let i=0;i<(special?24:16);i++){
  const a=wall?noise(i+14)*TAU:-Math.PI*.95+noise(i+14)*Math.PI*.9;
  const speed=(25+noise(i+34)*55)*scale,t=age;
  const x=p.x+Math.cos(a)*speed*t,y=p.y+Math.sin(a)*speed*t+35*t*t*scale;
  ctx.globalAlpha=fade;ctx.strokeStyle=i%3===0?"#ffcf7b":"#8c7760";ctx.lineWidth=(i%3===0?1:2)*scale;
  ctx.beginPath();ctx.moveTo(x-Math.cos(a)*5*fade,y-Math.sin(a)*5*fade);ctx.lineTo(x,y);ctx.stroke();
 }
 // Low, spreading dust remains after the flash instead of a solid expanding disk.
 if(!wall)for(let i=0;i<8;i++){
  ctx.globalAlpha=fade*.45;const side=i%2?1:-1;
  glow(ctx,p.x+side*(8+age*(20+i*5))*scale,p.y-3-i%3*2,(6+age*13)*scale,"#b59c7777","#6e625255");
 }
 ctx.restore();
}
