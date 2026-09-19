"use client";

import {useCallback,useEffect,useRef,useState} from "react";

export type VoiceSignal={id:string;from:0|1;kind:"ready"|"offer"|"answer"|"candidate"|"leave";payload?:string};
type VoiceStatus="off"|"connecting"|"connected"|"muted"|"error"|"peer-waiting";

const rtcConfig:RTCConfiguration={iceServers:[{urls:"stun:stun.cloudflare.com:3478"}]};

export function useVoiceChat({online,waiting,role,signals,sendSignal}:{online:boolean;waiting:boolean;role:0|1;signals:VoiceSignal[];sendSignal:(kind:VoiceSignal["kind"],payload?:string)=>Promise<void>}){
 const [status,setStatus]=useState<VoiceStatus>("off"),[peerRequested,setPeerRequested]=useState(false);
 const active=useRef(false),pcRef=useRef<RTCPeerConnection|null>(null),streamRef=useRef<MediaStream|null>(null),audioRef=useRef<HTMLAudioElement|null>(null),seen=useRef(new Set<string>()),pendingCandidates=useRef<RTCIceCandidateInit[]>([]),pendingOffer=useRef<RTCSessionDescriptionInit|null>(null),offering=useRef(false);
 const sendRef=useRef(sendSignal);
 useEffect(()=>{sendRef.current=sendSignal},[sendSignal]);
 const setAudioElement=useCallback((element:HTMLAudioElement|null)=>{audioRef.current=element},[]);

 const flushCandidates=useCallback(async(pc:RTCPeerConnection)=>{if(!pc.remoteDescription)return;const queued=pendingCandidates.current.splice(0);for(const candidate of queued){try{await pc.addIceCandidate(candidate)}catch{}}},[]);
 const ensurePeer=useCallback(()=>{if(pcRef.current)return pcRef.current;const pc=new RTCPeerConnection(rtcConfig);pcRef.current=pc;
  pc.onicecandidate=event=>{if(event.candidate)void sendRef.current("candidate",JSON.stringify(event.candidate.toJSON()))};
  pc.ontrack=event=>{const audio=audioRef.current;if(!audio)return;audio.srcObject=event.streams[0];void audio.play().catch(()=>{});setStatus(current=>current==="muted"?current:"connected")};
  pc.onconnectionstatechange=()=>{if(pc.connectionState==="connected")setStatus(current=>current==="muted"?current:"connected");else if(pc.connectionState==="failed"||pc.connectionState==="disconnected")setStatus("error")};
  return pc
 },[]);
 const answerOffer=useCallback(async(offer:RTCSessionDescriptionInit)=>{if(!active.current){pendingOffer.current=offer;setPeerRequested(true);return}const pc=ensurePeer();if(pc.signalingState!=="stable")return;await pc.setRemoteDescription(offer);await flushCandidates(pc);const answer=await pc.createAnswer();await pc.setLocalDescription(answer);await sendRef.current("answer",JSON.stringify(pc.localDescription))},[ensurePeer,flushCandidates]);
 const startOffer=useCallback(async()=>{if(!active.current||role!==0||offering.current)return;const pc=ensurePeer();if(pc.signalingState!=="stable")return;offering.current=true;try{const offer=await pc.createOffer();await pc.setLocalDescription(offer);await sendRef.current("offer",JSON.stringify(pc.localDescription))}finally{offering.current=false}},[ensurePeer,role]);
 const enable=useCallback(async()=>{if(!online||waiting)return;if(!navigator.mediaDevices?.getUserMedia){setStatus("error");return}setStatus("connecting");try{const stream=streamRef.current??await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});streamRef.current=stream;active.current=true;const pc=ensurePeer();for(const track of stream.getTracks())if(!pc.getSenders().some(sender=>sender.track?.id===track.id))pc.addTrack(track,stream);await sendRef.current("ready");if(pendingOffer.current){const offer=pendingOffer.current;pendingOffer.current=null;await answerOffer(offer)}else if(role===0)await startOffer();setStatus(current=>current==="connected"?current:"peer-waiting")}catch{active.current=false;setStatus("error")}},[answerOffer,ensurePeer,online,role,startOffer,waiting]);
 const toggle=useCallback(()=>{if(status==="off"||status==="error"){void enable();return}const track=streamRef.current?.getAudioTracks()[0];if(!track)return;track.enabled=!track.enabled;setStatus(track.enabled?(pcRef.current?.connectionState==="connected"?"connected":"peer-waiting"):"muted")},[enable,status]);
 const leave=useCallback(()=>{if(active.current)void sendRef.current("leave");active.current=false;streamRef.current?.getTracks().forEach(track=>track.stop());streamRef.current=null;pcRef.current?.close();pcRef.current=null;pendingCandidates.current=[];pendingOffer.current=null;offering.current=false;setPeerRequested(false);setStatus("off")},[]);

 // Incoming signaling is an external room event; reflecting it in UI state is intentional.
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{for(const signal of signals){if(signal.from===role||seen.current.has(signal.id))continue;seen.current.add(signal.id);if(signal.kind==="ready"){setPeerRequested(true);if(active.current&&role===0)void startOffer();continue}if(signal.kind==="leave"){setPeerRequested(false);if(active.current)setStatus("peer-waiting");continue}if(!signal.payload)continue;try{if(signal.kind==="offer"){void answerOffer(JSON.parse(signal.payload) as RTCSessionDescriptionInit)}else if(signal.kind==="answer"){const pc=pcRef.current;if(pc&&active.current&&!pc.remoteDescription)void pc.setRemoteDescription(JSON.parse(signal.payload) as RTCSessionDescriptionInit).then(()=>flushCandidates(pc))}else if(signal.kind==="candidate"){const candidate=JSON.parse(signal.payload) as RTCIceCandidateInit,pc=pcRef.current;if(pc?.remoteDescription)void pc.addIceCandidate(candidate).catch(()=>{});else pendingCandidates.current.push(candidate)}}catch{setStatus("error")}}},[answerOffer,flushCandidates,role,signals,startOffer]);
 useEffect(()=>{if(!online&&active.current)leave()},[leave,online]);
 useEffect(()=>()=>{active.current=false;streamRef.current?.getTracks().forEach(track=>track.stop());pcRef.current?.close()},[]);

 const label=status==="off"?(peerRequested?"Tu rival quiere hablar":"Activar voz"):status==="connecting"?"Conectando…":status==="connected"?"Voz conectada":status==="muted"?"Micrófono silenciado":status==="peer-waiting"?"Esperando voz rival":"Reintentar voz";
 return{status,label,peerRequested,toggle,leave,setAudioElement};
}
