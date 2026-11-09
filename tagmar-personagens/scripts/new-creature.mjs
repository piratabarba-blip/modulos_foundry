// SPDX-License-Identifier: GPL-3.0-or-later
// Sugestões de construção extraoficiais; os totais usam a ficha nativa de PNJ.
import {ATTRS,clone} from './rules-adapter.mjs';
import {materialize,sourceKey,norm} from './generator.mjs';
import {validateCreature,creatureCreationData} from './creatures.mjs';
import {creatureProfile,automaticCandidates,MODES,GROUPS} from './creature-profiles.mjs';
export const SIZES=[['tiny','Minúsculo',.5,1],['small','Pequeno',.75,1],['medium','Médio',1,1],['large','Grande',1.75,2],['huge','Gigante',3,3]];
export const NATURES=[['beast','Fera instintiva'],['thinking','Criatura inteligente'],['magical','Criatura mágica']];
export const FOCUSES=[['balanced','Equilibrada'],['brute','Força e resistência'],['agile','Agilidade e percepção']];
export const NEW_BLOCKS=[['attacks','Armas e ataques naturais',['Combate']],['protection','Armaduras e proteções naturais',['Defesa']],['skills','Habilidades',['Habilidade']],['techniques','Técnicas de combate',['Tecnica_Combate']],['powers','Magias e poderes',['Magia']],['gear','Pertences e afins',['Pertence']]];
export const BLOCK_COUNTS={attacks:2,protection:1,skills:3,techniques:2,powers:2,gear:3};
export const newCreatureState=()=>({draft:{name:'',stage:5,size:'medium',group:'MO',nature:'auto',intelligence:'auto',magic:'auto',anatomy:'auto',element:'auto',focus:'balanced',variation:true,img:'',folder:'',locks:{},picks:{},modes:{},counts:{},excluded:[]},preview:null,dirty:false,created:null,error:''});
export function componentCatalog(context){
 const types=NEW_BLOCKS.flatMap(x=>x[2]),seen=new Set();
 return [...context.creatureCatalog??[],...context.catalog??[]].filter(i=>{if(!types.includes(i.type)||seen.has(i.key))return false;seen.add(i.key);return true;});
}
const integer=(v,min,max,label)=>{const n=Number(v);if(!Number.isInteger(n)||n<min||n>max)throw Error(`Use ${label} entre ${min} e ${max}.`);return n;};
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function choices(d){
 const stage=integer(d.stage,0,50,'um estágio'),size=SIZES.find(x=>x[0]===d.size),focus=FOCUSES.find(x=>x[0]===d.focus);
 if(!size||!focus)throw Error('Escolha porte e perfil válidos.');
 return {stage,size:d.size,focus:d.focus,scale:size[2],tokenSize:size[3],...creatureProfile(d)};
}
export function blockPlan(d,block){
 const mode=d.modes?.[block]??(Array.isArray(d.selections)?'chosen':'random');
 if(!MODES.some(x=>x[0]===mode))throw Error('Escolha um modo válido para os componentes.');
 return {mode,count:integer(d.counts?.[block]??BLOCK_COUNTS[block],0,20,'uma quantidade'),picks:[...new Set(d.picks?.[block]??d.selections??[])]};
}
function selectedComponents(d,catalog,c,attrs,old,keep,rng,warnings){
 const auto=automaticCandidates(catalog,c,attrs),keys=new Set();
 for(const [block,label,types]of NEW_BLOCKS){
  const plan=blockPlan(d,block);if(plan.mode==='none')continue;
  const selected=new Set();
  if(old)for(const i of old.items.filter(i=>types.includes(i.type)))if(keep('item:'+sourceKey(i),block))selected.add(sourceKey(i));
  if(!keep(block)){
   for(const key of plan.picks){const entry=catalog.find(i=>i.key===key);if(!entry)throw Error('Um componente escolhido não está disponível no sistema ativo.');if(types.includes(entry.type))selected.add(key);}
   if(plan.mode==='random'){
    const usedNames=new Set([...selected].map(k=>norm(catalog.find(i=>i.key===k)?.name)));
    const pool=auto[block].filter(i=>!selected.has(i.key)&&!usedNames.has(norm(i.name))&&!d.excluded?.includes(i.key));
    while(selected.size<plan.count&&pool.length){const at=Math.min(pool.length-1,Math.floor(rng()*pool.length)),entry=pool.splice(at,1)[0];selected.add(entry.key);}
    if(selected.size<plan.count&&auto[block].length)warnings.push(`${label}: ${selected.size} de ${plan.count} opções sugeridas. Complete manualmente se desejar.`);
   }
  }
  for(const key of selected)keys.add(key);
 }
 return keys;
}
function configureItem(entry,context,c){
 const i=materialize(entry,context.calculator),s=i.system;
 if(['Combate','Habilidade','Tecnica_Combate'].includes(i.type))s.nivel=i.type==='Tecnica_Combate'&&Number(s.mecanica)===0?Math.min(10,c.stage):c.stage;
 if(i.type==='Magia')s.nivel=entry.creatureMaterial?Math.max(0,Number(entry.system.nivel)||0):Math.min(20,c.stage);
 if(i.type==='Pertence'){s.quant=1;s.inTransport=false;}
 if(i.type==='Combate'&&entry.creatureMaterial){
  const target=Math.max(4,Math.round((6+c.stage)*c.scale*(c.focus==='brute'?1.15:1))),base=Number(s.dano_base.d100)||4;
  for(const [key,value]of Object.entries(s.dano_base))s.dano_base[key]=Math.max(0,Math.round(Number(value)*target/base));
 }else if(i.type==='Defesa'){
  s.absorcao=entry.creatureMaterial?Math.max(0,Math.round(c.stage*c.scale*1.5)):Number(s.absorcao)||0;
  s.defesa_base.valor=Number(s.defesa_base.valor)||0;s.equipado=true;
 }
 return i;
}
export function recalculateNew(preview,context){
 const p=clone(preview);p.actor=context.calculator.calculateCreature(p.actor);
 for(const key of ['ef','eh','karma'])p.actor.system[key+'_npc']=clone(p.actor.system[key]);
 p.actor.system.absorcao.value=p.actor.system.absorcao.max;validateCreature(p);return p;
}
export function generateNewCreature(draft,previous,context,rng=Math.random){
 const locks=draft.locks??{},c=choices(draft),old=previous?.actor,keep=(key,block)=>!!old&&(locks[key]||locks[block]);
 if(keep('stage'))c.stage=old.system.estagio;
 const actor={name:keep('name')?old.name:String(draft.name??'').trim()||`Nova criatura — estágio ${c.stage}`,type:'NPC',img:String(draft.img??'').trim()||'icons/svg/mystery-man.svg',system:context.calculator.defaults('Actor','NPC'),items:[],effects:[],flags:{},prototypeToken:{name:'',actorLink:false,width:c.tokenSize,height:c.tokenSize,texture:{src:''},bar1:{attribute:'ef_npc'},bar2:{attribute:'eh_npc'}}};
 if(/^(?:javascript|data):/i.test(actor.img))throw Error('Use um caminho de imagem do Foundry.');
 const s=actor.system,tier=Math.floor(c.stage/5),roll=()=>draft.variation?Math.floor(rng()*3)-1:0;
 const attrs={INT:c.intellect==='beast'?-7:1+tier,AUR:c.magical?2+tier:0,CAR:0,FOR:1+tier,FIS:1+tier,AGI:1+Math.floor(tier/2),PER:1+Math.floor(tier/2)};
 if(c.focus==='brute'){attrs.FOR+=2;attrs.FIS+=1;}if(c.focus==='agile'){attrs.AGI+=2;attrs.PER+=1;}
 for(const key of ATTRS)s.atributos[key]=keep('attr:'+key,'attributes')?old.system.atributos[key]:attrs[key]===-7?-7:Math.max(-2,Math.min(10,attrs[key]+roll()));
 s.estagio=c.stage;s.raca='';s.profissao='';
 const jitter=draft.variation ? 0.9+rng()*0.2 : 1;
 const resources={ef:Math.max(1,Math.round((12+3*c.stage)*c.scale*jitter)),eh:Math.max(0,Math.round(c.stage*(5+Math.max(0,s.atributos.FIS))*jitter)),karma:c.magical?Math.max(0,(c.stage+1)*Math.max(0,s.atributos.AUR)):0};
 for(const [key,suggested]of Object.entries(resources)){const max=keep('resource:'+key,'resources')?old.system[key].max:suggested;s[key]={...s[key],value:max,max};s[key+'_npc']=clone(s[key]);}
 for(const [key,value]of Object.entries({rm:c.stage+Math.max(0,s.atributos.AUR),rf:c.stage+s.atributos.FIS,moral:c.stage+s.atributos.FIS+2,vb:c.focus==='agile'?28:c.focus==='brute'?16:20,vbe:0,iniciativa:s.atributos.AGI}))s[key]=keep('resources')||keep('resource:'+key,['vb','vbe','iniciativa'].includes(key)?'movement':'resources')?old.system[key]:Math.max(0,value);
 s.altura=String(({tiny:.3,small:.8,medium:1.5,large:3,huge:6})[c.size]);s.peso=Math.round(70*c.scale*c.scale);
 s.descricao=`<p><strong>Criação extraoficial do mestre.</strong> Grupo: ${escapeHTML(GROUPS.find(x=>x[0]===c.group)[1])}. ${c.intellect==='beast'?'Irracional / instintiva':'Inteligente'}, ${c.magical?'com magia':'sem magia'}, porte ${escapeHTML(SIZES.find(x=>x[0]===c.size)[1])}. Valores sugeridos pelo gerador; revise anatomia, ataques e poderes antes de jogar.</p>`;
 if(String(draft.description??'').trim())s.descricao+='<p>'+escapeHTML(draft.description).replace(/\r?\n/g,'<br>')+'</p>';
 const catalog=componentCatalog(context),warnings=[],keys=selectedComponents(draft,catalog,c,s.atributos,old,keep,draft.variation?rng:()=>.5,warnings);
 for(const key of keys){
  const entry=catalog.find(i=>i.key===key);if(!entry)throw Error('Um componente escolhido não está disponível no sistema ativo.');
  const prior=old?.items.find(i=>sourceKey(i)===key),block=NEW_BLOCKS.find(x=>x[2].includes(entry.type))[0];
  if(prior&&keep('item:'+key,block)){actor.items.push(clone(prior));continue;}
  const item=configureItem(entry,context,c);if(prior)item._id=prior._id;actor.items.push(item);
 }
 for(const i of actor.items.filter(i=>i.type==='Combate'))if(Object.hasOwn(s.grupos,i.system.tipo))s.grupos[i.system.tipo]=c.stage;
 for(const i of actor.items.filter(i=>i.type==='Combate'))if(keep('item:'+sourceKey(i),'attacks')&&Object.hasOwn(s.grupos,i.system.tipo)){
  const delta=Number(i.system.nivel)-Number(s.grupos[i.system.tipo]);for(const k of ['def_l','def_m','def_p'])i.system[k]=Number(i.system[k])+delta;
 }
 actor.prototypeToken.name=actor.name;actor.prototypeToken.texture.src=actor.img;
 return recalculateNew({kind:'new',actor,choices:c,sourceErrors:{},warnings:[...warnings,
  'Construção extraoficial. Estágio, porte e perfil orientam sugestões; não garantem equilíbrio nem seguem um orçamento de profissão.',
  'Itens escolhidos manualmente prevalecem sobre as sugestões de grupo e anatomia. Armas e armaduras comuns conservam seus valores; somente componentes naturais recebem sugestões de dano e ABS.',
  'Nenhuma raça, profissão ou criatura pronta foi copiada. Nome, imagem, anatomia e história ficam sob sua decisão.'
 ]},context);
}
export function editNewItem(preview,context,{action,key,field,value}){
 const p=clone(preview),catalog=componentCatalog(context);
 if(action==='add'){
  if(p.actor.items.some(i=>sourceKey(i)===key))throw Error('Esse componente já está na prévia.');
  const entry=catalog.find(i=>i.key===key);if(!entry)throw Error('Escolha um componente válido.');
  const item=configureItem(entry,context,p.choices);p.actor.items.push(item);if(item.type==='Combate'&&Object.hasOwn(p.actor.system.grupos,item.system.tipo))p.actor.system.grupos[item.system.tipo]=p.choices.stage;
 }else{
  const item=p.actor.items.find(i=>sourceKey(i)===key);if(!item)throw Error('Componente não encontrado.');
  if(action==='remove')p.actor.items=p.actor.items.filter(i=>i!==item);
  else if(field==='damage'&&item.type==='Combate'){
   const n=integer(value,0,100000,'dano-base'),base=Number(item.system.dano_base.d100);
   for(const [k,v]of Object.entries(item.system.dano_base))item.system.dano_base[k]=base?Math.round(Number(v)*n/base):Math.round(Number(k.slice(1))*n/100);
  }else if(field==='abs'&&item.type==='Defesa')item.system.absorcao=integer(value,0,100000,'absorção');
  else if(field==='defense'&&item.type==='Defesa')item.system.defesa_base.valor=integer(value,-50,100,'defesa');
  else if(field==='level'&&['Habilidade','Magia','Tecnica_Combate'].includes(item.type))item.system.nivel=integer(value,0,100,'nível');
  else throw Error('Esse campo não pertence ao componente.');
 }
 return recalculateNew(p,context);
}
export function newCreationData(preview){if(preview.kind!=='new')throw Error('Prévia nova inválida.');return creatureCreationData(preview);}
