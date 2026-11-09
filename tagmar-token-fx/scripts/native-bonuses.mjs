import {MODULE_ID} from './core.mjs';
import {bonusLabel} from './bonus-rules.mjs';
import {calendarNow} from './timers.mjs';
const docs=value=>Array.from(value?.contents??value??[]);
const basic=['INT','AUR','CAR','FOR','FIS','AGI','PER'];
const native=key=>[...basic,'ABS','DEF','KMA','VB','RFIS','RMAG'].includes(key);
const read=(obj,path)=>path.split('.').reduce((v,k)=>v?.[k],obj);
const active=(e,t,now)=>!e.disabled&&!t.expired&&!t.endedByRM&&!(now!==null&&now>=t.endsAt)&&
  !t.recurringRM?.immune&&!t.recurringRM?.savedThisTurn&&!t.recurringRM?.outside;

export async function recalculateNativeBonuses(actor,utils){
  // Usa as mesmas funções das fichas por pontos e sorteio, sem abrir janela
  // e aguardando as gravações antes da próxima rolagem.
  const all=docs(actor.items),seen=new Set();
  const items=all.filter(i=>{if(!['Raca','Profissao'].includes(i.type))return true;if(seen.has(i.type))return false;seen.add(i.type);return true;});
  const context={items,raca:items.find(i=>i.type==='Raca'),profissao:items.find(i=>i.type==='Profissao'),
    defesas:items.filter(i=>i.type==='Defesa'),pertences:items.filter(i=>i.type==='Pertence'&&!i.system.inTransport),
    pertences_transporte:items.filter(i=>i.type==='Pertence'&&i.system.inTransport),transportes:items.filter(i=>i.type==='Transporte')};
  // Fachada de leitura: Actor.items é não configurável no Foundry. Um Proxy
  // sobre o Actor não pode devolver outra coleção para essa propriedade.
  const document={...context,get system(){return actor.system;},
    getFlag:actor.getFlag.bind(actor),
    deleteEmbeddedDocuments:actor.deleteEmbeddedDocuments.bind(actor)};
  const data={document,items,options:{editable:true}},update={},itemUpdates=[];
  const points=String(actor.getFlag('core','sheetClass')??actor.sheet?.constructor?.name??'').includes('AltSheet');
  let effective;
  if(actor.type==='Personagem'){
    if(!points&&context.raca&&!game.settings.get(game.system.id,'ajusteManual'))utils._calculaAjuste(data,update);
    if(Object.keys(update).length){await actor.update(update);for(const key of Object.keys(update))delete update[key];}
    effective=points?utils._preparaEfeitosAtributos(data).efetivos:undefined;
    utils._prepareValorTeste(data,update,effective);
    if(context.profissao)utils._attProfissao(data,update,itemUpdates,effective);
    utils._attCargaAbsorcaoDefesa(data,update,effective);
    if(context.raca)utils._attEfEhVB(data,update,effective);
    utils._attEhTemporaria(data,update,!points);
    utils._attKarmaMax(data,update,effective);
    utils._attRM(data,update,effective);utils._attRF(data,update,effective);
  }else {utils._prepareValorTeste(data,update);utils._attDefesaNPC(data,update);}
  if(Object.values(update).some(v=>typeof v==='number'&&!Number.isFinite(v)))throw Error('Confira os dados básicos da ficha: '+Object.entries(update).filter(([,v])=>typeof v==='number'&&!Number.isFinite(v)).map(([k])=>k).join(', '));
  if(Object.keys(update).length)await actor.update(update);
  utils._updateHabilItems(data,itemUpdates,effective);
  utils._updateCombatItems(data,itemUpdates,effective);
  utils._updateMagiasItems(data,itemUpdates,effective);
  utils._updateTencnicasItems(data,itemUpdates,effective);
  const merged=new Map();
  for(const u of itemUpdates)merged.set(u._id,{...merged.get(u._id),...u});
  if(merged.size)await actor.updateEmbeddedDocuments('Item',[...merged.values()]);
}

async function npcBonuses(actor,desired){
  const saved=actor.getFlag(MODULE_ID,'npcBonuses')??[];
  const previous=Array.isArray(saved)?Object.fromEntries(saved):saved,next={};
  for(const item of desired.filter(i=>i.system.ativo)){
    const key=item.system.atributo,value=Number(item.system.valor);
    const paths=basic.includes(key)?[`system.atributos.${key}`]:({KMA:['system.karma.max'],VB:['system.vb'],RFIS:['system.rf'],RMAG:['system.rm']})[key]??[];
    for(const path of paths)next[path]=(next[path]??0)+value;
  }
  const update={};
  for(const path of new Set([...Object.keys(previous),...Object.keys(next)])){
    const delta=(next[path]??0)-(previous[path]??0);
    if(delta){const value=Number(read(actor,path));if(!Number.isFinite(value))throw Error(`Valor inválido: ${path}`);update[path]=value+delta;}
  }
  if(Object.keys(update).length)await actor.update({...update,[`flags.${MODULE_ID}.npcBonuses`]:Object.entries(next)});
}

export async function syncNativeBonuses(actor,utilities=null){
  if(!['Personagem','NPC'].includes(actor.type))return;
  const now=calendarNow(game),desired=[];
  for(const effect of docs(actor.effects)){
    const timer=effect.getFlag(MODULE_ID,'spellTimer');
    for(const [index,row] of (timer?.bonuses??[]).entries()){
      if(!native(row.attribute)||!Number.isFinite(Number(row.value))||Number(row.value)===0)continue;
      desired.push({name:`${effect.name} · ${bonusLabel(row.attribute)}`,type:'Efeito',img:effect.img,
        system:{atributo:row.attribute,tipo:'+',valor:Number(row.value),ativo:active(effect,timer,now)},
        flags:{[MODULE_ID]:{spellBonus:{effectId:effect.id,index}}}});
    }
  }
  const existing=docs(actor.items).filter(i=>i.getFlag(MODULE_ID,'spellBonus'));
  if(!existing.length&&!desired.length)return;
  const key=row=>{const f=row.getFlag?.(MODULE_ID,'spellBonus')??row.flags[MODULE_ID].spellBonus;return `${f.effectId}:${f.index}`;};
  const wanted=new Set(desired.map(key)),removed=existing.filter(i=>!wanted.has(key(i)));
  const creates=[],updates=[];
  for(const row of desired){
    const found=existing.find(i=>key(i)===key(row));
    if(!found)creates.push(row);
    else if(found.name!==row.name||found.img!==row.img||['atributo','tipo','valor','ativo'].some(k=>found.system[k]!==row.system[k]))updates.push({_id:found.id,name:row.name,img:row.img,system:row.system});
  }
  if(removed.length)await actor.deleteEmbeddedDocuments('Item',removed.map(i=>i.id));
  if(creates.length)await actor.createEmbeddedDocuments('Item',creates);
  if(updates.length)await actor.updateEmbeddedDocuments('Item',updates);
  // Refaz também quando os itens já existem: uma execução interrompida pode
  // ter criado os efeitos sem concluir o cálculo dos atributos.
  if(actor.type==='NPC')await npcBonuses(actor,desired);
  const utils=utilities??await import('/systems/tagmar_rpg/modules/sheets/actorUtils.js');
  await recalculateNativeBonuses(actor,utils);
}
