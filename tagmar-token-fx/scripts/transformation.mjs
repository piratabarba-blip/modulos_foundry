import {changeTokenActor} from './token-actor-lifecycle.mjs';
import {MODULE_ID} from './core.mjs';
import {calendarNow} from './timers.mjs';
import {secondsFor} from './cast-rules.mjs';
const docs=c=>Array.from(c?.contents??c??[]);
const primary=()=>game.users.filter(u=>u.active&&u.isGM).sort((a,b)=>a.id.localeCompare(b.id))[0]?.id===game.user.id;
const escape=s=>foundry.utils.escapeHTML(String(s));
export const transformationState=token=>token?.getFlag?.(MODULE_ID,'transformation');
export function physicalEnergy(actor){
  const value=actor?.system?.[actor.type==='NPC'?'ef_npc':'ef']?.value;
  return value!==null&&value!==undefined&&Number.isFinite(Number(value))?Number(value):null;
}
export async function resolveForm(uuid,user){
  const actor=typeof uuid==='string'&&uuid?await fromUuid(uuid):null;
  if(actor?.documentName!=='Actor'||actor.type!=='NPC')throw Error('Escolha uma criatura ou Não Jogador (PNJ) para a transformação.');
  if(!user.isGM&&!actor.testUserPermission(user,'OBSERVER'))throw Error('Você não tem acesso à ficha da forma escolhida.');
  if(physicalEnergy(actor)===null||physicalEnergy(actor)<=0)throw Error('A forma escolhida precisa ter EF atual maior que zero. Confira a ficha da criatura.');
  return actor;
}
// O ActorDelta do Foundry aceita tipo, atributos, itens e efeitos próprios.
// Tombstones ocultam os itens do ator-base somente nesta cópia do token.
export function formDelta(token,form,item){
  const base=token.baseActor.toObject(),data=form.toObject(),original=token.actor.toObject();
  const items=structuredClone(data.items??[]);
  for(const entry of items){
    if(entry.flags?.[MODULE_ID]){delete entry.flags[MODULE_ID].activeJb2a;}
  }
  // Num token desvinculado, conserva a magia de origem para que seu UUID e
  // temporizador visual continuem resolvíveis durante a transformação.
  if(item.actor?.isToken&&item.actor.uuid===token.actor.uuid){
    const index=items.findIndex(i=>i._id===item.id);
    if(index>=0)items.splice(index,1);
    items.push(item.toObject());
  }
  const effects=structuredClone(data.effects??[]).filter(e=>!e.flags?.[MODULE_ID]?.spellTimer);
  const replace=(existing,chosen)=>[...chosen,...existing.filter(e=>!chosen.some(c=>c._id===e._id)).map(e=>({_id:e._id,_tombstone:true}))];
  return {_id:token.toObject().delta?._id??token.id,type:'NPC',name:`${original.name} — ${data.name}`,img:data.img,
    system:structuredClone(data.system),ownership:structuredClone(original.ownership??base.ownership),
    items:replace(base.items??[],items),effects:replace(base.effects??[],effects),flags:structuredClone(data.flags??{})};
}

export async function beginTransformation(token,item,c,form,castId){
  if(!primary())throw Error('A transformação precisa ser aplicada pelo mestre conectado.');
  if(transformationState(token))throw Error(`${token.name} já está transformado. Volte à forma original antes de transformar novamente.`);
  const now=calendarNow(game),seconds=secondsFor(c);
  if(now===null||!Number.isFinite(seconds)||seconds<=0||seconds>365*86400)throw Error('Confira o calendário e a duração da transformação.');
  if(!token.actor||!token.baseActor)throw Error('O token precisa de uma ficha de origem válida.');
  const raw=token.toObject();
  const original=Object.fromEntries(['actorId','actorLink','delta','name','texture','width','height','bar1','bar2'].map(k=>[k,structuredClone(raw[k]??null)]));
  const state={id:foundry.utils.randomID(),castId,source:item.uuid,formUuid:form.uuid,formName:form.name,
    startsAt:now,endsAt:now+seconds,original,visualId:null};
  const prototype=form.prototypeToken?.toObject?.()??{};
  const image=prototype.texture?.src||form.img;
  const delta=formDelta(token,form,item);
  const flags={...raw.flags,[MODULE_ID]:{...raw.flags?.[MODULE_ID],transformation:state}};
  try {
    await changeTokenActor(token,()=>token.update({actorLink:false,delta,name:delta.name,
      texture:{...raw.texture,src:image,scaleX:prototype.texture?.scaleX??1,scaleY:prototype.texture?.scaleY??1},
      width:Math.max(0.25,Number(prototype.width)||1),height:Math.max(0.25,Number(prototype.height)||1),
      bar1:{attribute:'ef_npc'},bar2:{attribute:'eh_npc'},flags},{recursive:false,diff:false}));
    if(token.actor?.type!=='NPC'||physicalEnergy(token.actor)===null)throw Error('A ficha da nova forma não foi carregada corretamente.');
  }catch(error){
    if(transformationState(token)?.id===state.id)await returnTransformation(token,'falha ao aplicar a forma',state.id);
    throw error;
  }
  return state;
}

async function endVisual(token,state){
  if(!state.visualId)return;
  const item=await fromUuid(state.source),timer=item?.getFlag(MODULE_ID,'activeJb2a');
  if(!timer||timer.id!==state.visualId)return;
  if(timer.config.mode==='area'){
    const other=docs(token.parent.tokens).some(t=>t.id!==token.id&&
      (transformationState(t)?.visualId===timer.id||docs(t.actor?.effects).some(e=>!e.disabled&&e.getFlag(MODULE_ID,'spellTimer')?.visualId===timer.id)));
    if(other)return;
  }else {
    const targets=timer.targets.filter(id=>id!==token.id);
    if(targets.length){await item.setFlag(MODULE_ID,'activeJb2a',{...timer,targets});return;}
  }
  await item.unsetFlag(MODULE_ID,'activeJb2a');
}

export async function returnTransformation(token,reason='retorno manual',expectedId=null){
  if(!primary())return false;
  const state=transformationState(token);
  if(!state||(expectedId&&state.id!==expectedId))return false;
  if(!state.original?.actorId||!game.actors.get(state.original.actorId))throw Error(`Não foi possível voltar ${token.name}: a ficha original não existe mais. O backup da transformação foi preservado no token.`);
  // Apenas os campos trocados são restaurados. Posição, rotação, visão, luz
  // própria, disposição e alterações nos demais tokens não são sobrescritas.
  const flags=structuredClone(token.toObject().flags??{});
  delete flags[MODULE_ID].transformation;
  // Retorno tem prioridade: uma biblioteca visual ausente não pode prendê-lo.
  try {await endVisual(token,state);}catch(error){console.warn('Tagmar FX | visual da transformação',error);}
  await changeTokenActor(token,()=>token.update({...structuredClone(state.original),flags},{recursive:false,diff:false}));
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:token.actor,token}),
    whisper:token.hidden?game.users.filter(u=>u.isGM).map(u=>u.id):[],
    content:`<p><strong>${escape(token.name)}</strong> voltou à forma original: ${escape(reason)}. A EF original foi preservada; dano excedente da forma não é transferido.</p>`});
  return true;
}

export async function checkTransformation(token){
  const state=transformationState(token);if(!state||!primary())return;
  const ef=physicalEnergy(token.actor),now=calendarNow(game);
  if(ef!==null&&ef<=0)return returnTransformation(token,'EF da forma chegou a zero',state.id);
  if(now!==null&&now>=state.endsAt)return returnTransformation(token,'duração encerrada',state.id);
}

export async function requestReturn(token){
  const state=transformationState(token);if(!state)return;
  if(!token.actor?.isOwner)throw Error('Você precisa controlar esse personagem para encerrar a transformação.');
  if(!game.users.some(u=>u.active&&u.isGM))throw Error('É necessário um mestre conectado para voltar à forma original.');
  await ChatMessage.create({user:game.user.id,speaker:ChatMessage.getSpeaker({actor:token.actor,token}),
    whisper:game.users.filter(u=>u.isGM).map(u=>u.id),content:'<p>Solicitação de retorno à forma original.</p>',
    flags:{[MODULE_ID]:{returnForm:{sceneId:token.parent.id,tokenId:token.id,id:state.id,status:'pending'}}}});
}
export async function resolveReturn(message){
  if(!primary())return;
  const request=message.getFlag(MODULE_ID,'returnForm');if(request?.status!=='pending')return;
  const sender=game.users.get(message.author?.id??message.user?.id);
  const token=game.scenes.get(request.sceneId)?.tokens.get(request.tokenId);
  if(!sender||!token?.actor?.testUserPermission(sender,'OWNER'))throw Error('Solicitação de retorno sem permissão sobre o personagem.');
  await message.update({[`flags.${MODULE_ID}.returnForm.status`]:'done'});
  return returnTransformation(token,'retorno manual',request.id);
}

export function registerTransformations(enqueue){
  const tracked=new Map();
  const check=token=>{
    if(!token?.uuid)return;
    if(transformationState(token))tracked.set(token.uuid,token);else tracked.delete(token.uuid);
    if(primary()&&transformationState(token))enqueue(()=>checkTransformation(token));
  };
  const scan=()=>{tracked.clear();for(const scene of game.scenes)for(const token of scene.tokens)check(token);};
  const tick=()=>{if(primary())for(const token of tracked.values())check(token);};
  Hooks.on('updateActor',actor=>{if(actor.isToken)check(actor.token);});
  Hooks.on('updateToken',check);Hooks.on('createToken',check);
  Hooks.on('deleteToken',token=>tracked.delete(token.uuid));
  Hooks.on('canvasReady',scan);Hooks.on('updateWorldTime',tick);
  Hooks.on('updateSetting',setting=>{if(setting.key?.startsWith('tagmar-calendario.'))tick();});
  const effectEnded=effect=>{
    const token=effect.parent?.token,state=transformationState(token);
    if(primary()&&state&&effect.getFlag(MODULE_ID,'spellTimer')?.transformationId===state.id)
      enqueue(()=>returnTransformation(token,'efeito encerrado',state.id));
  };
  Hooks.on('deleteActiveEffect',effectEnded);
  Hooks.on('updateActiveEffect',effect=>{if(effect.disabled)effectEnded(effect);});
  Hooks.on('createChatMessage',message=>{if(primary()&&message.getFlag(MODULE_ID,'returnForm'))enqueue(()=>resolveReturn(message));});
  scan();
}
