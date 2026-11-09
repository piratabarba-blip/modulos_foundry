import {hasBonuses,bonusEntries} from './bonus-rules.mjs';
import {syncTemporaryEH} from './temporary-eh.mjs';
import {MODULE_ID,destinationTokens} from './core.mjs';
import {castConfiguration,secondsFor,insideArea,facingAngle,attackResult,acceptsTarget,expandedSummons,hasAdjustments,adjustmentFor} from './cast-rules.mjs';
import {placeArea} from './area-preview.mjs';
import {calendarNow} from './timers.mjs';
import {animationConfiguration,playAnimation} from './jb2a.mjs';
import {itemAttackResult} from './item-attack.mjs';
import {visualArea} from './area-animation.mjs';
import {attackToChat} from './attack-chat.mjs';
import {targetName} from './chat-targets.mjs';
import {resistanceSchedule,registerRecurringResistance} from './recurring-resistance.mjs';
import {penaltyChanges} from './resistance-penalties.mjs';
import {spellStatuses} from './invisibility.mjs';
import {isRecurringArea,saveResistanceArea,registerResistanceAreas} from './resistance-areas.mjs';
import {resolveSummonForm,registerSummons} from './summoning.mjs';
import {scheduleSummons,processSummonJobs,registerSummonJobs} from './summon-jobs.mjs';
import {resolveForm,beginTransformation,registerTransformations,transformationState} from './transformation.mjs';
const esc=s=>foundry.utils.escapeHTML(String(s));
const primaryGM=()=>game.users.filter(u=>u.active&&u.isGM).sort((a,b)=>a.id.localeCompare(b.id))[0];
let choosing=false, processing=Promise.resolve();

function summaryResult(row) {
  if(!row.critical)return esc(row.description);
  const failure=/^Falha crítica:/i.test(row.description);
  const text=row.description.replace(/^(Falha crítica|Crítico):\s*/i,'');
  return `<strong class="tagmar-fx-critical ${failure?'is-failure':'is-success'}">${failure?'FALHA CRÍTICA':'CRÍTICO'}</strong> — ${esc(text)}`;
}

async function itemCard(item) {
  const description=item.type==='Magia'?item.system.efeito:item.system.descricao;
  const editor=foundry.applications?.ux?.TextEditor?.implementation;
  const text=typeof description==='string'?(editor?await editor.enrichHTML(description,{async:true,secrets:false,relativeTo:item}):esc(description)):'';
  return `<div class="tagmar-spell-card"><img src="${esc(item.img||'icons/svg/aura.svg')}" style="display:block;margin-left:auto;margin-right:auto;" alt=""><h2 class="mediaeval rola" style="text-align:center">${esc(item.name)}</h2><div class="mediaeval rola rola_desc">${text}</div></div>`;
}

function validateTechnique(item) {
  if(item.type==='Tecnica_Combate'&&Number(item.system.nivel)<=0&&item.flags?.tagmarSync?.environmentalTechnique!==true)
    throw Error(`É necessário possuir nível em ${item.name} para usar esta Técnica de Combate.`);
}

export async function turnToTarget(item,point,source) {
  const c=castConfiguration(item);if(!c.rotate)return;
  if(!source)[source]=destinationTokens(item,'self',canvas,game.user);
  const target=point??[...game.user.targets].find(t=>t.id!==source.id&&canvas.tokens.placeables.includes(t))?.center;
  if(!target)return;
  if(source.document.lockRotation){ui.notifications.warn('O token está com rotação bloqueada. Desative Bloquear rotação para ele virar.');return;}
  const rotation=facingAngle(source.center,target,c.offset);
  if(rotation!==null)await source.document.update({rotation});
}

export async function handleItemUse(item) {
  if(!['Magia','Combate','Tecnica_Combate'].includes(item.type)||!item.isOwner)return false;
  const c=castConfiguration(item);
  const visual=animationConfiguration(item);
  if(visual.enabled&&visual.mode==='area'&&(!c.enabled||!['point','circle','cone','ray'].includes(c.shape)))
    throw Error('Para usar o visual na área, ative a resolução do item e escolha círculo, cone ou linha no FX.');
  if(!c.enabled){await turnToTarget(item);return false;}
  validateTechnique(item);
  if(choosing){ui.notifications.warn('Termine ou cancele a área anterior.');return true;}
  if(!primaryGM())throw Error('É necessário um mestre conectado para resolver a magia automaticamente.');
  const [source]=destinationTokens(item,'self',canvas,game.user);
  if(!source?.actor)throw Error('Selecione o token do evocador.');
  if(!['self','point'].includes(c.shape))acceptsTarget(source,source,c.targetFilter);
  if(c.shape!=='point'&&(c.effectName||c.repeatRM||c.transform||c.invisible||hasAdjustments(c)||hasBonuses(c))&&calendarNow(game)===null)throw Error('Ative o calendário para o efeito com duração.');
  if(c.shape==='point'&&!c.summon&&!visual.enabled)throw Error('Escolha e ative uma animação JB2A para posicionar no mapa.');
  if(c.shape==='point'&&visual.timeMode==='calendar'&&calendarNow(game)===null)throw Error('Ative o calendário para o efeito com duração.');
  if(c.shape!=='point'&&c.transform)await resolveForm(c.formUuid,game.user);
  let area=null;
  const summons=[];
  if(c.summon){
    if(calendarNow(game)===null)throw Error('Ative o calendário para a duração da invocação.');
    for(const entry of expandedSummons(c)){
      const form=await resolveSummonForm(entry.formUuid,game.user),proto=form.prototypeToken.toObject();
      summons.push({form,preview:{src:proto.texture?.src||form.img,width:Number(proto.width)||1,height:Number(proto.height)||1}});
    }
  }
  choosing=true;
  try {
    const summonPoints=[];
    if(c.summon){
      const sceneId=canvas.scene.id;
      for(const [i,entry] of summons.entries()){
        area=await placeArea(c,{canvas,PIXI,document,Hooks,tokenPreview:entry.preview,
          notify:()=>ui.notifications.info(`Posicione ${entry.form.name} (${i+1}/${summons.length}). Esc cancela todo o conjunto.`)});
        if(!area||area.sceneId!==sceneId||canvas.scene?.id!==sceneId)return true;
        summonPoints.push({x:area.origin.x,y:area.origin.y});
      }
    }else if(['point','circle','cone','ray'].includes(c.shape))area=await placeArea(c,{canvas,PIXI,document,Hooks,notify:t=>ui.notifications.info(t)});
    else area={sceneId:canvas.scene.id,origin:source.center,direction:0};
    if(!area||canvas.scene.id!==area.sceneId)return true;
    const aim=['cone','ray'].includes(c.shape)?{x:area.origin.x+Math.cos(area.direction*Math.PI/180)*100,
      y:area.origin.y+Math.sin(area.direction*Math.PI/180)*100}:c.shape==='circle'?area.origin:null;
    if(!['self','point'].includes(c.shape))await turnToTarget(item,aim,source);
    const targets=c.shape==='point'?[]:c.shape==='self'?[source.id]:[...game.user.targets].map(t=>t.id);
    await ChatMessage.create({user:game.user.id,speaker:ChatMessage.getSpeaker({actor:item.actor,token:source.document}),
      whisper:[...new Set([...game.users.filter(u=>u.isGM).map(u=>u.id),game.user.id])],
      content:`<p><strong>${esc(item.name)}</strong>: aguardando resolução automática.</p>`,
      flags:{[MODULE_ID]:{castRequest:{itemUuid:item.uuid,sourceId:source.id,sceneId:area.sceneId,
        origin:{x:area.origin.x,y:area.origin.y},direction:area.direction,targets,...(c.summon?{summonPoints,summonForms:summons.map(e=>e.form.uuid)}:{}),status:'pending'}}}});
  }finally{choosing=false;}
  return true;
}

export async function applyMarker(actor,item,c,token,requestId,whisper,context={}) {
  if(!c.effectName&&!c.repeatRM&&!c.transform&&!c.invisible&&!hasAdjustments(c)&&!hasBonuses(c))return;
  const now=calendarNow(game),seconds=secondsFor(c);
  if(now===null||!Number.isFinite(seconds)||seconds<=0||seconds>365*86400)throw Error('Duração inválida ou calendário indisponível.');
  const schedule=resistanceSchedule(c,token,requestId,whisper);
  if(schedule.recurringRM)Object.assign(schedule.recurringRM,{areaId:context.areaId??null,
    immune:context.success===true&&c.rmSuccess==='end',savedThisTurn:context.success===true});
  const data={name:c.effectName||item.name,img:item.img,origin:item.uuid,disabled:false,transfer:false,changes:penaltyChanges(c,!context.success),statuses:spellStatuses(c,!context.success),
    duration:{startTime:game.time.worldTime,seconds},flags:{[MODULE_ID]:{spellTimer:{endsAt:now+seconds,source:item.uuid,expired:false,
      bonuses:bonusEntries(c),
      temporaryEH:c.temporaryEH>0?{amount:c.temporaryEH,grantId:requestId}:null,
      temporaryEF:c.temporaryEF>0?{amount:c.temporaryEF,grantId:requestId}:null,
      endedByRM:false,visualId:null,recurringRM:null,invisible:c.invisible===true,adjustments:{combat:adjustmentFor(c,'combat'),skill:adjustmentFor(c,'skill')},transformationId:c.transform?transformationState(token.document)?.id:null,
      ...schedule}}}};
  if(context.endsAt)data.flags[MODULE_ID].spellTimer.endsAt=context.endsAt;
  const existing=actor.effects.find(e=>e.getFlag(MODULE_ID,'spellTimer')?.source===item.uuid);
  if(existing){
    // Renovar zera o histórico de turnos e a ligação ao visual anterior.
    data.flags={...existing.flags,[MODULE_ID]:{...existing.flags?.[MODULE_ID],...data.flags[MODULE_ID]}};
    await existing.update(data,{recursive:false});
  }else await actor.createEmbeddedDocuments('ActiveEffect',[data]);
  await syncTemporaryEH(actor);
}

async function consumeAmmoOnce(item) {
  if(item.type!=='Combate'||Number(item.system.municao)<=0)return;
  const spent=item.system.tipo===''?Math.max(0,Number(item.system.nivel)||0):1;
  const scope='tagmar-ammu-nation',pool=item.actor.getFlag(scope,'municoes');
  const selected=item.actor.getFlag(scope,item.name);
  if(game.modules.get(scope)?.active&&Array.isArray(pool)&&pool.some(p=>p.nome===selected)){
    const next=pool.map(p=>p.nome===selected?{...p,quant:Math.max(0,Number(p.quant)-spent)}:p);
    await item.actor.setFlag(scope,'municoes',next);
    const quantity=next.find(p=>p.nome===selected).quant;
    const updates=item.actor.items.filter(i=>i.type==='Combate'&&item.actor.getFlag(scope,i.name)===selected)
      .map(i=>({_id:i.id,'system.municao':quantity}));
    if(updates.length)await item.actor.updateEmbeddedDocuments('Item',updates);
  }else await item.update({'system.municao':Math.max(0,Number(item.system.municao)-spent)});
}

export async function expireMarkers() {
  if(primaryGM()?.id!==game.user.id)return;
  const now=calendarNow(game);if(now===null)return;
  const actors=new Map(game.actors.map(a=>[a.uuid,a]));
  for(const scene of game.scenes)for(const token of scene.tokens)if(!token.actorLink&&token.actor)actors.set(token.actor.uuid,token.actor);
  for(const actor of actors.values()){
    const expired=actor.effects.filter(e=>{const f=e.getFlag(MODULE_ID,'spellTimer');return f&&!f.expired&&Number.isFinite(f.endsAt)&&now>=f.endsAt;});
    for(const effect of expired)await effect.update({disabled:true,[`flags.${MODULE_ID}.spellTimer.expired`]:true});
    if(expired.length)await syncTemporaryEH(actor);
  }
}

export async function resolveRequest(message) {
  if(primaryGM()?.id!==game.user.id)return;
  const request=message.getFlag(MODULE_ID,'castRequest');if(request?.status!=='pending')return;
  const sender=game.users.get(message.author?.id??message.user?.id);
  let item=await fromUuid(request.itemUuid);
  if(!sender||!item?.actor||!item.actor.testUserPermission(sender,'OWNER')||!['Magia','Combate','Tecnica_Combate'].includes(item.type))throw Error('Solicitação sem permissão sobre o evocador.');
  const c=castConfiguration(item);if(!c.enabled)throw Error('A automação desta magia foi desativada.');
  validateTechnique(item);
  const scene=game.scenes.get(request.sceneId),source=scene?.tokens.get(request.sourceId);
  if(!source?.actor||source.actor.uuid!==item.actor.uuid)throw Error('Token do evocador não corresponde à ficha.');
  if(!['self','point'].includes(c.shape))acceptsTarget(source,source,c.targetFilter);
  if(!['x','y'].every(k=>Number.isFinite(request.origin?.[k]))||!Number.isFinite(request.direction))throw Error('Posição de área inválida.');
  if(c.shape!=='point'&&(c.effectName||c.repeatRM||c.transform||c.invisible||hasAdjustments(c)||hasBonuses(c))&&(calendarNow(game)===null||secondsFor(c)>365*86400))throw Error('Confira calendário e duração antes de usar a magia.');
  if(!canvas.ready||canvas.scene.id!==scene.id)throw Error('O mestre precisa visualizar a cena da magia para esta prévia.');
  const scale=scene.grid.size/scene.grid.distance;
  if(!Number.isFinite(scale)||scale<=0)throw Error('Escala da cena inválida.');
  const animation=animationConfiguration(item);
  if(c.summon){
    await scheduleSummons(item,c,request,message,sender);
    await processSummonJobs();
    return;
  }
  // Ponto é apenas visual. Dados antigos de ataque, RM e transformação são ignorados.
  if(c.shape==='point'){
    const area=visualArea(c,request,scene);
    await message.update({[`flags.${MODULE_ID}.castRequest.status`]:'running'});
    try {
      await playAnimation(item,{...animation,mode:'area'},{game,canvas,sequencer:globalThis.Sequencer,SequenceClass:globalThis.Sequence,
        strict:true,area,sourceToken:source.object??canvas.tokens.placeables.find(t=>t.id===source.id),user:{isGM:true,targets:new Set()}});
      await message.update({[`flags.${MODULE_ID}.castRequest.status`]:'done',content:`<section class="tagmar-fx-summary">${await itemCard(item)}<p class="mediaeval">Efeito posicionado no mapa.${animation.timeMode==='calendar'?' Duração registrada na aba Efeitos do evocador.':''}</p></section>`});
    }catch(error){
      await message.update({[`flags.${MODULE_ID}.castRequest.status`]:'interrupted',content:`<p>Efeito no ponto interrompido: ${esc(error.message)}</p>`});
      throw error;
    }
    return;
  }
  const animationArea=animation.enabled&&animation.mode==='area'?visualArea(c,request,scene):null;
  const targets=canvas.tokens.placeables.filter(t=>t.actor&&(c.shape==='self'||acceptsTarget(source,t,c.targetFilter))&&
    (c.shape==='self'?t.id===source.id:c.shape==='targets'?request.targets?.includes(t.id):
      ((c.includeCaster||t.id!==source.id)&&insideArea(t.center,request.origin,request.direction,c,scale))));
  // Tokens vinculados à mesma ficha compartilham a reserva; não causar dano duplicado.
  const unique=[...new Map(targets.map(t=>[t.actor.uuid,t])).values()];
  if(hasBonuses(c)&&unique.some(t=>!['Personagem','NPC'].includes(t.actor.type)))throw Error('Bônus temporários são destinados a Personagens e PNJs.');
  const form=c.transform?await resolveForm(c.formUuid,sender):null;
  if(c.transform&&unique.some(t=>transformationState(t.document)))throw Error('Há um alvo já transformado. Volte à forma original antes de transformar novamente.');
  if(unique.some(t=>t.document.hidden))await message.update({whisper:game.users.filter(u=>u.isGM).map(u=>u.id)});
  const card=await itemCard(item);
  await message.update({[`flags.${MODULE_ID}.castRequest.status`]:'running'});
  const rows=[],affected=[];
  try {
    if(unique.length)await consumeAmmoOnce(item);
    for(const token of unique){
      const actor=token.actor;
      let damage=c.damage,apply=true,description='Sem teste',critical=false;
      let attack=null;
      if(typeof actor._aplicarDano!=='function')throw Error(`Ficha incompatível: ${token.name}`);
      if(['rm','rf'].includes(c.resolution)){
        const resistance=c.resolution.toUpperCase();
        if(!Number.isFinite(Number(actor.system[c.resolution])))throw Error(`${resistance} não configurada: ${token.name}`);
        const outcome=await actor._rollResistencia(c.fa,c.resolution==='rm'?'Magía':'Física',{whisper:message.whisper});
        if(typeof outcome?.success!=='boolean')throw Error('Atualize o sistema para retornar o resultado da resistência.');
        apply=!outcome.success;damage=outcome.success?(c.repeatRM&&c.repeatDamage?0:Math.ceil(c.damage*c.resistedDamage/100)):c.damage;
        description=outcome.success?`Passou na ${resistance}`:`Falhou na ${resistance}`;
      }else if(c.resolution==='attack'){
        const fromItem=item.type==='Combate';
        const defense=!fromItem&&c.defense?Number(actor.system.d_ativa?.valor):0;
        if(!Number.isFinite(defense))throw Error(`Defesa não configurada: ${token.name}`);
        const roll=await new Roll('1d20').evaluate();
        const result=fromItem?itemAttackResult(item,actor,game.tagmar.tabela_resol,roll.total):attackResult(game.tagmar.tabela_resol,c.column-defense,roll.total,c.damage);
        damage=result.damage;critical=result.critical;apply=!critical&&result.percent>0;
        description=critical?(result.color==='verde'?'Falha crítica: resolver pela regra específica':'Crítico: resolver pela regra específica'):`${result.color} — ${result.percent}%`;
          attack={roll,result};
      }
      const row={name:token.name,tokenUuid:token.document.uuid,actorUuid:actor.uuid,description,damage,applied:false,critical,stage:'applying',damageApplied:false};
      rows.push(row);
      await message.update({[`flags.${MODULE_ID}.castResults`]:rows});
      if(damage>0&&!critical){
        await actor._aplicarDano({valor:damage,isCura:false,curaTipo:null,isCritico:false},token);
        row.damageApplied=true;
        await message.update({[`flags.${MODULE_ID}.castResults`]:rows});
      }
      if(apply){
        if(c.transform){
          await beginTransformation(token.document,item,c,form,message.id);
          // O item de um evocador desvinculado foi preservado no ActorDelta;
          // obtenha sua nova instância antes de gravar temporizadores.
          item=await fromUuid(request.itemUuid)??item;
          row.description+=`; transformado em ${form.name}`;
        }
        await applyMarker(c.transform?token.document.actor:actor,item,c,token,message.id,message.whisper,{areaId:isRecurringArea(c)?message.id:null});
        affected.push(token);row.applied=true;
        if(c.temporaryEH>0)row.description+=`; EH temporária +${c.temporaryEH}`;
        if(c.temporaryEF>0)row.description+=`; EF temporária +${c.temporaryEF}`;
      }else if(c.repeatRM&&(c.rmSuccess==='turn'||isRecurringArea(c))){
        await applyMarker(actor,item,c,token,message.id,message.whisper,{areaId:isRecurringArea(c)?message.id:null,success:true});
      }
      row.stage='done';
      await message.update({[`flags.${MODULE_ID}.castResults`]:rows});
      if(attack){
        const chat=await attackToChat(item,token,attack.roll,attack.result,{whisper:message.whisper,damageApplied:row.damageApplied,requestId:message.id});
        if(critical&&chat?.criticalMessageId){
          row.criticalMessageId=chat.criticalMessageId;
          row.description=attack.result.color==='verde'?'Falha crítica: consulte a resolução individual':'Crítico: consulte a resolução individual';
          await message.update({[`flags.${MODULE_ID}.castResults`]:rows});
        }
      }
    }
    if(isRecurringArea(c))await saveResistanceArea(scene,item,c,request,message,targets);
    if(animation.enabled&&(affected.length||animation.mode==='area')){
      const previousVisual=item.getFlag(MODULE_ID,'activeJb2a')?.id;
      // Sincroniza o prazo apenas quando o visual foi configurado para o calendário.
      // Uma animação breve termina sozinha; o aviso/transformação continua ativo.
      const timedVisual=animation.timeMode==='calendar'&&(c.effectName||c.repeatRM||c.transform||c.invisible||hasAdjustments(c)||hasBonuses(c));
      try {await playAnimation(item,{...animation,...(timedVisual?{gameDuration:secondsFor(c),gameUnit:'seconds'}:{})}, {game,canvas,sequencer:globalThis.Sequencer,SequenceClass:globalThis.Sequence,
        sourceToken:source.object??canvas.tokens.placeables.find(t=>t.id===source.id),
        area:animationArea,
        user:{isGM:true,targets:new Set(affected)}});
        const visual=item.getFlag(MODULE_ID,'activeJb2a');
        if((c.repeatRM||c.transform)&&visual&&visual.id!==previousVisual)for(const token of affected){
          const state=transformationState(token.document);
          const effect=token.actor.effects.find(e=>e.getFlag(MODULE_ID,'spellTimer')?.recurringRM?.castId===message.id||
            (state?.id&&e.getFlag(MODULE_ID,'spellTimer')?.transformationId===state.id));
          if(effect)await effect.update({[`flags.${MODULE_ID}.spellTimer.visualId`]:visual.id});
          if(c.transform&&state?.castId===message.id)await token.document.update({[`flags.${MODULE_ID}.transformation.visualId`]:visual.id});
        }
      }catch(error){ui.notifications.warn(`Dano resolvido; visual não aplicado: ${error.message}`);}
    }
    const summary=`<section class="tagmar-fx-summary">${card}<hr><h3 class="mediaeval rola">Resumo do ataque</h3>${rows.map(r=>`<p class="mediaeval"><strong>${targetName(r.name,r.tokenUuid)}</strong>: ${summaryResult(r)}${r.damage>0?`; dano ${r.damage}`:''}${r.applied&&(c.effectName||c.repeatRM||c.transform||hasAdjustments(c)||hasBonuses(c))?`; duração registrada em Efeitos: ${esc(c.effectName||item.name)}${c.repeatRM?' (nova RM no início do próximo turno)':''}`:''}.</p>`).join('')||'<p>Nenhum alvo elegível para esta configuração.</p>'}<p class="mediaeval">Resultados comuns já aplicados. ${rows.some(r=>r.critical)?'Críticos têm resolução individual no chat; sua aplicação é manual, pelos cartões de ataque.':''}</p></section>`;
    // Primeiro conserva o registro concluído. Só remove a solicitação inicial
    // depois de salvar o resumo com o mesmo registro no fim do chat.
    await message.update({[`flags.${MODULE_ID}.castRequest.status`]:'done',content:summary});
    try {
      const finalMessage=await ChatMessage.create({user:sender.id,
        speaker:ChatMessage.getSpeaker({actor:item.actor,token:source}),whisper:message.whisper,
        content:summary,flags:{[MODULE_ID]:{castRequest:{...request,status:'done'},castResults:rows,sourceRequestId:message.id}}});
      if(finalMessage?.id&&message.delete)await message.delete();
    }catch(error){ui.notifications.warn(`Resultados aplicados; o resumo foi mantido na mensagem inicial: ${error.message}`);}
  }catch(error){
    await message.update({[`flags.${MODULE_ID}.castRequest.status`]:'interrupted',content:`<h3>${esc(item.name)} — interrompida</h3><p>${esc(error.message)}</p>${rows.map(r=>`<p>${esc(r.name)}: ${r.stage==='done'?'resolvido':r.damageApplied?'dano aplicado; confira o efeito':'aplicação iniciada; confira a ficha antes de repetir'} (dano previsto: ${r.damage}).</p>`).join('')}<p>Não repetir o uso inteiro. Confira estes alvos antes de continuar manualmente.</p>`});
    throw error;
  }
}

export function registerCasts() {
  const enqueue=task=>{
    processing=processing.then(task).catch(error=>{console.error('Tagmar FX | RM por turno',error);ui.notifications.error(error.message);});
    return processing;
  };
  registerResistanceAreas(enqueue,applyMarker);
  registerRecurringResistance(enqueue);
  registerTransformations(enqueue);
  registerSummons(enqueue);
  registerSummonJobs(enqueue);
  game.modules.get(MODULE_ID).api={...game.modules.get(MODULE_ID).api,handleItemUse};
  Hooks.on('createChatMessage',message=>{
    if(!message.getFlag(MODULE_ID,'castRequest')||primaryGM()?.id!==game.user.id)return;
    processing=processing.then(()=>resolveRequest(message)).catch(async error=>{
      console.error('Tagmar FX | magia',error);ui.notifications.error(error.message);
      if(message.getFlag(MODULE_ID,'castRequest')?.status==='pending')await message.update({[`flags.${MODULE_ID}.castRequest.status`]:'rejected',content:`<p>Magia não aplicada: ${esc(error.message)}</p>`});
    });
  });
  let cleanup=Promise.resolve();
  const expire=()=>{cleanup=cleanup.then(expireMarkers).catch(e=>console.error('Tagmar FX | duração',e));};
  Hooks.on('updateWorldTime',expire);Hooks.on('canvasReady',expire);
  Hooks.on('updateSetting',s=>{if(s.key?.startsWith('tagmar-calendario.'))expire();});
  expire();
}
