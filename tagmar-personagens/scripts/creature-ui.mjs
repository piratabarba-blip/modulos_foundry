// SPDX-License-Identifier: GPL-3.0-or-later
import {ATTRS,clone} from './rules-adapter.mjs';
import {groupSkills} from './skill-groups.mjs';
import {creaturePacks,creatureIndex,loadCreature} from './provider.mjs';
import {CREATURE_BLOCKS,prepareCreature,generateCreature,creatureCreationData,validateCreature} from './creatures.mjs';
export const creatureState=()=>({draft:{pack:'',source:'',factor:150,name:'',variation:false,locks:{},folder:''},preview:null,source:null,dirty:false,created:null,error:''});
const help={
 source:'Escolha uma criatura do compêndio do sistema ativo. A busca filtra os nomes. A ficha original nunca é alterada. Trocar de criatura limpa a prévia e as travas anteriores.',
 factor:'Sugestão extraoficial: 100% é a base, abaixo disso fica mais fraca e acima fica mais forte. EF, EH e Karma são multiplicados pela potência; dano-base e ABS pela raiz quadrada. Estágio e níveis treinados acompanham a potência; RM, RF e Moral recebem a diferença de estágio. Zero continua zero. Não é uma medida de desafio oficial.',
 locks:'Trave recursos, atributos, ataques, proteções, habilidades ou poderes. Também há cadeados por item e valor. A edição de um número fecha sua trava. Gerar novamente sempre parte da original, sem multiplicar a variante anterior. Totais de itens continuam refletindo os atributos.',
 powers:'Magias, poderes, textos, imagens, tamanho e formas de movimento são reaproveitados. Técnicas treinadas acompanham a diferença de estágio. Confira os poderes narrativos que mencionam números ou exigências próprias; não se criam poderes novos.',
 create:'Cria uma cópia nova como Não Jogador (PNJ), com itens e token próprios, na pasta escolhida. Só este botão grava uma ficha no mundo. Nenhuma prévia altera o compêndio ou os atores existentes.'
};
function itemSummary(i,actor){const s=i.system;
 if(i.type==='Combate'){const n=Number(s.nivel||0)+Number(s.custo||0);return `L ${Number(s.def_l)+n} · M ${Number(s.def_m)+n} · P ${Number(s.def_p)+n} · 100%: ${s.dano.d100}`;}
 if(i.type==='Defesa')return `${s.defesa_base.tipo}${s.defesa_base.valor} · ABS ${s.absorcao}`;
 if(i.type==='Habilidade')return `Nível ${s.nivel} · Total ${s.total}`;
 if(i.type==='Tecnica_Combate')return `Nível ${s.nivel} · FA ${s.fa}`;
 if(i.type==='Magia')return `Nível ${s.nivel} · Total ${s.total.valor}`;
 return 'Preservado';
}
export async function creatureView(app){
 const c=app.creature,d=c.draft,p=c.preview,base=c.source?.actor,locks=d.locks;
 const packs=creaturePacks();if(!packs.some(x=>x.key===d.pack)){d.pack=packs[0]?.key??'';d.source='';}
 const index=d.pack?await creatureIndex(d.pack):[];
 const choices=(rows,value)=>rows.map(x=>({...x,selected:x.key===value}));
 const comparisons=p?[['estagio','Estágio','stage'],['ef','EF','resource:ef'],['eh','EH','resource:eh'],['karma','Karma','resource:karma'],['absorcao','ABS','protection'],['rm','RM','resource:rm'],['rf','RF','resource:rf'],['moral','Moral','resource:moral']].map(([key,label,lock])=>({key,label,lock,original:base.system[key]?.max??base.system[key],value:p.actor.system[key]?.max??p.actor.system[key],locked:!!locks[lock],editable:key!=='absorcao'})):[];
 const blocks=p?CREATURE_BLOCKS.map(([key,label,types])=>({key,label,locked:!!locks[key],open:app.expanded.has('creature:'+key),items:p.actor.items.filter(i=>types.includes(i.type)).map(i=>({key:i._id,name:i.name,img:i.img,category:i.system.tipo,level:i.system.nivel,total:i.system.total,baseLevel:base.items.find(x=>x._id===i._id)?.system.nivel,baseTotal:base.items.find(x=>x._id===i._id)?.system.total,locked:!!locks['item:'+i._id],base:itemSummary(base.items.find(x=>x._id===i._id),base),value:itemSummary(i,p.actor)}))})):[];
 for(const block of blocks)if(block.key==='skills'){block.skills=true;block.skillGroups=groupSkills(block.items);}
 const sourceIssue=p?Object.keys(p.sourceErrors).filter(k=>p.actor.system[k].max<0).map(k=>`A fonte tem ${k.toUpperCase()} negativa. Corrija esse valor na variante antes de criar a cópia.`).join(' '):'';
 const rows=index.map(i=>({...i,label:i.name+(i.stage===undefined?'':` · estágio ${i.stage}`)}));
 return {criatura:true,sourceIssue,creatureSearchText:c.query??rows.find(i=>i.key===d.source)?.label??'',creatureDraft:d,creatureHelp:help,creaturePacks:choices(packs,d.pack),creatureChoices:choices(rows,d.source),creatureEmpty:!packs.length,creatureSource:c.source,preview:p,dirty:c.dirty,created:c.created,error:c.error,busy:app.busy,comparisons,blocks,
  creatureAttributes:p?ATTRS.map(key=>({key,original:base.system.atributos[key],value:p.actor.system.atributos[key],locked:!!locks['attr:'+key]})):[],attributesOpen:app.expanded.has('creature:attributes'),nameLocked:!!locks.name,attributesLocked:!!locks.attributes,resourcesLocked:!!locks.resources,movementLocked:!!locks.movement,
  movementFields:p?[['vb','VB'],['vbe','VBE'],['iniciativa','Iniciativa']].map(([key,label])=>({key,label,value:p.actor.system[key]})):[],
  creatureMovement:p?`VB ${p.actor.system.vb} · VBE ${p.actor.system.vbe} · Iniciativa ${p.actor.system.iniciativa}`:'',
  folders:choices([{key:'',label:'Sem pasta'},...game.folders.filter(f=>f.type==='Actor').map(f=>({key:f.id,label:f.name}))],d.folder)};
}
export async function creatureAction(app,action,data){
 const c=app.creature,d=c.draft;
 if(action==='c-lock'){if(!c.preview){ui.notifications.info('Gere a prévia antes de travar.');return;}d.locks[data.key]=!d.locks[data.key];return;}
 if(action==='c-unlock'){d.locks={};return;}
 if(action==='c-generate'){
  if(!d.source)throw Error('Escolha a criatura-base na lista.');
  const source=c.source?.uuid===`Compendium.${d.pack}.Actor.${d.source}`?c.source:prepareCreature(await loadCreature(d.pack,d.source),app.context.calculator);
  const next=generateCreature(source,d,c.preview,app.context.calculator);c.source=source;c.preview=next;c.dirty=false;c.created=null;
 }else if(action==='c-create'){
  if(!c.preview||c.dirty||c.created)throw Error('Gere uma prévia atualizada antes de criar a criatura.');
  const payload=creatureCreationData(c.preview);if(d.folder)payload.folder=d.folder;
  const actor=await Actor.create(payload,{renderSheet:false});if(!actor)throw Error('Não foi possível criar a criatura.');
  c.created=actor.id;ui.notifications.info(`Criatura criada: ${actor.name}.`);await actor.sheet.render(true);
 }else if(action==='c-open'){await game.actors.get(c.created)?.sheet.render(true);}
}
export function editCreature(app,key,value){
 const c=app.creature;if(!c.preview||c.dirty)throw Error('Gere a prévia pendente antes de editar os valores.');
 const n=Number(value);if(!Number.isInteger(n)||Math.abs(n)>1000000)throw Error('Use um número inteiro válido.');
 const p=clone(c.preview),s=p.actor.system;
 if(key.startsWith('attr:')){if(!ATTRS.includes(key.slice(5)))throw Error('Atributo inválido.');s.atributos[key.slice(5)]=n;}
 else if(key==='estagio'){if(n<0||n>1000)throw Error('Estágio inválido.');s.estagio=n;}
 else if(['vb','vbe','iniciativa'].includes(key)){if(n<0)throw Error('O movimento não pode ser negativo.');s[key]=n;}
 else if(['ef','eh','karma','rm','rf','moral'].includes(key)){if(n<0)throw Error('O recurso não pode ser negativo.');if(['ef','eh','karma'].includes(key)){s[key]={...s[key],value:n,max:n};s[key+'_npc']=clone(s[key]);}else s[key]=n;}
 else throw Error('Campo não editável.');
 p.actor=app.context.calculator.calculateCreature(p.actor);p.actor.system.absorcao.value=p.actor.system.absorcao.max;validateCreature(p);
 c.preview=p;c.created=null;c.draft.locks[key.startsWith('attr:')?key:key==='estagio'?'stage':['vb','vbe','iniciativa'].includes(key)?'movement':'resource:'+key]=true;
}
