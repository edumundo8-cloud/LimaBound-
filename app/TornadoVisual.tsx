import type {CSSProperties} from "react";
import type {Tornado} from "@/lib/battle";
import "./tornado.css";

export default function TornadoVisual({tornado,ground,width}:{tornado:Tornado;ground:number;width:number}){
 return <div className={`weather-funnel ${tornado.spin<0?"reverse":""}`} style={{left:`${tornado.x/width*100}%`,width:`${tornado.radius*1.7/width*100}%`,height:`${Math.min(390,ground)/3.9}%`}} role="img" aria-label="Tornado: desvía los disparos">
  <div className="funnel-cloud"/><div className="funnel-body"/>
  {Array.from({length:14},(_,i)=><i key={i} style={{"--level":i,"--band":`${96-i*5.8}%`,top:`${i*6.3}%`,animationDelay:`${-i*.23}s`} as CSSProperties}/>)}
  <div className="funnel-dust"/>
  {Array.from({length:7},(_,i)=><b key={i} style={{"--drift":`${(i%2?1:-1)*(16+i*3)}px`,animationDelay:`${-i*.37}s`} as CSSProperties}/>)}
 </div>;
}
