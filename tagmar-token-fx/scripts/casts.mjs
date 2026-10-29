import {MODULE_ID,destinationTokens} from './core.mjs';
import {castConfiguration,secondsFor,insideArea,facingAngle,attackResult,acceptsTarget} from './cast-rules.mjs';
import {placeArea} from './area-preview.mjs';
import {calendarNow} from './timers.mjs';
import {animationConfiguration,playAnimation} from './jb2a.mjs';
import {itemAttackResult} from './item-attack.mjs';
import {visualArea} from './area-animation.mjs';
import {attackToChat} from './attack-chat.mjs';
import {targetName} from './chat-targets.mjs';
const esc=s=>foundry.utils.escapeHTML(String(s));
const primaryGM=()=>game.users.filter(u=>u.active&&u.isGM).sort((a,b)=>a.id.localeCompare(b.id))[0];
let choosing=false, processing=Promise.resolve();

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
  if(visual.enabled&&visual.mode==='area'&&(!c.enabled||!['circle','cone','ray'].includes(c.shape)))
    throw Error('Para usar o visual na área, ative a resolução do item e escolha círculo, cone ou linha no FX.');
  if(!c.enabled){await turnToTarget(item);return false;}
  validateTechnique(item);
  if(choosing){ui.notifications.warn('Termine ou cancele a área anterior.');return true;}
  if(!primaryGM())throw Error('É necessário um mestre conectado para resolver a magia automaticamente.');
  const [source]=destinationTokens(item,'self',canvas,game.user);
  if(!source?.actor)throw Error('Selecione o token do evocador.');
  if(c.shape!=='self')acceptsTarget(source,source,c.targetFilter);
  if(c.effectName&&calendarNow(game)===null)throw Error('Ative o calendário para o efeito com duração.');
  let area=null;
  choosing=true;
  try {
    if(['circle','cone','ray'].includes(c.shape))area=await placeArea(c,{canvas,PIXI,document,Hooks,notify:t=>ui.notifications.info(t)});
    else area={sceneId:canvas.scene.id,origin:source.center,direction:0};
    if(!area||canvas.scene.id!==area.sceneId)return true;
    const aim=['cone','ray'].includes(c.shape)?{x:area.origin.x+Math.cos(area.direction*Math.PI/180)*100,
      y:area.origin.y+Math.sin(area.direction*Math.PI/180)*100}:c.shape==='circle'?area.origin:null;
    if(c.shape!=='self')await turnToTarget(item,aim,source);
    const targets=c.shape==='self'?[source.id]:[...game.user.targets].map(t=>t.id);
    await ChatMessage.create({user:game.user.id,speaker:ChatMessage.getSpeaker({actor:item.actor,token:source.document}),
      whisper:[...new Set([...game.users.filter(u=>u.isGM).map(u=>u.id),game.user.id])],
      content:`<p><strong>${esc(item.name)}</strong>: aguardando resolução automática.</p>`,
      flags:{[MODULE_ID]:{castRequest:{itemUuid:item.uuid,sourceId:source.id,sceneId:area.sceneId,
        origin:{x:area.origin.x,y:area.origin.y},direction:area.direction,targets,status:'pending'}}}});
  }finally{choosing=false;}
  return true;
}

async function applyMarker(actor,item,c) {
  if(!c.effectName)return;
  const now=calendarNow(game),seconds=secondsFor(c);
  if(now===null||!Number.isFinite(seconds)||seconds<=0||seconds>365*86400)throw Error('Duração inválida ou calendário indisponível.');
  const data={name:c.effectName,img:item.img,origin:item.uuid,disabled:false,transfer:false,changes:[],
    duration:{startTime:game.time.worldTime,seconds},flags:{[MODULE_ID]:{spellTimer:{endsAt:now+seconds,source:item.uuid,expired:false}}}};
  const existing=actor.effects.find(e=>e.getFlag(MODULE_ID,'spellTimer')?.source===item.uuid);
  if(existing)await existing.update(data);else await actor.createEmbeddedDocuments('ActiveEffect',[data]);
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
  }
}

export async function resolveRequest(message) {
  if(primaryGM()?.id!==game.user.id)return;
  const request=message.getFlag(MODULE_ID,'castRequest');if(request?.status!=='pending')return;
  const sender=game.users.get(message.author?.id??message.user?.id);
  const item=await fromUuid(request.itemUuid);
  if(!sender||!item?.actor||!item.actor.testUserPermission(sender,'OWNER')||!['Magia','Combate','Tecnica_Combate'].includes(item.type))throw Error('Solicitação sem permissão sobre o evocador.');
  const c=castConfiguration(item);if(!c.enabled)throw Error('A automação desta magia foi desativada.');
  validateTechnique(item);
  const scene=game.scenes.get(request.sceneId),source=scene?.tokens.get(request.sourceId);
  if(!source?.actor||source.actor.uuid!==item.actor.uuid)throw Error('Token do evocador não corresponde à ficha.');
  if(c.shape!=='self')acceptsTarget(source,source,c.targetFilter);
  if(!['x','y'].every(k=>Number.isFinite(request.origin?.[k]))||!Number.isFinite(request.direction))throw Error('Posição de área inválida.');
  if(c.effectName&&(calendarNow(game)===null||secondsFor(c)>365*86400))throw Error('Confira calendário e duração antes de usar a magia.');
  if(!canvas.ready||canvas.scene.id!==scene.id)throw Error('O mestre precisa visualizar a cena da magia para esta prévia.');
  const scale=scene.grid.size/scene.grid.distance;
  if(!Number.isFinite(scale)||scale<=0)throw Error('Escala da cena inválida.');
  const animation=animationConfiguration(item);
  const animationArea=animation.enabled&&animation.mode==='area'?visualArea(c,request,scene):null;
  const targets=canvas.tokens.placeables.filter(t=>t.actor&&(c.shape==='self'||acceptsTarget(source,t,c.targetFilter))&&
    (c.shape==='self'?t.id===source.id:c.shape==='targets'?request.targets?.includes(t.id):
      ((c.includeCaster||t.id!==source.id)&&insideArea(t.center,request.origin,request.direction,c,scale))));
  // Tokens vinculados à mesma ficha compartilham a reserva; não causar dano duplicado.
  const unique=[...new Map(targets.map(t=>[t.actor.uuid,t])).values()];
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
        apply=!outcome.success;damage=outcome.success?Math.ceil(c.damage*c.resistedDamage/100):c.damage;
        description=outcome.success?`Passou na ${resistance}`:`Falhou na ${resistance}`;
      }else if(c.resolution==='attack'){
        const fromItem=item.type==='Combate';
        const defense=!fromItem&&c.defense?Number(actor.system.d_ativa?.valor):0;
        if(!Number.isFinite(defense))throw Error(`Defesa não configurada: ${token.name}`);
        const roll=await new Roll('1d20').evaluate();
        const result=fromItem?itemAttackResult(item,actor,game.tagmar.tabela_resol,roll.total):attackResult(game.tagmar.tabela_resol,c.column-defense,roll.total,c.damage);
        damage=result.damage;critical=result.critical;apply=!critical&&result.percent>0;
        description=critical?'Crítico: resolver pela regra específica':`${result.color} — ${result.percent}%`;
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
      if(apply){await applyMarker(actor,item,c);affected.push(token);row.applied=true;}
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
    if(animation.enabled&&(affected.length||animation.mode==='area')){
      try {await playAnimation(item,{...animation,...(c.effectName?{timeMode:'calendar',gameDuration:secondsFor(c),gameUnit:'seconds'}:{})}, {game,canvas,sequencer:globalThis.Sequencer,SequenceClass:globalThis.Sequence,
        sourceToken:source.object??canvas.tokens.placeables.find(t=>t.id===source.id),
        area:animationArea,
        user:{isGM:true,targets:new Set(affected)}});}catch(error){ui.notifications.warn(`Dano resolvido; visual não aplicado: ${error.message}`);}
    }
    const summary=`<section class="tagmar-fx-summary">${card}<hr><h3 class="mediaeval rola">Resumo do ataque</h3>${rows.map(r=>`<p class="mediaeval"><strong>${targetName(r.name,r.tokenUuid)}</strong>: ${esc(r.description)}${r.damage>0?`; dano ${r.damage}`:''}${r.applied&&c.effectName?`; duração registrada em Efeitos: ${esc(c.effectName)}`:''}.</p>`).join('')||'<p>Nenhum alvo elegível para esta configuração.</p>'}<p class="mediaeval">Resultados comuns já aplicados. ${rows.some(r=>r.critical)?'Críticos têm resolução individual no chat; sua aplicação é manual, pelos cartões de ataque.':''}</p></section>`;
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
