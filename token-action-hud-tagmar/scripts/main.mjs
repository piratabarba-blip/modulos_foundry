import {MODULE_ID, SUPPORTED_SYSTEMS} from './model.mjs';
import {createIntegration} from './integration.mjs';

// The Core exposes its classes at ready. Register synchronously in this hook,
// independent of the alphabetical module loading order.
Hooks.once('tokenActionHudCoreApiReady',core=>{
  if(!SUPPORTED_SYSTEMS.includes(game.system.id))return;
  if(game.modules.get('token-action-hud')?.active) {
    ui.notifications.warn('Desative o Token Action HUD Classic antigo. Use Token Action HUD Core e Token Action HUD Tagmar.');
    return;
  }
  const module=game.modules.get(MODULE_ID);
  if(!module || !core.api?.SystemManager)return;
  module.api={requiredCoreModuleVersion:'2.1',SystemManager:createIntegration(core.api)};
  Hooks.callAll('tokenActionHudSystemReady',module);
});
