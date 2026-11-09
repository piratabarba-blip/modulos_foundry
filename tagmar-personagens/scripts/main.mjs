// SPDX-License-Identifier: GPL-3.0-or-later
import {ATTRS,clone} from './rules-adapter.mjs';
import {MODULE_ID,generate,creationData,validatePreview,specializations,sourceKey,SECTION_TYPES,availableItems,materialize,norm} from './generator.mjs';
import {loadContext} from './provider.mjs';
import {positionGeneratorShortcut} from './sidebar.mjs';
import {DEITIES} from './identity.mjs';
import {compatibleProfession,compatibleSpecialization,restrictionNote} from './compatibility.mjs';
import {KITS} from './kits.mjs';
const {ApplicationV2,HandlebarsApplicationMixin}=foundry.applications.api;
const HELP={
 name:'Digite o nome que quiser. Se deixar vazio, a prévia recebe um nome provisório com profissão e raça, que você pode trocar depois.',
 identity:'Livre é o padrão, sem comprar caracterizações sociais. Altura, peso e idade são sugestões narrativas pela raça, não uma nova tabela de regras. Edite um campo para preservá-lo ou use o cadeado. Sacerdotes recebem a ordem correspondente ao deus; escolhas travadas incompatíveis geram aviso.',
 choices:'Escolha raça, profissão e estágio. As listas e o sorteio respeitam as combinações permitidas pelas tabelas dos livros de Regras e ATS. Aleatória sorteia essa escolha a cada prévia. O cadeado conserva a escolha da prévia anterior. O módulo lê apenas os compêndios do sistema ativo.',
 locks:'Cadeado fechado mantém esse valor no próximo sorteio. Também há travas para cada atributo, item e bloco inteiro. Se uma trava conflitar com os pontos ou a profissão, o gerador explica e conserva a prévia anterior.',
 attrs:'Distribuição por pontos do sistema. Os valores já incluem os modificadores raciais. Editar um atributo fecha sua trava; gerar novamente redistribui só os restantes. A prioridade por profissão é uma sugestão do gerador.',
 eh:'A EH começa na base da profissão mais Físico. Cada estágio seguinte usa a tabela de EH da profissão mais Físico. Sorteada usa d10 na prévia; média usa as faixas ponderadas e arredonda só o total. Travar conserva os resultados dos dados, não impede o ajuste por Físico.',
 skills:'Os níveis respeitam o estágio, os custos, o grupo penalizado e o máximo de habilidades da profissão. A habilidade nata recebe o estágio sem gastar os pontos normais, conforme os cálculos do sistema. O total inclui o atributo.',
 techniques:'Técnicas básicas e da especialização escolhida. Técnicas de bônus de FA têm limite 10; as outras respeitam o estágio. Nesta prévia, técnicas com pré-requisito de outra técnica ficam para escolha manual na ficha.',
 kit:'Kits sugeridos de pertences comuns do compêndio. Quantidades e pesos entram na carga. Não concedem equipamento grátis nem descontam moedas: confira a compra com o mestre. A trava de Equipamentos conserva o kit atual. Sem kit deixa só armas e defesa. Você pode retirar itens da prévia.',
 spells:'Prioriza o nível máximo de cada magia escolhida, sem ultrapassar o estágio nem os pontos disponíveis. Travas individuais mantêm o nível escolhido por você. Magias comuns da profissão, básicas e da especialização escolhida. Não sorteia magias ancestrais nem perdidas. O orçamento e o total são calculados pelo sistema. Confira exigências narrativas da escola, ordem ou colégio com o mestre.',
 groups:'Distribui os pontos de grupos de armas da profissão, favorecendo os grupos do equipamento sorteado. Custo: leves 1, médios 2 e pesados 3. A trava mantém o conjunto de grupos da prévia.',
 equipment:'Sugestão de armas e uma armadura comuns dos Reinos, respeitando Força e Físico mínimos. Não é um orçamento de moedas nem um kit obrigatório da profissão. Pode retirar, trocar na ficha ou travar os itens. PNJs usam a defesa fixa dos equipamentos.',
 create:'Gera primeiro uma prévia, sem salvar no mundo. Criar ficha adiciona um ator novo com itens próprios; nunca altera uma ficha existente nem os compêndios. Abra a ficha criada para revisar e completar aparência, história e demais escolhas.',
 specialization:'Opcional: filtra as magias e técnicas da escola, academia, ordem ou tradição escolhida. Sem especialização, usa apenas as listas básicas. A aquisição e os requisitos narrativos precisam da aprovação do mestre.'
};
const list=(values,value)=>values.map(([key,label])=>({key,label,selected:String(key)===String(value)}));
let singleton;
export class GeneratorApp extends HandlebarsApplicationMixin(ApplicationV2){
 static DEFAULT_OPTIONS={id:MODULE_ID,tag:'section',classes:['tg-generator'],position:{width:1080,height:810},window:{title:'Tagmar - Gerador de Personagens e PNJs',icon:'fa-solid fa-user-plus',resizable:true},actions:{do:GeneratorApp.dispatch}};
 static PARTS={main:{template:`modules/${MODULE_ID}/templates/generator.hbs`}};
 context=null;preview=null;dirty=false;created=null;busy=false;error='';expanded=new Set(['attributes']);
 optionsDraft={type:'Personagem',name:'',race:'random',profession:'random',specialization:'random',stage:1,distribution:'profession',ehMode:'roll',locks:{},attributes:{},identity:{},kit:'adventurer',folder:''};
 async _prepareContext(){
  if(!game.user.isGM)throw Error('O gerador é exclusivo do mestre.');
  this.context??=await loadContext();const c=this.context,d=this.optionsDraft,p=this.preview;
  const selectedProfession=c.catalog.find(i=>i.key===(d.profession==='random'?p?.choices.profession:d.profession));
  const selectedRace=c.catalog.find(i=>i.key===d.race),explicitProfession=c.catalog.find(i=>i.key===d.profession);
  const choices=type=>[{key:'random',label:'Aleatória',selected:(type==='Raca'?d.race:d.profession)==='random'},...c.catalog.filter(i=>i.type===type).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).map(i=>{
   const disabled=type==='Raca'?!!explicitProfession&&!compatibleProfession(i,explicitProfession):!!selectedRace&&!compatibleProfession(selectedRace,i);
   return {key:i.key,label:i.name+(disabled?' — incompatível':''),disabled,selected:i.key===(type==='Raca'?d.race:d.profession)};
  })];
  const locked=key=>!!d.locks[key];
  const sectionLabels={skills:'Habilidades',techniques:'Técnicas de combate',spells:'Magias',equipment:'Equipamentos'};
  const sections=p?Object.entries(SECTION_TYPES).map(([key,types])=>{
   const items=p.actor.items.filter(i=>types.includes(i.type)&&(i.type!=='Habilidade'||i.system.nivel>0)).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).map(i=>({key:sourceKey(i),name:i.name,img:i.img,level:i.system.nivel,canLevel:['Habilidade','Tecnica_Combate','Magia'].includes(i.type),innate:i.type==='Habilidade'&&i.name===p.actor.system.hab_nata,locked:locked('item:'+sourceKey(i)),total:i.type==='Habilidade'?i.system.total:i.type==='Magia'?i.system.total.valor:i.type==='Tecnica_Combate'?i.system.fa:i.type==='Combate'?`${i.system.tipo} · ${i.system.dano.d100} de dano`:i.type==='Defesa'?`${i.system.defesa_base.tipo}${i.system.defesa_base.valor} · ABS ${i.system.absorcao}`:i.type==='Pertence'?`${i.system.quant} un. · ${Number(i.system.peso*i.system.quant).toLocaleString('pt-BR')} kg`:'',type:i.type}));
   const prof=c.catalog.find(i=>i.key===p.choices.profession);
   const candidates=key==='skills'?c.catalog.filter(i=>i.type==='Habilidade'):key==='equipment'?c.catalog.filter(i=>['Combate','Defesa','Pertence'].includes(i.type)&&/^(0[45]|10)\b/.test(norm(i.folders?.[0]))&&i.realm==='reinos'):availableItems(c.catalog,prof,p.choices.specialization,key==='spells'?'Magia':'Tecnica_Combate').filter(i=>!i.system.pre_requisito?.tecnica);
   const unique=new Map();for(const i of candidates)if(!items.some(x=>x.key===i.key)&&!unique.has(norm(i.name)))unique.set(norm(i.name),i);
   return {key,label:sectionLabels[key],items,count:items.length,locked:locked(key),open:this.expanded.has(key),help:HELP[key],candidates:[...unique.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).map(i=>({key:i.key,name:i.name}))};
  }):[];
  const stats=p?['ef','eh','karma','absorcao'].map(k=>({label:{ef:'EF',eh:'EH',karma:'Karma',absorcao:'ABS'}[k],value:p.actor.system[k].max})):[];
  if(p)stats.push({label:'Carga (kg)',value:Number(p.actor.system.carga.value).toLocaleString('pt-BR')});
  if(p)stats.push(...['rm','rf','vb'].map(k=>({label:k.toUpperCase(),value:p.actor.system[k]})));
  return {draft:d,personagem:d.type==='Personagem',pnj:d.type==='NPC',races:choices('Raca'),professions:choices('Profissao'),specializations:list([['random','Aleatória / sugerir'],['','Sem especialização'],...specializations(selectedProfession).filter(s=>compatibleSpecialization(selectedRace,selectedProfession,s)).map(s=>[s,s])],d.specialization),restriction:restrictionNote(selectedRace),kits:list(KITS.map(k=>[k.key,k.label]),d.kit),distribution:list([['profession','Priorizar a profissão'],['random','Distribuição aleatória']],d.distribution),ehModes:list([['roll','Sorteada (d10)'],['average','Média da profissão']],d.ehMode),locks:d.locks,help:HELP,preview:p,stats,sections,dirty:this.dirty,busy:this.busy,created:this.created,error:this.error,
   identityOpen:this.expanded.has('identity'),identityFields:[['altura','Altura (m)','text'],['peso','Peso (kg)','number'],['idade','Idade (anos)','number']].map(([key,label,type])=>({key,label,type,value:locked('identity:'+key)?d.identity[key]??p?.actor.system[key]??'':p?.actor.system[key]??'',locked:locked('identity:'+key)})),
   deities:list([['','Sortear um deus'],...DEITIES.map(x=>[x,x])],d.identity.deus??p?.actor.system.deus??''),deityLocked:locked('identity:deus'),
   attributes:ATTRS.map(key=>({key,value:p?.actor.system.atributos[key]??d.attributes[key]??0,racial:p?.actor.system.mod_racial[key]??0,locked:locked('attr:'+key)})),attributesOpen:this.expanded.has('attributes'),
   groups:p?Object.entries(p.actor.system.grupos).filter(([,v])=>v>0).map(([key,value])=>({key,value})):[],ehLocked:locked('eh'),groupsLocked:locked('groups'),ehInfo:p?(p.ehRolls.length?p.ehRolls.map(v=>v===null?'média':v).join(' · '):'EH inicial da profissão + Físico'):'',
   balances:p?[['Atributos',p.actor.system.carac_final.INT],['Habilidades',p.actor.system.pontos_aqui],['Técnicas',p.actor.system.pontos_tec],['Magias',p.actor.system.pontos_mag],['Armas',p.actor.system.pontos_comb]].map(([label,value])=>({label,value})):[],
   folders:list([['','Sem pasta'],...game.folders.filter(f=>f.type==='Actor').map(f=>[f.id,f.name])],d.folder)};
 }
 _onRender(context,options){
  super._onRender(context,options);
  for(const el of this.element.querySelectorAll('details[data-section]'))el.addEventListener('toggle',()=>{if(el.open)this.expanded.add(el.dataset.section);else this.expanded.delete(el.dataset.section);});
  for(const input of this.element.querySelectorAll('[data-field]'))input.addEventListener('change',async()=>{
   const field=input.dataset.field,value=input.type==='number'?Number(input.value):input.value;
   if(field.startsWith('identity:')){this.optionsDraft.identity[field.slice(9)]=value;this.optionsDraft.locks[field]=true;}
   else if(field.startsWith('attr:')){const a=field.slice(5);this.optionsDraft.attributes[a]=value;this.optionsDraft.locks[field]=true;}
   else this.optionsDraft[field]=value;
   if(field!=='folder'){this.dirty=true;this.created=null;this.element.querySelector('[data-do="create"]')?.setAttribute('disabled','');const status=this.element.querySelector('.tg-dirty');if(status)status.hidden=false;}
   if(field==='specialization'&&value&&this.optionsDraft.profession==='random'&&this.preview)this.optionsDraft.profession=this.preview.choices.profession;
   if(field==='profession'||field==='race'){if(!this.optionsDraft.locks.specialization)this.optionsDraft.specialization='random';await this.render({force:true});}
  });
  for(const input of this.element.querySelectorAll('[data-item-search]'))input.addEventListener('input',()=>{const select=this.element.querySelector(`select[data-add="${input.dataset.itemSearch}"]`);for(const option of select.options)option.hidden=!!option.value&&!norm(option.textContent).includes(norm(input.value));select.value='';});
 }
 static async dispatch(event,button){await this.perform(button.dataset.do,button.dataset);}
 async perform(action,data={}){
  if(this.busy)return;
  if(!game.user.isGM)return;
  if(action==='lock'){
   const key=data.key;if(!this.preview&&!this.optionsDraft.locks[key]){ui.notifications.info('Gere uma prévia antes de fechar as travas.');return;}
   this.optionsDraft.locks[key]=!this.optionsDraft.locks[key];
   if(this.optionsDraft.locks[key]&&this.preview&&['race','profession','stage','specialization'].includes(key))this.optionsDraft[key]=this.preview.choices[key];
   if(key.startsWith('attr:')&&this.preview)this.optionsDraft.attributes[key.slice(5)]=this.preview.actor.system.atributos[key.slice(5)];
   await this.render({force:true});return;
  }
  if(action==='tab'){this.optionsDraft.type=data.type;this.dirty=true;this.created=null;await this.render({force:true});return;}
  if(action==='unlock'){this.optionsDraft.locks={};await this.render({force:true});return;}
  this.busy=true;this.error='';
  try{
   if(action==='generate'){
    const next=generate(this.optionsDraft,this.preview,this.context);this.preview=next;this.created=null;this.dirty=false;
    for(const key of ['race','profession','stage','specialization'])if(this.optionsDraft.locks[key])this.optionsDraft[key]=next.choices[key];
   }else if(action==='create'){
    if(!this.preview||this.dirty||this.created)throw Error('Gere uma prévia atualizada antes de criar.');
    const payload=creationData(this.preview,this.context);if(this.optionsDraft.folder)payload.folder=this.optionsDraft.folder;
    const actor=await Actor.create(payload,{renderSheet:false});if(!actor)throw Error('O Foundry não criou a ficha.');
    this.created=actor.id;ui.notifications.info(`Ficha criada: ${actor.name}.`);await actor.sheet.render(true);
   }else if(action==='open'){const actor=game.actors.get(this.created);if(actor)await actor.sheet.render(true);}
   else if(action==='item-up'||action==='item-down'||action==='item-remove'||action==='item-add'){
    if(!this.preview||this.dirty)throw Error('Gere a prévia pendente antes de editar os itens.');
    const next=clone(this.preview);
    if(action==='item-add'){
     const key=this.element.querySelector(`select[data-add="${data.section}"]`)?.value;
     const entry=this.context.catalog.find(i=>i.key===key);if(!entry)throw Error('Escolha um item na lista.');
     const item=next.actor.items.find(i=>sourceKey(i)===key);if(item){item.system.nivel=1;}else{const added=materialize(entry,this.context.calculator);if(['Habilidade','Tecnica_Combate','Magia'].includes(added.type))added.system.nivel=1;next.actor.items.push(added);}
    }else{
     const item=next.actor.items.find(i=>sourceKey(i)===data.key);if(!item)throw Error('Item não encontrado.');
     if(item.type==='Habilidade'&&item.name===next.actor.system.hab_nata)throw Error('A habilidade nata acompanha o estágio.');
     if(action==='item-remove'){if(item.type==='Habilidade')item.system.nivel=0;else next.actor.items=next.actor.items.filter(i=>i!==item);}
     else item.system.nivel=Math.max(0,Number(item.system.nivel)+(action==='item-up'?1:-1));
    }
    next.actor=this.context.calculator.calculate(next.actor);validatePreview(next,this.context);this.preview=next;this.created=null;
    if(data.key&&action!=='item-remove')this.optionsDraft.locks['item:'+data.key]=true;
   }
  }catch(error){console.error('Tagmar Gerador |',error);this.error=error.message;ui.notifications.warn(error.message);}
  finally{this.busy=false;await this.render({force:true});}
 }
}
export async function openGenerator(){if(!game.user.isGM)return;try{singleton??=new GeneratorApp();await singleton.render({force:true});singleton.bringToFront();return singleton;}catch(error){ui.notifications.error(error.message);console.error('Tagmar Gerador |',error);}}
Hooks.once('init',()=>{game.settings.registerMenu(MODULE_ID,'open',{name:'Gerador de Personagens e PNJs',label:'Abrir gerador',hint:'Raça, profissão, estágio e travas. Cria uma ficha nova somente após conferir a prévia.',icon:'fa-solid fa-user-plus',type:GeneratorApp,restricted:true});});
Hooks.on('getSceneControlButtons',controls=>{
 if(!game.user.isGM)return;
 controls[MODULE_ID]={name:MODULE_ID,title:'Tagmar — Gerar personagens e PNJs',icon:'fa-solid fa-user-plus',visible:true,order:Object.keys(controls).length,onChange:(_event,active)=>{if(active)openGenerator();},tools:{generate:{name:'generate',title:'Gerar personagens e PNJs',icon:'fa-solid fa-user-plus',button:true,order:0,onChange:openGenerator}}};
});
Hooks.on('renderSceneControls',(app,element)=>{if(game.user.isGM)queueMicrotask(()=>positionGeneratorShortcut(app,element));});
Hooks.once('ready',()=>{const module=game.modules.get(MODULE_ID);if(module)module.api=Object.freeze({open:openGenerator});});
