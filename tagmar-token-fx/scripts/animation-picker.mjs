let serial=0;
const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');

// Lista no próprio diálogo: não usa o popup datalist do Chromium/Electron.
export function bindAnimationPicker(root,catalog) {
  const picker=root.querySelector('[data-animation-picker]');
  const input=picker.querySelector('[name="jbFile"]'),list=picker.querySelector('[role="listbox"]');
  const toggle=picker.querySelector('[data-animation-toggle]'),status=picker.querySelector('[data-animation-count]');
  list.id=`tagmar-animation-list-${++serial}`;
  input.setAttribute('aria-controls',list.id);
  let rows=[],active=-1;
  function close(){list.hidden=true;status.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');}
  function highlight(index){
    if(!rows.length)return;
    active=Math.max(0,Math.min(rows.length-1,index));
    for(const [i,option] of Array.from(list.children).entries())option.setAttribute('aria-selected',String(i===active));
    const option=list.children[active];input.setAttribute('aria-activedescendant',option.id);
    option.scrollIntoView({block:'nearest'});
  }
  function choose(index){
    if(!rows[index])return;
    input.value=rows[index].value;input.setCustomValidity('');
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
    close();input.focus({preventScroll:true});
  }
  function open(filter=false){
    const terms=filter?normalize(input.value).trim().split(/\s+/).filter(Boolean):[];
    rows=catalog.filter(row=>terms.every(term=>normalize(`${row.value} ${row.path}`).includes(term)));
    const fragment=document.createDocumentFragment();
    for(const [index,row] of rows.entries()){
      const option=document.createElement('div');option.className='tagmar-animation-option';
      option.id=`${list.id}-${index}`;option.setAttribute('role','option');option.setAttribute('aria-selected','false');
      option.textContent=row.value;option.title=row.value;
      option.addEventListener('pointerdown',event=>event.preventDefault());
      option.addEventListener('click',()=>choose(index));fragment.append(option);
    }
    list.replaceChildren(fragment);list.hidden=false;status.hidden=false;
    status.textContent=rows.length?`${rows.length} animações — role a lista ou digite para filtrar.`:'Nenhuma animação encontrada. Tente outro nome.';
    input.setAttribute('aria-expanded','true');active=-1;
    const selected=rows.findIndex(row=>row.value===input.value||row.path===input.value);
    if(selected>=0)highlight(selected);else{list.scrollTop=0;input.removeAttribute('aria-activedescendant');}
  }
  input.addEventListener('input',()=>open(true));
  input.addEventListener('click',()=>{if(list.hidden)open(false);});
  toggle.addEventListener('pointerdown',event=>event.preventDefault());
  toggle.addEventListener('click',()=>{if(list.hidden){input.focus({preventScroll:true});open(false);}else close();});
  input.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!list.hidden){event.preventDefault();event.stopPropagation();close();return;}
    if(event.key==='Enter'&&!list.hidden){event.preventDefault();event.stopPropagation();if(active>=0)choose(active);return;}
    if(!['ArrowDown','ArrowUp','Home','End','PageDown','PageUp'].includes(event.key))return;
    if(list.hidden&&!['ArrowDown','ArrowUp'].includes(event.key))return;
    event.preventDefault();event.stopPropagation();if(list.hidden)open(false);
    const next={ArrowDown:active+1,ArrowUp:active<0?rows.length-1:active-1,Home:0,End:rows.length-1,PageDown:active+8,PageUp:active-8};
    highlight(next[event.key]);
  });
  // Fechar em pointerdown/focusout desloca os botões do formulário antes do
  // mouseup e pode engolir o clique em Salvar/Testar. Fechar só após o clique.
  root.addEventListener('click',event=>{if(!picker.contains(event.target))close();});
  picker.addEventListener('keydown',event=>{if(event.key==='Tab')close();});
  close();
}
