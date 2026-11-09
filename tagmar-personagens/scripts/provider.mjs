// SPDX-License-Identifier: GPL-3.0-or-later
import {makeCalculator} from './rules-adapter.mjs';
import {norm} from './generator.mjs';
const SUPPORTED=new Set(['tagmar_rpg','tagmar3er-oficial','tagmar3er_oficial']);
let pending;
const creatureIndexes=new Map();
export function creaturePacks(){
 if(!game.user.isGM)throw Error('O gerador é exclusivo do mestre.');
 return [...game.packs.values()].filter(p=>p.documentName==='Actor'&&p.collection.startsWith(game.system.id+'.')&&/criatura|bestiario|bestiário/i.test(p.metadata?.name??p.collection)).map(p=>({key:p.collection,label:p.metadata?.label??p.collection})).sort((a,b)=>Number(b.key.endsWith('.criaturas-t3er'))-Number(a.key.endsWith('.criaturas-t3er'))||a.label.localeCompare(b.label,'pt-BR'));
}
function creaturePack(key){
 if(!creaturePacks().some(p=>p.key===key))throw Error('Escolha um compêndio de criaturas do sistema ativo.');
 return game.packs.get(key);
}
export async function creatureIndex(key){
 const pack=creaturePack(key);
 if(!creatureIndexes.has(key))creatureIndexes.set(key,Promise.resolve(pack.getIndex({fields:['type','system.estagio']})).then(index=>[...index.values()].filter(i=>!i.type||i.type==='NPC').map(i=>({key:i._id??i.id,name:i.name,stage:i.system?.estagio})).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'))).catch(e=>{creatureIndexes.delete(key);throw e;}));
 return creatureIndexes.get(key);
}
export async function loadCreature(packKey,id){
 const pack=creaturePack(packKey),doc=await pack.getDocument(id);
 if(!doc||doc.type!=='NPC')throw Error('Escolha uma criatura com ficha de PNJ.');
 return {actor:doc.toObject(),uuid:doc.uuid??`Compendium.${packKey}.Actor.${doc.id}`,packLabel:pack.metadata?.label??packKey};
}
export function combineProfessionOptions(catalog){
 const seen=new Map(),filtered=[];
 for(const item of catalog){
  if(!['Raca','Profissao'].includes(item.type)){filtered.push(item);continue;}
  const key=item.type+norm(item.name),existing=seen.get(key);
  if(!existing){const copy={...item,system:{...item.system}};seen.set(key,copy);filtered.push(copy);continue;}
  if(item.type==='Profissao'){
   const names=[...new Set([existing.system.especializacoes,item.system.especializacoes].flatMap(s=>String(s??'').split(',').map(x=>x.trim()).filter(Boolean)))];
   existing.system={...existing.system,especializacoes:names.join(',')};
  }
 }
 return filtered;
}
export function folderPath(folder,pack){const out=[],seen=new Set();let current=typeof folder==='string'?pack.folders.get(folder):folder;while(current&&!seen.has(current.id)){seen.add(current.id);out.unshift(current.name);const parent=current.folder;current=typeof parent==='string'?pack.folders.get(parent):parent;}return out;}
export function catalogEntry(doc,pack,realm,{includeCreatures=false}={}){
 if(!['Raca','Profissao','Habilidade','Tecnica_Combate','Magia','Combate','Defesa','Pertence'].includes(doc.type))return null;
 const raw=doc.toObject(),sync=raw.flags?.tagmarSync??{},folders=Array.isArray(sync.route)?sync.route:typeof sync.route==='string'?sync.route.split(/\s*(?:›|>|\/)\s*/):folderPath(doc.folder,pack);
 const route=norm(folders.join(' / '));
 const creatureMaterial=!!sync.creatureEmbedded||/criando criaturas|criacao de criaturas|poderes natos|efeitos especiais/.test(route);
 if(creatureMaterial&&!includeCreatures)return null;
 // Sempre mantém as imagens do próprio sistema ativo. Nenhum catálogo XXX é embutido aqui.
 return {key:`${pack.collection}.${doc.id}`,uuid:doc.uuid??`Compendium.${pack.collection}.Item.${doc.id}`,name:doc.name,type:doc.type,system:raw.system,img:raw.img,folders,realm,creatureMaterial,manualResolution:sync.manualResolution===true};
}
export async function loadContext({reload=false}={}){
 if(!game.user.isGM)throw Error('O gerador é exclusivo do mestre.');
 if(!SUPPORTED.has(game.system.id))throw Error('Este módulo requer Tagmar XXX ou Tagmar 3ER Oficial.');
 if(reload)pending=null;
 if(!pending)pending=(async()=>{
  const base=`systems/${game.system.id}`;
  const [rules,response]=await Promise.all([import(`/${base}/modules/sheets/actorUtils.js`),fetch(`${base}/template.json`)]);
  if(!response.ok)throw Error('Não foi possível carregar a estrutura da ficha do sistema.');
  const schema=await response.json(),calculator=makeCalculator(rules,schema),catalog=[],creatureCatalog=[];
  for(const [suffix,realm] of [['criando-fichas-t3er','reinos'],['terras-selvagens-t3er','terras']]){
   const pack=game.packs.get(`${game.system.id}.${suffix}`);if(!pack)continue;
   if(pack.documentName!=='Item')continue;
   const docs=await pack.getDocuments();for(const doc of docs){const entry=catalogEntry(doc,pack,realm,{includeCreatures:true});if(entry)(entry.creatureMaterial?creatureCatalog:catalog).push(entry);}
  }
  if(!catalog.some(i=>i.type==='Raca')||!catalog.some(i=>i.type==='Profissao'))throw Error('Compêndios de Criação de Fichas não encontrados. Atualize o sistema.');
  // Raças e profissões homônimas ficam na edição dos Reinos; demais itens preservam as rotas.
  const filtered=combineProfessionOptions(catalog);
  return {catalog:filtered,creatureCatalog,calculator,systemId:game.system.id};
 })().catch(error=>{pending=null;throw error;});
 return pending;
}
