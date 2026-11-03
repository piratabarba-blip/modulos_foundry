import {resolveForm} from './transformation.mjs';
import {resolveSummonForm,approvedSummons,summonState} from './summoning.mjs';
import {summonEntries,MAX_SUMMONS} from './cast-rules.mjs';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
export function transformationFields(c){
  return `<details class="tagmar-fx-section" data-cast-section="transformation" ${(c.transform||c.summon)?'open':''}><summary>Transformação em criatura / PNJ</summary>
    <label class="tagmar-fx-auto"><input name="cast_transform" type="checkbox" ${c.transform?'checked':''}>Transformar quem receber o efeito</label>
    <div data-form-settings ${c.transform?'':'hidden'}>
      <label>Transformar quem?<select data-cast-destination>${[['self','Próprio personagem'],['targets','Alvos marcados'],['area','Área']].map(([value,label])=>`<option value="${value}" ${(['self','targets'].includes(c.shape)?c.shape:'area')===value?'selected':''}>${label}</option>`).join('')}</select></label>
      <label>Procurar criatura no mundo<input type="search" data-form-search placeholder="Digite o nome da criatura…" autocomplete="off"></label>
      <select data-form-list size="5" aria-label="Criaturas para transformação" style="width:100%;height:auto;max-height:160px;overflow-y:auto"></select>
      <p class="hint" data-form-selected>Criatura escolhida: ${escape(c.formName||'nenhuma')}</p>
      <input type="hidden" name="cast_formUuid" value="${escape(c.formUuid)}">
      <input type="hidden" name="cast_formName" value="${escape(c.formName)}">
      <div data-form-drop style="border:1px dashed currentColor;padding:8px;margin:6px 0">Ou arraste aqui uma criatura / PNJ do mundo ou de um compêndio.</div>
      <div data-summon-settings ${c.summon?'':'hidden'}>
        <button type="button" data-add-summon>+ Adicionar criatura escolhida</button>
        <input type="hidden" name="cast_summons" value="${escape(JSON.stringify(summonEntries(c)))}">
        <div data-summon-rows></div>
        <label>Atraso para aparecer (rodadas)
          <input type="number" name="cast_summonDelay" min="0" max="10000" step="1" value="${c.summonDelay??0}"></label>
        <p class="hint">Adicione fichas diferentes ou aumente a quantidade da mesma criatura. Replicar: quantidade 3. Até ${MAX_SUMMONS} criaturas por uso. Você escolhe o ponto de cada cópia; Esc cancela o conjunto antes de enviar.</p>
      </div>
      <p class="hint" data-form-rules>Usa a ficha e a EF atual da criatura escolhida. A ficha original é preservada.</p>
    </div>
  </details>`;
}
export function bindTransformationPicker(root){
  const list=root.querySelector('[data-form-list]'),search=root.querySelector('[data-form-search]');
  const actors=Array.from(game.actors?.contents??game.actors??[]).filter(a=>a.type==='NPC'&&(game.user.isGM||a.testUserPermission(game.user,'OBSERVER')));
  const chosen=root.querySelector('[name="cast_formUuid"]');
  const rowsField=root.querySelector('[name="cast_summons"]'),rowsBox=root.querySelector('[data-summon-rows]');
  let entries=JSON.parse(rowsField.value||'[]');
  const sync=()=>{rowsField.value=JSON.stringify(entries);rowsField.dispatchEvent(new Event('change',{bubbles:true}));};
  const renderRows=()=>{
    rowsBox.innerHTML=entries.map((e,i)=>`<div data-summon-row="${i}" style="display:flex;gap:6px;align-items:center;margin:6px 0"><span style="flex:1;min-width:0">${escape(e.formName||'Criatura')}</span><label style="display:flex;gap:4px;align-items:center">Qtd.<input type="number" data-summon-quantity="${i}" value="${e.quantity}" min="1" max="${MAX_SUMMONS}" step="1" aria-label="Quantidade de ${escape(e.formName)}" style="width:58px"></label><button type="button" data-remove-summon="${i}" title="Retirar esta criatura da lista" style="flex:0">×</button></div>`).join('')||'<p class="hint">Escolha uma criatura acima e adicione à lista.</p>';
  };
  root.querySelector('[data-add-summon]').addEventListener('click',async event=>{
    event.preventDefault();
    try{
      const actor=await resolveSummonForm(chosen.value,game.user);
      if(entries.reduce((n,e)=>n+Number(e.quantity),0)>=MAX_SUMMONS)throw Error(`Limite de ${MAX_SUMMONS} criaturas por uso.`);
      const same=entries.find(e=>e.formUuid===actor.uuid);
      if(same)same.quantity=Number(same.quantity)+1;else entries.push({formUuid:actor.uuid,formName:actor.name,quantity:1});
      renderRows();sync();
    }catch(error){ui.notifications.warn(error.message);}
  });
  rowsBox.addEventListener('input',event=>{const field=event.target.closest('[data-summon-quantity]');if(field){entries[Number(field.dataset.summonQuantity)].quantity=Number(field.value);sync();}});
  rowsBox.addEventListener('click',event=>{const button=event.target.closest('[data-remove-summon]');if(button){event.preventDefault();entries.splice(Number(button.dataset.removeSummon),1);renderRows();sync();}});
  renderRows();
  const fill=()=>{
    const terms=normalize(search.value).split(/\s+/).filter(Boolean);
    const summon=root.querySelector('[name="cast_useType"]').value==='summon';
    const rows=actors.filter(a=>terms.every(t=>normalize(a.name).includes(t))&&(!summon||(!summonState(a)&&(game.user.isGM||approvedSummons().includes(a.uuid))))).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    list.replaceChildren();
    for(const actor of rows){const option=document.createElement('option');option.value=actor.uuid;option.textContent=actor.name;list.append(option);}
    list.value=chosen.value;
  };
  let selection=0;
  const choose=async uuid=>{
    const current=++selection;
    try{
      const actor=await (root.querySelector('[name="cast_useType"]').value==='summon'?resolveSummonForm:resolveForm)(uuid,game.user);
      if(current!==selection)return;
      chosen.value=actor.uuid;root.querySelector('[name="cast_formName"]').value=actor.name;
      root.querySelector('[data-form-selected]').textContent=`Criatura escolhida: ${actor.name}`;
      list.value=actor.uuid;
    }catch(error){ui.notifications.warn(error.message);}
  };
  list.addEventListener('change',()=>choose(list.value));search.addEventListener('input',fill);
  root.querySelector('[name="cast_useType"]').addEventListener('change',fill);
  const drop=root.querySelector('[data-form-drop]');
  drop.addEventListener('dragover',event=>event.preventDefault());
  drop.addEventListener('drop',event=>{
    event.preventDefault();event.stopPropagation();
    try{const data=JSON.parse(event.dataTransfer.getData('text/plain'));if(data.type!=='Actor'||typeof data.uuid!=='string')throw Error('Arraste uma ficha de criatura / PNJ.');void choose(data.uuid);}
    catch(error){ui.notifications.warn(error.message);}
  });
  fill();
}
