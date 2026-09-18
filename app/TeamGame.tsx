"use client";

import {useCallback,useEffect,useRef,useState,type CSSProperties} from "react";
import Link from "next/link";
import {CHARACTER_ROSTER,characterById,type CharacterId} from "@/lib/characters";
import {SCENES} from "@/lib/scenes";
import {COLORS,TEAM_COLORS,teamTornado,TEAM_WIDTH,TEAM_MOVE,TEAM_STEP,TURN_TIME,applyTeamAction,newTeamGame,nextPlayers,teamGround,tickTeamGame,type GameAction,type TeamState} from "@/lib/team-game";
import "./team-game.css";
import {useTeamVoice} from "./useTeamVoice";

type RoomResult={code:string;role:number;state:TeamState;revision:number;occupied:boolean[];serverNow:number;error?:string};
const token=()=>{let value=localStorage.getItem("limabound-team-token");if(!value){value=crypto.randomUUID();localStorage.setItem("limabound-team-token",value)}return value};
const colorStyle=(id:number)=>({"--player-color":COLORS[id]} as CSSProperties);

export default function TeamGame(){
 const [game,setGame]=useState<TeamState>(()=>{const s=newTeamGame(0,()=>.5);s.phase="lobby";return s});
 const [room,setRoom]=useState(""),[role,setRole]=useState(0),[occupied,setOccupied]=useState([true,false,false,false]);
 const [choice,setChoice]=useState<CharacterId>("perro-peruano"),[joinCode,setJoinCode]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
 const [angle,setAngle]=useState(48),[power,setPower]=useState(0),[charging,setCharging]=useState(false),[direction,setDirection]=useState<1|-1>(1),[shotType,setShotType]=useState<"basic"|"special"|"dual">("basic");
 const [chatOpen,setChatOpen]=useState(false),[draft,setDraft]=useState(""),[clock,setClock]=useState(0),[lastPower,setLastPower]=useState<number|null>(null);
 const sound=useRef<AudioContext|null>(null),lastSound=useRef(0);
 const unlockSound=()=>{try{sound.current??=new AudioContext();if(sound.current.state==="suspended")void sound.current.resume()}catch{}};
 useEffect(()=>{const event=game.event;if(event.id===lastSound.current)return;lastSound.current=event.id;const audio=sound.current;if(!audio||audio.state!=="running")return;
  const tone=(frequency:number,delay=0)=>{const osc=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime+delay;osc.type="triangle";osc.frequency.setValueAtTime(frequency,t);osc.frequency.exponentialRampToValueAtTime(55,t+.25);gain.gain.setValueAtTime(.065,t);gain.gain.exponentialRampToValueAtTime(.001,t+.3);osc.connect(gain).connect(audio.destination);osc.start(t);osc.stop(t+.31)};
  if(event.kind==="fire"){tone(670);event.shots?.forEach(shot=>tone(145,Math.max(0,(event.at+shot.delay+shot.path.length*1000/60-Date.now()-clockOffset.current)/1000)))}else if(event.kind==="move")tone(250);
 },[game.event]);
 useEffect(()=>()=>{void sound.current?.close()},[]);
 const stateRef=useRef(game),revision=useRef(-1),clockOffset=useRef(0),chargeStart=useRef(0),chargeFrame=useRef(0),powerRef=useRef(0),roomRef=useRef(room),actionLock=useRef(false),chatInput=useRef<HTMLInputElement>(null);
 const applyRoom=useCallback((result:RoomResult)=>{if(result.revision<revision.current)return;revision.current=result.revision;clockOffset.current=result.serverNow-Date.now();setGame(result.state);stateRef.current=result.state;setRole(result.role);setOccupied(result.occupied)},[]);
 useEffect(()=>{stateRef.current=game},[game]);
 useEffect(()=>{roomRef.current=room},[room]);
 const post=useCallback(async(type:string,extra:Record<string,unknown>={},code=roomRef.current)=>{
  const r=await fetch("/api/team-room",{method:"POST",headers:{"content-type":"application/json","x-player-token":token()},body:JSON.stringify({type,code,turnNo:stateRef.current.turnNo,round:stateRef.current.round,...extra})});
  const result=await r.json() as RoomResult;if(!r.ok)throw new Error(result.error||"No se pudo conectar.");return result;
 },[]);
 const sendVoice=useCallback(async(to:number,kind:import("@/lib/team-game").TeamSignal["kind"],payload?:string)=>{applyRoom(await post("voice",{to,kind,payload}))},[applyRoom,post]);
 const voice=useTeamVoice(room,role,occupied,game.voice,sendVoice);
 const join=useCallback(async(code:string)=>{setBusy(true);try{const result=await post("join",{character:choice},code);revision.current=-1;applyRoom(result);setRoom(code);roomRef.current=code;history.replaceState({},"",`?team=${code}`);setNotice("Conectado. Comparte la sala para reunir a tus amigos.")}catch(error){setNotice((error as Error).message)}finally{setBusy(false)}},[applyRoom,choice,post]);
 const joinedLink=useRef(false);
 useEffect(()=>{if(joinedLink.current)return;joinedLink.current=true;const code=new URLSearchParams(location.search).get("team");if(code)queueMicrotask(()=>{setJoinCode(code.toUpperCase());void join(code.toUpperCase())});SCENES.forEach(scene=>{const image=new Image();image.src=scene.src})},[join]);
 useEffect(()=>{
  let stopped=false,timeout:ReturnType<typeof setTimeout>;
  const poll=async()=>{try{if(room){const r=await fetch(`/api/team-room?code=${room}`,{headers:{"x-player-token":token()},cache:"no-store"});const result=await r.json();if(!r.ok)throw new Error(result.error);if(!stopped)applyRoom(result)}else setGame(current=>tickTeamGame(current,Date.now()))}catch{if(!stopped)setNotice("Reconectando con la sala…")}finally{if(!stopped)timeout=setTimeout(poll,700)}};
  timeout=setTimeout(poll,700);return()=>{stopped=true;clearTimeout(timeout)};
 },[room,applyRoom]);
 // requestAnimationFrame se congela con la pestana en segundo plano; el intervalo
 // mantiene el reloj al dia para que al volver no parezca que el turno se colgo.
 useEffect(()=>{let frame=0;const tick=()=>{setClock(Date.now()+clockOffset.current);frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick);
  const backup=setInterval(()=>setClock(Date.now()+clockOffset.current),250);
  const wake=()=>setClock(Date.now()+clockOffset.current);document.addEventListener("visibilitychange",wake);
  return()=>{cancelAnimationFrame(frame);clearInterval(backup);document.removeEventListener("visibilitychange",wake)}},[]);
 const stopCharge=useCallback(()=>{cancelAnimationFrame(chargeFrame.current);chargeStart.current=0;setCharging(false)},[]);
 useEffect(()=>{const reset=()=>{stopCharge();powerRef.current=0;setPower(0);setShotType("basic");const p=stateRef.current.players[role];setDirection(p.facing)};queueMicrotask(reset)},[game.round,game.turnNo,role,stopCharge]);
 useEffect(()=>()=>cancelAnimationFrame(chargeFrame.current),[]);
 const mine=game.players[role]??game.players[0],playing=game.phase==="playing",myTurn=playing&&game.turn===role&&clock>=game.turnStartedAt&&clock<game.turnStartedAt+TURN_TIME&&mine.hp>0;
 const act=useCallback(async(action:GameAction)=>{
  if(actionLock.current)return;actionLock.current=true;
  try{if(roomRef.current)applyRoom(await post(action.type,action as unknown as Record<string,unknown>));else{const next=applyTeamAction(stateRef.current,role,action);stateRef.current=next;setGame(next)}
   if(action.type==="fire"){setLastPower(action.power??0);stopCharge();powerRef.current=0;setPower(0);setShotType("basic")}
  }catch(error){setNotice((error as Error).message)}finally{actionLock.current=false}
 },[applyRoom,post,role,stopCharge]);
 const walk=useCallback((delta:number)=>{setDirection(delta<0?-1:1);void act({type:"move",delta})},[act]);
 const startCharge=useCallback(()=>{if(!myTurn||chargeStart.current)return;chargeStart.current=performance.now();powerRef.current=0;setPower(0);setCharging(true);const update=()=>{powerRef.current=Math.min(100,Math.max(1,Math.round((performance.now()-chargeStart.current)/30)));setPower(powerRef.current);if(powerRef.current<100)chargeFrame.current=requestAnimationFrame(update)};chargeFrame.current=requestAnimationFrame(update)},[myTurn]);
 const fire=useCallback(()=>{if(!myTurn||powerRef.current<=0)return;void act({type:"fire",power:powerRef.current,angle,direction,special:shotType==="special",dual:shotType==="dual"})},[myTurn,act,angle,direction,shotType]);
 useEffect(()=>{const down=(event:KeyboardEvent)=>{if((event.target as HTMLElement)?.closest("input,textarea,button,a,select")||event.repeat)return;if(event.code==="Space"){event.preventDefault();startCharge()}else if(myTurn&&["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)){event.preventDefault();if(event.key==="ArrowUp"||event.key==="ArrowDown")setAngle(value=>Math.max(18,Math.min(78,value+(event.key==="ArrowUp"?2:-2))));else walk(event.key==="ArrowLeft"?-TEAM_STEP:TEAM_STEP)}};const up=(event:KeyboardEvent)=>{if(event.code==="Space"&&chargeStart.current){event.preventDefault();stopCharge();fire()}};const blur=()=>stopCharge();window.addEventListener("keydown",down);window.addEventListener("keyup",up);window.addEventListener("blur",blur);return()=>{window.removeEventListener("keydown",down);window.removeEventListener("keyup",up);window.removeEventListener("blur",blur)}},[myTurn,walk,startCharge,stopCharge,fire]);
 const create=async()=>{setBusy(true);try{for(let attempt=0;attempt<3;attempt++){const code=Array.from(crypto.getRandomValues(new Uint8Array(6)),n=>"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[n%31]).join("");try{const result=await post("create",{character:choice},code);revision.current=-1;applyRoom(result);setRoom(code);roomRef.current=code;history.replaceState({},"",`?team=${code}`);setNotice("Sala creada. Invita hasta a tres amigos.");break}catch(error){if(attempt===2||!(error as Error).message.includes("Código ocupado"))throw error}}}catch(error){setNotice((error as Error).message)}finally{setBusy(false)}};
 const start=async()=>{setBusy(true);try{if(room)applyRoom(await post("start"));else{const next=newTeamGame();next.players[0].character=choice;stateRef.current=next;setGame(next);setDirection(next.players[0].facing)}setNotice("")}catch(error){setNotice((error as Error).message)}finally{setBusy(false)}};
 const select=(id:CharacterId)=>{setChoice(id);if(room)void act({type:"select",character:id})};
 const share=async()=>{const url=`${location.origin}/?team=${room}`;try{if(navigator.share)await navigator.share({title:"LimaBound 2 contra 2",url});else{await navigator.clipboard.writeText(url);setNotice("Enlace copiado. Envíalo a tus amigos.")}}catch(error){if((error as Error).name!=="AbortError")setNotice(`Comparte el código ${room}.`)}};
 const send=()=>{if(!draft.trim())return;void act({type:"chat",text:draft});setDraft("")};
 const scene=SCENES[game.scene],elapsed=Math.max(0,clock-game.event.at),firing=game.event.kind==="fire"&&elapsed<(game.event.duration??0),displayCraters=firing?(game.event.cratersBefore??game.craters):game.craters;
 const shownHP=(id:number)=>{if(!firing||!game.event.hpBefore)return game.players[id].hp;return Math.max(0,game.event.hpBefore[id]-(game.event.shots??[]).reduce((sum,shot)=>sum+(elapsed>=shot.delay+shot.path.length*1000/60?shot.damage[id]:0),0))};
 const terrain=Array.from({length:Math.ceil(TEAM_WIDTH/4)+1},(_,i)=>{const x=Math.min(TEAM_WIDTH,i*4);return `${x},${teamGround(x,displayCraters,game.scene)}`}).join(" ");
 const aimGround=teamGround(mine.x,displayCraters,game.scene)-38,aimReach=54+power*.5,aim={x0:mine.x,y0:aimGround,x1:mine.x+Math.cos(angle*Math.PI/180)*aimReach*direction,y1:aimGround-Math.sin(angle*Math.PI/180)*aimReach};
 const remaining=Math.max(0,Math.ceil((game.turnStartedAt+TURN_TIME-clock)/1000)),next=nextPlayers(game),ended=game.phase==="ended"&&!firing,tornado=teamTornado(game.turnNo,game.seed);
 return <main className="team-app" onPointerDown={unlockSound} onKeyDown={unlockSound}>
  <header className="team-header"><Link href="/" className="team-brand">✦ LIMA BOUND <small>2 VS 2</small></Link><span>Equipo {mine.team===0?"A":"B"} · J{role+1}</span><Link href="/duel">Duelo 1v1</Link>{room&&<button onClick={share}>Invitar · {room}</button>}</header>
  {notice&&<p className="team-notice" role="status">{notice}</p>}
  {game.phase==="lobby"?<section className="team-lobby">
   <div className="team-lobby-title"><small>CUATRO JUGADORES · DOS EQUIPOS</small><h1>Arma tu equipo</h1><p>Invita a tus amigos o juega con bots. Las explosiones también dañan a tus aliados.</p></div>
   <div className="team-characters" aria-label="Elige tu personaje">{CHARACTER_ROSTER.map(c=><button key={c.id} aria-pressed={(room?mine.character:choice)===c.id} onClick={()=>select(c.id)} disabled={busy}><img src={c.image} alt=""/><span>{c.name}</span></button>)}</div>
   {room&&<><div className="team-lobby-seats">{game.players.map(p=><article key={p.id} style={colorStyle(p.id)}><b>J{p.id+1} · Equipo {p.team===0?"A":"B"}</b><span>{occupied[p.id]?characterById(p.character).name:"Puesto libre → bot"}</span><small>{p.id===role?"Tú":occupied[p.id]?"Conectado":"Comparte el enlace para invitar"}</small></article>)}</div><p className="team-lobby-help">{occupied.filter(Boolean).length}/4 amigos conectados. Los puestos libres se completarán con bots al comenzar.</p></>}
   <div className="team-start-actions">{(!room||role===0)&&<button className="team-primary" disabled={busy} onClick={start}>{room?"Empezar partida":"Jugar solo con bots"}</button>}{!room?<button disabled={busy} onClick={create}>Crear sala para amigos</button>:<button onClick={share}>Compartir invitación</button>}</div>
   {room&&<div className="team-lobby-voice"><button onClick={voice.toggle} aria-pressed={voice.enabled&&!voice.muted}>🎙 {voice.label}</button>{voice.enabled&&<button onClick={voice.leave}>Salir de voz</button>}<small>Prueba el micrófono aquí antes de empezar. Hace falta HTTPS y dar permiso al navegador.</small>{voice.error&&<p role="status">{voice.error} <button onClick={voice.listen}>Escuchar voz</button></p>}</div>}
   {room&&role!==0&&<p role="status">Esperando a que el anfitrión empiece… Puedes elegir tu personaje.</p>}
   {!room&&<form className="team-join" onSubmit={e=>{e.preventDefault();void join(joinCode)}}><label htmlFor="team-code">¿Ya tienes una invitación?</label><input id="team-code" value={joinCode} placeholder="CÓDIGO" maxLength={6} autoComplete="off" onChange={e=>setJoinCode(e.target.value.replace(/[^a-z0-9]/gi,"").toUpperCase())}/><button disabled={busy||joinCode.length!==6}>Entrar</button></form>}
  </section>:<>
   <section className="team-roster" aria-label="Jugadores y vida">{game.players.map(p=><article key={p.id} style={colorStyle(p.id)} className={`team-${p.team===0?"a":"b"} ${game.turn===p.id?"current":""} ${shownHP(p.id)===0?"eliminated":""}`}><img src={characterById(p.character).image} alt=""/><div><b>J{p.id+1} · EQUIPO {p.team===0?"A":"B"}{p.id===role?" · TÚ":p.bot?" · BOT":""}</b><span>{characterById(p.character).name}</span><meter min={0} max={160} value={shownHP(p.id)} aria-label={`Vida jugador ${p.id+1}`}/><small>{shownHP(p.id)} / 160</small></div></article>)}</section>
   <div className="team-arena-heading"><span>{scene.label} · Ronda {game.round}</span><strong>{firing?"DISPARO EN CURSO":ended?"RONDA TERMINADA":clock<game.turnStartedAt?"CAMBIO DE TURNO":`J${game.turn+1}${myTurn?" · TU TURNO":""} · ${remaining}s`}</strong><span>Serie · <b style={{color:TEAM_COLORS[0]}}>A {game.wins[0]}</b>–<b style={{color:TEAM_COLORS[1]}}>{game.wins[1]} B</b></span></div>
   <section className="team-field" aria-label={`Mapa ${scene.label}`} data-scene={game.scene} data-round={game.round}>
    <div className="team-stage" key={`${game.round}-${game.scene}`}>
     <img className="team-backdrop" src={scene.src} alt={`Escenario ${scene.label}`} fetchPriority="high"/>
     <svg className="team-terrain" viewBox={`0 0 ${TEAM_WIDTH} 390`} preserveAspectRatio="none" aria-hidden="true" style={{"--aim":COLORS[role]} as CSSProperties}><defs><linearGradient id="team-ground-fill" x2="0" y2="1"><stop stopColor="#595965"/><stop offset="1" stopColor="#151d30"/></linearGradient><marker id="team-aim-head" viewBox="0 0 12 12" refX="8.5" refY="6" markerWidth="6" markerHeight="6" orient="auto"><path d="M1.5 1.5 L11 6 L1.5 10.5 L4.2 6 Z" fill="var(--aim,#fff)"/></marker></defs><polygon points={`0,450 ${terrain} ${TEAM_WIDTH},450`} fill="url(#team-ground-fill)"/><polyline points={terrain} fill="none" stroke="#e8d6ac" strokeWidth="3"/>
      {myTurn&&aim&&<g className="team-aim-guide"><circle cx={aim.x0} cy={aim.y0} r="3.2" fill={COLORS[role]} opacity=".75"/><line x1={aim.x0} y1={aim.y0} x2={aim.x1} y2={aim.y1} stroke={COLORS[role]} strokeWidth="2.4" strokeLinecap="round" strokeDasharray="9 7" opacity=".8" markerEnd="url(#team-aim-head)"/></g>}
      {firing&&game.event.shots?.map((shot,i)=>{
       const frame=Math.floor((elapsed-shot.delay)*60/1000),point=shot.path[Math.min(frame,shot.path.length-1)],color=COLORS[game.event.player??0];
       if(frame<0||!point)return null;
       if(frame<shot.path.length)return shot.special
        ?<g key={i} className="team-orb-ss"><circle cx={point.x} cy={point.y} r="19" fill={color} opacity=".2"/><circle cx={point.x} cy={point.y} r="11" fill="#ffe9a1" opacity=".85"/><circle cx={point.x} cy={point.y} r="6" fill={color} stroke="#fff" strokeWidth="2"/></g>
        :<circle key={i} cx={point.x} cy={point.y} r="7" fill={color} stroke="white" strokeWidth="2"/>;
       // El SS abre una onda triple y dorada; el disparo normal, un destello corto.
       const age=(frame-shot.path.length)/(shot.special?46:30),fade=Math.max(0,1-age);
       if(fade<=0)return null;
       const r=shot.radius*(.4+age*1.1);
       return <g key={i}><circle cx={shot.impact.x} cy={shot.impact.y} r={r} fill={shot.special?"#ffd76a":color} opacity={fade*(shot.special?.7:.55)}/><circle cx={shot.impact.x} cy={shot.impact.y} r={r*1.3} fill="none" stroke={shot.special?"#fff3c4":"#fff6bc"} strokeWidth={shot.special?7:3} opacity={fade}/>{shot.special&&<circle cx={shot.impact.x} cy={shot.impact.y} r={r*1.95} fill="none" stroke={color} strokeWidth="3" opacity={fade*.5}/>}</g>;
      })}
     </svg>
     <div className={`team-wind ${game.wind<0?"left":"right"}`} aria-label={`Viento ${Math.abs(game.wind)} hacia ${game.wind<0?"la izquierda":"la derecha"}`}><b>VIENTO</b><i>{game.wind<0?"←":"→"}</i><em>{Math.abs(game.wind)}</em></div>
     {tornado&&<div className={`team-tornado ${tornado.spin<0?"counterclockwise":""}`} style={{left:`${tornado.x/TEAM_WIDTH*100}%`,width:`${tornado.radius*2/TEAM_WIDTH*100}%`}} aria-label="Tornado: desvía un poco los disparos"><u/><i/><i/><i/><i/><i/><i/><i/><i/><b/><b/><b/><span>TORNADO</span></div>}
     {(scene.kind==="plaza"||scene.kind==="faro")&&<img className={`team-landmark ${scene.kind}`} src={scene.kind==="plaza"?"/game/plaza-san-martin.png":"/game/faro-miraflores.png"} alt={scene.landmark} style={{bottom:`${(390-teamGround(TEAM_WIDTH/2,displayCraters,game.scene))/3.9}%`}}/>}
     {game.players.map(p=><div key={p.id} className={`team-fighter ${game.turn===p.id?"active":""} ${shownHP(p.id)===0?"down":""}`} style={{...colorStyle(p.id),left:`${p.x/TEAM_WIDTH*100}%`,bottom:`${(390-teamGround(p.x,displayCraters,game.scene))/3.9}%`}}><span>J{p.id+1}<i>{p.team===0?"A":"B"}</i></span><img src={characterById(p.character).image} alt={`Jugador ${p.id+1}: ${characterById(p.character).name}`} style={{transform:`scaleX(${(p.id===role&&myTurn?direction:p.facing)*characterById(p.character).drawnFacing})`}}/>{shownHP(p.id)===0&&<b>KO</b>}</div>)}
    </div>
    <nav className="team-turn-queue" aria-label="Próximos turnos"><b>SIGUEN</b>{next.map(id=><span key={id} style={colorStyle(id)}>● J{id+1}<small>Equipo {game.players[id].team===0?"A":"B"}</small></span>)}</nav>
   </section>
   {ended?<section className="team-result" role="status"><h2>{game.winner===2?"Empate":game.winner===mine.team?"¡Victoria de tu equipo!":"Gana el equipo rival"}</h2><p>Serie A {game.wins[0]}–{game.wins[1]} B · Mejor de tres</p>{(!room||role===0)?<button className="team-primary" onClick={()=>void act({type:"rematch"})}>{Math.max(...game.wins)>=2?"Nueva partida":"Siguiente ronda"}</button>:<p>El anfitrión iniciará la siguiente ronda.</p>}</section>:<section className="team-controls" aria-label="Controles de combate">
    <div className="team-charge"><label>Potencia <b>{power}%</b></label><button disabled={!myTurn} className={charging?"charging":""} aria-label="Mantén presionado para cargar" onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);startCharge()}} onPointerUp={stopCharge} onPointerCancel={stopCharge} onLostPointerCapture={stopCharge} onKeyDown={e=>{if(e.key===" "||e.key==="Enter"){e.preventDefault();startCharge()}}} onKeyUp={e=>{if(e.key===" "||e.key==="Enter")stopCharge()}}><i style={{width:`${power}%`}}/>{lastPower!==null&&<u style={{left:`${lastPower}%`}}/>}<span>{charging?"Suelta para fijar":power>0?"Potencia lista":"Mantén para cargar"}</span></button></div>
    <div className="team-aim"><label>Ángulo <b>{angle}°</b><input aria-label="Ángulo de disparo" type="range" min="18" max="78" value={angle} onChange={e=>setAngle(Number(e.target.value))}/></label><div className="team-direction"><button aria-label="Apuntar a la izquierda" aria-pressed={direction===-1} onClick={()=>setDirection(-1)}>←</button><button aria-label="Apuntar a la derecha" aria-pressed={direction===1} onClick={()=>setDirection(1)}>→</button></div><button className="team-fire" disabled={!myTurn||charging||power<=0} onClick={fire}>DISPARAR <small>{shotType==="special"?"SS":shotType==="dual"?"DUAL SHOT":"BALA 1"}</small></button></div>
    <div className="team-movement"><span>Caminar <b>{Math.max(0,TEAM_MOVE-mine.moved).toFixed(1)} m</b></span><button aria-label="Caminar a la izquierda" disabled={!myTurn||mine.moved>=TEAM_MOVE} onClick={()=>walk(-TEAM_STEP)}>←</button><button aria-label="Caminar a la derecha" disabled={!myTurn||mine.moved>=TEAM_MOVE} onClick={()=>walk(TEAM_STEP)}>→</button><small>Flechas: mover y apuntar · Espacio: cargar y disparar</small></div>
    <div className="team-items"><button className="team-ss" disabled={!myTurn||mine.specialUsed} aria-pressed={shotType==="special"} onClick={()=>setShotType(shotType==="special"?"basic":"special")}>SS <small>{mine.specialUsed?"Usado":"1 por partida"}</small></button><button disabled={!myTurn||mine.dualUsed} aria-pressed={shotType==="dual"} onClick={()=>setShotType(shotType==="dual"?"basic":"dual")}>DUAL SHOT <small>{mine.dualUsed?"Usado":"1 por partida"}</small></button><button disabled={!myTurn||mine.itemUsed||mine.hp>=160} onClick={()=>void act({type:"heal"})}>♥ CURA <small>+40 HP · fin de turno</small></button></div>
    <p className="team-friendly">Fuego amigo activo. El SS abre un cráter enorme y quema a todo el que esté cerca, incluido tu aliado.</p>
   </section>}
   <div className="team-social"><button aria-expanded={chatOpen} onClick={()=>setChatOpen(!chatOpen)}>Chat de la partida</button>{room&&<><button onClick={voice.toggle} aria-pressed={voice.enabled&&!voice.muted}>🎙 {voice.label}</button>{voice.enabled&&<button onClick={voice.leave}>Salir de voz</button>}</>}{!room&&<button onClick={()=>{setGame(s=>({...s,phase:"lobby"}));setChatOpen(false)}}>Invitar amigos</button>}</div>
   {voice.error&&<p className="team-notice" role="status">{voice.error} {voice.enabled&&<button onClick={voice.listen}>Escuchar voz</button>}</p>}
   {chatOpen&&<section className="team-chat" aria-label="Chat de la partida"><header><b>Chat</b><button aria-label="Cerrar chat" onClick={()=>setChatOpen(false)}>×</button></header><div role="log" aria-live="polite">{game.chat.length===0?<p>Saluda a tus amigos.</p>:game.chat.slice(-12).map((m,i)=><p key={i}><b style={{color:COLORS[m.player]}}>J{m.player+1}</b> {m.text}</p>)}</div><div className="team-reactions">{["👋","😂","💀"].map(emoji=><button key={emoji} aria-label={`Enviar ${emoji}`} onClick={()=>void act({type:"chat",text:emoji})}>{emoji}</button>)}</div><form onSubmit={e=>{e.preventDefault();send()}}><input ref={chatInput} aria-label="Mensaje" placeholder="Mensaje corto…" maxLength={80} value={draft} onChange={e=>setDraft(e.target.value)}/><button>Enviar</button></form></section>}
  </>}
 </main>;
}
