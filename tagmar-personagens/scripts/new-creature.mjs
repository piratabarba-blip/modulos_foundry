// SPDX-License-Identifier: GPL-3.0-or-later
// Criação pelo Livro 3.02; perfis sugeridos e escolhas do mestre continuam editáveis.
import {ATTRS,clone} from './rules-adapter.mjs';
import {materialize,sourceKey,norm,dedupe} from './generator.mjs';
import {validateCreature,creatureCreationData} from './creatures.mjs';
import {creatureProfile,automaticCandidates,MODES,GROUPS} from './creature-profiles.mjs';
import {BOOK_SOURCE,bookChoices,physicalEnergy,heroicEnergy,creatureMorale,naturalColumns,naturalDamage,weaponSizeBonus,setDamageTable} from './creature-book.mjs';
export const SIZES=[['tiny','Minúsculo',.5,1],['small','Pequeno',.75,1],['medium','Médio',1,1],['large','Grande',1.75,2],['huge','Gigante',3,3]];
export const NATURES=[['beast','Fera instintiva'],['thinking','Criatura inteligente'],['magical','Criatura mágica']];
export const FOCUSES=[['balanced','Equilibrada'],['brute','Força e resistência'],['agile','Agilidade e percepção']];
export const NEW_BLOCKS=[['attacks','Armas e ataques naturais',['Combate']],['protection','Armaduras e proteções naturais',['Defesa']],['skills','Habilidades',['Habilidade']],['techniques','Técnicas de combate',['Tecnica_Combate']],['powers','Magias e poderes',['Magia']],['gear','Pertences e afins',['Pertence']]];
export const BLOCK_COUNTS={attacks:2,protection:1,skills:3,techniques:2,powers:2,gear:3};
export const newCreatureState=()=>({draft:{name:'',stage:5,size:'medium',group:'MO',nature:'auto',intelligence:'auto',magic:'auto',anatomy:'auto',element:'auto',focus:'balanced',variation:true,weight:'',height:'',combativeness:'auto',organization:'group',corporeality:'corporeal',construction:'auto',magicSource:'auto',usesPerDay:1,damageRange:'middle',moralMode:'auto',speedVb:'',img:'',folder:'',locks:{},picks:{},modes:{},counts:{},excluded:[]},preview:null,dirty:false,created:null,error:''});
export function componentCatalog(context){
 const types=NEW_BLOCKS.flatMap(x=>x[2]),seen=new Set();
 return [...context.creatureCatalog??[],...context.catalog??[]].filter(i=>{if(!types.includes(i.type)||seen.has(i.key))return false;seen.add(i.key);return true;});
}
export const skillCatalog=context=>dedupe(componentCatalog(context).filter(i=>i.type==='Habilidade'));
const integer=(v,min,max,label)=>{const n=Number(v);if(!Number.isInteger(n)||n<min||n>max)throw Error(`Use ${label} entre ${min} e ${max}.`);return n;};
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function choices(d){
 const stage=integer(d.stage,0,50,'um estágio'),size=SIZES.find(x=>x[0]===d.size),focus=FOCUSES.find(x=>x[0]===d.focus);
 if(!size||!focus)throw Error('Escolha porte e perfil válidos.');
 return bookChoices(d,{stage,size:d.size,focus:d.focus,scale:size[2],tokenSize:size[3],...creatureProfile(d)});
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
  if(old)for(const i of old.items.filter(i=>types.includes(i.type)))if(keep('item:'+sourceKey(i),block)&&(block!=='skills'||Number(i.system.nivel)>0))selected.add(sourceKey(i));
  if(!keep(block)){
   for(const key of plan.picks){const entry=catalog.find(i=>i.key===key);if(!entry)throw Error('Um componente escolhido não está disponível no sistema ativo.');if(types.includes(entry.type))selected.add(key);}
   if(plan.mode==='random'){
    const usedNames=new Set([...selected].map(k=>norm(catalog.find(i=>i.key===k)?.name)));
    const pool=auto[block].filter(i=>!selected.has(i.key)&&!usedNames.has(norm(i.name))&&!d.excluded?.includes(i.key)&&!(block==='skills'&&old?.items.some(x=>sourceKey(x)===i.key&&Number(x.system.nivel)===0&&keep('item:'+i.key,block))));
    while(selected.size<plan.count&&pool.length){const at=Math.min(pool.length-1,Math.floor(rng()*pool.length)),entry=pool.splice(at,1)[0];selected.add(entry.key);}
    if(selected.size<plan.count&&auto[block].length)warnings.push(`${label}: ${selected.size} de ${plan.count} opções sugeridas. Complete manualmente se desejar.`);
   }
  }
  for(const key of selected)keys.add(key);
 }
 return keys;
}
function configureItem(entry,context,c,rng=()=>.5,variation=false){
 const i=materialize(entry,context.calculator),s=i.system;
 if(['Combate','Habilidade','Tecnica_Combate'].includes(i.type))s.nivel=i.type==='Tecnica_Combate'&&Number(s.mecanica)===0?Math.min(10,c.stage):c.stage;
 if(i.type==='Magia')s.nivel=entry.creatureMaterial?Math.max(0,Number(entry.system.nivel)||0):Math.min(20,c.stage);
 if(i.type==='Pertence'){s.quant=1;s.inTransport=false;}
 if(i.type==='Combate'&&entry.creatureMaterial){
  const columns=naturalColumns(i.name),target=naturalDamage(c,rng,variation);
  if(columns){[s.def_l,s.def_m,s.def_p]=columns;s.bonus=norm(i.name).startsWith('halito encantado')?'AUR':'AGI';s.bonus_magico=0;}
  // O livro não fornece dano de hálitos nem perfis para todos os ataques especiais.
  if(columns&&s.bonus!=='AUR'&&target!==null){setDamageTable(s,target);s.bonus_dano='FOR';s.peso=0;}
  s.tipo='CD'; // Ataques naturais acompanham Combate Desarmado da criatura.
 }else if(i.type==='Combate'&&!entry.creatureMaterial){
  const extra=weaponSizeBonus(c.height);
  if(extra&&c.usesTools)setDamageTable(s,Number(s.dano_base.d100)+extra);
 }else if(i.type==='Defesa'){
  s.absorcao=Number(s.absorcao)||0;
  s.defesa_base.valor=entry.creatureMaterial?Math.max(0,Math.min(3,Number(s.defesa_base.valor)||0)):Number(s.defesa_base.valor)||0;s.equipado=true;
 }
 return i;
}
export function recalculateNew(preview,context){
 const p=clone(preview),s=p.actor.system,c=p.choices,locks=p.locks??{};
 if(c?.book){
  const write=(key,value)=>{if(!locks.resources&&!locks['resource:'+key])s[key]=['ef','eh','karma'].includes(key)?{...s[key],value,max:value}:value;};
  write('ef',Math.max(0,physicalEnergy(c.weight,s.atributos.FIS,c.constructed)));write('eh',Math.max(0,heroicEnergy(c,s.atributos)));
  write('karma',c.magical&&c.magicSource==='learned'?Math.max(0,(c.stage+1)*Math.max(0,s.atributos.AUR)):0);
  write('rm',c.stage+s.atributos.AUR);write('rf',c.stage+s.atributos.FIS);write('moral',creatureMorale(c));
  if(p.baseDescription!==undefined){
   s.descricao=p.baseDescription;
   const powers=p.actor.items.filter(i=>i.type==='Magia');
   if(c.magical&&c.magicSource==='innate'&&powers.length)s.descricao+='<p><strong>Dons naturais — sugestão do mestre:</strong> '+powers.map(i=>escapeHTML(i.name)+`: ${c.usesPerDay} uso(s) por dia`).join('; ')+'. Sem consumo automático de Karma ou controle automático de usos.</p>';
  }
 }
 p.actor=context.calculator.calculateCreature(p.actor);
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
 const resources={ef:Math.max(0,physicalEnergy(c.weight,s.atributos.FIS,c.constructed)),eh:Math.max(0,heroicEnergy(c,s.atributos)),karma:c.magical&&c.magicSource==='learned'?Math.max(0,(c.stage+1)*Math.max(0,s.atributos.AUR)):0};
 for(const [key,suggested]of Object.entries(resources)){const max=keep('resource:'+key,'resources')?old.system[key].max:suggested;s[key]={...s[key],value:max,max};s[key+'_npc']=clone(s[key]);}
 for(const [key,value]of Object.entries({rm:c.stage+s.atributos.AUR,rf:c.stage+s.atributos.FIS,moral:creatureMorale(c),vb:c.speedVb??(c.focus==='agile'?28:c.focus==='brute'?16:20),vbe:0,iniciativa:s.atributos.AGI}))s[key]=keep('resources')||keep('resource:'+key,['vb','vbe','iniciativa'].includes(key)?'movement':'resources')?old.system[key]:value;
 s.altura=String(c.height);s.peso=c.weight;
 s.descricao=`<p><strong>Criação do mestre.</strong> Cálculos: ${BOOK_SOURCE}. Grupo: ${escapeHTML(GROUPS.find(x=>x[0]===c.group)[1])}. ${c.intellect==='beast'?'Irracional / instintiva':'Inteligente'}, ${c.magical?'com magia':'sem magia'}, porte ${escapeHTML(SIZES.find(x=>x[0]===c.size)[1])}. Perfil e repertório são sugestões editáveis; a criatura não é uma publicação oficial.</p>`;
 if(c.weight>9500&&c.weight<=47500)s.descricao+='<p><strong>Extensão extraoficial do gerador:</strong> dano natural acima de 9500 kg estimado em faixas adicionais de 3000 kg, teto +4 por faixa e piso +4 a cada duas faixas.</p>';
 if(c.height>6.5&&c.height<=32.5&&c.usesTools)s.descricao+='<p><strong>Extensão extraoficial do gerador:</strong> bônus de armas acima de 6,50 m estimado mantendo +4 por faixa de um metro.</p>';
 if(String(draft.description??'').trim())s.descricao+='<p>'+escapeHTML(draft.description).replace(/\r?\n/g,'<br>')+'</p>';
 const catalog=componentCatalog(context),warnings=[],keys=selectedComponents(draft,catalog,c,s.atributos,old,keep,draft.variation?rng:()=>.5,warnings);
 for(const key of keys){
  const entry=catalog.find(i=>i.key===key);if(!entry)throw Error('Um componente escolhido não está disponível no sistema ativo.');
  const prior=old?.items.find(i=>sourceKey(i)===key),block=NEW_BLOCKS.find(x=>x[2].includes(entry.type))[0];
  if(prior&&keep('item:'+key,block)){actor.items.push(clone(prior));continue;}
  const item=configureItem(entry,context,c,rng,!!draft.variation);if(prior)item._id=prior._id;actor.items.push(item);
 }
 // A ficha mantém todas as habilidades; quantidade e escolhas só treinam níveis.
 for(const entry of skillCatalog(context))if(!actor.items.some(i=>i.type==='Habilidade'&&norm(i.name)===norm(entry.name))){
  const prior=old?.items.find(i=>sourceKey(i)===entry.key);
  actor.items.push(blockPlan(draft,'skills').mode!=='none'&&prior&&keep('item:'+entry.key,'skills')?clone(prior):materialize(entry,context.calculator));
 }
 for(const i of actor.items.filter(i=>i.type==='Combate'))if(Object.hasOwn(s.grupos,i.system.tipo))s.grupos[i.system.tipo]=c.stage;
 for(const i of actor.items.filter(i=>i.type==='Combate'))if(keep('item:'+sourceKey(i),'attacks')&&Object.hasOwn(s.grupos,i.system.tipo)){
  const delta=Number(i.system.nivel)-Number(s.grupos[i.system.tipo]);for(const k of ['def_l','def_m','def_p'])i.system[k]=Number(i.system[k])+delta;
 }
 actor.prototypeToken.name=actor.name;actor.prototypeToken.texture.src=actor.img;
 if(c.corporeality==='incorporeal')warnings.push('O livro usa Aura na EH de incorpóreas, mas não define uma EF especial aqui. Confira e trave a EF adequada à criatura.');
 if(naturalDamage(c)===null)warnings.push('Peso fora da faixa automática (2–47500 kg): preservados os danos dos componentes. Defina e trave cada dano manualmente.');
 if(weaponSizeBonus(c.height)===null&&c.usesTools)warnings.push('Altura acima de 32,50 m: fora da extensão automática de armas. Confira e trave o dano manualmente.');
 if(c.weight>9500&&c.weight<=47500)warnings.push('Dano natural estimado pela extensão extraoficial: acima de 9500 kg, faixas de 3000 kg, teto +4 por faixa e piso +4 a cada duas faixas.');
 if(c.height>6.5&&c.height<=32.5&&c.usesTools)warnings.push('Armas ampliadas: extensão extraoficial acima de 6,50 m, mantendo +4 de dano por faixa de um metro.');
 if(actor.items.some(i=>i.type==='Combate'&&catalog.find(e=>e.key===sourceKey(i))?.creatureMaterial&&!naturalColumns(i.name)))warnings.push('Ataques especiais sem linha correspondente na tabela preservam as colunas e o dano do componente; confira-os.');
 return recalculateNew({kind:'new',actor,choices:c,baseDescription:s.descricao,locks:clone(locks),sourceErrors:{},warnings:[...warnings,
  'EF e EH seguem o Livro 3.02. Peso, atributos, combatividade e repertório sugeridos ainda exigem julgamento do mestre. Não há orçamento de profissão nem garantia de equilíbrio.',
  'Proteção natural usa bônus de defesa de 0 a +3; ABS é preservada do componente, pois esta seção não fornece fórmula de absorção. Evite somar várias peles.',
  'Dano natural usa peso e Força; armas ampliadas usam altura. CD e demais grupos usados acompanham o estágio nas colunas. Extensões acima de 9500 kg/6,50 m são extraoficiais. Travas prevalecem.',
  'Karma de magia aprendida é uma sugestão editável; dons naturais usam uma frequência diária escolhida pelo mestre. Confira cada descrição.',
  'Raças civilizadas ou selvagens excepcionais podem usar a EH da profissão correspondente; ajuste e trave a EH nesse caso.'
 ]},context);
}
export function editNewItem(preview,context,{action,key,field,value}){
 const p=clone(preview),catalog=componentCatalog(context);
 if(action==='add'){
  const existing=p.actor.items.find(i=>sourceKey(i)===key);
  if(existing){if(existing.type==='Habilidade'&&Number(existing.system.nivel)===0){existing.system.nivel=p.choices.stage;return recalculateNew(p,context);}throw Error('Esse componente já está na prévia.');}
  const entry=catalog.find(i=>i.key===key);if(!entry)throw Error('Escolha um componente válido.');
  const item=configureItem(entry,context,p.choices);p.actor.items.push(item);if(item.type==='Combate'&&Object.hasOwn(p.actor.system.grupos,item.system.tipo))p.actor.system.grupos[item.system.tipo]=p.choices.stage;
 }else{
  const item=p.actor.items.find(i=>sourceKey(i)===key);if(!item)throw Error('Componente não encontrado.');
  if(action==='remove'){if(item.type==='Habilidade')item.system.nivel=0;else p.actor.items=p.actor.items.filter(i=>i!==item);}
  else if(field==='damage'&&item.type==='Combate'){
   const n=integer(value,0,100000,'dano-base');setDamageTable(item.system,n);
  }else if(field==='abs'&&item.type==='Defesa')item.system.absorcao=integer(value,0,100000,'absorção');
  else if(field==='defense'&&item.type==='Defesa')item.system.defesa_base.valor=integer(value,-50,100,'defesa');
  else if(field==='level'&&['Combate','Habilidade','Magia','Tecnica_Combate'].includes(item.type)){
   item.system.nivel=integer(value,0,item.type==='Combate'?p.choices.stage:100,item.type==='Combate'?'proficiência':'nível');
   if(item.type==='Combate')item.system.tipo='';
  }
  else throw Error('Esse campo não pertence ao componente.');
 }
 return recalculateNew(p,context);
}
export function newCreationData(preview){if(preview.kind!=='new')throw Error('Prévia nova inválida.');return creatureCreationData(preview);}
