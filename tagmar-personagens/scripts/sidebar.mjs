// SPDX-License-Identifier: GPL-3.0-or-later
// Posiciona nosso botão ao final do grupo de atalhos do Tagmar.
// Move o nó existente: não cria cópias nem troca callbacks ou ferramentas ativas.
export function positionGeneratorShortcut(app,element){
 const root=element?.querySelector?element:element?.[0]??app?.element;
 const menu=root?.querySelector?.('[data-application-part="layers"], #scene-controls-layers, #scene-controls-controls');
 if(!menu)return false;
 const own=menu.querySelector('[data-control="tagmar-personagens"]')?.closest('li');
 if(!own||own.parentElement!==menu)return false;
 const button=own.querySelector('[data-control="tagmar-personagens"]');
 button.classList.add('button','tg-generator-shortcut');
 button.dataset.tooltipDirection='RIGHT';
 const shortcuts=[...menu.querySelectorAll('[data-tagmar-shortcut-row]')].filter(row=>row.parentElement===menu);
 const anchor=shortcuts.at(-1)??menu.querySelector('[data-control="sequencer"]')?.closest('li');
 if(!anchor||anchor.parentElement!==menu)return false;
 if(anchor.nextElementSibling!==own)anchor.after(own);
 return true;
}
