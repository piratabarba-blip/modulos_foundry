import {syncTemporaryEH} from './temporary-eh.mjs';
import {MODULE_ID} from './core.mjs';
import {calendarNow} from './timers.mjs';
import {transformationState,returnTransformation} from './transformation.mjs';
import {penaltyChanges} from './resistance-penalties.mjs';
import {adjustmentFor} from './cast-rules.mjs';
import {invisibilityChange} from './invisibility.mjs';

export const primaryGM = () => game.users.filter(u=>u.active&&u.isGM).sort((a,b)=>a.id.localeCompare(b.id))[0];
const docs = collection => Array.from(collection?.contents??collection??[]);
const timerOf = effect => effect.getFlag(MODULE_ID,'spellTimer');
const escape = value => foundry.utils.escapeHTML(String(value));

// Snapshot da conjuração: mudar a FA do item depois não muda magias já em andamento.
export function resistanceSchedule(c,token,requestId,whisper) {
  if(!c.repeatRM||c.resolution!=='rm')return {};
  const combat=game.combat;
  return {recurringRM:{fa:c.fa,sceneId:token.document.parent?.id??canvas.scene.id,
    tokenId:token.id,castId:requestId,whisper:[...(whisper??[])],turns:{},
    repeatDamage:c.repeatDamage===true,damage:c.damage??0,successMode:c.rmSuccess??'end',
    combatPenalty:c.combatPenalty??0,skillPenalty:c.skillPenalty??0,
    combatModifier:adjustmentFor(c,'combat'),skillModifier:adjustmentFor(c,'skill'),
    persistAfterExit:c.persistAfterExit===true,
    anchor:combat?.started?{combatId:combat.id,round:combat.round,turn:combat.turn}:null}};
}

export async function stopResistedVisual(effect) {
  const timer=timerOf(effect),rule=timer?.recurringRM;
  if(!rule||!timer.visualId)return;
  if(rule.areaId&&!timer.expired)return; // O campo continua existindo para novos alvos.
  const item=await fromUuid(timer.source);
  const visual=item?.getFlag(MODULE_ID,'activeJb2a');
  // Um uso posterior pode ter substituído o visual: nunca encerrar a nova conjuração.
  if(!visual||visual.id!==timer.visualId)return;
  const scene=game.scenes.get(visual.sceneId);
  const actor=effect.parent;
  if(visual.config.mode==='area'){
    const stillAffected=docs(scene?.tokens).some(t=>docs(t.actor?.effects).some(e=>
      e!==effect&&!e.disabled&&!timerOf(e)?.expired&&timerOf(e)?.visualId===visual.id));
    if(!stillAffected)await item.unsetFlag(MODULE_ID,'activeJb2a');
    return;
  }
  const remaining=visual.targets.filter(id=>{
    const target=scene?.tokens.get(id);
    return actor?target?.actor?.uuid!==actor.uuid:id!==rule.tokenId;
  });
  if(remaining.length)await item.setFlag(MODULE_ID,'activeJb2a',{...visual,targets:remaining});
  else await item.unsetFlag(MODULE_ID,'activeJb2a');
}

export async function repeatResistance(combat,previous,current) {
  if(primaryGM()?.id!==game.user.id||!combat.started)return;
  if(!Number.isInteger(current.round)||!Number.isInteger(current.turn)||current.round<1)return;
  // Retroceder ou reordenar o turno atual não concede outro teste.
  if(current.round<previous.round||(current.round===previous.round&&current.turn<=previous.turn))return;
  const combatant=combat.combatants.get(current.combatantId);
  const actor=combatant?.actor,token=combatant?.token;
  if(!actor||!token||combatant.defeated)return;
  const now=calendarNow(game);
  if(now===null){ui.notifications.warn('RM por turno: ative o calendário para conferir a duração da magia.');return;}
  for(const effect of docs(actor.effects)){
    const timer=timerOf(effect),rule=timer?.recurringRM;
    if(!rule||effect.disabled||timer.expired||rule.sceneId!==token.parent?.id||rule.tokenId!==token.id)continue;
    if(now>=timer.endsAt){
      await effect.update({disabled:true,[`flags.${MODULE_ID}.spellTimer.expired`]:true});
      await syncTemporaryEH(actor);
      await stopResistedVisual(effect);continue;
    }
    if(rule.immune||rule.outside)continue;
    const anchor=rule.anchor;
    if(anchor?.combatId===combat.id&&(current.round<anchor.round||
      (current.round===anchor.round&&current.turn<=anchor.turn)))continue;
    if(current.round<=(rule.turns?.[combat.id]?.round??-1))continue;
    if(!Number.isFinite(Number(actor.system.rm))||typeof actor._rollResistencia!=='function'){
      ui.notifications.warn(`RM por turno: confira a resistência de ${actor.name}.`);continue;
    }
    // Grava antes do dado para não duplicar em reconexão, hooks repetidos ou troca de mestre.
    const turns={...rule.turns,[combat.id]:{round:current.round,turn:current.turn}};
    await effect.update({[`flags.${MODULE_ID}.spellTimer.recurringRM.turns`]:turns});
    const whisper=token.hidden?game.users.filter(u=>u.isGM).map(u=>u.id):rule.whisper;
    try {
      const result=await actor._rollResistencia(rule.fa,'Magía',{whisper});
      if(typeof result?.success!=='boolean')throw Error('O sistema não retornou o resultado da RM.');
      // Um efeito removido/renovado durante o teste não pertence mais a esta execução.
      if(!docs(actor.effects).includes(effect)||timerOf(effect)?.recurringRM?.castId!==rule.castId)continue;
      if(result.success&&(rule.successMode??'end')==='end'&&(!rule.areaId||rule.persistAfterExit)){
        await effect.update({disabled:true,[`flags.${MODULE_ID}.spellTimer.endedByRM`]:true});
        await stopResistedVisual(effect);
        const form=transformationState(token);
        if(form?.castId===rule.castId)await returnTransformation(token,'resistiu à magia',form.id);
      }else {
        await effect.update({changes:penaltyChanges(rule,!result.success),...invisibilityChange(effect,!result.success),
          [`flags.${MODULE_ID}.spellTimer.recurringRM.immune`]:result.success&&rule.successMode==='end',
          [`flags.${MODULE_ID}.spellTimer.recurringRM.savedThisTurn`]:result.success});
        if(!result.success&&rule.repeatDamage&&rule.damage>0){
          if(typeof actor._aplicarDano!=='function')throw Error('Ficha sem aplicação de dano.');
          await actor._aplicarDano({valor:rule.damage,isCura:false,curaTipo:null,isCritico:false},token.object??token);
        }
      }
      await syncTemporaryEH(actor);
      const outcome=result.success?(rule.successMode==='turn'?'passou na RM; sem dano nem ajustes deste efeito neste turno.':rule.areaId&&!rule.persistAfterExit?'passou na RM; imune até sair e entrar novamente.':'passou na RM; efeito encerrado neste alvo.'):
        `falhou na RM; efeito continua.${rule.repeatDamage&&rule.damage>0?` Dano integral aplicado: ${rule.damage}.`:''}`;
      await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor,token}),whisper,
        content:`<p><strong>${escape(effect.name)}</strong> — ${escape(token.name??actor.name)}: ${outcome}</p>`});
    }catch(error){
      console.error('Tagmar FX | RM por turno',error);
      ui.notifications.error(`RM por turno de ${actor.name}: ${error.message} Confira o chat e resolva manualmente este turno; o teste não será repetido automaticamente.`);
    }
  }
}

export function registerRecurringResistance(enqueue) {
  Hooks.on('combatTurnChange',(combat,previous,current)=>{
    if(primaryGM()?.id!==game.user.id)return;
    const before={...previous},after={...current};
    enqueue(()=>repeatResistance(combat,before,after));
  });
  const cleanup=effect=>{
    if(primaryGM()?.id===game.user.id&&timerOf(effect)?.recurringRM)enqueue(()=>{
      if(effect.disabled||timerOf(effect)?.expired||!docs(effect.parent?.effects).includes(effect))return stopResistedVisual(effect);
    });
  };
  Hooks.on('deleteActiveEffect',cleanup);
  Hooks.on('updateActiveEffect',effect=>{if(effect.disabled||timerOf(effect)?.expired)cleanup(effect);});
}
