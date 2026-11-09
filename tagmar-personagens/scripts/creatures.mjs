// SPDX-License-Identifier: GPL-3.0-or-later
// Adaptação sugerida pelo gerador. Não representa progressão oficial de criaturas.
import {ATTRS,clone,merge} from './rules-adapter.mjs';
const ID='tagmar-personagens';
const finite=(v,label)=>{const n=Number(v);if(!Number.isFinite(n))throw Error(`Valor inválido: ${label}.`);return n;};
const freshId=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>'abcdefghijklmnopqrstuvwxyz0123456789'[n%36]).join('');
const positiveScale=(value,factor)=>Number(value)>0?Math.max(1,Math.round(Number(value)*factor)):Number(value)||0;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const CREATURE_BLOCKS=[['attacks','Ataques e grupos de armas',['Combate']],['protection','Armaduras e proteções',['Defesa']],['skills','Habilidades',['Habilidade']],['powers','Magias, técnicas e poderes',['Magia','Tecnica_Combate','Efeito']]];
export function prepareCreature(source,calculator){
 if(source.actor?.type!=='NPC')throw Error('A criatura precisa ser um PNJ do compêndio.');
 const actor=clone(source.actor);actor.system=merge(calculator.defaults('Actor','NPC'),actor.system);
 actor.items=(actor.items??[]).map(i=>({...i,system:merge(calculator.defaults('Item',i.type),i.system)}));
 for(const item of actor.items)if(item.type==='Defesa'&&item.system.absorcao==null)item.system.absorcao=0;
 // IDs locais servem à simulação; IDs novos são atribuídos somente à cópia criada.
 actor.items.forEach((i,n)=>{i._id??='preview'+String(n).padStart(9,'0');});
 return {...source,actor:calculator.calculateCreature(actor)};
}
function clean(actor){
 delete actor._stats;delete actor.ownership;delete actor.folder;delete actor.sort;delete actor.pack;
 // Origem do livro é preservada; estados de campanha e automações não são herdados.
 actor.flags=actor.flags?.tagmarSync?{tagmarSync:clone(actor.flags.tagmarSync)}:{};
 actor.effects=[];
 for(const item of actor.items){delete item._stats;delete item.folder;delete item.ownership;item.effects=[];item.flags=item.flags?.tagmarSync?{tagmarSync:clone(item.flags.tagmarSync)}:{};}
 if(actor.prototypeToken){for(const key of ['_id','actorId','actorData','delta','x','y','flags','effects','statuses'])delete actor.prototypeToken[key];actor.prototypeToken.actorLink=false;actor.prototypeToken.hidden=false;actor.prototypeToken.bar1={attribute:'ef_npc'};actor.prototypeToken.bar2={attribute:'eh_npc'};}
}
export function generateCreature(source,options,previous,calculator,rng=Math.random){
 const base=source.actor,actor=clone(base),s=actor.system,b=base.system;
 const pct=finite(options.factor??150,'potência');if(pct<25||pct>300)throw Error('Use potência de 25% a 300%.');
 const same=previous?.sourceUuid===source.uuid,locks=same?(options.locks??{}):{},old=same?previous.actor:null;
 const factor=pct/100,jitter=options.variation?0.9+rng()*0.2:1,resourcesFactor=factor*jitter,damageFactor=Math.sqrt(resourcesFactor);
 const keep=(key,section)=>!!old&&(locks[key]||locks[section]);
 s.estagio=keep('stage','resources')?old.system.estagio:Math.max(0,Math.round(Number(b.estagio)*factor));
 const delta=s.estagio-Number(b.estagio);
 actor.name=keep('name')?old.name:String(options.name??'').trim()||`${base.name} — ${pct<100?'mais fraca':pct>100?'mais forte':'variante'} (${pct}%)`;
 for(const key of ATTRS)s.atributos[key]=keep('attr:'+key,'attributes')?old.system.atributos[key]:finite(options.attributes?.[key]??b.atributos[key],key);
 for(const key of ['ef','eh','karma']){const max=keep('resource:'+key,'resources')?old.system[key].max:positiveScale(b[key].max,resourcesFactor);s[key]={...s[key],max,value:max};s[key+'_npc']={...s[key+'_npc'],max,value:max};}
 for(const key of ['rm','rf','moral'])s[key]=keep('resource:'+key,'resources')?old.system[key]:Math.max(0,Number(b[key]??0)+delta);
 for(const key of ['vb','vbe','iniciativa'])s[key]=keep('movement')?old.system[key]:b[key];
 // Anatomia, atributos e deslocamento não crescem automaticamente com a potência.
 for(const [group,value] of Object.entries(s.grupos))s.grupos[group]=keep('attacks')?old.system.grupos[group]:Number(value)>0?Math.max(0,Number(value)+delta):Number(value);
 for(const item of actor.items){
  const original=base.items.find(i=>i._id===item._id),block=CREATURE_BLOCKS.find(([, ,types])=>types.includes(item.type))?.[0];
  if(keep('item:'+item._id,block)){item.system=clone(old.items.find(i=>i._id===item._id)?.system??original.system);continue;}
  const x=item.system,o=original.system;
  if(item.type==='Combate'){
   if(!Object.hasOwn(s.grupos,x.tipo))x.nivel=Math.max(0,Number(o.nivel??0)+delta);
   for(const [key,value] of Object.entries(o.dano_base??{}))x.dano_base[key]=positiveScale(value,damageFactor);
  }else if(item.type==='Defesa'){
   x.absorcao=positiveScale(o.absorcao,damageFactor);
   x.defesa_base.valor=Number(o.defesa_base.valor)+Math.trunc(delta/4);
  }else if(item.type==='Habilidade'&&Number(o.nivel)>0)x.nivel=Math.max(1,Number(o.nivel)+delta);
  else if(item.type==='Tecnica_Combate'&&Number(o.nivel)>0)x.nivel=Math.max(1,Number(o.nivel)+delta);
  // Magias e poderes descritos do livro mantêm seus níveis e textos.
 }
 // Ataques travados em grupos conservam o nível do item sem alterar os demais.
 for(const item of actor.items.filter(i=>i.type==='Combate'))if(keep('item:'+item._id,'attacks')&&Object.hasOwn(s.grupos,item.system.tipo)){
  const desired=Number(item.system.nivel),group=Number(s.grupos[item.system.tipo]);
  if(desired!==group){item.system.def_l+=desired-group;item.system.def_m+=desired-group;item.system.def_p+=desired-group;}
 }
 clean(actor);
 const calculated=calculator.calculateCreature(actor);
 for(const key of ['ef','eh','karma'])calculated.system[key+'_npc']=clone(calculated.system[key]);
 calculated.system.absorcao.value=calculated.system.absorcao.max;
 const sourceErrors=Object.fromEntries(['ef','eh','karma','absorcao'].filter(k=>Number(b[k].max)<0).map(k=>[k,Number(b[k].max)]));
 const result={actor:calculated,sourceUuid:source.uuid,sourceName:base.name,factor:pct,baseStage:b.estagio,variation:!!options.variation,sourceErrors,warnings:[
  ...Object.entries(sourceErrors).map(([key,value])=>`A fonte tem ${key.toUpperCase()} máxima ${value}. Corrija esse recurso na prévia antes de criar a cópia; o compêndio não será alterado.`),
  'Potência relativa é uma sugestão extraoficial, não mede desafio nem garante equilíbrio. Confira a ficha antes de jogar.',
  'Atributos, anatomia, movimento e magias originais são preservados. Descrições de poderes podem citar números antigos; revise-as na cópia.',
  'Travas conservam os valores-base dos itens. Totais continuam acompanhando os atributos; ajustes de grupo preservam a coluna de ataques travados.'
 ]};
 validateCreature(result);return result;
}
export function validateCreature(preview,{creating=false}={}){
 const a=preview.actor;if(a.type!=='NPC'||!a.name.trim())throw Error('Prévia de criatura inválida.');
 const walk=(value,path)=>{if(typeof value==='number'&&!Number.isFinite(value))throw Error(`Cálculo inválido: ${path}.`);if(value&&typeof value==='object')for(const [k,v]of Object.entries(value))walk(v,path+'.'+k);};walk(a.system,'criatura');for(const i of a.items)walk(i.system,i.name);
 for(const key of ['ef','eh','karma','absorcao']){const x=a.system[key];if(!x||Number(x.value)!==Number(x.max)||Number(x.max)<0&&(creating||Number(x.max)!==preview.sourceErrors?.[key]))throw Error(`Corrija ${key.toUpperCase()} máxima inválida antes de criar a cópia.`);}
 const ids=a.items.map(i=>i._id);if(new Set(ids).size!==ids.length)throw Error('Itens duplicados na prévia.');
}
export function creatureCreationData(preview){
 validateCreature(preview,{creating:true});const a=clone(preview.actor);delete a._id;clean(a);
 a.items.forEach(i=>{i._id=freshId();});
 if(preview.kind==='new'){
  a.flags[ID]={newCreature:{...clone(preview.choices),extraofficial:true,components:preview.actor.items.map(i=>i.flags?.[ID]?.source).filter(Boolean)}};
  if(a.prototypeToken)a.prototypeToken.name=a.name;
  return a;
 }
 a.flags[ID]={creatureVariant:{sourceUuid:preview.sourceUuid,sourceName:preview.sourceName,baseStage:preview.baseStage,factor:preview.factor,variation:preview.variation,extraofficial:true}};
 const note=`<p><strong>Variante sugerida pelo gerador:</strong> ${esc(preview.sourceName)}, potência relativa ${preview.factor}%, estágio-base ${preview.baseStage}. Adaptação extraoficial; poderes e descrições exigem revisão do mestre. Origem: ${esc(preview.sourceUuid)}.</p>`;
 // Biografia usa a mesma chave da ficha nativa. A descrição original fica intacta.
 a.system.descricao=(typeof a.system.descricao==='string'?a.system.descricao:'')+note;
 if(a.prototypeToken)a.prototypeToken.name=a.name;
 return a;
}
