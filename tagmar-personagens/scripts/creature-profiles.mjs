// SPDX-License-Identifier: GPL-3.0-or-later
// Nomes dos grupos: https://tagmar.com.br/Criaturas.aspx
// As combinações abaixo são sugestões extraoficiais, nunca restrições de regra.
import {norm} from './generator.mjs';
export const GROUPS=[['AD','Animais'],['AG','Animais Gigantes'],['AO','Animais Sombrios'],['CC','Criaturas Artificiais'],['CDT','Criaturas de Dartel'],['CDV','Criaturas Divinas'],['DE','Criaturas Infernais'],['CM','Criaturas Místicas'],['CV','Criaturas Vegetais'],['DR','Dragões'],['DI','Dragões Imperiais'],['EL','Elementais'],['HI','Hidras'],['LI','Licantropos'],['MO','Monstros'],['MV','Mortos-Vivos'],['RC','Raças Civilizadas'],['RG','Raças Gigantes'],['RS','Raças Selvagens']];
export const INTELLECTS=[['auto','Sugerir pelo grupo'],['beast','Irracional / instintiva'],['thinking','Inteligente']];
export const MAGIC=[['auto','Sugerir pelo grupo'],['no','Sem magia'],['yes','Com magia / poderes mágicos']];
export const BODIES=[['auto','Sugerir pelo grupo'],['quadruped','Quadrúpede'],['biped','Bípede / com mãos'],['winged','Alada'],['serpent','Serpentiforme'],['aquatic','Aquática'],['arthropod','Inseto / aracnídeo / crustáceo'],['plant','Vegetal'],['amorphous','Amorfa']];
export const ELEMENTS=[['auto','Sugerir pelo grupo'],['none','Sem afinidade específica'],['fire','Fogo'],['water','Água'],['earth','Terra'],['air','Ar'],['ice','Gelo'],['dark','Sombras'],['light','Luz']];
export const MODES=[['random','Escolher e completar aleatoriamente'],['chosen','Somente minhas escolhas'],['none','Não incluir']];
const DEFAULTS={AD:['beast',false,'quadruped'],AG:['beast',false,'quadruped'],AO:['beast',true,'quadruped','dark'],CC:['beast',true,'biped','earth'],CDT:['thinking',true,'biped'],CDV:['thinking',true,'biped','light'],DE:['thinking',true,'biped','dark'],CM:['thinking',true,'winged'],CV:['beast',false,'plant'],DR:['thinking',true,'winged','fire'],DI:['thinking',true,'winged','fire'],EL:['beast',true,'amorphous','earth'],HI:['beast',false,'serpent'],LI:['thinking',false,'biped'],MO:['beast',false,'quadruped'],MV:['beast',true,'biped','dark'],RC:['thinking',false,'biped'],RG:['thinking',false,'biped'],RS:['thinking',false,'biped']};
const option=(rows,key,label)=>{if(!rows.some(x=>x[0]===key))throw Error(`Escolha ${label} válido.`);return key;};
export function creatureProfile(d){
 const group=option(GROUPS,d.group??'MO','um grupo'),base=DEFAULTS[group];
 const legacy=d.nature&&d.nature!=='auto'?d.nature:null;
 if(legacy&&!['beast','thinking','magical'].includes(legacy))throw Error('Natureza inválida.');
 let intellect=option(INTELLECTS,d.intelligence??'auto','um intelecto');
 if(intellect==='auto')intellect=legacy?(legacy==='beast'?'beast':'thinking'):base[0];
 let magic=option(MAGIC,d.magic??'auto','uma capacidade mágica');
 const magical=magic==='auto'?(legacy?legacy==='magical':base[1]):magic==='yes';
 let anatomy=option(BODIES,d.anatomy??'auto','uma forma do corpo');if(anatomy==='auto')anatomy=base[2];
 let element=option(ELEMENTS,d.element??'auto','uma afinidade');if(element==='auto')element=base[3]??'none';
 return {group,intellect,magical,anatomy,element,usesTools:intellect==='thinking'&&anatomy==='biped',nature:magical?'magical':intellect==='beast'?'beast':'thinking'};
}
const names=(items,values)=>items.filter(i=>values.includes(norm(i.name)));
const unique=items=>{const seen=new Set();return items.filter(i=>{const k=i.type+norm(i.name);if(seen.has(k))return false;seen.add(k);return true;});};
const ATTACKS={quadruped:['mordida','garra','chifre','patada','cauda','coice'],biped:['punho','garra','mordida','cabecada'],winged:['garra','bicada','mordida','cauda'],serpent:['mordida','bote','cauda','agarrar'],aquatic:['mordida','tentaculos','pinca','cauda'],arthropod:['pinca','mordida','ferrao','picada'],plant:['espinhos','agarrar','esmagar'],amorphous:['toque','esmagar','jato']};
const SPELLS={fire:['bola de fogo','piromanipulacao','resistencia ao fogo'],water:['hidromanipulacao','onda destrutiva','respiracao aquatica'],earth:['geomancia','geomanipulacao','armadilha natural'],air:['aeromanipulacao','raio eletrico','levitacao'],ice:['dardos de gelo','toque gelido','hidromanipulacao'],dark:['escuridao','medo','putrefacao'],light:['manipulacao de luz','curas fisicas','protecao divina'],none:['manipulacao de luz','ilusoes','sono','invisibilidade','raio eletrico','escudo magico']};
const BREATH={fire:['halito flamejante'],water:['jato de agua'],earth:['rochas','jato de lama'],air:['halito de ar espiral','halito eletrico'],ice:['halito congelante','halito gelado'],dark:['halito infernal'],light:['halito sagrado'],none:[]};
export function automaticCandidates(catalog,c,attrs={}){
 const natural=catalog.filter(i=>i.creatureMaterial),common=catalog.filter(i=>!i.creatureMaterial);
 const attacks=names(natural.filter(i=>i.type==='Combate'),ATTACKS[c.anatomy]??ATTACKS.quadruped);
 if(c.magical&&['DR','DI','EL','DE','CDV'].includes(c.group))attacks.unshift(...names(natural.filter(i=>i.type==='Combate'),BREATH[c.element]??[]));
 const weapons=common.filter(i=>i.type==='Combate'&&/^04\b/.test(norm(i.folders?.[0]))&&['cajado','adaga','espada','espada curta','cimitarra','machado de guerra','clava','porrete','lanca','lanca leve'].includes(norm(i.name))&&Number(i.system.forca_min??0)<=Number(attrs.FOR??0));
 const category=c.scale<1?'l':c.scale>=1.75?'p':'m';
 const armorNames=c.anatomy==='plant'?['casca de arvore']:c.anatomy==='arthropod'?['exoesqueleto']:c.group==='CC'?['corpo de pedra','corpo de ferro','corpo de argila']:c.group==='EL'?({water:['corpo de agua'],earth:['corpo de pedra','corpo de areia'],ice:['corpo de gelo'],fire:['gase'],air:['gase']}[c.element]??['gase']):['DR','DI','HI'].includes(c.group)||['serpent','aquatic'].includes(c.anatomy)?['escamas']:['couro animal'];
 let protection=natural.filter(i=>i.type==='Defesa'&&armorNames.some(n=>norm(i.name)===n+' '+category));
 if(!protection.length)protection=natural.filter(i=>i.type==='Defesa'&&armorNames.some(n=>norm(i.name).startsWith(n)));
 if(c.usesTools){const armor=names(common.filter(i=>i.type==='Defesa'),['couro leve','couro rigido','cota de malha parcial','couraca parcial']).filter(i=>Number(i.system.for_min??0)<=Number(attrs.FOR??0)&&Number(i.system.fis_min??0)<=Number(attrs.FIS??0));if(armor.length)protection=armor;}
 const skillNames=c.intellect==='thinking'?['usar os sentidos','sobrevivencia','escalar superficies','lideranca','sabedoria','misticismo','navegacao']:['usar os sentidos','sobrevivencia','seguir trilhas','natação','escalar superficies'];
 const skills=names(common.filter(i=>i.type==='Habilidade'),skillNames.map(norm));
 const techniqueNames=c.usesTools?['aparar','esquiva','desviar','ataque oportuno','carga']:c.anatomy==='quadruped'?['carga de quadrupede','bote','ataques multiplos']:c.anatomy==='winged'?['carga aerea','ataques multiplos']:['ataques multiplos','prender'];
 const techniques=names(catalog.filter(i=>i.type==='Tecnica_Combate'),techniqueNames);
 // Não sorteia pacotes de poderes que descrevem uma criatura específica, nem técnicas com pré-requisitos.
 const safeTechniques=techniques.filter(i=>!i.system.pre_requisito?.tecnica&&!(/pr[eé][ -]?requisito/i.test(String(i.system.descricao??''))));
 const powers=c.magical?names(common.filter(i=>i.type==='Magia'&&/^07\b/.test(norm(i.folders?.[0]))),SPELLS[c.element]??SPELLS.none):[];
 const gear=c.usesTools?names(common.filter(i=>i.type==='Pertence'),['cantil','corda','corda trancada','mochila de couro','algibeira','pederneiras','capa','racao de viagem']):[];
 return {attacks:unique(c.usesTools&&weapons.length?weapons:attacks),protection:unique(protection),skills:unique(skills),techniques:unique(safeTechniques),powers:unique(powers),gear:unique(gear)};
}
