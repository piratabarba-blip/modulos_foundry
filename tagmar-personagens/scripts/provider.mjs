// SPDX-License-Identifier: GPL-3.0-or-later
import {makeCalculator} from './rules-adapter.mjs';
import {norm} from './generator.mjs';
const SUPPORTED=new Set(['tagmar_rpg','tagmar3er-oficial','tagmar3er_oficial']);
let pending;
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
export function catalogEntry(doc,pack,realm){
 if(!['Raca','Profissao','Habilidade','Tecnica_Combate','Magia','Combate','Defesa','Pertence'].includes(doc.type))return null;
 const raw=doc.toObject(),sync=raw.flags?.tagmarSync??{},folders=Array.isArray(sync.route)?sync.route:typeof sync.route==='string'?sync.route.split(/\s*(?:›|>|\/)\s*/):folderPath(doc.folder,pack);
 const route=norm(folders.join(' / '));
 if(sync.creatureEmbedded||/criando criaturas|criacao de criaturas|poderes natos|efeitos especiais/.test(route))return null;
 // Sempre mantém as imagens do próprio sistema ativo. Nenhum catálogo XXX é embutido aqui.
 return {key:`${pack.collection}.${doc.id}`,uuid:doc.uuid??`Compendium.${pack.collection}.Item.${doc.id}`,name:doc.name,type:doc.type,system:raw.system,img:raw.img,folders,realm,manualResolution:sync.manualResolution===true};
}
export async function loadContext({reload=false}={}){
 if(!game.user.isGM)throw Error('O gerador é exclusivo do mestre.');
 if(!SUPPORTED.has(game.system.id))throw Error('Este módulo requer Tagmar XXX ou Tagmar 3ER Oficial.');
 if(reload)pending=null;
 if(!pending)pending=(async()=>{
  const base=`systems/${game.system.id}`;
  const [rules,response]=await Promise.all([import(`/${base}/modules/sheets/actorUtils.js`),fetch(`${base}/template.json`)]);
  if(!response.ok)throw Error('Não foi possível carregar a estrutura da ficha do sistema.');
  const schema=await response.json(),calculator=makeCalculator(rules,schema),catalog=[];
  for(const [suffix,realm] of [['criando-fichas-t3er','reinos'],['terras-selvagens-t3er','terras']]){
   const pack=game.packs.get(`${game.system.id}.${suffix}`);if(!pack)continue;
   if(pack.documentName!=='Item')continue;
   const docs=await pack.getDocuments();for(const doc of docs){const entry=catalogEntry(doc,pack,realm);if(entry)catalog.push(entry);}
  }
  if(!catalog.some(i=>i.type==='Raca')||!catalog.some(i=>i.type==='Profissao'))throw Error('Compêndios de Criação de Fichas não encontrados. Atualize o sistema.');
  // Raças e profissões homônimas ficam na edição dos Reinos; demais itens preservam as rotas.
  const filtered=combineProfessionOptions(catalog);
  return {catalog:filtered,calculator,systemId:game.system.id};
 })().catch(error=>{pending=null;throw error;});
 return pending;
}
