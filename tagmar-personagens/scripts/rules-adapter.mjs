// SPDX-License-Identifier: GPL-3.0-or-later
// Orquestra as funções públicas do sistema instalado. Não contém uma cópia das regras.
export const ATTRS=['INT','AUR','CAR','FOR','FIS','AGI','PER'];
export const clone=value=>structuredClone(value);
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export function merge(a,b){const out=clone(a??{});for(const [k,v] of Object.entries(b??{})){if(['__proto__','constructor','prototype'].includes(k))throw Error('Chave de dados inválida.');out[k]=object(v)&&object(out[k])?merge(out[k],v):clone(v);}return out;}
export function set(target,path,value){const keys=path.split('.');if(keys.some(k=>['__proto__','constructor','prototype'].includes(k)))throw Error('Campo inválido.');for(const k of keys.slice(0,-1))target=target[k]??={};target[keys.at(-1)]=clone(value);}
export function makeCalculator(rules,schema){
 const required=['_preparaCaracRaciais','_setPontosRaca','_prepareValorTeste','_attProfissao','_attCargaAbsorcaoDefesa','_attEfEhVB','_attKarmaMax','_attRM','_attRF','_attProximoEstag','_updateCombatItems','_updateMagiasItems','_updateTencnicasItems'];
 for(const key of required)if(typeof rules[key]!=='function')throw Error(`Sistema sem a função ${key}. Atualize o Tagmar antes de usar o gerador.`);
 function defaults(kind,type){let out={};const def=schema[kind]?.[type];if(!def)throw Error(`Tipo ${type} não encontrado no sistema.`);for(const t of def.templates??[])out=merge(out,schema[kind].templates[t]);const own=clone(def);delete own.templates;return merge(out,own);}
 function view(raw){const actor=clone(raw);actor.items=actor.items.map(i=>({...i,id:i._id,system:merge(defaults('Item',i.type),i.system)}));for(const [key,type] of Object.entries({defesas:'Defesa',transportes:'Transporte',habilidades:'Habilidade',combate:'Combate',magias:'Magia',tecnicas:'Tecnica_Combate'}))actor[key]=actor.items.filter(i=>i.type===type);actor.pertences=actor.items.filter(i=>i.type==='Pertence'&&!i.system.inTransport);actor.pertences_transporte=actor.items.filter(i=>i.type==='Pertence'&&i.system.inTransport);actor.raca=actor.items.find(i=>i.type==='Raca');actor.profissao=actor.items.find(i=>i.type==='Profissao');actor.deleteEmbeddedDocuments=()=>{throw Error('Mais de uma raça ou profissão na prévia.');};return actor;}
 function calculate(raw){
  const out=clone(raw);
  for(let pass=0;pass<3;pass++){
   const actor=view(out),data={document:actor,items:actor.items,options:{editable:true}},items=[];
   const apply=update=>{for(const [p,v] of Object.entries(update)){if(v===undefined)throw Error(`Cálculo incompleto: ${p}.`);set(actor,p,v);set(out,p,v);}};
   const run=(fn,...args)=>{const update={};fn(data,update,...args);apply(update);};
   run(rules._preparaCaracRaciais);
   // Força a atualização dos campos de pontos gastos mesmo quando o saldo coincide.
   actor.system.carac_final.INT=Number.NaN;run(rules._setPontosRaca);
   const attrs=actor.system.atributos;
   run(rules._prepareValorTeste,attrs);run(rules._attProfissao,items,attrs);
   run(rules._attCargaAbsorcaoDefesa,attrs);run(rules._attEfEhVB,attrs);
   run(rules._attKarmaMax,attrs);run(rules._attRM,attrs);run(rules._attRF,attrs);run(rules._attProximoEstag);
   rules._updateCombatItems(data,items,attrs);rules._updateMagiasItems(data,items,attrs);rules._updateTencnicasItems(data,items,attrs);
   for(const update of items){const item=out.items.find(i=>i._id===update._id);if(!item)throw Error('Item de cálculo ausente.');for(const [p,v] of Object.entries(update))if(p!=='_id')set(item,p,v);}
  }
  return out;
 }
 function attributeBalance(actor){const update={};rules._setPontosRaca({document:{...actor,system:{...actor.system,carac_final:{INT:NaN}}},options:{editable:true}},update);return update['system.carac_final.INT'];}
 function xpForStage(stage){if(stage<=1)return 0;const update={};rules._attProximoEstag({document:{system:{estagio:stage-1,pontos_estagio:{next:-1}}},options:{editable:true}},update);return update['system.pontos_estagio.next'];}
 function calculateCreature(raw){
  if(raw.type!=='NPC')throw Error('A criatura precisa usar a ficha de PNJ.');
  const out=clone(raw);
  for(let pass=0;pass<2;pass++){
   const actor=view(out),data={document:actor,items:actor.items,options:{editable:true}},update={},items=[];
   for(const name of ['_prepareValorTeste','_attDefesaNPC']){if(typeof rules[name]!=='function')throw Error(`Atualize o sistema: falta ${name}.`);rules[name](data,update);}
   for(const [path,value] of Object.entries(update))set(out,path,value);
   for(const name of ['_updateCombatItems','_updateMagiasItems','_updateTencnicasItems','_updateHabilItems']){if(typeof rules[name]!=='function')throw Error(`Atualize o sistema: falta ${name}.`);rules[name](data,items);}
   for(const change of items){const item=out.items.find(i=>i._id===change._id);for(const [path,value] of Object.entries(change))if(path!=='_id')set(item,path,value);}
  }
  return out;
 }
 return {defaults,calculate,calculateCreature,attributeBalance,xpForStage};
}
