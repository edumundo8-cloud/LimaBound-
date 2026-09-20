"use client";
import {useEffect,useRef} from "react";
import {drawExplosion,drawProjectile} from "@/lib/combat-effects";
import {COLORS,TEAM_WIDTH,type TeamState} from "@/lib/team-game";
import type {CharacterId} from "@/lib/characters";

export default function CombatEffects({event,elapsed,character}:{event:TeamState["event"];elapsed:number;character:CharacterId}){
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const ctx=canvas.current?.getContext("2d");if(!ctx)return;
  ctx.clearRect(0,0,TEAM_WIDTH,390);
  if(event.kind!=="fire")return;
  for(const shot of event.shots??[]){
   const frame=(elapsed-shot.delay)*60/1000;
   if(frame<0)continue;
   const index=Math.floor(frame),color=COLORS[event.player??0];
   if(index<shot.path.length){
    const point=shot.path[index],next=shot.path[index+1]??point,fraction=frame-index;
    const head={x:point.x+(next.x-point.x)*fraction,y:point.y+(next.y-point.y)*fraction};
    drawProjectile(ctx,[...shot.path.slice(Math.max(0,index-28),index),head],color,shot.special,elapsed,character);
   }else drawExplosion(ctx,shot.impact,shot.radius,(frame-shot.path.length)/36,color,shot.special,shot.wall);
  }
 },[event,elapsed,character]);
 return <canvas ref={canvas} className="team-combat-effects" width={Math.ceil(TEAM_WIDTH)} height={390} aria-hidden="true"/>;
}
