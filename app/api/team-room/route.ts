import {env} from "cloudflare:workers";
import {handleTeamRoom} from "@/lib/team-room";
export function GET(req:Request){return handleTeamRoom(req,env.DB)}
export function POST(req:Request){return handleTeamRoom(req,env.DB)}
