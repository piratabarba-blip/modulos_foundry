// SPDX-License-Identifier: GPL-3.0-or-later
import {ATTRS,clone,merge} from './rules-adapter.mjs';
import {suggestIdentity} from './identity.mjs';
import {compatibleProfession,compatibleSpecialization,assertCompatibility} from './compatibility.mjs';
import {KITS} from './kits.mjs';
export const MODULE_ID='tagmar-personagens';
export const norm=s=>String(s??'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const canonical=s=>norm(s).split(' ').filter(x=>!['a','o','de','da','do','das','dos','e'].includes(x)&&!/^\d+$/.test(x)).join(' ');
export const specializations=p=>String(p?.system.especializacoes??'').split(',').map(s=>s.trim()).filter(Boolean);
export const id=()=>{const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);return [...bytes].map(x=>'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[x%62]).join('');};
export function pick(list,rng=Math.random){if(!list.length)throw Error('Nenhuma opção compatível no compêndio.');return list[Math.min(list.length-1,Math.floor(rng()*list.length))];}
function weighted(list,weight,rng){const weights=list.map(x=>Math.max(.01,weight(x))),total=weights.reduce((a,b)=>a+b,0);let n=rng()*total;for(let i=0;i<list.length;i++){n-=weights[i];if(n<=0)return list[i];}return list.at(-1);}
export const SECTION_TYPES={skills:['Habilidade'],techniques:['Tecnica_Combate'],spells:['Magia'],equipment:['Combate','Defesa','Pertence']};
const PROFILE={
 mago:{attrs:['INT','AUR','FIS','AGI'],skills:['misticismo','escrita','lingua','sabedoria','usar os sentidos'],weapons:['Cajado','Adaga']},
 guerreiro:{attrs:['FOR','FIS','AGI','PER'],skills:['aplicar esforco','escalar superficies','corrida','usar os sentidos','montar animais'],weapons:['Espada','Machado','Lança']},
 ladino:{attrs:['AGI','PER','INT','FIS'],skills:['acoes furtivas','destrezar fechaduras','furtar objetos','escalar superficies','enganacao'],weapons:['Adaga','Cimitarra','Arco Simples']},
 bardo:{attrs:['CAR','AUR','PER','AGI'],skills:['arte','persuasao','empatia','negociacao','etiqueta'],weapons:['Cimitarra','Adaga']},
 sacerdote:{attrs:['CAR','AUR','FIS','FOR'],skills:['religiao','medicina','empatia','lideranca','sabedoria'],weapons:['Maça','Cajado','Martelo']},
 rastreador:{attrs:['PER','AGI','FIS','AUR'],skills:['seguir trilhas','sobrevivencia','usar os sentidos','lidar com animais','navegacao'],weapons:['Arco Simples','Espada','Adaga']},
 feiticeiro:{attrs:['PER','AUR','FIS','AGI'],skills:['sensibilidade','sobrevivencia','misticismo','usar os sentidos','religiao'],weapons:['Cajado','Adaga']},
 berserker:{attrs:['FIS','FOR','AGI','PER'],skills:['sobrevivencia','aplicar esforco','corrida','escalar superficies','lidar com animais'],weapons:['Machado','Espada','Lança']}
};
export function dedupe(items){const map=new Map();for(const i of items){const key=norm(i.name);if(!map.has(key))map.set(key,i);}return [...map.values()];}
export function eligible(item,profession,specialization){
 const path=item.folders??[],route=path.slice(1).map(norm).join(' / '),prof=norm(profession.name);
 if(!route.includes(prof))return false;
 if(item.type==='Magia'&&!/^07\b/.test(norm(path[0])))return false;
 const last=norm(path.at(-1)),spec=canonical(specialization);
 if(/basic/.test(last)||path.length===2&&item.type==='Tecnica_Combate')return true;
 return !!spec&&canonical(last).includes(spec);
}
export function availableItems(catalog,profession,specialization,type){
 const candidates=catalog.filter(i=>i.type===type&&eligible(i,profession,specialization));
 // A versão da especialização substitui a versão básica do mesmo item, com seu custo próprio.
 candidates.sort((a,b)=>Number(b.folders.length)-Number(a.folders.length)||Number(a.system.custo)-Number(b.system.custo));
 return dedupe(candidates);
}
export function materialize(entry,calculator){
 const system=merge(calculator.defaults('Item',entry.type),entry.system);
 if(['Habilidade','Magia','Tecnica_Combate','Combate'].includes(entry.type))system.nivel=0;
 const flags={[MODULE_ID]:{source:entry.key,route:entry.folders??[]}};
 if(entry.uuid)flags.core={sourceId:entry.uuid};
 // Só dados de jogo; nunca herda scripts, ActiveEffects, permissões ou FX de terceiros.
 return {_id:id(),name:entry.name,type:entry.type,img:entry.img||'icons/svg/item-bag.svg',system,effects:[],flags};
}
export const sourceKey=i=>i.flags?.[MODULE_ID]?.source;
const groupCost=g=>['CD','CI','CL','CLD','EL'].includes(g)?1:['CmE','CmM','EM','PmA','PmL'].includes(g)?2:3;
function integer(value,label,min,max){const n=Number(value);if(!Number.isInteger(n)||n<min||n>max)throw Error(`${label}: use um inteiro entre ${min} e ${max}.`);return n;}
function protectedItems(previous,section,locks){return (previous?.actor.items??[]).filter(i=>SECTION_TYPES[section].includes(i.type)&&(locks[section]||locks['item:'+sourceKey(i)])).map(clone);}
function selectPair(options,previous,catalog,rng){
 const value=key=>options.locks?.[key]&&previous?previous.choices[key]:options[key];
 const races=catalog.filter(i=>i.type==='Raca'),profs=catalog.filter(i=>i.type==='Profissao');
 const resolve=(key,list)=>{const v=value(key);if(!v||v==='random')return null;const item=list.find(i=>i.key===v);if(!item)throw Error('Escolha de raça ou profissão ausente no sistema.');return item;};
 let race=resolve('race',races),profession=resolve('profession',profs);
 if(race&&profession){assertCompatibility(race,profession);return {race,profession};}
 if(profession)race=pick(races.filter(r=>compatibleProfession(r,profession)),rng);
 else{race??=pick(races.filter(r=>profs.some(p=>compatibleProfession(r,p))),rng);profession=pick(profs.filter(p=>compatibleProfession(race,p)),rng);}
 return {race,profession};
}
export function generate(options,previous,context){
 const {catalog,calculator,systemId,rng=Math.random}=context,locks=options.locks??{},warnings=[];
 const {race,profession}=selectPair(options,previous,catalog,rng);
 const stage=integer(locks.stage&&previous?previous.choices.stage:options.stage,'Estágio',1,50);
 let spec=locks.specialization&&previous?previous.choices.specialization:options.specialization??'';
 const specs=specializations(profession).filter(s=>compatibleSpecialization(race,profession,s));if(spec==='random')spec=norm(profession.name)==='sacerdote'&&locks['identity:deus']?'':specs.length?pick(specs,rng):'';if(spec&&!specs.includes(spec))throw Error('A especialização não pertence à profissão escolhida. Selecione outra ou retire a trava.');
 assertCompatibility(race,profession,spec);
 const suggested=suggestIdentity(options,previous,race,profession,spec,rng,specs);spec=suggested.specialization;
 const profile=PROFILE[norm(profession.name)]??{attrs:[profession.system.atrib_mag||'FOR','FIS','AGI','PER'],skills:[],weapons:['Cajado','Adaga']};
 const randomized=options.distribution==='random';
 const actor={name:options.name?.trim()||`${profession.name} — ${race.name}`,type:options.type==='NPC'?'NPC':'Personagem',img:'icons/svg/mystery-man.svg',system:merge(calculator.defaults('Actor',options.type==='NPC'?'NPC':'Personagem'),calculator.defaults('Actor','Personagem')),items:[],effects:[],flags:{core:{sheetClass:'tagmar.tagmarAltSheet'},[MODULE_ID]:{version:'0.1.0-beta.1',mode:'pontos'}},prototypeToken:{actorLink:options.type!=='NPC',name:'',texture:{src:'icons/svg/mystery-man.svg'}}};
 if(locks.name&&previous)actor.name=previous.actor.name;
 actor.prototypeToken.name=actor.name;
 actor.system.estagio=stage;actor.system.raca=race.name;actor.system.profissao=profession.name;actor.system.especializacao=spec;
 Object.assign(actor.system,suggested.identity);
 actor.items.push(materialize(race,calculator),materialize(profession,calculator));
 actor.system.mod_racial=clone(race.system.mod_racial);
 actor.system.atributos=Object.fromEntries(ATTRS.map(a=>[a,Number(race.system.mod_racial[a]??0)]));
 for(const a of ATTRS)if(locks['attr:'+a]){
  const value=options.attributes?.[a]??previous?.actor.system.atributos[a];
  actor.system.atributos[a]=integer(value,a,-4,10);
  if(actor.system.atributos[a]<Number(race.system.mod_racial[a]??0))throw Error(`O atributo ${a} travado está abaixo do modificador da raça. Ajuste o valor ou a raça.`);
 }
 if(calculator.attributeBalance(actor)<0)throw Error('Os atributos travados ultrapassam o orçamento. Reduza os valores ou libere uma trava.');
 if(!randomized)for(const a of profile.attrs.slice(0,2))if(!locks['attr:'+a]&&actor.system.atributos[a]<1){const before=actor.system.atributos[a];actor.system.atributos[a]=1;if(calculator.attributeBalance(actor)<0)actor.system.atributos[a]=before;}
 const weight=a=>randomized?1:Math.max(1,14-4*profile.attrs.indexOf(a))*(profile.attrs.includes(a)?1:.06);
 for(let guard=0;guard<150;guard++){
  const choices=ATTRS.filter(a=>!locks['attr:'+a]&&actor.system.atributos[a]<Math.max(4,Number(race.system.mod_racial[a]??0)+4)).filter(a=>{actor.system.atributos[a]++;const ok=calculator.attributeBalance(actor)>=0;actor.system.atributos[a]--;return ok;});
  if(!choices.length)break;const a=weighted(choices,a=>weight(a)/(Math.max(1,actor.system.atributos[a])+1),rng);actor.system.atributos[a]++;
 }
 const allSkills=dedupe(catalog.filter(i=>i.type==='Habilidade'));
 let innate=profession.system.hab_nata;
 // O catálogo usa Sensibilidade onde uma versão antiga da profissão diz Sensitividade.
 if(norm(innate)==='sensitividade'&&!allSkills.some(i=>i.name===innate))innate=allSkills.find(i=>norm(i.name)==='sensibilidade')?.name??innate;
 actor.system.hab_nata=innate;
 const budget=profession.system.p_aquisicao;
 let skills=locks.skills?protectedItems(previous,'skills',locks):allSkills.map(entry=>materialize(entry,calculator));
 if(!locks.skills)for(const kept of protectedItems(previous,'skills',locks)){const index=skills.findIndex(i=>sourceKey(i)===sourceKey(kept));if(index<0)throw Error('Uma habilidade travada não está mais disponível.');skills[index]=kept;}
 const innateItem=skills.find(i=>i.name===innate);if(innateItem)innateItem.system.nivel=stage;else warnings.push('Habilidade nata não encontrada no catálogo. Confira com o mestre.');
 function purchase(list,total,type,section,customWeight=()=>1){
  const cost=i=>Number(i.system.custo)+(type==='Habilidade'&&i.system.tipo===profession.system.grupo_pen?1:0);
  const free=i=>type==='Habilidade'&&i.name===innate&&i.system.tipo!==profession.system.grupo_pen;
  let remaining=total-list.reduce((n,i)=>n+(free(i)?0:cost(i)*Number(i.system.nivel)),0);
  if(remaining<0)throw Error(`Os itens travados em ${section} ultrapassam os pontos da profissão. Libere uma trava.`);
  if(locks[section])return list;
  for(let guard=0;guard<6000;guard++){
   const learned=list.filter(i=>i.system.nivel>0).length,maxSkills=Number(budget.p_hab)+Math.floor(stage/2);
   const pool=list.filter(i=>!locks['item:'+sourceKey(i)]&&!free(i)&&Number.isFinite(cost(i))&&cost(i)>0&&cost(i)<=remaining&&i.system.nivel<Math.min(stage,type==='Tecnica_Combate'&&Number(i.system.mecanica)===0?10:stage)&&(type!=='Habilidade'||i.system.nivel>0||learned<maxSkills));
   if(!pool.length)break;
   const item=weighted(pool,i=>customWeight(i)*(i.system.nivel>0?1.8:1)/(1+i.system.nivel/stage),rng);
   // Magias: completa a escolhida até o estágio antes de comprar outra; travas continuam exatas.
   const gain=type==='Magia'?Math.min(stage-Number(item.system.nivel),Math.floor(remaining/cost(item))):1;
   item.system.nivel+=gain;remaining-=cost(item)*gain;
  }
  return list;
 }
 const skillWeight=i=>randomized?1:profile.skills.includes(norm(i.name))?10:profile.attrs.includes(i.system.ajuste?.atributo)?2:1;
 skills=purchase(skills,Number(budget.p_hab)*stage,'Habilidade','skills',skillWeight);actor.items.push(...skills);
 function levelSection(type,section,total){
  const available=availableItems(catalog,profession,spec,type).filter(i=>type!=='Tecnica_Combate'||!i.system.pre_requisito?.tecnica);
  const kept=protectedItems(previous,section,locks),keys=new Set(available.map(i=>i.key));
  for(const item of kept)if(!keys.has(sourceKey(item)))throw Error(`Um item travado em ${section==='spells'?'magias':'técnicas'} não pertence à profissão/especialização. Libere a trava ou restaure a escolha.`);
  const list=locks[section]?kept:available.map(entry=>{const k=kept.find(i=>sourceKey(i)===entry.key);return k??materialize(entry,calculator);});
  purchase(list,total,type,section);
  return list.filter(i=>i.system.nivel>0||locks['item:'+sourceKey(i)]);
 }
 const techniques=levelSection('Tecnica_Combate','techniques',Number(budget.p_tec)*stage);actor.items.push(...techniques);
 const magicAttr=profession.system.atrib_mag,magicBudget=ATTRS.includes(magicAttr)?Math.max(0,(2*actor.system.atributos[magicAttr]+7)*stage):0;
 const spells=levelSection('Magia','spells',magicBudget);actor.items.push(...spells);
 // Equipamento comum dos compêndios; itens raciais/especiais não são sorteados como equipamento universal.
 let equipment=protectedItems(previous,'equipment',locks);
 if(!locks.equipment){
  const ordinary=catalog.filter(i=>i.realm==='reinos');
  const weapons=dedupe(ordinary.filter(i=>i.type==='Combate'&&/^04\b/.test(norm(i.folders?.[0]))&&Object.hasOwn(actor.system.grupos,i.system.tipo)&&Number(i.system.forca_min??-4)<=actor.system.atributos.FOR));
  const candidates=weapons.filter(i=>profile.weapons.some(n=>norm(i.name).startsWith(norm(n))));
  const selectedWeapons=[];
  for(const priority of profile.weapons){const list=candidates.filter(i=>norm(i.name).startsWith(norm(priority)));if(list.length&&!selectedWeapons.some(i=>i.system.tipo===list[0].system.tipo)){selectedWeapons.push(pick(list,rng));if(selectedWeapons.length>=2)break;}}
  if(!selectedWeapons.length&&weapons.length)selectedWeapons.push(pick(weapons,rng));
  const armor=dedupe(ordinary.filter(i=>i.type==='Defesa'&&norm(i.folders?.at(-1))==='armaduras'&&Number(i.system.for_min??0)<=actor.system.atributos.FOR&&Number(i.system.fis_min??0)<=actor.system.atributos.FIS));
  const light=['mago','feiticeiro','ladino','bardo'].includes(norm(profession.name));
  const allowedArmor=armor.filter(i=>!light||i.system.defesa_base.tipo==='L');
  const selectedArmor=allowedArmor.length?[pick(allowedArmor,rng)]:[];
  equipment.push(...[...selectedWeapons,...selectedArmor].filter(i=>!equipment.some(k=>sourceKey(k)===i.key)).map(i=>materialize(i,calculator)));
  const kitKey=options.kit??'adventurer',kit=KITS.find(k=>k.key===kitKey);
  if(!kit)throw Error('Kit de pertences não encontrado. Escolha novamente.');
  for(const [name,quantity] of kit.items){
   const entry=ordinary.find(i=>i.type==='Pertence'&&norm(i.name)===norm(name));
   if(!entry){warnings.push(`Pertence do kit ausente no compêndio: ${name}. Não foi substituído.`);continue;}
   if(equipment.some(i=>sourceKey(i)===entry.key))continue;
   const item=materialize(entry,calculator);item.system.quant=quantity;item.system.inTransport=false;equipment.push(item);
  }

 }
 actor.items.push(...equipment);
 if(locks.groups&&previous)actor.system.grupos=clone(previous.actor.system.grupos);
 else{
  const preferred=new Set(equipment.filter(i=>i.type==='Combate').map(i=>i.system.tipo));let left=Number(budget.p_gra)*stage;
  const pool=Object.keys(actor.system.grupos);
  for(let guard=0;guard<3000;guard++){const gs=pool.filter(g=>groupCost(g)<=left&&actor.system.grupos[g]<stage);if(!gs.length)break;const g=weighted(gs,g=>preferred.has(g)?20:1,rng);actor.system.grupos[g]++;left-=groupCost(g);}
 }
 let ehRolls=[];
 if(locks.eh&&previous){if(previous.choices.stage!==stage)throw Error('Libere a trava de EH para alterar o estágio.');ehRolls=clone(previous.ehRolls);}
 else for(let n=1;n<stage;n++)ehRolls.push(options.ehMode==='average'?null:Math.floor(rng()*10)+1);
 const table=profession.system.lista_eh;
 let eh=Number(profession.system.eh_base)+actor.system.atributos.FIS;
 const average=(Number(table.v1)*2+Number(table.v2)*3+Number(table.v3)*3+Number(table.v4)*2)/10;
 for(const roll of ehRolls)eh+=(roll===null?average:Number(table[roll<=2?'v1':roll<=5?'v2':roll<=8?'v3':'v4']))+actor.system.atributos.FIS;
 actor.system.eh.max=Math.max(0,Math.round(eh));actor.system.eh.value=actor.system.eh.max;
 actor.system.pontos_estagio.value=calculator.xpForStage(stage);
 actor.system.descricao='<p>Ficha sugerida pelo Gerador de Personagens e PNJs. Revise identidade, equipamentos, especialização e escolhas de aquisição com o mestre antes de usar.</p>';
 let calculated=calculator.calculate(actor);
 for(const key of ['ef','eh','karma','absorcao','focus'])calculated.system[key].value=calculated.system[key].max;
 if(calculated.type==='NPC')for(const key of ['ef','eh','karma'])calculated.system[key+'_npc']=clone(calculated.system[key]);
 calculated.prototypeToken.bar1={attribute:calculated.type==='NPC'?'ef_npc':'ef'};
 calculated.prototypeToken.bar2={attribute:calculated.type==='NPC'?'eh_npc':'eh'};
 calculated.prototypeToken.actorLink=calculated.type==='Personagem';
 // NPCs usam defesa fixa no sistema. Marca todos os itens de defesa da prévia como equipados.
 for(const item of calculated.items.filter(i=>i.type==='Defesa'))item.system.equipado=true;
 const result={actor:calculated,choices:{race:race.key,profession:profession.key,stage,specialization:spec},ehRolls,warnings,systemId};
 validatePreview(result,context);
 for(const [key,label] of [['pontos_aqui','habilidades'],['pontos_tec','técnicas'],['pontos_mag','magias'],['pontos_comb','grupos de armas']])if(calculated.system[key]>0)warnings.push(`Restam ${calculated.system[key]} ponto(s) de ${label} para revisão na ficha.`);
 return result;
}
export function validatePreview(result,{catalog,calculator,systemId}){
 if(result.systemId!==systemId)throw Error('Esta prévia pertence a outro sistema. Gere novamente.');
 const actor=result.actor,s=actor.system,stage=integer(s.estagio,'Estágio',1,50);
 if(!actor.name.trim())throw Error('Informe um nome.');
 for(const [key,label] of [['pontos_aqui','habilidades'],['pontos_tec','técnicas'],['pontos_mag','magias'],['pontos_comb','grupos de armas']])if(!Number.isFinite(s[key])||s[key]<0)throw Error(`Pontos insuficientes de ${label}. Reveja as escolhas travadas.`);
 if(calculator.attributeBalance(actor)<0)throw Error('Atributos acima do orçamento.');
 const profession=catalog.find(i=>i.key===result.choices.profession),race=catalog.find(i=>i.key===result.choices.race);if(!profession||!race)throw Error('Raça ou profissão ausente no catálogo.');
 assertCompatibility(race,profession,s.especializacao);
 for(const item of actor.items){if(['Habilidade','Tecnica_Combate','Magia'].includes(item.type)){
  integer(item.system.nivel,`Nível de ${item.name}`,0,Math.min(stage,item.type==='Tecnica_Combate'&&Number(item.system.mecanica)===0?10:stage));
  if(['Magia','Tecnica_Combate'].includes(item.type)&&!availableItems(catalog,profession,s.especializacao,item.type).some(i=>i.key===sourceKey(item)))throw Error(`Item incompatível com a profissão: ${item.name}.`);
 }}
 if(actor.items.filter(i=>i.type==='Habilidade'&&i.system.nivel>0).length>s.max_hab)throw Error('Quantidade de habilidades acima do máximo da profissão.');
 function finite(v){if(typeof v==='number'&&!Number.isFinite(v))throw Error('Cálculo inválido na prévia.');if(v&&typeof v==='object')Object.values(v).forEach(finite);}finite(actor);
 return result;
}
export function creationData(result,context){
 validatePreview(result,context);const data=clone(result.actor);delete data._id;
 for(const item of data.items)item._id=id();
 return data;
}
