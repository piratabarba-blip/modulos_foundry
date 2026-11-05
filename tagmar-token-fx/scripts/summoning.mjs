import {closeActorApplications,changeTokenActor} from './token-actor-lifecycle.mjs';
import {MODULE_ID} from './core.mjs';
import {calendarNow} from './timers.mjs';
import {secondsFor} from './cast-rules.mjs';
const docs=c=>Array.from(c?.contents??c??[]);
const primary=()=>game.users.filter(u=>u.active&&u.isGM).sort((a,b)=>a.id.localeCompare(b.id))[0]?.id===game.user.id;
const esc=s=>foundry.utils.escapeHTML(String(s));
export const summonState=doc=>doc?.getFlag?.(MODULE_ID,'summon');
export const approvedSummons=()=>game.settings.get(MODULE_ID,'summonForms')??[];
export async function resolveSummonForm(uuid,user){
  if(!user.isGM&&!approvedSummons().includes(uuid))throw Error('O mestre precisa salvar esta criatura na configuração de Invocar criatura antes do primeiro uso.');
  const actor=typeof uuid==='string'&&uuid?await fromUuid(uuid):null;
  if(actor?.documentName!=='Actor'||actor.type!=='NPC'||summonState(actor))throw Error('Escolha uma criatura / PNJ original do mundo ou de um compêndio.');
  if(!user.isGM&&!actor.testUserPermission(user,'OBSERVER'))throw Error('Peça ao mestre acesso de observador à criatura ou ao compêndio.');
  if(!(Number(actor.system.ef_npc?.value)>0))throw Error('A criatura precisa ter EF atual maior que zero.');
  return actor;
}
export async function approveSummon(uuid){
  await resolveSummonForm(uuid,game.user);
  if(game.user.isGM&&!approvedSummons().includes(uuid))await game.settings.set(MODULE_ID,'summonForms',[...approvedSummons(),uuid]);
}
export function summonPosition(scene,point,width,height){
  const size=scene.grid.size,d=scene.dimensions;
  const x=point.x-width*size/2,y=point.y-height*size/2;
  if(![x,y,width,height,size].every(Number.isFinite)||size<=0||width<=0||height<=0||width>100||height>100)throw Error('Tamanho ou posição da criatura inválido.');
  const left=d?.sceneX??0,top=d?.sceneY??0,w=d?.sceneWidth??scene.width,h=d?.sceneHeight??scene.height;
  if(Number.isFinite(w)&&Number.isFinite(h)&&(x<left||y<top||x+width*size>left+w||y+height*size>top+h))throw Error('Posicione a criatura inteiramente dentro do mapa.');
  return {x,y};
}
export async function beginSummon(item,c,request,message,sender,{entryId='0',startsAt=null}={}){
  if(!primary())throw Error('A invocação precisa de um mestre ativo.');
  const scene=game.scenes.get(request.sceneId),source=scene?.tokens.get(request.sourceId);
  if(!scene||!source?.actor||source.actor.uuid!==item.actor.uuid||!item.actor.testUserPermission(sender,'OWNER'))throw Error('Evocador sem permissão.');
  const form=await resolveSummonForm(c.formUuid,sender),now=calendarNow(game),seconds=secondsFor(c);
  if(now===null||!Number.isFinite(seconds)||seconds<=0||seconds>365*86400)throw Error('Confira o calendário e a duração da invocação.');
  // Cada solicitação é única, inclusive depois de reconectar/trocar de mestre.
  if(docs(game.actors).some(a=>{const s=summonState(a);return s?.castId===message.id&&(s.entryId??'0')===entryId;}))throw Error('Esta invocação já foi criada; confira a cena antes de repetir.');
  const proto=form.prototypeToken.toObject(),width=Number(proto.width)||1,height=Number(proto.height)||1;
  const position=summonPosition(scene,request.origin,width,height);
  const state={id:foundry.utils.randomID(),actorId:foundry.utils.randomID(),castId:message.id,source:item.uuid,casterUuid:item.actor.uuid,
    sceneId:scene.id,sourceId:source.id,formUuid:form.uuid,formName:form.name,userId:sender.id,
    entryId,startsAt:startsAt??now,endsAt:(startsAt??now)+seconds,tokenId:null,visualId:null};
  const data=form.toObject();data._id=state.actorId;delete data.folder;delete data._stats;
  data.name=`${form.name} — invocação`;data.ownership={default:0,[sender.id]:3};
  for(const user of game.users)if(!user.isGM&&item.actor.testUserPermission(user,'OWNER'))data.ownership[user.id]=3;
  data.flags=structuredClone(data.flags??{});data.flags[MODULE_ID]={summon:state};
  data.effects=(data.effects??[]).filter(e=>!e.flags?.[MODULE_ID]?.spellTimer);
  for(const entry of data.items??[])if(entry.flags?.[MODULE_ID])delete entry.flags[MODULE_ID].activeJb2a;
  data.prototypeToken={...proto,actorLink:false,hidden:false,disposition:source.disposition,flags:{},delta:{}};
  const actor=await Actor.create(data,{renderSheet:false,keepId:true});
  try{
    const doc=await actor.getTokenDocument({...position,actorLink:false,hidden:false,name:data.name,
      disposition:source.disposition,flags:{[MODULE_ID]:{summon:{...state,actorId:actor.id}}}},{parent:scene});
    const raw=doc.toObject();delete raw._id;
    const [token]=await scene.createEmbeddedDocuments('Token',[raw]);
    if(!token)throw Error('O token não foi criado.');
    await actor.setFlag(MODULE_ID,'summon',{...state,actorId:actor.id,tokenId:token.id});
    return {actor,token,state:{...state,actorId:actor.id,tokenId:token.id}};
  }catch(error){
    // Não remover a ficha caso o token tenha sido criado antes de uma falha posterior.
    if(!docs(scene.tokens).some(t=>t.actorId===actor.id))await actor.delete();
    throw error;
  }
}
export async function dismissSummon(actor,reason='encerrada pelo mestre'){
  if(!primary())return;
  const state=summonState(actor);if(!state||state.actorId!==actor.id)return;
  for(const scene of game.scenes){
    const ids=docs(scene.tokens).filter(t=>t.actorId===actor.id&&summonState(t)?.id===state.id).map(t=>t.id);
    for(const id of ids){
      const token=scene.tokens.get(id);
      await changeTokenActor(token,()=>scene.deleteEmbeddedDocuments('Token',[id]));
    }
  }
  const item=await fromUuid(state.source),visual=item?.getFlag(MODULE_ID,'activeJb2a');
  if(state.visualId&&visual?.id===state.visualId){
    const targets=visual.targets?.filter(id=>id!==state.tokenId)??[];
    if(targets.length&&visual.config?.mode==='targets')await item.setFlag(MODULE_ID,'activeJb2a',{...visual,targets});
    else await item.unsetFlag(MODULE_ID,'activeJb2a');
  }
  // Um token extra sem a marca é preservado, assim como a ficha à qual ele se refere.
  if(!docs(game.scenes).some(s=>docs(s.tokens).some(t=>t.actorId===actor.id))){await closeActorApplications(actor);await actor.delete();}
  else await actor.unsetFlag(MODULE_ID,'summon');
  await ChatMessage.create({speaker:ChatMessage.getSpeaker(),content:`<p>Invocação de <strong>${esc(state.formName)}</strong>: ${esc(reason)}.</p>`});
}
export async function checkSummons(){
  if(!primary())return;
  const now=calendarNow(game);
  for(const actor of docs(game.actors)){
    const state=summonState(actor);if(!state||state.actorId!==actor.id)continue;
    const exists=docs(game.scenes).some(s=>docs(s.tokens).some(t=>t.actorId===actor.id&&summonState(t)?.id===state.id));
    if(!exists)await dismissSummon(actor,'token removido');
    else if(now!==null&&now>=state.endsAt)await dismissSummon(actor,'duração encerrada');
  }
}
export async function requestDismissSummon(actor){
  if(!game.user.isGM)throw Error('Só o mestre pode encerrar a invocação antecipadamente.');
  const state=summonState(actor);if(!state)return;
  await ChatMessage.create({user:game.user.id,whisper:game.users.filter(u=>u.isGM).map(u=>u.id),
    content:`<p>Encerrar invocação: ${esc(state.formName)}.</p>`,
    flags:{[MODULE_ID]:{dismissSummon:{actorId:actor.id,id:state.id,status:'pending'}}}});
}
export function registerSummons(enqueue){
  const check=()=>{if(primary())enqueue(checkSummons);};
  Hooks.on('updateWorldTime',check);Hooks.on('canvasReady',check);Hooks.on('deleteToken',check);Hooks.on('deleteScene',check);
  Hooks.on('updateSetting',s=>{if(s.key?.startsWith('tagmar-calendario.'))check();});
  Hooks.on('createChatMessage',message=>{
    const request=message.getFlag(MODULE_ID,'dismissSummon');
    if(!primary()||request?.status!=='pending')return;
    enqueue(async()=>{
      if(message.getFlag(MODULE_ID,'dismissSummon')?.status!=='pending')return;
      const sender=game.users.get(message.author?.id??message.user?.id),actor=game.actors.get(request.actorId);
      if(!sender?.isGM||summonState(actor)?.id!==request.id)throw Error('Solicitação de encerramento inválida.');
      await message.update({[`flags.${MODULE_ID}.dismissSummon.status`]:'done'});
      await dismissSummon(actor);
    });
  });
  check();
}
