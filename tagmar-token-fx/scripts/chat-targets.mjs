const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function targetName(name, tokenUuid) {
  if (!tokenUuid) return escape(name);
  return `<span class="tagmar-fx-chat-target" data-token-uuid="${escape(tokenUuid)}" tabindex="0" title="Passe o mouse para destacar este token na cena." style="cursor:help;border-bottom:1px dotted currentColor">${escape(name)}</span>`;
}

// Mesmo destaque usado pelo monitor de combate; não controla nem marca o token.
export function registerChatTargets({document:doc=document,window:win=window,getCanvas=()=>canvas,getUser=()=>game.user,hooks=Hooks}={}) {
  let active=null;
  const clear=event=>{if(active?.owned)active.token._onHoverOut(event,{updateLegend:false});active=null;};
  const enter=event=>{
    const el=event.target.closest?.('.tagmar-fx-chat-target');
    if(!el||el===active?.el)return;
    clear(event);
    const view=getCanvas(),user=getUser(),parts=el.dataset.tokenUuid?.split('.');
    if(!view?.ready||parts?.length!==4||parts[0]!=='Scene'||parts[2]!=='Token'||parts[1]!==view.scene?.id)return;
    const token=view.tokens.get(parts[3]);
    if(!token?.visible||!token.isVisible||(token.document.hidden&&!user.isGM)||!token._canHover(user,event))return;
    const owned=!token.hover;
    active={el,token,owned};
    if(owned)token._onHoverIn(event,{updateLegend:false});
  };
  const leave=event=>{if(active?.el.contains(event.target)&&!active.el.contains(event.relatedTarget))clear(event);};
  doc.addEventListener('pointerover',enter);doc.addEventListener('pointerout',leave);
  doc.addEventListener('focusin',enter);doc.addEventListener('focusout',leave);
  win.addEventListener('blur',clear);
  hooks.on('canvasTearDown',()=>clear());hooks.on('deleteChatMessage',()=>clear());
}
