import {MODULE_ID} from './core.mjs';
import {calendarNow} from './timers.mjs';
import {expandedSummons,secondsFor} from './cast-rules.mjs';
import {resolveSummonForm,summonPosition,beginSummon,summonState} from './summoning.mjs';
import {animationConfiguration,playAnimation} from './jb2a.mjs';
const docs=c=>Array.from(c?.contents??c??[]);
const primary=()=>game.users.filter(u=>u.active&&u.isGM).sort((a,b)=>a.id.localeCompare(b.id))[0]?.id===game.user.id;
const esc=s=>foundry.utils.escapeHTML(String(s));
export const summonJobs=scene=>scene?.getFlag?.(MODULE_ID,'summonQueue')??[];
async function writeJob(scene,job){
  const queue=summonJobs(scene).filter(j=>j.id!==job.id);
  if(job.status!=='done'&&job.status!=='cancelled')queue.push(job);
  await scene.setFlag(MODULE_ID,'summonQueue',queue);
}
async function report(job,status,content){
  const message=game.messages?.get(job.id);
  if(message)await message.update({[`flags.${MODULE_ID}.castRequest.status`]:status,content});
  else await ChatMessage.create({whisper:job.whisper,content});
}
export async function scheduleSummons(item,c,request,message,sender){
  if(!primary())throw Error('É necessário um mestre ativo.');
  const scene=game.scenes.get(request.sceneId),source=scene?.tokens.get(request.sourceId);
  if(!source?.actor||source.actor.uuid!==item.actor.uuid||!item.actor.testUserPermission(sender,'OWNER'))throw Error('Evocador sem permissão.');
  if(summonJobs(scene).some(j=>j.id===message.id)||docs(game.actors).some(a=>summonState(a)?.castId===message.id))throw Error('Esta invocação já foi agendada ou criada.');
  const entries=expandedSummons(c),points=request.summonPoints??(entries.length===1?[request.origin]:[]);
  if(points.length!==entries.length)throw Error('Posicione cada criatura antes de confirmar a invocação.');
  if(request.summonForms&&(request.summonForms.length!==entries.length||entries.some((e,i)=>e.formUuid!==request.summonForms[i])))throw Error('A lista de criaturas mudou durante o posicionamento. Use novamente.');
  const now=calendarNow(game),seconds=secondsFor(c),delay=Number(c.summonDelay??0);
  if(now===null||!Number.isFinite(seconds)||seconds<=0||seconds>365*86400||!Number.isInteger(delay)||delay<0||delay>10000)throw Error('Confira calendário, duração e atraso.');
  // Valide todo o conjunto antes de salvar ou criar qualquer ficha.
  for(let i=0;i<entries.length;i++){
    const form=await resolveSummonForm(entries[i].formUuid,sender),proto=form.prototypeToken.toObject();
    summonPosition(scene,points[i]??{},Number(proto.width)||1,Number(proto.height)||1);
    entries[i]={...entries[i],formName:form.name,origin:{x:points[i].x,y:points[i].y},entryId:String(i)};
  }
  const job={id:message.id,status:'waiting',sceneId:scene.id,sourceId:source.id,itemUuid:item.uuid,casterUuid:item.actor.uuid,
    userId:sender.id,name:item.name,img:item.img,whisper:message.whisper,config:structuredClone(c),animation:animationConfiguration(item),
    dueAt:now+delay*15,endsAt:now+delay*15+seconds,entries,created:[]};
  await writeJob(scene,job);
  await report(job,'scheduled',`<p><strong>${esc(item.name)}</strong>: ${entries.length} criatura(s) agendada(s). Atraso: ${delay} rodada(s) (${delay*15} segundos do jogo). Acompanhe em Efeitos.</p>`);
  return job;
}
async function summonVisual(job,item,results){
  const config=job.animation;if(!config.enabled||!results.length)return;
  const scene=game.scenes.get(job.sceneId),source=scene.tokens.get(job.sourceId);
  const ids=results.map(r=>r.token.id);
  if(config.timeMode==='calendar'){
    // Um único visual com vários destinos; renderiza ao abrir a cena, mesmo se o mestre não estiver nela.
    const id=foundry.utils.randomID();
    await item.setFlag(MODULE_ID,'activeJb2a',{id,startsAt:job.dueAt,endsAt:job.endsAt,sceneId:scene.id,sourceId:source.id,
      targets:ids,config:{...config,mode:'targets',gameDuration:job.endsAt-job.dueAt,gameUnit:'seconds'}});
    for(const result of results)await result.actor.setFlag(MODULE_ID,'summon',{...summonState(result.actor),visualId:id});
  }else if(canvas?.ready&&canvas.scene?.id===scene.id){
    await playAnimation(item,{...config,mode:'targets'}, {game,canvas,sequencer:globalThis.Sequencer,SequenceClass:globalThis.Sequence,
      strict:true,sourceToken:source.object??canvas.tokens.placeables.find(t=>t.id===source.id),user:{isGM:true,targets:new Set(results.map(r=>r.token.object??r.token))}});
  }else ui.notifications.info('Criaturas invocadas. A animação breve não foi reproduzida porque o mestre estava em outra cena.');
}
export async function processSummonJobs(){
  if(!primary())return;
  const now=calendarNow(game);if(now===null)return;
  for(const scene of game.scenes)for(const original of [...summonJobs(scene)]){
    const job=structuredClone(original);
    if(job.status==='running'){
      job.status='interrupted';job.error='Execução interrompida. Confira as criaturas já criadas antes de usar novamente.';
      await writeJob(scene,job);await report(job,'interrupted',`<p>${esc(job.name)}: ${esc(job.error)}</p>`);continue;
    }
    if(job.status!=='waiting'||now<job.dueAt)continue;
    if(now>=job.endsAt){job.status='done';await report(job,'done',`<p>${esc(job.name)}: o relógio passou do atraso e de toda a duração. Nenhuma criatura foi criada.</p>`);await writeJob(scene,job);continue;}
    // Grave antes de criar. Em caso de interrupção, nunca repita automaticamente a criação.
    job.status='running';await writeJob(scene,job);
    try{
      const sender=game.users.get(job.userId),item=await fromUuid(job.itemUuid),source=scene.tokens.get(job.sourceId);
      if(!sender||!item?.actor||!source?.actor||source.actor.uuid!==job.casterUuid||!item.actor.testUserPermission(sender,'OWNER'))throw Error('Evocador, item ou permissão não está mais disponível.');
      for(const entry of job.entries){
        const form=await resolveSummonForm(entry.formUuid,sender),proto=form.prototypeToken.toObject();
        summonPosition(scene,entry.origin,Number(proto.width)||1,Number(proto.height)||1);
      }
      const results=[];
      for(const entry of job.entries){
        const result=await beginSummon(item,{...job.config,formUuid:entry.formUuid},
          {sceneId:scene.id,sourceId:job.sourceId,origin:entry.origin},{id:job.id},sender,{entryId:entry.entryId,startsAt:job.dueAt});
        results.push(result);job.created.push({actorId:result.actor.id,tokenId:result.token.id});await writeJob(scene,job);
      }
      try{await summonVisual(job,item,results);}catch(error){ui.notifications.warn(`Criaturas invocadas; confira o visual: ${error.message}`);}
      job.status='done';
      const units={seconds:'segundos',minutes:'minutos',hours:'horas',days:'dias',weeks:'semanas',rounds:'rodadas'};
      await report(job,'done',`<p><strong>${esc(job.name)}</strong>: ${results.length} criatura(s) invocada(s): ${results.map(r=>esc(r.state.formName)).join(', ')}. Duração: ${esc(job.config.duration)} ${esc(units[job.config.unit])}, a partir da chegada prevista. Controle concedido ao evocador; o mestre pode encerrar pela aba Efeitos.</p>`);
      await writeJob(scene,job);
    }catch(error){job.status='interrupted';job.error=error.message;await writeJob(scene,job);await report(job,'interrupted',`<p>${esc(job.name)}: ${esc(error.message)}. Confira ${job.created.length} criatura(s) já criada(s) antes de repetir.</p>`);}
  }
}
export async function requestCancelSummon(scene,id){
  if(!game.user.isGM)throw Error('Só o mestre pode cancelar uma invocação agendada.');
  await ChatMessage.create({user:game.user.id,whisper:game.users.filter(u=>u.isGM).map(u=>u.id),content:'<p>Cancelar agendamento de invocação.</p>',
    flags:{[MODULE_ID]:{cancelSummon:{sceneId:scene.id,id,status:'pending'}}}});
}
export function registerSummonJobs(enqueue){
  const check=()=>{if(primary())enqueue(processSummonJobs);};
  Hooks.on('updateWorldTime',check);Hooks.on('canvasReady',check);Hooks.on('updateUser',check);
  Hooks.on('updateSetting',s=>{if(s.key?.startsWith('tagmar-calendario.'))check();});
  Hooks.on('createChatMessage',message=>{
    const request=message.getFlag(MODULE_ID,'cancelSummon');if(!primary()||request?.status!=='pending')return;
    enqueue(async()=>{
      if(message.getFlag(MODULE_ID,'cancelSummon')?.status!=='pending')return;
      const sender=game.users.get(message.author?.id??message.user?.id),scene=game.scenes.get(request.sceneId);
      if(!sender?.isGM||!scene)throw Error('Cancelamento sem permissão.');
      const job=summonJobs(scene).find(j=>j.id===request.id);
      await message.update({[`flags.${MODULE_ID}.cancelSummon.status`]:'done'});
      if(job){await writeJob(scene,{...job,status:'cancelled'});await report(job,'cancelled','<p>Agendamento cancelado pelo mestre. Cópias que já haviam sido criadas permanecem sob controle da mesa.</p>');}
    });
  });
  check();
}
