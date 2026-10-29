import {MODULE_ID} from './core.mjs';
import {calendarNow,validTimer} from './timers.mjs';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const openSheets=new Map();
const effectsTabSelected=new WeakMap();

const documents=collection=>Array.from(collection?.contents??collection??[]);

export function activeVisualTimes(actor,game) {
  const items=new Map();
  const remember=owner=>{for(const item of documents(owner?.items))if(item.uuid)items.set(item.uuid,item);};
  remember(actor);
  for(const owner of documents(game.actors))remember(owner);
  for(const scene of documents(game.scenes))for(const token of documents(scene.tokens))if(!token.actorLink)remember(token.actor);
  const rows=[];
  for(const item of items.values()){
    const timer=item.getFlag(MODULE_ID,'activeJb2a');
    if(!validTimer(timer))continue;
    const ownedHere=item.actor?.uuid===actor.uuid;
    const scene=game.scenes?.get?.(timer.sceneId);
    const affected=timer.config?.mode!=='area'&&timer.targets.some(id=>scene?.tokens?.get?.(id)?.actor?.uuid===actor.uuid);
    if(!ownedHere&&!affected)continue;
    // A mesma magia pode ter aviso e visual. Só juntá-los se seus prazos coincidirem.
    const duplicate=documents(actor.effects).some(effect=>{
      const notice=effect.getFlag(MODULE_ID,'spellTimer');
      return !effect.disabled&&!notice?.expired&&notice?.source===item.uuid&&Math.abs(notice.endsAt-timer.endsAt)<1;
    });
    if(!duplicate)rows.push({item,timer});
  }
  return rows;
}

export function remainingLabel(seconds) {
  if(seconds===null)return 'Calendário indisponível';
  if(seconds<=0)return 'Expirado';
  let remaining=Math.ceil(seconds);const pieces=[];
  for(const [unit,size] of [['sem',604800],['d',86400],['h',3600],['min',60],['s',1]]){
    const count=Math.floor(remaining/size);remaining%=size;
    if(count)pieces.push(`${count} ${unit}`);
    if(pieces.length===2)break;
  }
  return `Restam ${pieces.join(' ')}`;
}

export function renderSpellTimes(app,html) {
  const root=html?.[0]??html,actor=app.actor??app.document;
  if(!root?.querySelector||!actor?.effects)return;
  const nav=root.querySelector('.prim-tabs'),body=root.querySelector('.sheet-primary');
  if(!nav||!body)return;
  if(!nav.dataset.tagmarSpellTimes){
    nav.dataset.tagmarSpellTimes='bound';
    nav.addEventListener('click',event=>{
      const link=event.target.closest('[data-tab]');
      if(link)effectsTabSelected.set(app,link.dataset.tab==='efeitos');
    });
  }
  let tab=body.querySelector('.tab[data-tab="efeitos"]');
  if(!tab){
    const label=document.createElement('label');label.className='mediaeval tagmar-fx-effects-tab';
    label.innerHTML='<a class="item" data-tab="efeitos" title="Efeitos com duração">Efeitos</a>';nav.append(label);
    tab=document.createElement('div');tab.className='tab efeitos container';tab.dataset.tab='efeitos';tab.dataset.group='primary';
    body.querySelector('.tab[data-tab]')?.parentElement.append(tab);
    // Tabs do Foundry delega os cliques; não registrar outro controlador.
    if(effectsTabSelected.get(app))app._tabs?.[0]?.activate('efeitos');
    if(app._tabs?.[0]?.active==='efeitos')tab.classList.add('active');
  }
  let panel=tab.querySelector('.tagmar-spell-times');
  if(!panel){panel=document.createElement('section');panel.className='tagmar-spell-times';tab.prepend(panel);}
  const now=calendarNow(game);
  const effects=Array.from(actor.effects).filter(e=>e.getFlag(MODULE_ID,'spellTimer'));
  const visuals=activeVisualTimes(actor,game);
  const visualRows=visuals.map(({item,timer})=>{
    const status=now!==null&&now<timer.startsAt?'Aguardando início':remainingLabel(now===null?null:timer.endsAt-now);
    const expired=now!==null&&now>=timer.endsAt;
    return `<tr class="${expired?'inactive':''}"><td><img src="${escape(item.img||'icons/svg/clockwork.svg')}" width="28" height="28" alt=""></td><td>${escape(item.name)}<small style="display:block">${timer.config?.lightEnabled?'Visual e iluminação':'Efeito visual'}${timer.config?.mode==='area'?' na área':''}</small></td><td>${escape(status)}</td><td>${item.isOwner?`<button type="button" data-end-visual-time="${escape(item.uuid)}" data-timer-id="${escape(timer.id)}" title="Encerrar o visual e a luz desta magia" aria-label="Encerrar ${escape(item.name)}"><i class="fas fa-stop"></i></button>`:''}</td></tr>`;
  }).join('');
  panel.innerHTML=`<h3 class="fairyDust">Tempo de magias e técnicas</h3><p class="hint">Avisos de duração; não alteram atributos ou condições.</p><table><thead><tr><th></th><th>Efeito</th><th>Tempo restante</th><th></th></tr></thead><tbody>${effects.map(e=>{
    const timer=e.getFlag(MODULE_ID,'spellTimer');
    const expired=timer.expired===true||(now!==null&&now>=timer.endsAt);
    const status=expired?'Expirado':e.disabled?'Inativo':remainingLabel(now===null?null:timer.endsAt-now);
    return `<tr class="${expired||e.disabled?'inactive':''}"><td><img src="${escape(e.img||'icons/svg/clockwork.svg')}" width="28" height="28" alt=""></td><td>${escape(e.name)}</td><td>${escape(status)}</td><td>${actor.isOwner?`<button type="button" data-remove-spell-time="${escape(e.id)}" title="Remover este aviso de duração" aria-label="Remover ${escape(e.name)}"><i class="fas fa-trash"></i></button>`:''}</td></tr>`;
  }).join('')+visualRows||'<tr><td colspan="4">Nenhuma magia ou técnica com duração registrada.</td></tr>'}</tbody></table>`;
  for(const button of panel.querySelectorAll('[data-end-visual-time]'))button.addEventListener('click',async event=>{
    event.preventDefault();event.stopPropagation();
    const item=visuals.find(row=>row.item.uuid===button.dataset.endVisualTime)?.item;
    if(!item?.isOwner||item.getFlag(MODULE_ID,'activeJb2a')?.id!==button.dataset.timerId)return;
    try{await item.unsetFlag(MODULE_ID,'activeJb2a');renderSpellTimes(app,root);}catch(error){ui.notifications.error(error.message);}
  });
  for(const button of panel.querySelectorAll('[data-remove-spell-time]'))button.addEventListener('click',async event=>{
    event.preventDefault();event.stopPropagation();
    const effect=actor.effects.get(button.dataset.removeSpellTime);
    if(!actor.isOwner||!effect?.getFlag(MODULE_ID,'spellTimer'))return;
    try{await effect.delete();renderSpellTimes(app,root);}catch(error){ui.notifications.error(error.message);}
  });
  openSheets.set(app,root);
}

export function registerSpellTimes() {
  const refresh=()=>{for(const [app,root] of openSheets){if(root.isConnected)renderSpellTimes(app,root);else openSheets.delete(app);}};
  Hooks.on('renderActorSheet',renderSpellTimes);
  Hooks.on('closeActorSheet',app=>openSheets.delete(app));
  Hooks.on('updateWorldTime',refresh);
  Hooks.on('updateSetting',s=>{if(s.key?.startsWith('tagmar-calendario.'))refresh();});
  for(const hook of ['createActiveEffect','updateActiveEffect','deleteActiveEffect'])Hooks.on(hook,refresh);
  for(const hook of ['createItem','updateItem','deleteItem','updateActor','updateToken','deleteToken','canvasReady'])Hooks.on(hook,refresh);
}
