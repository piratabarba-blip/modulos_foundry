// SPDX-License-Identifier: GPL-3.0-or-later
import {norm} from './generator.mjs';
const TYPES={Combate:'Arma / ataque',Defesa:'Proteção',Pertence:'Pertence',Magia:'Magia',Tecnica_Combate:'Técnica',Habilidade:'Habilidade'};
const identity=item=>item.type+':'+norm(item.name);
// Consolida só a apresentação: mantém os documentos, custos e chaves de origem.
// O chamador filtra profissão/especialização antes de escolher o representante.
export function pickerChoices(candidates,{excluded=[]}={}){
 const blocked=new Set(excluded.map(identity)),groups=new Map();
 for(const item of candidates){
  const key=identity(item);if(blocked.has(key))continue;
  const group=groups.get(key);
  if(group)group.copies++;
  else groups.set(key,{item,copies:1});
 }
 const names=new Map();for(const {item}of groups.values())names.set(norm(item.name),(names.get(norm(item.name))??0)+1);
 return [...groups.values()].map(({item,copies})=>{
  const name=item.name+(names.get(norm(item.name))>1?' · '+(TYPES[item.type]??item.type):'');
  return {key:item.key,name,label:name+(item.creatureMaterial?' · Criaturas':''),copies,title:copies>1?`${item.name}: presente em ${copies} listas. As cópias repetidas estão ocultas nesta escolha.`:item.name};
 }).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}
