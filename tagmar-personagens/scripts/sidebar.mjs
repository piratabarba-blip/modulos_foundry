// SPDX-License-Identifier: GPL-3.0-or-later
// Atalho direto: não registra grupo/ferramenta nem muda a camada ativa do mapa.
export function positionGeneratorShortcut(app,element,open){
 const root=element?.querySelector?element:element?.[0]??app?.element;
 const menu=root?.querySelector?.('[data-application-part="layers"], #scene-controls-layers, #scene-controls-controls');
 if(!menu||typeof open!=='function')return false;
 // Limpa apenas controles antigos deste módulo, caso a barra seja reaproveitada.
 root.querySelectorAll('[data-control="tagmar-personagens"]').forEach(node=>node.closest('li')?.remove());
 let own=menu.querySelector('[data-tg-generator-row]');
 if(!own){
  own=root.ownerDocument.createElement('li');
  own.dataset.tgGeneratorRow='';
  const button=root.ownerDocument.createElement('button');
  button.type='button';
  button.className='control ui-control icon button fa-solid fa-user-plus tg-generator-shortcut';
  button.dataset.tooltip='';
  button.dataset.tooltipDirection='RIGHT';
  button.setAttribute('aria-label','Tagmar — Gerar personagens, PNJs e criaturas');
  own.append(button);
 }
 const button=own.querySelector('button');
 // Atribuição substitui o callback anterior e evita duplicar cliques em rerenders.
 button.onclick=async event=>{
  event.preventDefault();event.stopPropagation();
  if(button.disabled)return;
  button.disabled=true;
  try{await open();}finally{button.disabled=false;}
 };
 if(menu.lastElementChild!==own)menu.append(own);
 return true;
}
