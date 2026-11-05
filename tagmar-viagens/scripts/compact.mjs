// SPDX-License-Identifier: GPL-3.0-or-later
import * as E from './engine.mjs';
import {compactPosition,compactGeometry} from './compact-position.mjs';
const MODULE_ID='tagmar-viagens';
export function makeCompactApp({readState,canEdit,clock,act}){
  const {ApplicationV2,HandlebarsApplicationMixin}=foundry.applications.api;
  return class TravelCompact extends HandlebarsApplicationMixin(ApplicationV2){
    static DEFAULT_OPTIONS={id:'tagmar-viagens-compact',tag:'section',classes:['tagmar-travel','tagmar-travel-compact'],position:{width:400,height:300,left:80,top:100},window:{title:'Acompanhamento da viagem',icon:'fa-solid fa-route',resizable:false},actions:{do:TravelCompact.dispatch}};
    static PARTS={main:{template:'modules/tagmar-viagens/templates/compact.hbs'}};
    selected=null;
    #position=null;
    #dragging=false;
    #refreshPending=false;
    #dragCleanup=null;
    #fitViewport=()=>{if(this.element?.isConnected)this.#applyPosition();};
    async render(options={}){
      // A world-time tick must not replace a drag or resize handle mid-gesture.
      if(this.#dragging){this.#refreshPending=true;return this;}
      return super.render(options);
    }
    _canRender(options){if(!game.user.isGM)return false;return super._canRender(options);}
    async _prepareContext(options){
      const base=await super._prepareContext(options),state=readState();clock.reconcile(state,clock.now(game));const t=state.trips.find(t=>t.id===this.selected);
      if(!t)return {...base,missing:true};const linked=clock.display(state,t,clock.now(game)),sum=E.totals(t),stage=E.currentStage(t),est=E.estimate(t);
      return {...base,linked:linked.linked,beforeLink:linked.beforeLink,current:linked.current,clockAvailable:clock.available(game),canRewind:linked.linked&&canEdit(),id:t.id,name:t.name,phase:t.paused?'Pausada':stage.label,leg:stage.index?`${stage.index}. ${stage.name}`:'',done:E.formatNumber(sum.done),total:E.formatNumber(sum.distance),remaining:E.formatNumber(sum.remaining),percent:sum.distance?sum.done/sum.distance*100:stage.finished?100:0,eta:linked.linked?linked.eta:E.arrival(t,est.arrival),paused:t.paused,editable:canEdit(),canAdvance:canEdit()&&(linked.linked||!t.paused&&!stage.finished&&t.segments.length>0),canUndo:canEdit()&&!linked.linked&&t.history.length>0};
    }
    _onRender(context,options){
      super._onRender(context,options);
      if(!this.#position){
        const calendar=this.element.ownerDocument.querySelector('.tagmar-calendar .calendar-shell');
        this.#position=compactPosition(game.settings.get(MODULE_ID,'compactPosition'),calendar?.getBoundingClientRect().width||400);
      }
      this.#applyPosition();
      window.addEventListener('resize',this.#fitViewport);
      this.element.querySelector('.tv-mini-drag')?.addEventListener('pointerdown',event=>this.#startPointer(event,false));
      this.element.querySelector('.tv-mini-resize')?.addEventListener('pointerdown',event=>this.#startPointer(event,true));
    }
    #applyPosition(){
      const shell=this.element.querySelector('.tv-mini-shell');if(!shell)return;
      const geometry=compactGeometry({position:this.#position,viewportWidth:window.innerWidth,viewportHeight:window.innerHeight,height:shell.offsetHeight});
      shell.style.setProperty('--tv-hud-scale',String(geometry.scale));
      const {scale,...position}=geometry;this.setPosition(position);
    }
    #startPointer(event,resizing){
      if(event.button!==0)return;
      event.preventDefault();event.stopPropagation();this.bringToFront();
      this.#dragCleanup?.();this.#dragging=true;
      const handle=event.currentTarget,pointer=event.pointerId,start=this.element.getBoundingClientRect(),preference={...this.#position},x=event.clientX,y=event.clientY;
      handle.setPointerCapture(pointer);
      const move=next=>{
        if(next.pointerId!==pointer)return;
        this.#position=resizing?compactPosition({...preference,width:start.width+next.clientX-x}):{...preference,left:start.left+next.clientX-x,top:start.top+next.clientY-y};
        this.#applyPosition();
      };
      const cleanup=()=>{
        handle.removeEventListener('pointermove',move);
        handle.removeEventListener('pointerup',finish);
        handle.removeEventListener('pointercancel',finish);
        if(handle.hasPointerCapture(pointer))handle.releasePointerCapture(pointer);
        this.#dragCleanup=null;this.#dragging=false;
      };
      const finish=async next=>{
        if(next.pointerId!==pointer)return;
        // Capture the final pointer position even when no last move event fired.
        if(next.type!=='pointercancel')move(next);
        const rect=this.element.getBoundingClientRect();
        this.#position={...this.#position,left:Math.round(rect.left),top:Math.round(rect.top)};
        cleanup();
        try{await game.settings.set(MODULE_ID,'compactPosition',this.#position);}
        catch(error){console.error('Tagmar Viagens | Posição do acompanhamento',error);ui.notifications.warn('Não foi possível salvar a posição do acompanhamento.');}
        if(this.#refreshPending&&this.rendered){this.#refreshPending=false;await this.render({force:true});}
      };
      this.#dragCleanup=cleanup;
      handle.addEventListener('pointermove',move);
      handle.addEventListener('pointerup',finish);
      handle.addEventListener('pointercancel',finish);
    }
    _onClose(options){
      this.#dragCleanup?.();this.#refreshPending=false;
      window.removeEventListener('resize',this.#fitViewport);
      super._onClose(options);
    }
    static async dispatch(_event,button){
      if(button.dataset.command==='close'){
        await act('close',this.selected);
        return this.close();
      }
      return act(button.dataset.command,this.selected,button.dataset.value);
    }
  };
}
