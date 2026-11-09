// SPDX-License-Identifier: GPL-3.0-or-later
import {norm} from './generator.mjs';
// Busca local no índice: digitar não carrega fichas nem recria a janela.
export function bindCreaturePicker(app){
 const root=app.element.querySelector('[data-creature-picker]');if(!root)return;
 const input=root.querySelector('[data-c-search]'),value=root.querySelector('[data-c-field="source"]'),popup=root.querySelector('[role="listbox"]'),toggle=root.querySelector('[data-c-toggle]'),empty=popup.querySelector('[data-c-empty]'),options=[...popup.querySelectorAll('[role="option"]')];
 const initial={source:value.value,dirty:app.creature.dirty,created:app.creature.created};
 let visible=[],active=-1;
 const close=()=>{popup.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');};
 const highlight=n=>{active=n;for(const option of options)option.classList.toggle('tg-focused',option===visible[n]);if(visible[n]){input.setAttribute('aria-activedescendant',visible[n].id);visible[n].scrollIntoView({block:'nearest'});}};
 const show=query=>{const q=norm(query);visible=options.filter(option=>{option.hidden=!norm(option.textContent).includes(q);return !option.hidden;});empty.hidden=visible.length>0;popup.hidden=false;input.setAttribute('aria-expanded','true');active=-1;input.removeAttribute('aria-activedescendant');options.forEach(option=>option.classList.remove('tg-focused'));popup.scrollTop=0;};
 const choose=option=>{if(app.busy||!option)return;app.creature.query=null;value.value=option.dataset.key;input.value=option.textContent.trim();close();if(value.value===initial.source){app.creature.draft.source=initial.source;app.creature.dirty=initial.dirty;app.creature.created=initial.created;app.render({force:true});return;}value.dispatchEvent(new Event('change',{bubbles:true}));};
 input.addEventListener('focus',()=>{input.select();show('');});
 input.addEventListener('input',()=>{
  app.creature.query=input.value;app.creature.draft.source='';value.value='';app.creature.dirty=true;app.creature.created=null;
  for(const key of ['c-create','c-generate'])app.element.querySelector(`[data-do="${key}"]`)?.setAttribute('disabled','');
  const pending=app.element.querySelector('.tg-dirty');if(pending)pending.hidden=false;
  show(input.value);
 });
 input.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return;}
  if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();event.stopPropagation();if(popup.hidden)show('');if(visible.length)highlight(active<0?(event.key==='ArrowDown'?0:visible.length-1):(active+(event.key==='ArrowDown'?1:-1)+visible.length)%visible.length);}
  else if(event.key==='Enter'&&!popup.hidden){event.preventDefault();event.stopPropagation();choose(visible[active<0?0:active]);}
 });
 toggle.addEventListener('mousedown',e=>e.preventDefault());
 toggle.addEventListener('click',()=>{if(popup.hidden){input.focus();show('');}else close();});
 for(const option of options){option.addEventListener('mousedown',e=>e.preventDefault());option.addEventListener('click',()=>choose(option));}
 root.addEventListener('focusout',event=>{if(!root.contains(event.relatedTarget))close();});
}
