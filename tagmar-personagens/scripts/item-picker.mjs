// SPDX-License-Identifier: GPL-3.0-or-later
import {norm} from './generator.mjs';
// Uma só caixa de busca; o select oculto conserva os IDs usados pelas ações existentes.
export function bindItemPickers(app){
 app.itemPickerCleanup?.();const controller=new AbortController(),signal=controller.signal;
 app.itemPickerCleanup=()=>controller.abort();
 let nextId=0;
 for(const root of app.element.querySelectorAll('[data-item-picker]')){
  const input=root.querySelector('input'),select=root.querySelector('select'),popup=root.querySelector('[role=listbox]'),toggle=root.querySelector('[data-picker-toggle]');
  const id='tg-item-options-'+(++nextId);popup.id=id;input.setAttribute('aria-controls',id);
  const entries=[...select.options].filter(o=>o.value);let visible=[],active=-1;
  const listen=(el,event,fn)=>el.addEventListener(event,fn,{signal});
  const close=()=>{popup.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');};
  const choose=option=>{if(!option||app.busy)return;select.value=option.value;input.value=option.textContent.trim();select.dispatchEvent(new Event('change',{bubbles:true}));close();};
  const highlight=index=>{active=index;for(const button of popup.querySelectorAll('[role=option]'))button.classList.toggle('tg-focused',Number(button.dataset.index)===index);const button=popup.querySelector(`[data-index="${index}"]`);if(button){input.setAttribute('aria-activedescendant',button.id);if(button.offsetTop<popup.scrollTop)popup.scrollTop=button.offsetTop;else if(button.offsetTop+button.offsetHeight>popup.scrollTop+popup.clientHeight)popup.scrollTop=button.offsetTop+button.offsetHeight-popup.clientHeight;}};
  const show=(all=false)=>{
   const q=all?'':norm(input.value);visible=entries.filter(o=>{o.hidden=!norm(o.textContent).includes(q);return !o.hidden;});active=-1;input.removeAttribute('aria-activedescendant');
   const fragment=document.createDocumentFragment();visible.forEach((option,index)=>{const button=document.createElement('button');button.type='button';button.id=id+'-'+index;button.setAttribute('role','option');button.setAttribute('aria-selected',String(select.value===option.value));button.tabIndex=-1;button.dataset.index=String(index);button.textContent=option.textContent;button.title=option.title;fragment.append(button);});
   if(!visible.length){const empty=document.createElement('p');empty.textContent='Nenhum item encontrado.';fragment.append(empty);}
   popup.replaceChildren(fragment);
   const pane=root.closest('.tg-preview,.tg-options'),bounds=pane?.getBoundingClientRect()??{top:0,bottom:innerHeight},rect=root.getBoundingClientRect();
   const below=Math.min(innerHeight,bounds.bottom)-rect.bottom-6,above=rect.top-Math.max(0,bounds.top)-6,up=below<150&&above>below;
   popup.classList.toggle('tg-above',up);popup.style.maxHeight=Math.max(40,Math.min(260,up?above:below))+'px';popup.hidden=false;popup.scrollTop=0;input.setAttribute('aria-expanded','true');
  };
  listen(input,'focus',()=>{input.select();show(true);});
  listen(input,'click',()=>{if(popup.hidden)show(true);});
  listen(input,'input',()=>{select.value='';show();});
  listen(input,'keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}
   else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
    event.preventDefault();event.stopPropagation();if(popup.hidden)show(!!select.value);
    if(visible.length)highlight(event.key==='Home'?0:event.key==='End'?visible.length-1:active<0?(event.key==='ArrowUp'?visible.length-1:0):(active+(event.key==='ArrowDown'?1:-1)+visible.length)%visible.length);
   }else if(event.key==='Enter'&&!popup.hidden){event.preventDefault();event.stopPropagation();choose(visible[active<0?0:active]);close();}
   else if(event.key==='Tab')close();
  });
  listen(toggle,'mousedown',event=>event.preventDefault());listen(toggle,'click',()=>{if(popup.hidden){input.focus();show(true);}else close();});
  listen(popup,'mousedown',event=>event.preventDefault());listen(popup,'click',event=>{const button=event.target.closest('[role=option]');if(button)choose(visible[Number(button.dataset.index)]);});
  listen(root,'focusout',event=>{if(!root.contains(event.relatedTarget))close();});
  listen(app.element,'mousedown',event=>{if(!root.contains(event.target))close();});

 }
}
