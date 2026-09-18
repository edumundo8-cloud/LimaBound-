import {applyTeamAction,newTeamGame,tickTeamGame,type GameAction,type TeamSignal,type TeamState} from "./team-game.ts";
import {isCharacterId} from "./characters.ts";

type Row={code:string;tokens:string;state:string;revision:number;updated_at:number};
type Statement={bind(...args:unknown[]):Statement;first<T>():Promise<T|null>;run():Promise<{meta:{changes?:number}}>};
export type TeamDB={prepare(sql:string):Statement};
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
const publicRoom=(row:Row,token:string)=>({code:row.code,role:(JSON.parse(row.tokens) as (string|null)[]).indexOf(token),state:JSON.parse(row.state) as TeamState,revision:row.revision,occupied:(JSON.parse(row.tokens) as (string|null)[]).map(Boolean),serverNow:Date.now()});

export async function handleTeamRoom(req:Request,db:TeamDB):Promise<Response>{
 try{
  const body=req.method==="POST"?await req.json() as Record<string,unknown>:{};
  const code=String(body.code??new URL(req.url).searchParams.get("code")??"").toUpperCase();
  const token=String(req.headers.get("x-player-token")??body.token??"");
  const action=String(body.type??"poll");
  if(!/^[A-Z0-9]{6}$/.test(code)||token.length<16||token.length>80)return json({error:"Revisa el código de seis caracteres."},400);
  if(action==="create"){
   const state=newTeamGame();state.phase="lobby";if(isCharacterId(body.character))state.players[0].character=body.character;
   const row:Row={code,tokens:JSON.stringify([token,null,null,null]),state:JSON.stringify(state),revision:0,updated_at:Date.now()};
   try{await db.prepare("INSERT INTO team_rooms (code,tokens,state,revision,updated_at) VALUES (?,?,?,?,?)").bind(code,row.tokens,row.state,0,row.updated_at).run()}
   catch(error){if(String(error).includes("UNIQUE"))return json({error:"Código ocupado. Intenta de nuevo."},409);throw error}
   return json(publicRoom(row,token));
  }
  for(let attempt=0;attempt<5;attempt++){
   const row=await db.prepare("SELECT code,tokens,state,revision,updated_at FROM team_rooms WHERE code=?").bind(code).first<Row>();
   if(!row)return json({error:"La sala no existe. Pide un enlace nuevo a tu amigo."},404);
   const tokens=JSON.parse(row.tokens) as (string|null)[],role=tokens.indexOf(token);let state=JSON.parse(row.state) as TeamState;
   if(action==="join"){
    if(role>=0)return json(publicRoom(row,token));
    const slot=tokens.indexOf(null);if(slot<0)return json({error:"Esta sala ya tiene cuatro jugadores."},409);
    if(state.phase!=="lobby")return json({error:"La partida empezó. Espera a que el anfitrión abra otra sala."},409);
    tokens[slot]=token;state.players[slot].bot=false;if(isCharacterId(body.character))state.players[slot].character=body.character;
   }else{
    if(role<0)return json({error:"Entra a la sala para jugar."},403);
    if(action==="poll"){
     const next=tickTeamGame(state);if(next===state)return json(publicRoom(row,token));state=next;
    }else if(action==="start"){
     if(role!==0)return json({error:"El anfitrión inicia la partida."},403);
     if(state.phase!=="lobby")return json(publicRoom(row,token));
     state.phase="playing";state.turnStartedAt=Date.now();state.event={id:state.event.id+1,kind:"start",at:Date.now()};
    }else if(action==="voice"){
     const kind=String(body.kind) as TeamSignal["kind"],to=Number(body.to);
     if(!["ready","offer","answer","candidate","leave"].includes(kind)||!Number.isInteger(to)||to<0||to>3||to===role||!tokens[to])return json({error:"Destino de voz inválido."},400);
     const payload=String(body.payload??"");if(payload.length>18000)return json({error:"Señal demasiado grande."},400);
     state.voice=[...state.voice.filter(s=>Date.now()-s.at<45000).slice(-119),{id:crypto.randomUUID(),from:role,to,kind,payload,at:Date.now()}];
    }else{
     if(action==="rematch"&&role!==0)return json({error:"El anfitrión inicia la siguiente ronda."},403);
     // A stale click must never become an action in a later turn or round.
     if(["move","fire","heal","rematch"].includes(action)&&(body.turnNo!==state.turnNo||body.round!==state.round))return json({error:"El turno cambió. Vuelve a intentarlo."},409);
     try{state=applyTeamAction(state,role,{...body,type:action} as GameAction)}catch(error){return json({error:error instanceof Error?error.message:"Acción inválida."},409)}
    }
   }
   const updated:Row={...row,tokens:JSON.stringify(tokens),state:JSON.stringify(state),revision:row.revision+1,updated_at:Date.now()};
   const result=await db.prepare("UPDATE team_rooms SET tokens=?,state=?,revision=?,updated_at=? WHERE code=? AND revision=?").bind(updated.tokens,updated.state,updated.revision,updated.updated_at,code,row.revision).run();
   if(result.meta.changes)return json(publicRoom(updated,token));
  }
  return json({error:"La sala está sincronizando. Reintenta la acción."},409);
 }catch(error){console.error("team-room",error);return json({error:"No se pudo conectar con la sala. Intenta de nuevo."},503)}
}
