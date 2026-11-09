import {MODULE_ID} from './core.mjs';
import {calendarNow} from './timers.mjs';
import {syncNativeBonuses} from './native-bonuses.mjs';

// EH atual inclui o saldo temporário. O registro persiste junto da ficha,
// em uma única atualização, sem alterar os máximos normais de EH e EF.
const FLAG='temporaryEH';
const PATH=`flags.${MODULE_ID}.${FLAG}`;
const INTERNAL='tagmarTemporaryEH';
const queues=new WeakMap();
const docs=value=>Array.from(value?.contents??value??[]);
const primary=()=>docs(game.users).filter(u=>u.active&&u.isGM).sort((a,b)=>a.id.localeCompare(b.id))[0]?.id===game.user.id;
const pathFor=(actor,resource='EH')=>['Personagem','NPC'].includes(actor?.type)?`system.${resource.toLowerCase()}${actor.type==='NPC'?'_npc':''}.value`:null;
const read=(object,path)=>Object.hasOwn(object??{},path)?object[path]:path.split('.').reduce((value,key)=>value?.[key],object);
const pools=actor=>structuredClone(Array.isArray(actor.getFlag(MODULE_ID,FLAG))?actor.getFlag(MODULE_ID,FLAG):[]);
const remaining=entries=>entries.reduce((total,e)=>total+Math.max(0,Number(e.remaining)||0),0);
export const temporaryResourceRemaining=(actor,resource,effectId)=>remaining(pools(actor).filter(e=>(e.resource??'EH')===resource&&(!effectId||e.effectId===effectId)));
export const temporaryEHRemaining=(actor,effectId)=>temporaryResourceRemaining(actor,'EH',effectId);

export function consumeTemporaryEH(actor,changes,options={}){
  if(!pathFor(actor)||options[INTERNAL])return;
  const entries=pools(actor);let changed=false;
  for(const resource of ['EH','EF']){
    const path=pathFor(actor,resource),previous=Number(read(actor,path));
    let requested=Number(read(changes,path));
    const balance=temporaryResourceRemaining(actor,resource);
    if(!balance||!Number.isFinite(requested)||!Number.isFinite(previous))continue;
    const maxPath=path.replace('.value','.max'),maximum=Number(read(actor,maxPath));
    // Descanso nativo completo: o teto normal não apaga o bônus vigente.
    if(read(changes,'system.eh.deficitFis')!==undefined&&read(changes,'system.ef.value')!==undefined&&requested===maximum){
      requested+=balance;changes[path]=requested;
    }
    const newMax=Number(read(changes,maxPath));
    // Mudança do teto por Físico/estágio não representa dano à reserva.
    let loss=Math.max(0,previous-requested+(Number.isFinite(newMax)?newMax-maximum:0));
    if(!loss)continue;
    for(const entry of entries.filter(e=>(e.resource??'EH')===resource)){
      const spent=Math.min(loss,Math.max(0,Number(entry.remaining)||0));
      entry.remaining-=spent;loss-=spent;changed||=spent>0;
    }
  }
  if(changed)changes[PATH]=entries;
}

async function reconcile(actor){
  if(!pathFor(actor))return;
  await syncNativeBonuses(actor);
  const before=pools(actor),now=calendarNow(game),next=[];
  for(const effect of docs(actor.effects))for(const resource of ['EH','EF']){
    const timer=effect.getFlag(MODULE_ID,'spellTimer'),grant=timer?.['temporary'+resource];
    if(!grant||!Number.isFinite(Number(grant.amount))||Number(grant.amount)<=0)continue;
    const old=before.find(e=>e.effectId===effect.id&&e.grantId===grant.grantId&&(e.resource??'EH')===resource);
    const active=!effect.disabled&&!timer.expired&&!timer.endedByRM&&
      !(now!==null&&now>=timer.endsAt)&&!timer.recurringRM?.immune&&
      !timer.recurringRM?.savedThisTurn&&!timer.recurringRM?.outside;
    const amount=Math.min(1000000,Number(grant.amount));
    next.push({effectId:effect.id,grantId:grant.grantId,resource,amount,
      active,granted:Boolean(old?.granted||active),
      remaining:active?(old?.granted?Math.min(amount,old.remaining):amount):0});
  }
  if(JSON.stringify(before)===JSON.stringify(next))return;
  const update={[PATH]:next};
  for(const resource of ['EH','EF']){
    const path=pathFor(actor,resource),current=Number(read(actor,path));
    const sum=rows=>remaining(rows.filter(e=>(e.resource??'EH')===resource));
    const previous=before.filter(e=>(e.resource??'EH')===resource);
    const ended=previous.filter(e=>e.active!==false&&!next.some(n=>n.effectId===e.effectId&&n.resource===resource&&n.active));
    const released=remaining(ended);
    const delta=sum(next)-sum(before);
    if(!delta&&!ended.length)continue;
    if(!Number.isFinite(current))throw Error(`${resource} inválida em ${actor.name}.`);
    // Ao encerrar, conserva os pontos que cabem no máximo normal. Só retira
    // excesso; reservas de outras magias permanecem disponíveis por seu prazo.
    let value=current+delta+released;
    if(ended.length){
      const maximum=Number(read(actor,path.replace('.value','.max')));
      if(!Number.isFinite(maximum))throw Error(`${resource} máxima inválida em ${actor.name}.`);
      value=Math.min(value,maximum+sum(next));
    }
    update[path]=resource==='EH'?Math.max(0,value):value;
  }
  await actor.update(update,{[INTERNAL]:true});
}

export function syncTemporaryEH(actor){
  if(!actor||!pathFor(actor))return Promise.resolve();
  const previous=queues.get(actor)??Promise.resolve();
  const next=previous.catch(()=>{}).then(()=>reconcile(actor));
  queues.set(actor,next);return next;
}

// A cura normal do sistema limita pela EH máxima. Com bônus ativo, cura só
// a parcela normal e preserva o saldo temporário, mesmo acima desse máximo.
export function wrapEHHealing(prototype){
  const original=prototype?._aplicarDano;
  if(typeof original!=='function'||original.tagmarTemporaryEH)return;
  async function damage(data,token){
    const resource=data.curaTipo==='EF'?'EF':'EH',path=pathFor(this,resource),balance=temporaryResourceRemaining(this,resource);
    if(!path||!balance||!data.isCura||data.isCritico)return original.call(this,data,token);
    const current=Number(read(this,path)),maximum=Number(read(this,path.replace('.value','.max')));
    const amount=Number(data.valor);
    if(!Number.isFinite(amount)||amount<=0)return;
    const healed=Math.max(0,Math.min(amount,maximum-(current-balance)));
    if(!healed){ui.notifications.info(`Sua ${resource} normal já está no máximo. O bônus temporário não é recuperado pela cura.`);return;}
    await this.update({[path]:current+healed});
    if(token?.center)globalThis.canvas?.interface?.createScrollingText(token.center,`${resource} +${healed}`,{fill:'green',fontFamily:'GoudyMediaeval',strokeThickness:2,stroke:'black'});
  }
  damage.tagmarTemporaryEH=true;
  prototype._aplicarDano=damage;
}

export function registerTemporaryEH(){
  Hooks.on('preUpdateActor',consumeTemporaryEH);
  wrapEHHealing(CONFIG.Actor.documentClass?.prototype);
  const run=actor=>{if(primary()&&actor)void syncTemporaryEH(actor).catch(error=>{
    console.error('Tagmar FX | EH temporária',error);ui.notifications.error(`Confira a EH temporária de ${actor.name}: ${error.message}`);
  });};
  for(const hook of ['createActiveEffect','updateActiveEffect','deleteActiveEffect'])Hooks.on(hook,e=>run(e.parent));
  const all=()=>{
    if(!primary())return;
    const actors=new Set(docs(game.actors));
    for(const scene of docs(game.scenes))for(const token of docs(scene.tokens))if(!token.actorLink&&token.actor)actors.add(token.actor);
    for(const actor of actors)if(pools(actor).length||docs(actor.effects).some(e=>e.getFlag(MODULE_ID,'spellTimer')?.temporaryEH||e.getFlag(MODULE_ID,'spellTimer')?.temporaryEF||e.getFlag(MODULE_ID,'spellTimer')?.bonuses?.length))run(actor);
  };
  Hooks.on('canvasReady',all);Hooks.on('updateUser',all);
  all();
}
