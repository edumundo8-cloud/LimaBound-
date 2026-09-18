"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import type {TeamSignal} from "@/lib/team-game";

type Peer={pc:RTCPeerConnection;audio:HTMLAudioElement;ice:RTCIceCandidateInit[];offering:boolean};
type Send=(to:number,kind:TeamSignal["kind"],payload?:string)=>Promise<void>;
export function useTeamVoice(room:string,role:number,occupied:boolean[],signals:TeamSignal[],send:Send){
 const [enabled,setEnabled]=useState(false),[muted,setMuted]=useState(false),[connected,setConnected]=useState(0),[error,setError]=useState("");
 const peers=useRef(new Map<number,Peer>()),stream=useRef<MediaStream|null>(null),active=useRef(false),seen=useRef(new Set<string>()),sendRef=useRef(send),roleRef=useRef(role),occupiedRef=useRef(occupied),generation=useRef(0),queue=useRef(Promise.resolve()),started=useRef(0);
 useEffect(()=>{sendRef.current=send;roleRef.current=role;occupiedRef.current=occupied},[send,role,occupied]);
 const closePeer=useCallback((id:number)=>{const peer=peers.current.get(id);if(!peer)return;peer.pc.close();peer.audio.pause();peer.audio.srcObject=null;peers.current.delete(id)},[]);
 const cleanup=useCallback(()=>{generation.current++;active.current=false;stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;for(const id of peers.current.keys())closePeer(id)},[closePeer]);
 const count=useCallback(()=>setConnected([...peers.current.values()].filter(p=>p.pc.connectionState==="connected").length),[]);
 const transmit=useCallback(async(to:number,kind:TeamSignal["kind"],payload?:string)=>{try{await sendRef.current(to,kind,payload)}catch{if(active.current)setError("La voz perdió conexión. Sal y vuelve a activarla.")}},[]);
 const ensure=useCallback((id:number)=>{
  const found=peers.current.get(id);if(found)return found;
  const pc=new RTCPeerConnection({iceServers:[{urls:"stun:stun.cloudflare.com:3478"}]}),audio=new Audio();audio.autoplay=true;audio.setAttribute("playsinline","");
  const peer:Peer={pc,audio,ice:[],offering:false};peers.current.set(id,peer);
  stream.current?.getTracks().forEach(track=>pc.addTrack(track,stream.current!));
  pc.onicecandidate=e=>{if(e.candidate&&active.current)void transmit(id,"candidate",JSON.stringify(e.candidate.toJSON()))};
  pc.ontrack=e=>{audio.srcObject=e.streams[0]??new MediaStream([e.track]);void audio.play().catch(()=>setError("Pulsa Escuchar voz para oír a tus amigos."))};
  pc.onconnectionstatechange=()=>{if(active.current){count();if(pc.connectionState==="failed")setError("No se pudo enlazar la voz con un jugador. Reintenta la voz.")}};
  return peer;
 },[count,transmit]);
 const offer=useCallback(async(id:number)=>{if(!active.current||roleRef.current>=id)return;const peer=ensure(id);if(peer.offering||peer.pc.signalingState!=="stable"||peer.pc.connectionState==="connected")return;peer.offering=true;try{await peer.pc.setLocalDescription(await peer.pc.createOffer());await transmit(id,"offer",JSON.stringify(peer.pc.localDescription))}finally{peer.offering=false}},[ensure,transmit]);
 const flush=async(peer:Peer)=>{for(const candidate of peer.ice.splice(0))await peer.pc.addIceCandidate(candidate)};
 const leave=useCallback(()=>{if(active.current)occupiedRef.current.forEach((yes,id)=>{if(yes&&id!==roleRef.current)void transmit(id,"leave")});cleanup();setEnabled(false);setMuted(false);setConnected(0);setError("")},[cleanup,transmit]);
 const enable=useCallback(async()=>{
  const gen=++generation.current;setError("");
  try{if(!navigator.mediaDevices?.getUserMedia)throw new Error("Este navegador no ofrece micrófono. Abre el enlace en Chrome o Safari con HTTPS.");
   const media=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
   if(gen!==generation.current){media.getTracks().forEach(track=>track.stop());return}
   stream.current=media;active.current=true;started.current=Date.now();setEnabled(true);setMuted(false);
   for(let id=0;id<4;id++)if(occupiedRef.current[id]&&id!==roleRef.current)await transmit(id,"ready");
  }catch(cause){cleanup();setEnabled(false);setError((cause as Error).name==="NotAllowedError"?"Permite el micrófono en tu navegador y vuelve a activar la voz.":(cause as Error).message)}
 },[cleanup,transmit]);
 const toggle=()=>{if(!enabled){void enable();return}const next=!muted;stream.current?.getAudioTracks().forEach(t=>{t.enabled=!next});setMuted(next)};
 useEffect(()=>{
  for(const signal of signals){if(signal.to!==role||seen.current.has(signal.id))continue;seen.current.add(signal.id);
   queue.current=queue.current.then(async()=>{
    if(!active.current||signal.at<started.current-45000)return;
    if(signal.kind==="leave"){closePeer(signal.from);count();return}
    if(signal.kind==="ready"){
     if(roleRef.current<signal.from)await offer(signal.from);
     else if(!peers.current.has(signal.from))await transmit(signal.from,"ready");
     return;
    }
    if(!signal.payload)return;const peer=ensure(signal.from);
    if(signal.kind==="offer"&&peer.pc.signalingState==="stable"){
     await peer.pc.setRemoteDescription(JSON.parse(signal.payload));await flush(peer);await peer.pc.setLocalDescription(await peer.pc.createAnswer());await transmit(signal.from,"answer",JSON.stringify(peer.pc.localDescription));
    }else if(signal.kind==="answer"&&peer.pc.signalingState==="have-local-offer"){
     await peer.pc.setRemoteDescription(JSON.parse(signal.payload));await flush(peer);
    }else if(signal.kind==="candidate"){
     const candidate=JSON.parse(signal.payload) as RTCIceCandidateInit;if(peer.pc.remoteDescription)await peer.pc.addIceCandidate(candidate);else peer.ice.push(candidate);
    }
   }).catch(()=>{if(active.current)setError("No se pudo conectar la voz. Sal y actívala de nuevo.")});
  }
  if(seen.current.size>400)seen.current=new Set(signals.map(s=>s.id));
 },[signals,role,offer,ensure,closePeer,count,transmit]);
 useEffect(()=>{if(!enabled)return;const timer=setInterval(()=>{for(let id=0;id<4;id++)if(occupiedRef.current[id]&&id!==roleRef.current&&peers.current.get(id)?.pc.connectionState!=="connected")void transmit(id,"ready")},8000);return()=>clearInterval(timer)},[enabled,transmit]);
 useEffect(()=>()=>cleanup(),[room,cleanup]);
 const listen=()=>{for(const peer of peers.current.values())void peer.audio.play().then(()=>setError("")).catch(()=>setError("El navegador sigue bloqueando el audio."))};
 return {enabled,muted,connected,error,toggle,leave,listen,label:!enabled?"Activar voz":muted?"Micrófono silenciado":connected?`Voz · ${connected} conectado${connected===1?"":"s"}`:"Esperando voz de amigos"};
}
