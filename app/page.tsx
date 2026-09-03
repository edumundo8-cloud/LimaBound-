"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Mic, MicOff, Send, Sparkles } from "lucide-react";

type Shot = "pebble" | "bubble" | "meteor";
type Line = { who: string; text: string; emote?: boolean };
const weapons: {id:Shot; name:string; icon:string; note:string}[] = [
  {id:"pebble",name:"Pisco Pebble",icon:"✦",note:"Reliable"},
  {id:"bubble",name:"Bog Bubble",icon:"◉",note:"Wide blast"},
  {id:"meteor",name:"Purple Comet",icon:"☄",note:"Heavy hit"},
];

export default function Home(){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const terrain=useRef<number[]>([]);
  const raf=useRef<number|null>(null);
  const [angle,setAngle]=useState(47),[power,setPower]=useState(66),[wind,setWind]=useState(6);
  const [shot,setShot]=useState<Shot>("pebble"),[myHp,setMyHp]=useState(100),[foeHp,setFoeHp]=useState(100);
  const [turn,setTurn]=useState<"you"|"foe"|"over">("you"),[status,setStatus]=useState("Your turn — make it weird.");
  const [mic,setMic]=useState(false),[chatOpen,setChatOpen]=useState(false),[draft,setDraft]=useState("");
  const [chat,setChat]=useState<Line[]>([{who:"Rana",text:"Croak. Your move."}]);

  const paint=useCallback((orb?:{x:number;y:number},blast?:{x:number;y:number;r:number})=>{
    const c=canvasRef.current,ctx=c?.getContext("2d"); if(!c||!ctx)return;
    const w=c.width,h=c.height,t=terrain.current;
    const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,"#77cdf2");sky.addColorStop(.62,"#d7f2df");sky.addColorStop(1,"#76ad62");ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    ctx.fillStyle="#fff9";[[90,62],[360,45],[650,72]].forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,25,0,7);ctx.arc(x+29,y+5,18,0,7);ctx.arc(x-28,y+8,16,0,7);ctx.fill()});
    ctx.fillStyle="#7b91b955";ctx.beginPath();ctx.moveTo(0,245);ctx.lineTo(135,116);ctx.lineTo(250,245);ctx.lineTo(410,105);ctx.lineTo(560,245);ctx.lineTo(680,135);ctx.lineTo(w,245);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();
    ctx.beginPath();ctx.moveTo(0,h);for(let x=0;x<w;x+=2)ctx.lineTo(x,t[x]??260);ctx.lineTo(w,h);ctx.closePath();const g=ctx.createLinearGradient(0,230,0,h);g.addColorStop(0,"#77b85f");g.addColorStop(.13,"#46905b");g.addColorStop(1,"#23484c");ctx.fillStyle=g;ctx.fill();
    const critter=(x:number,flip:boolean,color:string,hp:number,kind:"dog"|"frog")=>{const y=(t[Math.round(x)]??270)-21;ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);ctx.fillStyle="#21304755";ctx.beginPath();ctx.ellipse(0,20,38,8,0,0,7);ctx.fill();ctx.fillStyle=color;
      if(kind==="dog"){ctx.beginPath();ctx.ellipse(0,0,28,15,0,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(23,-12,16,13,-.2,0,7);ctx.fill();ctx.beginPath();ctx.moveTo(15,-20);ctx.lineTo(13,-39);ctx.lineTo(24,-24);ctx.moveTo(26,-22);ctx.lineTo(31,-40);ctx.lineTo(37,-19);ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-24,0);ctx.quadraticCurveTo(-42,-17,-33,-28);ctx.stroke();}
      else{ctx.beginPath();ctx.ellipse(0,3,29,18,0,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(23,-9,20,14,0,0,7);ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(-15,13);ctx.lineTo(-32,27);ctx.moveTo(5,15);ctx.lineTo(17,30);ctx.stroke();}
      ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(29,-14,6,0,7);ctx.fill();ctx.fillStyle="#1c293d";ctx.beginPath();ctx.arc(31,-14,3,0,7);ctx.fill();ctx.strokeStyle="#704928";ctx.lineWidth=7;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(8,-4);ctx.lineTo(39,-18);ctx.stroke();ctx.fillStyle="#e9af45";ctx.beginPath();ctx.arc(42,-19,7,0,7);ctx.fill();ctx.restore();
      ctx.fillStyle="#12213866";ctx.fillRect(x-34,y-45,68,7);ctx.fillStyle=hp>50?"#58dc83":hp>20?"#ffc65b":"#ff6677";ctx.fillRect(x-34,y-45,68*hp/100,7);
    };
    critter(w*.16,false,"#3d3b43",myHp,"dog");critter(w*.84,true,"#77883b",foeHp,"frog");
    if(orb){ctx.shadowColor="#fff2a4";ctx.shadowBlur=18;ctx.fillStyle="#fff4a0";ctx.beginPath();ctx.arc(orb.x,orb.y,7,0,7);ctx.fill();ctx.shadowBlur=0}
    if(blast){const b=ctx.createRadialGradient(blast.x,blast.y,2,blast.x,blast.y,blast.r);b.addColorStop(0,"#fff");b.addColorStop(.25,"#ffe260");b.addColorStop(.62,"#ff735d");b.addColorStop(1,"#734dd800");ctx.fillStyle=b;ctx.beginPath();ctx.arc(blast.x,blast.y,blast.r,0,7);ctx.fill()}
  },[myHp,foeHp]);

  const reset=useCallback(()=>{const c=canvasRef.current;if(!c)return;terrain.current=Array.from({length:c.width},(_,x)=>c.height*(.67+.05*Math.sin(x/68)+.025*Math.sin(x/21)));paint()},[paint]);
  useEffect(()=>reset(),[reset]);
  const crater=(cx:number,r:number)=>{const t=terrain.current;for(let x=Math.max(0,Math.floor(cx-r));x<Math.min(t.length,Math.ceil(cx+r));x++){const d=Math.sqrt(Math.max(0,r*r-(x-cx)**2))*.62;t[x]=Math.max(t[x],(t[Math.round(cx)]??0)+d)}};
  const launch=(left:boolean,a:number,p:number,size:number,done:(hit:boolean)=>void)=>{const c=canvasRef.current;if(!c)return;if(raf.current)cancelAnimationFrame(raf.current);const sx=c.width*(left?.18:.82),sy=(terrain.current[Math.round(sx)]??265)-42,rad=a*Math.PI/180;let x=sx,y=sy,dx=Math.cos(rad)*p*.145*(left?1:-1),dy=-Math.sin(rad)*p*.145,n=0;
    const tick=()=>{n++;x+=dx;y+=dy;dy+=.17;dx+=wind*.0009*(left?1:-1);paint({x,y});const ground=terrain.current[Math.max(0,Math.min(c.width-1,Math.round(x)))]??c.height;if(y>=ground||x<0||x>c.width||n>420){const target=c.width*(left?.84:.16),hit=Math.abs(x-target)<60;crater(Math.max(10,Math.min(c.width-10,x)),size);let r=8;const boom=()=>{r+=5;paint(undefined,{x,y:Math.min(y,ground),r});if(r<size)requestAnimationFrame(boom);else{paint();done(hit)}};boom();return}raf.current=requestAnimationFrame(tick)};tick()};
  const enemy=()=>{setStatus("Rana is calculating… probably.");setTimeout(()=>launch(false,42+Math.random()*14,59+Math.random()*14,46,hit=>{if(hit)setMyHp(v=>Math.max(0,v-25));setWind(Math.round(Math.random()*20-10));setTurn("you");setStatus(hit?"That croak hurt. Your turn!":"Rana missed. Try not to laugh.")}),500)};
  const fire=()=>{if(turn!=="you")return;setTurn("foe");setStatus("Chaski fires!");const size=shot==="meteor"?60:shot==="bubble"?50:41;launch(true,angle,power,size,hit=>{if(hit){const dmg=shot==="meteor"?39:shot==="bubble"?29:24;setFoeHp(v=>Math.max(0,v-dmg));setStatus(`Bonk! ${dmg} damage.`)}else setStatus("Missed. Very artistic.");setTimeout(enemy,750)})};
  useEffect(()=>{if(foeHp<=0){setTurn("over");setStatus("Chaski wins! Buen perro.")}else if(myHp<=0){setTurn("over");setStatus("Rana wins. Suspiciously.")}},[foeHp,myHp]);
  const rematch=()=>{setMyHp(100);setFoeHp(100);setTurn("you");setStatus("Your turn — make it weird.");setWind(6);reset()};
  const send=()=>{if(!draft.trim())return;setChat(v=>[...v,{who:"You",text:draft.trim()}]);setDraft("")};
  const emote=(text:string)=>{setChat(v=>[...v,{who:"You",text,emote:true}]);setChatOpen(true)};

  return <main className="game-shell">
    <header className="topbar"><div className="brand"><span>✦</span><strong>ODDBOUND</strong><i>PRIVATE ALPHA</i></div><div className="room"><b/> ROOM CHASKI-47</div><button className={mic?"mic on":"mic"} onClick={()=>setMic(v=>!v)} aria-label={mic?"Mute microphone":"Enable microphone"}>{mic?<Mic size={19}/>:<MicOff size={19}/>}</button></header>
    <section className="battle">
      <div className="hud mine"><img src="/characters/chaski.png" alt="Chaski, a Peruvian hairless dog"/><div><small>YOU</small><strong>Chaski</strong><div className="hp"><i style={{width:`${myHp}%`}}/></div></div></div>
      <div className="turn"><small>TURN 04</small><strong>{status}</strong><span>Wind {wind>=0?"→":"←"} {Math.abs(wind)}</span></div>
      <div className="hud theirs"><div><small>RIVAL</small><strong>Rana</strong><div className="hp foe"><i style={{width:`${foeHp}%`}}/></div></div><img src="/characters/rana.png" alt="Rana, an unimpressed combat frog"/></div>
      <canvas ref={canvasRef} width={760} height={390}/>
      {turn==="over"&&<div className="result"><Sparkles/><strong>{status}</strong><button onClick={rematch}>Rematch</button></div>}
    </section>
    <section className="dock"><div className="weapons">{weapons.map(w=><button key={w.id} onClick={()=>setShot(w.id)} className={shot===w.id?"chosen":""}><b>{w.icon}</b><span>{w.name}<small>{w.note}</small></span></button>)}</div>
      <div className="aim"><label>ANGLE <b>{angle}°</b><input type="range" min="18" max="78" value={angle} onChange={e=>setAngle(+e.target.value)}/></label><label>POWER <b>{power}</b><input type="range" min="28" max="100" value={power} onChange={e=>setPower(+e.target.value)}/></label><button className="fire" disabled={turn!=="you"} onClick={fire}>FIRE<small>tap to launch</small></button></div>
      <div className="social"><div>{["👋","😂","💀","🐸"].map(e=><button key={e} onClick={()=>emote(e)}>{e}</button>)}</div><button className="chatbutton" onClick={()=>setChatOpen(v=>!v)}><MessageCircle size={18}/> Battle chat <b>{chat.length}</b></button><span>SFX ON</span></div>
    </section>
    {chatOpen&&<aside className="chat"><header><strong>Battle chat</strong><button onClick={()=>setChatOpen(false)}>×</button></header><section>{chat.map((m,i)=><p key={i} className={m.emote?"emote":""}><b>{m.who}</b><span>{m.text}</span></p>)}</section><footer><input value={draft} maxLength={80} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Say something nice…"/><button onClick={send}><Send size={18}/></button></footer></aside>}
  </main>;
}
