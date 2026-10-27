const TIP_ID = 'tagmar-calendar-day-tooltip';

// All candidate regions lie outside the visible (scaled) calendar.
export function tooltipRegions(hud, anchor, viewport, below = false) {
  const gap=10, edge=8;
  const width=Math.max(1,viewport.width-edge*2), height=Math.max(1,viewport.height-edge*2);
  const regions={
    right:{side:'right',left:Math.max(edge,hud.right+gap),top:edge,width:Math.max(0,viewport.width-edge-hud.right-gap),height},
    left:{side:'left',left:edge,top:edge,width:Math.max(0,hud.left-gap-edge),height},
    bottom:{side:'bottom',left:edge,top:Math.max(edge,hud.bottom+gap),width,height:Math.max(0,viewport.height-edge-hud.bottom-gap)},
    top:{side:'top',left:edge,top:edge,width,height:Math.max(0,hud.top-gap-edge)}
  };
  const side=(anchor.left+anchor.right)/2 < (hud.left+hud.right)/2 ? 'left' : 'right';
  const opposite=side==='left'?'right':'left';
  return (below?['bottom',side,opposite,'top']:[side,opposite,'top','bottom']).map(key=>regions[key]);
}

export function positionCalendarTooltip(tooltip, target, shell, viewport) {
  const hud=shell.getBoundingClientRect(), anchor=target.getBoundingClientRect();
  const regions=tooltipRegions(hud,anchor,viewport,Boolean(target.closest('.hud-information,.hud-resize-handle')));
  const usable=regions.filter(r=>r.width>=120 && r.height>=32);
  let selected;
  // Measure again after wrapping, rather than pushing a tall tooltip over the HUD.
  for(const region of usable) {
    tooltip.style.maxWidth=`${Math.min(380,region.width)}px`;
    tooltip.style.maxHeight='none';
    const bounds=tooltip.getBoundingClientRect();
    if(bounds.height<=region.height) { selected=region;break; }
  }
  selected ??= [...usable].sort((a,b)=>b.width*b.height-a.width*a.height)[0]
    ?? regions.filter(r=>r.width>0 && r.height>0).sort((a,b)=>b.width*b.height-a.width*a.height)[0]
    ?? {side:'screen',left:8,top:8,width:Math.max(1,viewport.width-16),height:Math.max(1,viewport.height-16)};
  tooltip.style.maxWidth=`${Math.min(380,selected.width)}px`;
  tooltip.style.maxHeight=`${selected.height}px`;
  const bounds=tooltip.getBoundingClientRect();
  const clamp=(v,min,max)=>Math.max(min,Math.min(v,max));
  let left=clamp(anchor.left,selected.left,selected.left+selected.width-bounds.width);
  let top=clamp(anchor.top,selected.top,selected.top+selected.height-bounds.height);
  if(selected.side==='right') left=selected.left;
  if(selected.side==='left') left=selected.left+selected.width-bounds.width;
  if(selected.side==='bottom') top=selected.top;
  if(selected.side==='top') top=selected.top+selected.height-bounds.height;
  Object.assign(tooltip.style,{left:`${left}px`,top:`${top}px`});
  tooltip.dataset.side=selected.side;
}

export function activateCalendarTooltips(element) {
  const shell=element.querySelector('.calendar-shell');
  if(!shell) return ()=>{};
  const controller=new AbortController(), options={signal:controller.signal};
  let current, previousDescription, timer;
  const hide=()=>{
    clearTimeout(timer);
    document.getElementById(TIP_ID)?.remove();
    if(current) {
      if(previousDescription===null) current.removeAttribute('aria-describedby');
      else current.setAttribute('aria-describedby',previousDescription);
    }
    current=null;
  };
  const deferHide=()=>{clearTimeout(timer);timer=setTimeout(hide,120);};
  hide();
  for(const target of element.querySelectorAll('[data-calendar-tip],[data-tooltip],[title]')) {
    const text=target.dataset.calendarTip ?? target.dataset.tooltip ?? target.title;
    if(!text) continue;
    target.dataset.calendarTip=text;
    target.removeAttribute('title');target.removeAttribute('data-tooltip');
    const show=()=>{
      hide();current=target;previousDescription=target.getAttribute('aria-describedby');
      const tooltip=document.createElement('div');
      tooltip.id=TIP_ID;tooltip.setAttribute('role','tooltip');
      tooltip.textContent=text; // User-written events must never become HTML.
      document.body.append(tooltip);
      target.setAttribute('aria-describedby',[previousDescription,TIP_ID].filter(Boolean).join(' '));
      positionCalendarTooltip(tooltip,target,shell,{width:window.innerWidth,height:window.innerHeight});
      tooltip.addEventListener('pointerenter',()=>clearTimeout(timer),options);
      tooltip.addEventListener('pointerleave',deferHide,options);
    };
    target.addEventListener('pointerenter',show,options);
    target.addEventListener('pointerleave',deferHide,options);
    target.addEventListener('focus',show,options);
    target.addEventListener('blur',hide,options);
    target.addEventListener('pointerdown',hide,options);
    target.addEventListener('keydown',event=>{if(event.key==='Escape')hide();},options);
    if(target.matches(':hover'))show();
  }
  window.addEventListener('resize',hide,options);
  window.addEventListener('keydown',event=>{if(event.key==='Escape')hide();},options);
  return ()=>{hide();controller.abort();};
}
