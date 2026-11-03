// ActiveEffects derivados: nunca grava por cima dos bônus manuais da ficha.
import {adjustmentFor} from './cast-rules.mjs';
export function penaltyChanges(config,active=true) {
  if(!active)return [];
  return [['system.tagmarFxCombatAdjustment',adjustmentFor(config,'combat')],['system.tagmarFxSkillAdjustment',adjustmentFor(config,'skill')]]
    .filter(([,value])=>value!==0)
    .map(([key,value])=>({key,mode:2,value:String(value),priority:20}));
}
export function penaltyTotal(actor,kind){
  const key=kind==='combat'?'system.tagmarFxCombatPenalty':'system.tagmarFxSkillPenalty';
  const adjustment=kind==='combat'?'system.tagmarFxCombatAdjustment':'system.tagmarFxSkillAdjustment';
  return Array.from(actor?.effects??[]).filter(e=>!e.disabled&&!e.isSuppressed)
    .flatMap(e=>e.changes??[]).filter(c=>c.key===key||c.key===adjustment)
    .reduce((total,c)=>total+(c.key===key?Math.max(0,Math.min(100,Number(c.value)||0)):-Math.max(-100,Math.min(100,Number(c.value)||0))),0);
}
