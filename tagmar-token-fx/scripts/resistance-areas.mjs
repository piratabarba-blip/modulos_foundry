import {syncTemporaryEH} from './temporary-eh.mjs';
import {MODULE_ID} from './core.mjs';
import {insideArea,acceptsTarget,secondsFor} from './cast-rules.mjs';
import {calendarNow} from './timers.mjs';
import {primaryGM} from './recurring-resistance.mjs';
const docs=c=>Array.from(c?.contents??c??[]);
export const isRecurringArea=c=>c.repeatRM&&c.resolution==='rm'&&!c.transform&&['circle','cone','ray'].includes(c.shape);
const timer=e=>e.getFlag(MODULE_ID,'spellTimer');
const areaList=scene=>scene.getFlag(MODULE_ID,'resistanceAreas')??[];
const center=t=>t.object?.center??{x:t.x+t.width*t.parent.grid.size/2,y:t.y+t.height*t.parent.grid.size/2};

export async function saveResistanceArea(scene,item,c,request,message,targets){
  const now=calendarNow(game);
  const areas=areaList(scene).filter(a=>a.endsAt>now&&a.itemUuid!==item.uuid);
  const replaced=new Set(areaList(scene).filter(a=>a.itemUuid===item.uuid).map(a=>a.id));
  for(const token of docs(scene.tokens))for(const e of docs(token.actor?.effects)){
    if(replaced.has(timer(e)?.recurringRM?.areaId))await e.update({disabled:true,changes:[]});
  }
  areas.push({id:message.id,itemUuid:item.uuid,name:item.name,img:item.img,config:structuredClone(c),
    sourceId:request.sourceId,sourceDisposition:scene.tokens.get(request.sourceId)?.disposition,
    origin:request.origin,direction:request.direction,endsAt:now+secondsFor(c),
    whisper:[...message.whisper],inside:targets.map(t=>t.id)});
  await scene.setFlag(MODULE_ID,'resistanceAreas',areas);
}

// A fila do mestre serializa deslocamentos, entrada inicial e avanço de turno.
// O teste usa o centro do token e a geometria salva, mesmo sem a cena aberta.
export async function reconcileResistanceAreas(scene,applyMarker){
  if(primaryGM()?.id!==game.user.id)return;
  const now=calendarNow(game);if(now===null)return;
  const original=areaList(scene);if(!original.length)return;
  const areas=structuredClone(original);
  for(const area of areas){
    const c=area.config,source={id:area.sourceId,disposition:area.sourceDisposition};
    const scale=scene.grid.size/scene.grid.distance;
    const eligible=docs(scene.tokens).filter(t=>t.actor&&(c.includeCaster||t.id!==source.id)&&
      acceptsTarget(source,t,c.targetFilter)&&insideArea(center(t),area.origin,area.direction,c,scale));
    const ids=now<area.endsAt?eligible.map(t=>t.id):[];
    for(const id of area.inside.filter(id=>!ids.includes(id))){
      const actor=scene.tokens.get(id)?.actor??docs(game.actors).find(a=>docs(a.effects).some(e=>timer(e)?.recurringRM?.areaId===area.id&&timer(e)?.recurringRM?.tokenId===id));
      const replacement=eligible.find(t=>ids.includes(t.id)&&t.actor.uuid===actor?.uuid);
      for(const e of docs(actor?.effects).filter(e=>timer(e)?.recurringRM?.areaId===area.id)){
        if(replacement){await e.update({[`flags.${MODULE_ID}.spellTimer.recurringRM.tokenId`]:replacement.id});continue;}
        if(c.persistAfterExit&&now<area.endsAt){
          await e.update({[`flags.${MODULE_ID}.spellTimer.recurringRM.leftArea`]:true});continue;
        }
        await e.update({disabled:true,changes:[],[`flags.${MODULE_ID}.spellTimer.recurringRM.outside`]:true});
        await syncTemporaryEH(actor);
      }
    }
    const entrants=eligible.filter(t=>ids.includes(t.id)&&!area.inside.includes(t.id));
    // Persistir antes do dado: erro/interrupção não repete dano silenciosamente.
    const changed=ids.length!==area.inside.length||ids.some(id=>!area.inside.includes(id));
    area.inside=ids;
    if(changed)await scene.setFlag(MODULE_ID,'resistanceAreas',areas);
    const seen=new Set();
    for(const token of entrants){
      if(seen.has(token.actor.uuid))continue;seen.add(token.actor.uuid);
      const actor=token.actor;
      if(c.persistAfterExit){
        const existing=docs(actor.effects).filter(e=>timer(e)?.recurringRM?.areaId===area.id);
        if(existing.length){
          for(const e of existing)await e.update({[`flags.${MODULE_ID}.spellTimer.recurringRM.leftArea`]:false,[`flags.${MODULE_ID}.spellTimer.recurringRM.tokenId`]:token.id});
          continue;
        }
      }
      if(docs(actor.effects).some(e=>!e.disabled&&timer(e)?.recurringRM?.areaId===area.id&&!timer(e)?.recurringRM?.outside))continue;
      try{
        const whisper=token.hidden?game.users.filter(u=>u.isGM).map(u=>u.id):area.whisper;
        const result=await actor._rollResistencia(c.fa,'Magía',{whisper});
        if(typeof result?.success!=='boolean')throw Error('A RM não retornou resultado.');
        const item={uuid:area.itemUuid,name:area.name,img:area.img};
        if(!result.success&&c.damage>0)await actor._aplicarDano({valor:c.damage,isCura:false,curaTipo:null,isCritico:false},token.object??{document:token,center:center(token)});
        await applyMarker(actor,item,c,{id:token.id,document:token},area.id,whisper,{areaId:area.id,endsAt:area.endsAt,success:result.success});
        const esc=foundry.utils.escapeHTML;
        await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor,token}),whisper,
          content:`<p><strong>${esc(area.name)}</strong> — ${esc(token.name??actor.name)} entrou na área: ${result.success?'passou na RM.':`falhou na RM; dano ${c.damage}, penalidades temporárias aplicadas.`}</p>`});
      }catch(error){console.error('Tagmar FX | entrada na área',error);ui.notifications.error(`Confira manualmente a entrada de ${actor.name}: ${error.message}`);}
    }
  }
  const remaining=areas.filter(a=>a.endsAt>now);
  if(remaining.length!==areas.length)await scene.setFlag(MODULE_ID,'resistanceAreas',remaining);
}

export function registerResistanceAreas(enqueue,applyMarker){
  const reconcile=scene=>{if(scene&&primaryGM()?.id===game.user.id)enqueue(()=>reconcileResistanceAreas(scene,applyMarker));};
  Hooks.on('updateToken',(token,change)=>{
    if(['x','y','width','height','disposition'].some(k=>Object.hasOwn(change,k)))reconcile(token.parent);
  });
  Hooks.on('createToken',token=>reconcile(token.parent));
  Hooks.on('deleteToken',token=>reconcile(token.parent));
  Hooks.on('combatTurnChange',(combat)=>reconcile(combat.scene??game.scenes.get(combat.sceneId)));
  const all=()=>{for(const scene of game.scenes)if(areaList(scene).length)reconcile(scene);};
  Hooks.on('canvasReady',all);Hooks.on('updateWorldTime',all);
  Hooks.on('updateSetting',s=>{if(s.key?.startsWith('tagmar-calendario.'))all();});
}
