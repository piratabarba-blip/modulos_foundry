import {penaltyTotal} from './resistance-penalties.mjs';
const signed=n=>n<0?'−'+Math.abs(n):n>0?'+'+n:'0';
function adjustmentFields(field,kind){
  let group=field.closest('[data-tagmar-adjustment]');if(group)return group;
  const cell=field.parentElement,row=field.closest('.row.dados');
  const oldLabel=cell.previousElementSibling;
  if(row&&oldLabel&&/Bônus\s*\/\s*Penalidade/i.test(oldLabel.textContent)&&!oldLabel.querySelector('input,select'))oldLabel.remove();
  group=document.createElement('div');group.dataset.tagmarAdjustment=kind;group.className='tagmar-fx-adjustments';
  field.insertAdjacentElement('beforebegin',group);
  for(const [key,text] of [['manual','Bônus/Penalidade:'],['effect','Efeito:'],['total','Total:']]){
    const label=document.createElement('label');label.className='mediaeval';
    const caption=document.createElement('span');caption.textContent=text;label.append(caption);
    const input=key==='manual'?field:document.createElement('input');
    if(key!=='manual'){
      input.type='number';input.readOnly=true;input.tabIndex=-1;input.className=field.className;
      input.dataset.adjustmentOutput=key;input.setAttribute('aria-label',`${text} ${kind==='combat'?'combate':'habilidades'}`);
    }
    label.append(input);group.append(label);
  }
  if(row){row.classList.add('tagmar-fx-adjustment-row');cell.classList.add('tagmar-fx-adjustments-cell');}
  if(globalThis.getComputedStyle){
    const style=getComputedStyle(field);
    for(const output of group.querySelectorAll('[data-adjustment-output]'))for(const key of ['backgroundColor','color','borderTop','borderRight','borderBottom','borderLeft','borderRadius','fontFamily','fontSize','fontWeight'])output.style[key]=style[key];
  }
  return group;
}
export function renderSheetAdjustments(actor,root){
  for(const [kind,name] of [['skill','system.bonus_habil'],['combat','system.inf_ataque.bonus']]){
    const field=root.querySelector(`input[name="${name}"]`);if(!field)continue;
    const active=Array.from(actor.effects??[]).filter(e=>!e.disabled&&!e.isSuppressed&&(e.changes??[]).some(c=>
      c.key===(kind==='combat'?'system.tagmarFxCombatAdjustment':'system.tagmarFxSkillAdjustment')||
      c.key===(kind==='combat'?'system.tagmarFxCombatPenalty':'system.tagmarFxSkillPenalty')));
    const group=adjustmentFields(field,kind);
    const modifier=-penaltyTotal(actor,kind),manual=Number(field.value)||0;
    const effect=group.querySelector('[data-adjustment-output="effect"]'),total=group.querySelector('[data-adjustment-output="total"]');
    effect.value=String(modifier||0);total.value=String(manual+modifier||0);
    effect.title=active.length?`Ajuste temporário nas rolagens: ${signed(modifier)}. Origem: ${active.map(e=>e.name??'Efeito').join('; ')}.`:'Nenhum ajuste temporário ativo.';
    total.title=`Bônus/Penalidade manual (${manual}) + Efeito (${signed(modifier)}). Total usado nas rolagens.`;
    if(!field.dataset.tagmarAdjustmentBound){field.dataset.tagmarAdjustmentBound='true';
      field.addEventListener('input',()=>renderSheetAdjustments(actor,root));}
  }
}
