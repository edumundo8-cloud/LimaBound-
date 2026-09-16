export const CHARACTER_ROSTER = [
  {id:"perro-peruano",name:"Perro Peruano",image:"/characters/perro-peruano.png",size:"compact"},
  {id:"cocinero-chifa",name:"Cocinero Chifa",image:"/characters/cocinero-chifa.png",size:"medium"},
  {id:"churrera-limena",name:"Churrera Limeña",image:"/characters/churrera-limena.png",size:"wide"},
  {id:"mototaxista",name:"Mototaxista",image:"/characters/mototaxista.png",size:"wide"},
  {id:"cobrador-combi",name:"Cobrador de Combi",image:"/characters/cobrador-combi.png",size:"wide"},
  {id:"maestro-cevichero",name:"Maestro Cevichero",image:"/characters/maestro-cevichero.png",size:"wide"},
] as const;

export type CharacterId=(typeof CHARACTER_ROSTER)[number]["id"];
export type Character=(typeof CHARACTER_ROSTER)[number];

export const DEFAULT_CHARACTERS:[CharacterId,CharacterId]=["perro-peruano","cobrador-combi"];
export const CHARACTER_IDS=new Set<CharacterId>(CHARACTER_ROSTER.map(character=>character.id));

export const characterById=(id:CharacterId|undefined):Character=>CHARACTER_ROSTER.find(character=>character.id===id)??CHARACTER_ROSTER[0];
export const isCharacterId=(value:unknown):value is CharacterId=>typeof value==="string"&&CHARACTER_IDS.has(value as CharacterId);
