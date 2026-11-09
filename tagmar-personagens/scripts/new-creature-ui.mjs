// SPDX-License-Identifier: GPL-3.0-or-later
import {ATTRS,clone} from './rules-adapter.mjs';
import {sourceKey,norm} from './generator.mjs';
import {editCreature} from './creature-ui.mjs';
import {SIZES,FOCUSES,NEW_BLOCKS,componentCatalog,generateNewCreature,editNewItem,newCreationData,blockPlan} from './new-creature.mjs';
import {GROUPS,INTELLECTS,MAGIC,BODIES,ELEMENTS,MODES,creatureProfile,automaticCandidates} from './creature-profiles.mjs';
const HELP={
 build:'Começa uma ficha nova de PNJ, sem copiar uma criatura. Estágio, porte, natureza e perfil orientam sugestões extraoficiais. Você pode editar os números, trocar os componentes e usar travas antes de criar.',
 locks:'Editar um valor fecha seu cadeado. Gerar novamente preserva valores, itens e blocos travados. Os totais continuam acompanhando os atributos. A opção Variação muda as sugestões; desligada, os números ficam previsíveis.',
 parts:'Adicione itens exatos antes ou depois de gerar. Escolher e completar preserva suas escolhas e sorteia até a quantidade indicada, sem duplicar nomes. Somente minhas escolhas não completa nada. Não incluir esvazia o bloco, mesmo com travas. Uma trava de bloco mantém sua lista atual. As sugestões usam grupo, inteligência, magia, corpo e afinidade; suas escolhas manuais têm prioridade.',
 resources:'EF, EH e Karma começam completos. Os valores são sugestões de construção, não uma regra oficial de avanço. ABS e defesa são calculadas a partir das proteções escolhidas; edite a proteção para alterá-las.',
 damage:'Dano-base a 100%, antes do atributo e do ajuste do próprio ataque. Alterar este valor redimensiona a tabela de percentuais. O total de dano inclui os bônus nativos da ficha.',
 nature:'Inteligência e magia são independentes: uma fera irracional pode ter poderes mágicos. Irracional sugere INT −7; magia sugere Aura, Karma e um repertório compatível com a afinidade. Sugerir pelo grupo é apenas um ponto de partida, não uma restrição oficial.',
 group:'Os 19 nomes de grupos seguem Criaturas Online do Tagmar. O gerador sugere inteligência, magia e corpo para cada grupo; você pode substituir cada escolha. Isso não copia poderes, imunidades ou uma criatura existente.',
 anatomy:'A forma do corpo orienta ataques, proteção e técnicas. O sorteio de armas, armaduras comuns e pertences é reservado a criaturas inteligentes bípedes com mãos. Suas escolhas manuais podem abrir exceções.',
 element:'Orienta os poderes e magias sorteados: fogo, água, terra, ar, gelo, sombras ou luz. Não aplica imunidades, vulnerabilidades nem efeitos automaticamente.',
 size:'Porte orienta EF, dano, ABS, tamanho do token, altura e peso sugeridos. Não determina sozinho a anatomia da criatura. Confira o tamanho do token e a imagem depois de criar.'
};
const list=(rows,value)=>rows.map(([key,label])=>({key,label,selected:key===value}));
export function newCreatureView(app){
 const n=app.newCreature,d=n.draft,p=n.preview,locks=d.locks,catalog=componentCatalog(app.context),profile=creatureProfile(d),suggested=automaticCandidates(catalog,{...profile,scale:SIZES.find(x=>x[0]===d.size)?.[2]??1},p?.actor.system.atributos);
 const stats=p?[['ef','EF'],['eh','EH'],['karma','Karma'],['rm','RM'],['rf','RF'],['moral','Moral'],['vb','VB'],['vbe','VBE'],['iniciativa','Iniciativa']].map(([key,label])=>{const lock=['vb','vbe','iniciativa'].includes(key)?'movement':'resource:'+key;return {key,label,value:p.actor.system[key]?.max??p.actor.system[key],lock,locked:!!(locks[lock]||locks.resources)};}):[];
 const blocks=NEW_BLOCKS.map(([key,label,types])=>{const plan=blockPlan(d,key),chosen=plan.picks.filter(k=>catalog.some(i=>i.key===k&&types.includes(i.type)));return {key,label,locked:!!locks[key],open:app.expanded.has('new:'+key),modes:list(MODES,plan.mode),count:plan.count,random:plan.mode==='random',excluded:plan.mode==='none',hint:plan.mode==='none'?'Este bloco não será incluído.':plan.mode==='chosen'?'Somente os itens que você escolher.':`${suggested[key].length} sugestões compatíveis. Quantidade é o total desejado; escolhas manuais adicionais são mantidas.`,chosen:chosen.map(k=>({key:k,name:catalog.find(i=>i.key===k).name})),items:(p?.actor.items??[]).filter(i=>types.includes(i.type)).map(i=>{
  const s=i.system,atk=i.type==='Combate',def=i.type==='Defesa',level=['Habilidade','Magia','Tecnica_Combate'].includes(i.type);
  return {key:sourceKey(i),name:i.name,img:i.img,locked:!!locks['item:'+sourceKey(i)],attack:atk,protection:def,canLevel:level,level:s.nivel,damage:s.dano_base?.d100,abs:s.absorcao,defense:s.defesa_base?.valor,
   summary:atk?`L ${Number(s.def_l)+Number(s.nivel)+Number(s.custo)} · M ${Number(s.def_m)+Number(s.nivel)+Number(s.custo)} · P ${Number(s.def_p)+Number(s.nivel)+Number(s.custo)} · Dano 100% ${s.dano.d100}`:def?`${s.defesa_base.tipo}${s.defesa_base.valor} · ABS ${s.absorcao}`:i.type==='Habilidade'?`Total ${s.total}`:i.type==='Magia'?`Total ${s.total.valor}`:`FA ${s.fa}`};
 }),candidates:catalog.filter(i=>types.includes(i.type)&&!chosen.includes(i.key)&&!(p?.actor.items??[]).some(x=>sourceKey(x)===i.key)).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).map(i=>({key:i.key,label:i.name+(i.creatureMaterial?' · Criaturas':'')}))};});
 return {novaCriatura:true,draft:d,preview:p,busy:app.busy,dirty:n.dirty,error:n.error,created:n.created,locks,help:HELP,sizes:list(SIZES,d.size),groups:list(GROUPS,d.group??'MO'),intellects:list(INTELLECTS,d.intelligence??'auto'),magics:list(MAGIC,d.magic??'auto'),bodies:list(BODIES,d.anatomy??'auto'),elements:list(ELEMENTS,d.element??'auto'),profileLabel:`${GROUPS.find(x=>x[0]===profile.group)[1]} · ${profile.intellect==='beast'?'Irracional':'Inteligente'} · ${profile.magical?'Com magia':'Sem magia'} · ${BODIES.find(x=>x[0]===profile.anatomy)[1]}`,focuses:list(FOCUSES,d.focus),stats,blocks,
  attributes:p?ATTRS.map(key=>({key,value:p.actor.system.atributos[key],locked:!!locks['attr:'+key]})):[],
  folders:list([['','Sem pasta'],...game.folders.filter(f=>f.type==='Actor').map(f=>[f.id,f.name])],d.folder),resourcesLocked:!!locks.resources,attributesLocked:!!locks.attributes};
}
export async function newCreatureAction(app,action,data){
 const n=app.newCreature,d=n.draft;
 if(action==='n-generate'){n.preview=generateNewCreature(d,n.preview,app.context);n.dirty=false;n.created=null;}
 else if(action==='n-lock'){if(!n.preview)throw Error('Gere a prévia antes de travar.');d.locks[data.key]=!d.locks[data.key];}
 else if(action==='n-unlock')d.locks={};
 else if(action==='n-create'){
  if(!n.preview||n.dirty||n.created)throw Error('Confira uma prévia atualizada antes de criar.');
  const payload=newCreationData(n.preview);if(d.folder)payload.folder=d.folder;
  const actor=await Actor.create(payload,{renderSheet:false});if(!actor)throw Error('O Foundry não criou a criatura.');n.created=actor.id;ui.notifications.info(`Criatura criada: ${actor.name}.`);await actor.sheet.render(true);
 }else if(action==='n-open')await game.actors.get(n.created)?.sheet.render(true);
 else if(action==='n-add'||action==='n-remove'||action==='n-unpick'||action==='n-item-edit'){
  const key=action==='n-add'?app.element.querySelector(`[data-n-add="${data.section}"]`)?.value:data.key;
  const entry=componentCatalog(app.context).find(i=>i.key===key),block=NEW_BLOCKS.find(x=>x[2].includes(entry?.type))?.[0];if(!entry||!block)throw Error('Escolha um componente válido.');
  if(action==='n-add'||action==='n-unpick'||action==='n-remove'){
   d.picks??={};d.excluded??=[];const picks=new Set(d.picks[block]??[]);
   if(action==='n-add'){picks.add(key);d.excluded=d.excluded.filter(k=>k!==key);if(d.modes?.[block]==='none')d.modes[block]='chosen';}
   else{picks.delete(key);d.excluded=[...new Set([...d.excluded,key])];delete d.locks['item:'+key];delete d.locks[block];}
   d.picks[block]=[...picks];n.created=null;
   if(!n.preview||n.dirty||action==='n-unpick'){n.dirty=true;return;}
  }
  if(!n.preview||n.dirty)throw Error('Gere a prévia pendente antes de editar os valores.');
  const next=editNewItem(n.preview,app.context,{action:action==='n-add'?'add':action==='n-remove'?'remove':'edit',key,field:data.field,value:data.value});
  n.preview=next;n.created=null;
  if(action==='n-remove'){delete d.locks['item:'+key];delete d.locks[block];}
  else d.locks['item:'+key]=true;
 }
}
export function bindNewCreature(app){
 for(const input of app.element.querySelectorAll('[data-n-field]'))input.addEventListener('change',async()=>{
  if(app.busy)return;const key=input.dataset.nField,n=app.newCreature;
  n.draft[key]=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.value;
  if(['group','intelligence','magic'].includes(key))n.draft.nature='auto';
  if(key!=='folder'){n.dirty=true;n.created=null;n.error='';}await app.render({force:true});
 });
 for(const input of app.element.querySelectorAll('[data-n-plan]'))input.addEventListener('change',async()=>{
  if(app.busy)return;const n=app.newCreature,prop=input.dataset.nPlan,block=input.dataset.nBlock;
  n.draft[prop]??={};n.draft[prop][block]=input.type==='number'?Number(input.value):input.value;n.dirty=true;n.created=null;n.error='';await app.render({force:true});
 });
 for(const input of app.element.querySelectorAll('[data-n-edit]'))input.addEventListener('change',async()=>{
  try{editCreature({creature:app.newCreature,context:app.context},input.dataset.nEdit,input.value);app.newCreature.error='';}catch(e){app.newCreature.error=e.message;ui.notifications.warn(e.message);}await app.render({force:true});
 });
 for(const input of app.element.querySelectorAll('[data-n-item]'))input.addEventListener('change',()=>app.perform('n-item-edit',{key:input.dataset.nItem,field:input.dataset.nProp,value:input.value}));
 for(const input of app.element.querySelectorAll('[data-n-search]'))input.addEventListener('input',()=>{const select=app.element.querySelector(`[data-n-add="${input.dataset.nSearch}"]`);for(const option of select.options)option.hidden=!!option.value&&!norm(option.textContent).includes(norm(input.value));select.value='';});
}
