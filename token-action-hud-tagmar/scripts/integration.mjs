import {MODULE_ID, actorActions, defaults} from './model.mjs';
import {executeAction} from './actions.mjs';

export function createIntegration(api) {
  class TagmarActionHandler extends api.ActionHandler {
    async buildSystemActions() {
      if(!this.actor)return;
      const actions=actorActions(this.actor,{
        getImage:doc=>api.Utils.getImage(doc),
        hideUntrained:game.settings.get(MODULE_ID,'hideUntrained'),isGM:game.user.isGM
      });
      for(const [id,rows] of actions)this.addActions(rows,{id,type:'system'});
    }
  }
  class TagmarRollHandler extends api.RollHandler {
    async handleActionClick(event,value) {
      try {
        return await executeAction(this.actor,value,{rightClick:this.isRightClick||event?.button===2||event?.type==='contextmenu'});
      } catch(error) {
        console.error('Token Action HUD Tagmar |',error);
        ui.notifications.warn(error.message||'Não foi possível executar esta ação.');
        return false;
      } finally {Hooks.callAll('forceUpdateTokenActionHud');}
    }
  }
  return class TagmarSystemManager extends api.SystemManager {
    getActionHandler(){return new TagmarActionHandler();}
    getRollHandler(){return new TagmarRollHandler();}
    getAvailableRollHandlers(){return {core:'Tagmar — ações da ficha'};}
    async registerDefaults(){return defaults();}
    registerSettings(onChange) {
      game.settings.register(MODULE_ID,'hideUntrained',{
        name:'Ocultar habilidades e técnicas sem nível',
        hint:'Desativado: mostra também os testes sem treinamento. Técnicas ambientais continuam disponíveis.',
        scope:'client',config:true,type:Boolean,default:false,onChange
      });
    }
  };
}
