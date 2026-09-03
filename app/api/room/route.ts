import { env } from "cloudflare:workers";

type ChatLine={who:string;text:string;emote?:boolean};
type Crater={x:number;r:number};
type GameState={positions:[number,number];hp:[number,number];turn:0|1;turnNo:number;moved:[number,number];specialUsed:[boolean,boolean];wind:number;winner:number|null;craters:Crater[];lastEvent:{type:string;player?:number;from?:number;to?:number;impactX?:number;angle?:number;power?:number;special?:boolean;hit?:boolean;damage?:number;nonce:number};chat:ChatLine[]};
const clean=(v:unknown,n=80)=>String(v??"").trim().slice(0,n);
const fresh=():GameState=>({positions:[122,638],hp:[100,100],turn:0,turnNo:1,moved:[0,0],specialUsed:[false,false],wind:Math.round(Math.random()*16-8),winner:null,craters:[],lastEvent:{type:"start",nonce:Date.now()},chat:[{who:"Rana",text:"He calculado tus probabilidades. Son decorativas. 🐸"}]});
const groundAt=(x:number,craters:Crater[]=[])=>{let y=304+10*Math.sin(x/72)+5*Math.sin(x/29);for(const c of craters){const d=Math.abs(x-c.x);if(d<c.r)y+=Math.sqrt(c.r*c.r-d*d)*.42}return y};
const db=()=>{if(!env.DB)throw new Error("DB unavailable");return env.DB};

export async function GET(req:Request){
  const code=clean(new URL(req.url).searchParams.get("code"),8).toUpperCase();
  const row=await db().prepare("SELECT code, guest_token, state, revision FROM rooms WHERE code = ?").bind(code).first<{code:string;guest_token:string|null;state:string;revision:number}>();
  if(!row)return Response.json({error:"La sala no existe."},{status:404});
  return Response.json({code:row.code,waiting:!row.guest_token,state:JSON.parse(row.state),revision:row.revision});
}

export async function POST(req:Request){
  const p=await req.json() as Record<string,unknown>;const action=clean(p.action,12);const code=clean(p.code,8).toUpperCase();const token=clean(p.token,80);
  if(action==="create"){
    if(!code||!token)return Response.json({error:"Missing room data"},{status:400});
    const state=fresh();
    try{await db().prepare("INSERT INTO rooms (code, host_token, state, revision, updated_at) VALUES (?, ?, ?, 0, ?)").bind(code,token,JSON.stringify(state),Date.now()).run();}
    catch{return Response.json({error:"Code collision"},{status:409})}
    return Response.json({code,role:0,state,revision:0});
  }
  const row=await db().prepare("SELECT host_token, guest_token, state, revision FROM rooms WHERE code = ?").bind(code).first<{host_token:string;guest_token:string|null;state:string;revision:number}>();
  if(!row)return Response.json({error:"Room no existe, causa."},{status:404});
  if(action==="join"){
    if(row.host_token===token)return Response.json({role:0,state:JSON.parse(row.state),revision:row.revision});
    if(row.guest_token&&row.guest_token!==token)return Response.json({error:"La sala está completa: dos jugadores, una mala decisión."},{status:409});
    if(!row.guest_token)await db().prepare("UPDATE rooms SET guest_token=?, updated_at=? WHERE code=? AND guest_token IS NULL").bind(token,Date.now(),code).run();
    return Response.json({role:1,state:JSON.parse(row.state),revision:row.revision});
  }
  const player=row.host_token===token?0:row.guest_token===token?1:-1;
  if(player<0)return Response.json({error:"No perteneces a esta partida."},{status:403});
  const s=JSON.parse(row.state) as GameState;
  if(action==="move"){
    if(s.turn!==player||s.winner!==null)return Response.json({error:"Todavía no es tu turno."},{status:409});
    const requested=Math.max(-38,Math.min(38,Number(p.delta)||0));const left=104-s.moved[player];const delta=Math.sign(requested)*Math.min(Math.abs(requested),left);
    const min=player===0?50:420,max=player===0?340:710;const before=s.positions[player];s.positions[player]=Math.max(min,Math.min(max,before+delta));s.moved[player]+=Math.abs(s.positions[player]-before);s.lastEvent={type:"move",player,from:before,to:s.positions[player],nonce:Date.now()};
  }else if(action==="fire"){
    if(s.turn!==player||s.winner!==null)return Response.json({error:"Todavía no es tu turno."},{status:409});
    const special=Boolean(p.special);if(special&&s.specialUsed[player])return Response.json({error:"El especial ya fue utilizado. La épica tiene límites."},{status:409});
    s.craters=s.craters??[];const angle=Math.max(18,Math.min(78,Number(p.angle)||45)),power=Math.max(28,Math.min(100,Number(p.power)||60));let x=s.positions[player],y=groundAt(x,s.craters)-47,dx=Math.cos(angle*Math.PI/180)*power*.145*(player===0?1:-1),dy=-Math.sin(angle*Math.PI/180)*power*.145;
    for(let i=0;i<420&&y<groundAt(x,s.craters)&&x>0&&x<760;i++){x+=dx;y+=dy;dy+=.17;dx+=s.wind*.0009*(player===0?1:-1)}
    const target=1-player,hit=Math.abs(x-s.positions[target])<(special?105:61),damage=hit?(special?44:25):0;if(hit)s.hp[target]=Math.max(0,s.hp[target]-damage);if(special)s.specialUsed[player]=true;
    if(s.hp[target]===0)s.winner=player;else{s.turn=target as 0|1;s.turnNo++;s.moved[target]=0;s.wind=Math.round(Math.random()*16-8)}
    const impactX=Math.max(8,Math.min(752,x));s.craters=[...s.craters.slice(-13),{x:impactX,r:special?22:14}];s.lastEvent={type:"fire",player,impactX,angle,power,special,hit,damage,nonce:Date.now()};
  }else if(action==="chat"||action==="emote"){
    const text=clean(p.text,80);if(text)s.chat=[...s.chat.slice(-24),{who:player===0?"Chaski":"Rana",text,emote:action==="emote"}];
  }else if(action==="rematch"){
    Object.assign(s,fresh());
  }else return Response.json({error:"Unknown action"},{status:400});
  const next=row.revision+1;const out=await db().prepare("UPDATE rooms SET state=?, revision=?, updated_at=? WHERE code=? AND revision=?").bind(JSON.stringify(s),next,Date.now(),code,row.revision).run();
  if(!out.meta.changes)return Response.json({error:"sync"},{status:409});
  return Response.json({state:s,revision:next});
}
