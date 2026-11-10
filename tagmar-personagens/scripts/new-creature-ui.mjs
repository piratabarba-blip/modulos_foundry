// SPDX-License-Identifier: GPL-3.0-or-later
import {ATTRS,clone} from './rules-adapter.mjs';
import {groupSkills} from './skill-groups.mjs';
import {pickerChoices} from './picker-choices.mjs';
import {sourceKey,norm} from './generator.mjs';
import {editCreature} from './creature-ui.mjs';
import {SIZES,FOCUSES,NEW_BLOCKS,componentCatalog,generateNewCreature,editNewItem,newCreationData,blockPlan,recalculateNew,skillCatalog} from './new-creature.mjs';
import {GROUPS,INTELLECTS,MAGIC,BODIES,ELEMENTS,MODES,creatureProfile,automaticCandidates} from './creature-profiles.mjs';
import {COMBATIVENESS,ORGANIZATIONS,CORPOREALITIES,CONSTRUCTIONS,MAGIC_SOURCES,DAMAGE_RANGES,MORALES,BOOK_SOURCE} from './creature-book.mjs';
const HELP={
 build:'Começa uma ficha nova de PNJ. EF, EH, defesa, ataques naturais e resistências usam o Livro de Criaturas 3.02, capítulo 5. Perfil, peso e atributos iniciais são sugestões. Você pode editar e travar os valores; a criatura criada é sua, não uma criatura oficial do livro.',
 locks:'Editar um valor fecha seu cadeado. Gerar novamente preserva valores, itens e blocos travados. Os totais continuam acompanhando os atributos. A opção Variação muda as sugestões; desligada, os números ficam previsíveis.',
 parts:'Adicione itens exatos antes ou depois de gerar. Escolher e completar preserva suas escolhas e sorteia até a quantidade indicada, sem duplicar nomes. Somente minhas escolhas não completa nada. Não incluir esvazia os outros blocos, mesmo com travas. Em Habilidades, Sem níveis treinados mantém a lista completa no nível zero; quantidade conta somente habilidades treinadas. Uma trava de bloco mantém sua lista atual. As sugestões usam grupo, inteligência, magia, corpo e afinidade; suas escolhas manuais têm prioridade.',
 resources:'EF = piso(2 × raiz do peso) + Físico; construída usa 2,5. EH = estágio × (base da combatividade + 7 se naturalmente solitária + Físico ou Aura para incorpórea); não combativa tem EH zero. Travas preservam exceções. ABS vem da proteção; não há fórmula de ABS nesta seção do livro.',
 damage:'Dano-base a 100%, antes do atributo e do ajuste do próprio ataque. Alterar este valor redimensiona a tabela de percentuais. O total de dano inclui os bônus nativos da ficha.',
 nature:'Inteligência e magia são independentes: uma fera irracional pode ter dons naturais. INT −7 é a representação numérica de irracional na ficha. Dons usam frequência diária e Karma zero; magia aprendida permite Karma. As sugestões por grupo podem ser alteradas.',
 group:'Os 19 nomes de grupos seguem Criaturas Online do Tagmar. O gerador sugere inteligência, magia e corpo para cada grupo; você pode substituir cada escolha. Isso não copia poderes, imunidades ou uma criatura existente.',
 anatomy:'A forma do corpo orienta ataques, proteção e técnicas. O sorteio de armas, armaduras comuns e pertences é reservado a criaturas inteligentes bípedes com mãos. Suas escolhas manuais podem abrir exceções.',
 element:'Orienta os poderes e magias sorteados: fogo, água, terra, ar, gelo, sombras ou luz. Não aplica imunidades, vulnerabilidades nem efeitos automaticamente.',
 size:'Porte sugere peso, altura e tamanho do token. Os cálculos usam o peso e a altura em números, não o nome do porte. Peso/altura vazios usam a sugestão. Armas proporcionais à altura têm bônus automático; acima de 6,50 m usa extensão extraoficial até 32,50 m. Não altera ABS por estágio.',
 book:'Combatividade sugere bases 0, 5, 7, 10 ou 13. Solitária significa a organização natural da espécie; separar um indivíduo de um grupo não dá +7. Não combativa sempre tem EH zero. Perfis automáticos são sugestões editáveis.',
 body:'Corpórea usa Físico na EH; incorpórea usa Aura. Construída usa o multiplicador 2,5 na EF. Ser irracional não é o mesmo que não possuir mente. Confira a EF de incorpóreas e trave as exceções.',
 natural:'Dano-base natural por peso, em múltiplos de quatro, mais Força no total nativo. Livro: 2–9500 kg. Extensão extraoficial automática até 47500 kg: +3000 kg por faixa, teto +4 por faixa e piso +4 a cada duas faixas. Armas proporcionais: +4 por metro até 32,50 m; acima de 6,50 m é extensão extraoficial. Estágio/CD aumenta a coluna, não o dano-base. Hálitos e ataques especiais preservam o componente. Travas prevalecem.',
 spells:'Dons naturais: frequência por magia, escolhida pelo mestre, registrada na biografia; sem contador automático nem gasto de Karma. Magias aprendidas: Karma sugerido e editável. Nada substitui as limitações da descrição da magia.',
 morale:'Moral normalmente é o estágio. Covarde usa 50%, destemida 150%, e mágica destemida 200%. Construídas e mortos-vivos sugerem Sem Moral. Zero registra a ausência de Moral; não adiciona imunidade automática.',
 speed:'Informe a Velocidade Base (VB), em metros por rodada de 15 segundos, como na ficha. O valor vai diretamente para a VB, sem conversão. Vazio usa uma sugestão pelo perfil. Editar e travar a VB na prévia preserva esse valor ao gerar novamente.'
};
const list=(rows,value)=>rows.map(([key,label])=>({key,label,selected:key===value}));
export function newCreatureView(app){
 const n=app.newCreature,d=n.draft,p=n.preview,locks=d.locks,catalog=componentCatalog(app.context),profile=creatureProfile(d),suggested=automaticCandidates(catalog,{...profile,scale:SIZES.find(x=>x[0]===d.size)?.[2]??1},p?.actor.system.atributos);
 const stats=p?[['ef','EF'],['eh','EH'],['karma','Karma'],['rm','RM'],['rf','RF'],['moral','Moral'],['vb','VB'],['vbe','VBE'],['iniciativa','Iniciativa']].map(([key,label])=>{const lock=['vb','vbe','iniciativa'].includes(key)?'movement':'resource:'+key;return {key,label,value:p.actor.system[key]?.max??p.actor.system[key],lock,locked:!!(locks[lock]||locks.resources)};}):[];
 const blocks=NEW_BLOCKS.map(([key,label,types])=>{const plan=blockPlan(d,key),chosen=plan.picks.filter(k=>catalog.some(i=>i.key===k&&types.includes(i.type)));return {key,label,locked:!!locks[key],open:app.expanded.has('new:'+key),modes:list(MODES,plan.mode),count:plan.count,random:plan.mode==='random',excluded:plan.mode==='none',hint:plan.mode==='none'?'Este bloco não será incluído.':plan.mode==='chosen'?'Somente os itens que você escolher.':`${suggested[key].length} sugestões compatíveis. Quantidade é o total desejado; escolhas manuais adicionais são mantidas.`,chosen:chosen.map(k=>({key:k,name:catalog.find(i=>i.key===k).name})),items:(p?.actor.items??[]).filter(i=>types.includes(i.type)).map(i=>{
  const s=i.system,atk=i.type==='Combate',def=i.type==='Defesa',level=['Combate','Habilidade','Magia','Tecnica_Combate'].includes(i.type);
  return {key:sourceKey(i),name:i.name,img:i.img,locked:!!locks['item:'+sourceKey(i)],attack:atk,protection:def,canLevel:level,level:s.nivel,category:s.tipo,total:s.total,noLevel:!!s.nao_rolar_sem_nivel,editable:!!p,damage:s.dano_base?.d100,abs:s.absorcao,defense:s.defesa_base?.valor,
   summary:atk?`Grupo ${s.tipo||'Individual'} · Nível ${s.nivel} · L ${Number(s.def_l)+Number(s.nivel)+Number(s.custo)} · M ${Number(s.def_m)+Number(s.nivel)+Number(s.custo)} · P ${Number(s.def_p)+Number(s.nivel)+Number(s.custo)} · Dano 100% ${s.dano.d100}`:def?`${s.defesa_base.tipo}${s.defesa_base.valor} · ABS ${s.absorcao}`:i.type==='Habilidade'?`Total ${s.total}`:i.type==='Magia'?`Total ${s.total.valor}`:i.type==='Pertence'?`${s.quant} un. · ${Number(s.peso*s.quant).toLocaleString('pt-BR')} kg`:`FA ${s.fa}`};
 }),candidates:pickerChoices(catalog.filter(i=>types.includes(i.type)),{excluded:[...catalog.filter(i=>chosen.includes(i.key)),...(p?.actor.items??[]).filter(i=>types.includes(i.type))]})};});
 for(const block of blocks)if(block.key==='skills'){
  block.skills=true;
  if(!p)block.items=skillCatalog(app.context).map(i=>({key:i.key,name:i.name,img:i.img,category:i.system.tipo,total:'—',level:0,noLevel:!!i.system.nao_rolar_sem_nivel,editable:false}));
  block.skillGroups=groupSkills(block.items);
  block.modes=block.modes.map(m=>({...m,label:m.key==='none'?'Sem níveis treinados':m.label}));
  block.hint='Todas as habilidades permanecem na ficha. Quantidade e escolhas definem quais recebem níveis. Nível 0 mantém o total nativo (−7); habilidades restritas continuam exigindo treinamento.';
 }
 return {novaCriatura:true,draft:d,speedVbValue:d.speedVb!==''&&d.speedVb!=null?d.speedVb:d.speedKmh!==''&&d.speedKmh!=null?Math.round(25*Number(d.speedKmh)/6*100)/100:'',preview:p,busy:app.busy,dirty:n.dirty,error:n.error,created:n.created,locks,help:HELP,bookSource:BOOK_SOURCE,profileOpen:app.expanded.has('new:profile'),spellSourceOpen:app.expanded.has('new:spell-source'),identityOpen:app.expanded.has('new:identity'),
  combativities:list(COMBATIVENESS,d.combativeness??'auto'),organizations:list(ORGANIZATIONS,d.organization??'group'),corporealities:list(CORPOREALITIES,d.corporeality??'corporeal'),constructions:list(CONSTRUCTIONS,d.construction??'auto'),magicSources:list(MAGIC_SOURCES,d.magicSource??'auto'),damageRanges:list(DAMAGE_RANGES,d.damageRange??'middle'),morales:list(MORALES,d.moralMode??'auto'),
  bookSummary:p?`EF por ${p.choices.weight} kg · Combatividade ${COMBATIVENESS.find(x=>x[0]===p.choices.combativeness)?.[1]} · ${p.choices.organization==='solitary'?'Solitária':'Em grupo'} · EH usa ${p.choices.corporeality==='incorporeal'?'Aura':'Físico'}`:'',
  sizes:list(SIZES,d.size),groups:list(GROUPS,d.group??'MO'),intellects:list(INTELLECTS,d.intelligence??'auto'),magics:list(MAGIC,d.magic??'auto'),bodies:list(BODIES,d.anatomy??'auto'),elements:list(ELEMENTS,d.element??'auto'),profileLabel:`${GROUPS.find(x=>x[0]===profile.group)[1]} · ${profile.intellect==='beast'?'Irracional':'Inteligente'} · ${profile.magical?'Com magia':'Sem magia'} · ${BODIES.find(x=>x[0]===profile.anatomy)[1]}`,focuses:list(FOCUSES,d.focus),stats,blocks,
  attributes:p?ATTRS.map(key=>({key,value:p.actor.system.atributos[key],locked:!!locks['attr:'+key]})):[],
  folders:list([['','Sem pasta'],...game.folders.filter(f=>f.type==='Actor').map(f=>[f.id,f.name])],d.folder),resourcesLocked:!!locks.resources,attributesLocked:!!locks.attributes};
}
export async function newCreatureAction(app,action,data){
 const n=app.newCreature,d=n.draft;
 if(action==='n-generate'){n.preview=generateNewCreature(d,n.preview,app.context);n.dirty=false;n.created=null;}
 else if(action==='n-lock'){if(!n.preview)throw Error('Gere a prévia antes de travar.');d.locks[data.key]=!d.locks[data.key];n.preview.locks=clone(d.locks);}
 else if(action==='n-unlock'){d.locks={};if(n.preview)n.preview.locks={};}
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
  n.preview.locks=clone(d.locks);
  const next=editNewItem(n.preview,app.context,{action:action==='n-add'?'add':action==='n-remove'?'remove':'edit',key,field:data.field,value:data.value});
  n.preview=next;n.created=null;
  if(block==='skills'&&action==='n-item-edit'&&Number(data.value)>0&&d.modes?.skills==='none')d.modes.skills='chosen';
  if(action==='n-remove'){delete d.locks['item:'+key];delete d.locks[block];}
  else d.locks['item:'+key]=true;
 }
}
export function bindNewCreature(app){
 for(const input of app.element.querySelectorAll('[data-n-field]'))input.addEventListener('change',async()=>{
  if(app.busy)return;const key=input.dataset.nField,n=app.newCreature;
  n.draft[key]=input.type==='checkbox'?input.checked:input.type==='number'&&input.value!==''?Number(input.value):input.value;
  if(key==='speedVb')delete n.draft.speedKmh;
  if(['group','intelligence','magic'].includes(key))n.draft.nature='auto';
  if(key!=='folder'){n.dirty=true;n.created=null;n.error='';}await app.render({force:true});
 });
 for(const input of app.element.querySelectorAll('[data-n-plan]'))input.addEventListener('change',async()=>{
  if(app.busy)return;const n=app.newCreature,prop=input.dataset.nPlan,block=input.dataset.nBlock;
  n.draft[prop]??={};n.draft[prop][block]=input.type==='number'?Number(input.value):input.value;n.dirty=true;n.created=null;n.error='';await app.render({force:true});
 });
 for(const input of app.element.querySelectorAll('[data-n-edit]'))input.addEventListener('change',async()=>{
  try{const n=app.newCreature;editCreature({creature:n,context:app.context},input.dataset.nEdit,input.value);n.preview=recalculateNew({...n.preview,locks:clone(n.draft.locks)},app.context);n.error='';}catch(e){app.newCreature.error=e.message;ui.notifications.warn(e.message);}await app.render({force:true});
 });
 for(const input of app.element.querySelectorAll('[data-n-item]'))input.addEventListener('change',()=>app.perform('n-item-edit',{key:input.dataset.nItem,field:input.dataset.nProp,value:input.value}));

}
