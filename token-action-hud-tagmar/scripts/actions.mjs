import {ATTRIBUTES, ROLLABLE_ITEMS, SUPPORTED_SYSTEMS, decode, escapeHTML} from './model.mjs';

const busy=new Set();
function requireActor(actor,context) {
  if(!SUPPORTED_SYSTEMS.includes(game.system.id))throw Error('Este módulo atende aos sistemas Tagmar XXX e Tagmar 3ER Oficial.');
  if(!actor?.isOwner || actor.compendium?.locked)throw Error('Você precisa controlar esta ficha para usar suas ações.');
  // Reject stale HUD buttons, or several casters: FX uses the controlled token.
  if(context.actorUuid!==actor.uuid)throw Error('A seleção mudou. Aguarde a barra atualizar e tente novamente.');
  const controlled=globalThis.canvas?.tokens?.controlled??[];
  if(controlled.length>1)throw Error('Selecione apenas um token para usar as ações do Tagmar.');
  if(controlled.length===1 && controlled[0].actor!==actor)throw Error('Selecione o token desta ficha antes de usar a ação.');
}
export async function promptResistance(actor,kind) {
  const label=kind==='rm'?'mágica (RM)':'física (RF)';
  return foundry.applications.api.DialogV2.wait({
    window:{title:`Resistência ${label} — ${actor.name}`},
    content:`<p>Teste de resistência ${label} de <strong>${escapeHTML(actor.name)}</strong>.</p><div class="form-group"><label>Força de Ataque (FA)</label><input name="force" type="number" value="1" step="1" min="1" required autofocus></div>`,
    buttons:[{action:'roll',label:'Rolar resistência',default:true,callback:(_event,button)=>{
      const input=button.form.elements.force;
      if(!input.reportValidity())throw Error('Informe uma Força de Ataque inteira, de pelo menos 1.');
      const value=Number(input.value);
      if(!Number.isInteger(value)||value<1)throw Error('Força de Ataque inválida.');
      return value;
    }},{action:'cancel',label:'Cancelar',callback:()=>null}],rejectClose:false
  });
}
const loadVehicle=()=>import(`/systems/${game.system.id}/modules/vehicles/actions.mjs`);
/** Delegate to Tagmar; do not duplicate damage, targets, spell timing or FX. */
export async function executeAction(actor,encoded,{rightClick=false,askResistance=promptResistance,vehicleModule=loadVehicle}={}) {
  const context=decode(encoded);
  if(!context)return false;
  requireActor(actor,context);
  const key=actor.uuid;
  if(busy.has(key))return false;
  busy.add(key);
  try {
    const {action,id}=context;
    if(action==='sheet')return actor.sheet.render(true);
    if(action==='item'||action==='inspect') {
      const item=actor.items.get(id);
      if(!item)throw Error('O item foi removido desta ficha. Aguarde a barra atualizar.');
      if(!item.isOwner)throw Error('Você não tem permissão para usar este item.');
      if(rightClick || action==='inspect')return item.sheet.render(true);
      if(!ROLLABLE_ITEMS.has(item.type)||typeof item.rollTagmarItem!=='function')throw Error('Este item não possui uma ação compatível. Abra sua ficha.');
      return await item.rollTagmarItem();
    }
    if(rightClick)return actor.sheet.render(true);
    if(action==='attribute' && ['Personagem','NPC'].includes(actor.type) && Object.hasOwn(ATTRIBUTES,id))return await actor._rollAtributo(id);
    if(action==='resistance' && ['Personagem','NPC'].includes(actor.type) && ['rm','rf'].includes(id)) {
      const force=await askResistance(actor,id);
      if(force==null || force===false)return false;
      requireActor(actor,context);
      if(!Number.isInteger(force)||force<1)throw Error('Força de Ataque inválida.');
      return await actor._rollResistencia(force,id==='rm'?'Magía':'Física');
    }
    if(action==='morale' && actor.type==='NPC')return await actor._rollMoral();
    if(action==='maneuver' && actor.type==='Veiculo') {
      const module=await vehicleModule();
      requireActor(actor,context);
      return await module.maneuverFromSheet(actor);
    }
    if(action==='troop' && actor.type==='Tropa' && ['attack','apparatus','morale'].includes(id)) {
      if(!game.user.isGM)throw Error('As ações de tropas são controladas pelo mestre.');
      if(typeof actor.sheet.action!=='function')throw Error('Abra a ficha de Tropa do sistema para usar esta ação.');
      return await actor.sheet.action(id);
    }
    throw Error('Ação indisponível para esta ficha.');
  } finally {busy.delete(key);}
}
