// SPDX-License-Identifier: GPL-3.0-or-later
import * as E from './engine.mjs';
import {compactPosition,compactGeometry} from './compact-position.mjs';
import {bindMap,updateMapProgress} from './map-ui.mjs';
import {readMapViews,findMapView,rememberMapView,captureMapView,restoreMapView} from './map-viewport.mjs';
const MODULE_ID='tagmar-viagens';
export function makeCompactApp({readState,canEdit,clock,act}){
  const {ApplicationV2,HandlebarsApplicationMixin}=foundry.applications.api;
  return class TravelCompact extends HandlebarsApplicationMixin(ApplicationV2){
    static DEFAULT_OPTIONS={id:'tagmar-viagens-compact',tag:'section',classes:['tagmar-travel','tagmar-travel-compact'],position:{width:400,height:300,left:80,top:100},window:{title:'Acompanhamento da viagem',icon:'fa-solid fa-route',resizable:false},actions:{do:TravelCompact.dispatch}};
    static PARTS={main:{template:'modules/tagmar-viagens/templates/compact.hbs'}};
    selected=null;
    zoom=1;maxMapZoom=24;viewportMap=true;mapDraft=null;mapPanning=false;
    #mapOpen=null;
    #mapViews=null;
    #mapSaveTimer=null;
    #mapSaveTask=Promise.resolve();
    #contextKey=null;
    #position=null;
    #dragging=false;
    #refreshPending=false;
    #dragCleanup=null;
    #fitViewport=()=>{if(this.element?.isConnected)this.#applyPosition();};
    async render(options={}){
      if(!game.user.isGM)return this;
      // A world-time tick must not replace a drag or resize handle mid-gesture.
      if(this.#dragging){this.#refreshPending=true;return this;}
      if(this.rendered&&this.#contextKey){
        const context=await this._prepareContext(options);
        if(this.#key(context)===this.#contextKey){this.#updateLive(context);return this;}
        if(this.mapPanning){this.#refreshPending=true;return this;}
      }
      this.rememberMapViewport();
      return super.render(options);
    }
    #key(context){return JSON.stringify([context.id,context.missing,context.hasMap,context.mapOpen,context.linked,context.beforeLink,context.clockAvailable,context.canRewind,context.editable,context.canAdvance,context.canUndo,context.paused,context.mapTrip?.map,context.mapTrip?.segments.map(s=>[s.id,s.name,s.type,s.path])]);}
    #updateLive(context){
      const text=(selector,value)=>{const el=this.element.querySelector(selector);if(el&&el.textContent!==value)el.textContent=value;};
      text('.tv-mini-name',context.name);text('.tv-mini-phase span',context.phase);text('.tv-mini-phase small',context.leg);
      text('.tv-mini-distance b',`${context.done} / ${context.total} km`);text('.tv-mini-distance>span',`Faltam ${context.remaining} km`);
      text('.tv-mini-eta',`Chegada: ${context.eta}`);text('.tv-mini-clock',`📅 ${context.current}`);
      const progress=this.element.querySelector('progress');if(progress&&progress.value!==context.percent)progress.value=context.percent;
      if(context.mapOpen)updateMapProgress(this,context.mapTrip);
    }
    mapViewFor(trip){return findMapView(this.#mapViews??[],trip);}
    rememberMapViewport(){
      const view=captureMapView(this.element,this.maxMapZoom);if(!view)return;
      const next=rememberMapView(this.#mapViews??[],view,this.maxMapZoom);if(next===this.#mapViews)return;
      this.#mapViews=next;clearTimeout(this.#mapSaveTimer);this.#mapSaveTimer=setTimeout(()=>this.#flushMapViews(),200);
      if(this.#refreshPending&&!this.mapPanning&&!this.#dragging){this.#refreshPending=false;queueMicrotask(()=>this.render({force:true}));}
    }
    #flushMapViews(){
      clearTimeout(this.#mapSaveTimer);this.#mapSaveTimer=null;
      const value={schema:1,views:E.clone(this.#mapViews??[])};
      this.#mapSaveTask=this.#mapSaveTask.then(()=>game.settings.set(MODULE_ID,'compactMapViewports',value)).catch(error=>console.error('Tagmar Viagens | Enquadramento do minimapa',error));return this.#mapSaveTask;
    }
    _canRender(options){if(!game.user.isGM)return false;return super._canRender(options);}
    async _prepareContext(options){
      this.#mapOpen??=game.settings.get(MODULE_ID,'compactMapOpen')===true;
      this.#mapViews??=readMapViews(game.settings.get(MODULE_ID,'compactMapViewports'),this.maxMapZoom);
      const base=await super._prepareContext(options),state=readState();clock.reconcile(state,clock.now(game));const t=state.trips.find(t=>t.id===this.selected);
      if(!t)return {...base,missing:true};const linked=clock.display(state,t,clock.now(game)),sum=E.totals(t),stage=E.currentStage(t),est=E.estimate(t);
      return {...base,hasMap:!!t.map,mapOpen:!!t.map&&this.#mapOpen,mapTrip:t,linked:linked.linked,beforeLink:linked.beforeLink,current:linked.current,clockAvailable:clock.available(game),canRewind:linked.linked&&canEdit(),id:t.id,name:t.name,phase:t.paused?'Pausada':stage.label,leg:stage.index?`${stage.index}. ${stage.name}`:'',done:E.formatNumber(sum.done),total:E.formatNumber(sum.distance),remaining:E.formatNumber(sum.remaining),percent:sum.distance?sum.done/sum.distance*100:stage.finished?100:0,eta:linked.linked?linked.eta:E.arrival(t,est.arrival),paused:t.paused,editable:canEdit(),canAdvance:canEdit()&&(linked.linked||!t.paused&&!stage.finished&&t.segments.length>0),canUndo:canEdit()&&!linked.linked&&t.history.length>0};
    }
    _onRender(context,options){
      super._onRender(context,options);
      this.#contextKey=this.#key(context);
      if(!this.#position){
        const calendar=this.element.ownerDocument.querySelector('.tagmar-calendar .calendar-shell');
        this.#position=compactPosition(game.settings.get(MODULE_ID,'compactPosition'),calendar?.getBoundingClientRect().width||400);
      }
      this.zoom=this.mapViewFor(context.mapTrip)?.zoom??1;
      this.#applyPosition();
      if(context.mapOpen){bindMap(this,context.mapTrip,false,{readOnly:true});this.element.querySelector('[data-map-host]')?.addEventListener('scroll',()=>this.rememberMapViewport(),{passive:true});}
      window.addEventListener('resize',this.#fitViewport);
      this.element.querySelector('.tv-mini-drag')?.addEventListener('pointerdown',event=>this.#startPointer(event,false));
      this.element.querySelector('.tv-mini-resize')?.addEventListener('pointerdown',event=>this.#startPointer(event,true));
    }
    #applyPosition(){
      const shell=this.element.querySelector('.tv-mini-shell');if(!shell)return;
      const geometry=compactGeometry({position:this.#position,viewportWidth:window.innerWidth,viewportHeight:window.innerHeight,height:shell.offsetHeight});
      shell.style.setProperty('--tv-hud-scale',String(geometry.scale));
      // Preserve legacy top positions on first opening, then anchor by the base.
      this.#position.bottom??=geometry.top+geometry.height;
      this.element.style.setProperty('bottom','auto','important');
      const {scale,...position}=geometry;this.setPosition({...position,scale:1});
    }
    #startPointer(event,resizing){
      if(event.button!==0)return;
      event.preventDefault();event.stopPropagation();this.bringToFront();
      this.#dragCleanup?.();this.#dragging=true;
      const handle=event.currentTarget,pointer=event.pointerId,start=this.element.getBoundingClientRect(),preference={...this.#position},x=event.clientX,y=event.clientY;
      handle.setPointerCapture(pointer);
      const move=next=>{
        if(next.pointerId!==pointer)return;
        this.#position=resizing?compactPosition({...preference,bottom:start.bottom,width:start.width+next.clientX-x}):{...preference,left:start.left+next.clientX-x,top:start.top+next.clientY-y,bottom:start.bottom+next.clientY-y};
        this.#applyPosition();
        const host=this.element.querySelector('[data-map-host]');if(host)restoreMapView(this.element,host,this.mapViewFor({id:host.dataset.tripId,map:{src:host.dataset.mapSrc,width:Number(host.dataset.mapWidth),height:Number(host.dataset.mapHeight)}}));
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
        this.#position={...this.#position,left:Math.round(rect.left),top:Math.round(rect.top),bottom:Math.round(rect.bottom)};
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
      this.rememberMapViewport();if(this.#mapSaveTimer)this.#flushMapViews();this.#contextKey=null;
      this.#dragCleanup?.();this.#refreshPending=false;
      window.removeEventListener('resize',this.#fitViewport);
      super._onClose(options);
    }
    static async dispatch(_event,button){
      if(button.dataset.command==='toggleMap'){
        this.rememberMapViewport();if(this.#mapSaveTimer)await this.#flushMapViews();
        const rect=this.element.getBoundingClientRect();this.#position={...this.#position,bottom:rect.bottom};
        await game.settings.set(MODULE_ID,'compactPosition',this.#position);
        this.#mapOpen=!this.#mapOpen;await game.settings.set(MODULE_ID,'compactMapOpen',this.#mapOpen);
        return this.render({force:true});
      }
      if(button.dataset.command==='close'){
        await act('close',this.selected);
        return this.close();
      }
      return act(button.dataset.command,this.selected,button.dataset.value);
    }
  };
}
