import {MODULE_ID} from './core.mjs';
import {targetName} from './chat-targets.mjs';

// Reutiliza o cartão do sistema sem rolar novamente nem gastar munição por alvo.
export async function attackToChat(item,token,roll,result,{whisper,damageApplied=false,requestId}={}) {
  const esc=value=>foundry.utils.escapeHTML(String(value));
  const status=result.critical?'Crítico: consulte a resolução a seguir e aplique o resultado pelas ações deste cartão.'
    :damageApplied?'Dano já aplicado automaticamente a este alvo.':'Nenhum dano aplicado a este alvo.';
  const target=`<p class="mediaeval"><strong>Alvo: ${targetName(token.name,token.document?.uuid)}</strong></p>`;
  let criticalMessage;
  const criticalToChat=async(column,table,user,actor,type,failure)=>{
    if(typeof game.tagmar.rolarCritico!=='function')throw Error('Atualize o sistema para a resolução de crítico por alvo.');
    criticalMessage=await game.tagmar.rolarCritico(column,table,user,actor,type==='MAG'?'':type,failure,{
      targetHtml:target,whisper,flags:{[MODULE_ID]:{attackTarget:token.actor.uuid,attackToken:token.document?.uuid,requestId,criticalResolution:true}}
    });
  };
  const notice=`<p class="mediaeval tagmar-fx-damage-status">${status}</p>`;
  const method=result.total>20?'combateToChatPlus':'combateToChat';
  if(item.type==='Combate'&&typeof item[method]==='function') {
    const nativeButtons=item._chatActionButtons.bind(item);
    const context=new Proxy(item,{get(object,key){
      if(key==='_tagmarCriticalToChat')return criticalToChat;
      if(key==='_chatActionButtons')return (...args)=>{
        const {button='',buttonC=''}=nativeButtons(...args);
        if(!button&&!buttonC)return {button:notice,buttonC:''};
        return {button:`${notice}<details${result.critical?' open':''}><summary>${result.critical?'Aplicar resultado do crítico':'Ações manuais do cartão'}</summary><p>Usam os tokens selecionados no mapa. Confira o alvo antes de aplicar. ${damageApplied?'O dano acima já foi aplicado; aplicar novamente repetirá o dano.':''}</p>${button}${buttonC}</details>`,buttonC:''};
      };
      return Reflect.get(object,key,object);
    }});
    const wrappedRoll=new Proxy(roll,{get(object,key){
      if(key==='toMessage')return data=>roll.toMessage({...data,whisper,
        flavor:`${target}${data.flavor??''}`,
        flags:{...data.flags,[MODULE_ID]:{attackTarget:token.actor.uuid,requestId,damageApplied}}});
      const value=Reflect.get(object,key,object);return typeof value==='function'?value.bind(object):value;
    }});
    const p=item.system.penalidade??{};
    const args=[result.column,result.color,p.p25,p.p50,p.p75,p.p100,wrappedRoll,'',result.total];
    if(result.total>20)args.push(Math.trunc((result.total-result.column)/20)*50);
    await item[method].apply(context,args);
    return {criticalMessageId:criticalMessage?.id};
  }
  // Itens sem cartão de Combate mantêm os mesmos elementos visuais.
  const colors={verde:['#91cf50','white','Verde'],branco:['white','black','Branco'],amarelo:['#ffff00','black','Amarelo'],laranja:['#ff9900','white','Laranja'],vermelho:['#ff0000','white','Vermelho'],azul:['#00a1e8','white','Azul'],roxo:['#0000ff','white','Azul Escuro'],cinza:['#bfbfbf','black','Cinza']};
  const [bg,fg,label]=colors[result.color];
  await roll.toMessage({speaker:ChatMessage.getSpeaker({actor:item.actor}),whisper,
    flavor:`${target}<img src="${esc(item.img||'icons/svg/aura.svg')}" style="display:block;margin:auto"><h2 class="mediaeval rola" style="text-align:center">${esc(item.name)}</h2><h4 class="mediaeval rola">Coluna: ${result.column}</h4><h1 class="mediaeval rola" style="background:${bg};color:${fg};text-align:center">${label} - ${result.critical?'Crítico':`${result.percent}%`}</h1><h2 class="mediaeval rola rola_dano" style="text-align:center">Dano: ${result.damage}</h2>${notice}`});
  if(result.critical)await criticalToChat(result.column,game.tagmar.tabela_resol,game.user,item.actor,'',result.color==='verde');
  return {criticalMessageId:criticalMessage?.id};
}
