// SPDX-License-Identifier: GPL-3.0-or-later
import * as E from "./engine.mjs";
import * as C from "./clock.mjs";
import * as M from "./map-model.mjs";
import * as L from "./map-library.mjs";
import {bindMap,loadMapImage,updateMapProgress} from "./map-ui.mjs";
import {readMapViews,findMapView,rememberMapView,captureMapView} from './map-viewport.mjs';
import {sceneSource,sceneMap} from "./scene-map.mjs";
import {makeCompactApp} from "./compact.mjs";
export const MODULE_ID="tagmar-viagens";
const HELP={
  distance:{title:"Distância do trecho",text:"Digite quantos quilômetros serão percorridos com este transporte. Exemplo: 250 km a pé + 1.000 km de carroça = dois trechos, somando 1.250 km. A distância total é a soma dos trechos. Depois de iniciar este trecho, sua distância fica fixa; duplique a viagem para mudar o roteiro."},
  profile:{title:"Transportes salvos",text:"Escolha um transporte na lista para consultar ou editar seus atributos. Criar transporte abre uma ficha sem gravar: escolha o tipo, informe nome, VB ou velocidade média e jornada, e clique em Salvar transporte. Cancelar descarta só a criação ainda não salva. Excluir retira o transporte escolhido da lista após confirmação; os trechos de viagens existentes mantêm suas próprias cópias. Os quatro modelos iniciais ficam na mesma lista. A distância é calculada pelos caminhos na aba Mapa ou pode ser informada manualmente em Planejamento."},
  unit:{title:"VB ou velocidade média",text:"Em VB, informe o valor escolhido pelo mestre para o grupo ou os animais (por exemplo, a menor VB). A conversão é VB × 0,24 km/h. Em média em km/h, informe diretamente a velocidade de viagem. Não há leitura automática das fichas."},
  speed:{title:"Velocidade base",text:"Exemplo: VB 20 equivale a 4,8 km/h antes dos fatores. Para uma embarcação, você pode escolher média em km/h e informar 8. Ajuste para uma velocidade sustentável: movimento de combate não significa que se possa manter esse ritmo o dia inteiro."},
  work:{title:"Jornada e descanso",text:"Quantas horas se viaja em cada ciclo de 24 horas. Jornada de 8 h implica 16 h de descanso; 24 h significa movimento contínuo, como um navio com revezamento. Cada trecho começa seu próprio ciclo. Não é acrescentado descanso após a chegada. A jornada fica fixa quando o trecho começa."},
  size:{title:"Porte",text:"Pequeno, médio ou grande é uma anotação do veículo. Não altera a velocidade sozinho: ajuste a média para representar o transporte utilizado."},
  animals:{title:"Quantidade de animais",text:"Registre quantos animais de tração ou montaria participam: 1, 2, 4, 6 ou outra quantidade. Mais animais não multiplicam a velocidade. Informe a VB ou média adequada e ajuste carga e cansaço manualmente."},
  pace:{title:"Ritmo",text:"Multiplica a velocidade base. Sugestões: cauteloso 0,8; normal 1; apressado 1,2. São estimativas editáveis, não regras oficiais. Fator 1 é neutro; 0 impede deslocamento."},
  difficulty:{title:"Dificuldade do caminho",text:"Sugestões: fácil 1; médio 0,85; difícil 0,65; muito difícil 0,45; absurdo 0,25. Exemplo: 5 km/h × 0,65 = 3,25 km/h. Estes fatores são estimativas não oficiais. Se a VB já inclui essa penalidade, deixe em 1."},
  load:{title:"Carga",text:"Sugestões: leve 1; carregado 0,8; muito carregado 0,6. Não há cálculo automático de peso nem leitura de inventários. Deixe 1 se você já considerou a carga na velocidade informada."},
  fatigue:{title:"Cansaço manual",text:"O mestre define a condição: descansado 1; cansado 0,8; exausto 0,5. Não há cansaço ou recuperação automáticos. Durante a viagem, alterar este fator afeta somente o percurso restante, sem recalcular quilômetros já viajados."},
  wait:{title:"Espera antes do trecho",text:"Horas paradas antes de começar este trecho: embarque, troca de transporte ou descanso adicional. Exemplo: 2 horas aguardando a partida do navio. Não repita aqui uma pausa já contabilizada em outro lugar. Essa espera ocorre uma vez, não todo dia."},
  departure:{title:"Dia e horário de partida",text:"O dia é um contador relativo à viagem: dia 1, dia 2 etc. A referência de data é uma anotação opcional, como 18 de Água de 1522. Não há ligação com o calendário. Depois do primeiro avanço, dia e horário de partida ficam fixos."},
  advance:{title:"Avanço de tempo",text:"Com a viagem vinculada, H−/H+ e D−/D+ mudam o relógio do mundo e o calendário, e recalculam esta viagem. O calendário também atualiza a viagem. Parar suspende só o deslocamento. Antes do momento do vínculo, preserva o progresso já existente. Sem vínculo, o avanço é manual e independente. +1 dia equivale a 24 horas. Sem vínculo, o excedente após chegar não é usado; com vínculo, o calendário avança o intervalo completo. Salve suas alterações antes de avançar."},
  estimate:{title:"Previsão de chegada",text:"A previsão usa os parâmetros salvos e assume que as condições atuais continuarão. Inclui descanso e esperas; não inclui vento, clima ou eventos inesperados. Se pausada, a estimativa considera a retomada. Velocidade zero impede estimar a chegada."},
  map:{title:"Mapa e escala",text:"Selecione uma cena do mundo para copiar sua imagem e escala, sem ativar nem editar a cena. Também pode escolher uma imagem pelo seletor de arquivos. A escala da cena precisa estar em quilômetros, metros, milhas, pés ou outra unidade reconhecida; se não puder ser aproveitada, calibre por dois pontos. Calibrar escala: marque dois pontos cuja distância você conhece, informe os quilômetros e salve. Depois escolha o transporte e trace os pontos seguindo estradas, rios ou litoral. Cada trecho entra no roteiro. A precisão depende da escala e do traçado. O mesmo mapa deve ter escala uniforme; não há relevo ou rotas automáticas. Após iniciar a viagem, duplique para mudar o caminho. Carregar um mapa e salvar sua escala guarda ambos na biblioteca do mundo. Novas viagens usam o último mapa escolhido; trocar na biblioteca não altera as cópias de outras viagens. Para outra escala da mesma imagem, use Salvar como novo mapa. Arraste com o botão direito para mover a imagem e use a rodinha para o zoom no cursor, inclusive enquanto traça um trecho."},
  undo:{title:"Pausa e desfazer",text:"Pausar impede novos avanços até retomar. Desfazer restaura até 20 ações anteriores desta viagem: avanço, edição, pausa ou alteração de trechos. Não desfaz a exclusão de uma viagem nem alterações dos perfis. Com vínculo ao calendário, use H−/D− para voltar o tempo; Desfazer fica desativado."}
};
let app, mini, busy=false,clockPending=false,clockScheduled=false,clockForceWrite=false;
let clockTask=Promise.resolve();
const planners=new Set();
const emptyState=()=>({schema:1,revision:0,trips:[],profiles:E.defaultProfiles()});
function readState() {
  const s=E.clone(game.settings.get(MODULE_ID,"state"));
  if(s?.schema!==1||!Array.isArray(s.trips)||!Array.isArray(s.profiles))throw Error("Formato de viagens desconhecido. Não será sobrescrito.");
  return s;
}
function editor() {return game.users.filter(u=>u.active&&u.isGM).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)[0];}
function canEdit() {return game.user.isGM && editor()?.id===game.user.id;}
function assertEditor() {if(!canEdit())throw Error("Somente o mestre coordenador pode editar. Feche a sessão do outro mestre para assumir.");}
async function persist(s,revision) {
  assertEditor();
  if(readState().revision!==revision)throw Error("Outra sessão alterou as viagens. Recarregue antes de salvar.");
  s.revision=revision+1;
  await game.settings.set(MODULE_ID,"state",s);
}
async function refreshPlanners({clockOnly=false,state=null}={}){
  for(const planner of planners)await planner.refreshAutomatically({clockOnly:clockOnly||!!state&&state.revision===planner.revision});
}
function requestClockSync(){
  clockPending=true;if(busy||clockScheduled)return clockTask;
  clockScheduled=true;clockTask=Promise.resolve().then(async()=>{
    clockScheduled=false;if(busy)return;clockPending=false;const forceWrite=clockForceWrite;clockForceWrite=false;
    if(!game.user?.isGM||!C.available(game))return;if(!canEdit()){await refreshPlanners({clockOnly:true});await refreshCompact();return;}
    busy=true;
    try{const state=readState(),instant=C.now(game),delta=instant-(state.clockLink?.cursor??instant);if(C.reconcile(state,instant)){if(forceWrite||delta<0||delta>=15){state.clockRevision=(state.clockRevision??0)+1;await game.settings.set(MODULE_ID,'state',state);}await refreshPlanners({clockOnly:true});await refreshCompact();}}
    catch(error){console.error('Tagmar Viagens | Sincronização',error);ui.notifications.warn('Viagens: '+error.message);}
    finally{busy=false;if(clockPending)requestClockSync();}
  });return clockTask;
}
const confirm=content=>foundry.applications.api.DialogV2.confirm({window:{title:"Viagens e Expedições"},content:`<p>${content}</p>`,modal:true,rejectClose:false});
const choices=(list,value)=>list.map(([v,label])=>({value:v,label,selected:String(v)===String(value)}));
function paramsContext(p,prefix) {
  const result={...p,prefix,usesAnimals:["mount","cart"].includes(p.type),usesSize:["cart","ship"].includes(p.type),animalsAvailable:prefix==="profile."||["mount","cart"].includes(p.type),sizeAvailable:prefix==="profile."||["cart","ship"].includes(p.type),speedLabel:p.speedMode==="vb"?"VB do grupo / animais":"Média (km/h)",units:choices([["vb","VB"],["kmh","km/h"]],p.speedMode),sizes:choices([["Pequeno","Pequeno"],["Médio","Médio"],["Grande","Grande"]],p.size)};
  for(const [key,list] of Object.entries(E.FACTORS))result[`${key}Choices`]=choices(list,p[key]);
  result.factors=Object.entries(E.FACTORS).map(([key,list])=>{
    const options=choices(list,p[key]),custom=!options.some(o=>o.selected);
    return {key,name:prefix+key,label:{pace:"Ritmo",difficulty:"Caminho",load:"Carga",fatigue:"Cansaço"}[key],value:p[key],custom,choices:[...options,{value:"custom",label:"Personalizado",selected:custom}]};
  });
  return result;
}
const {ApplicationV2,HandlebarsApplicationMixin}=foundry.applications.api;
export class TravelApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS={id:MODULE_ID,tag:"section",classes:["tagmar-travel"],position:{width:800,height:740},
    window:{title:"Tagmar — Viagens e Expedições",icon:"fa-solid fa-route",resizable:true},actions:{do:TravelApp.dispatch}};
  static PARTS={main:{template:`modules/${MODULE_ID}/templates/travel.hbs`}};
  selected=null; profileId=null; profileDraft=null; tab="trips"; view="map"; dirty=false; revision=0; expanded=new Set();
  mapDraft=null; mapProfileId=null; zoom=1; dragIndex=null; dragMoved=false;
  mapViews=null; mapSceneSelections=new Map(); mapSavedSelections=new Map(); mapPanning=false; mapCreatorOpen=false;
  #mapSaveTimer=null;
  #mapSaveTask=Promise.resolve();
  #mapViewsDirty=false;
  mapViewFor(trip){return findMapView(this.mapViews??[],trip);}
  rememberMapViewport(){this.#rememberMapViewport();}
  #rememberMapViewport(){
    const view=captureMapView(this.element);if(!view)return;
    const next=rememberMapView(this.mapViews??[],view);if(next===this.mapViews)return;
    this.mapViews=next;this.#mapViewsDirty=true;clearTimeout(this.#mapSaveTimer);
    this.#mapSaveTimer=setTimeout(()=>this.#flushMapViews(),200);
  }
  async #flushMapViews(){
    clearTimeout(this.#mapSaveTimer);this.#mapSaveTimer=null;if(!this.#mapViewsDirty)return this.#mapSaveTask;
    this.#mapViewsDirty=false;const value={schema:1,views:E.clone(this.mapViews??[])};
    this.#mapSaveTask=this.#mapSaveTask.then(()=>game.settings.set(MODULE_ID,'mapViewports',value)).catch(error=>console.error('Tagmar Viagens | Posição do mapa',error));
    return this.#mapSaveTask;
  }
  async render(options={}){this.#rememberMapViewport();return super.render(options);}
  async refreshAutomatically({clockOnly=false}={}){
    if(!this.rendered||this.dirty||this.mapDraft||this.mapPanning||this.element?.querySelector('.tv-help-dialog[open]'))return;
    // Clock ticks need no new form. Updating only the marker preserves native
    // selects, current map scroll, focus and the selected transport.
    if(clockOnly&&this.view!=='track'){
      if(this.view==='map'){const state=readState();C.reconcile(state,C.now(game));updateMapProgress(this,state.trips.find(t=>t.id===this.selected));}
      return;
    }
    const active=this.element?.ownerDocument.activeElement;
    if(active&&this.element.contains(active)&&active.matches('select,input,textarea,[contenteditable="true"]'))return;
    await this.render({force:true});
  }
  _canRender(options) {if(!game.user.isGM)return false;return super._canRender(options);}
  async _prepareContext(options) {
    this.mapViews??=readMapViews(game.settings.get(MODULE_ID,'mapViewports'));
    const base=await super._prepareContext(options), s=readState();C.reconcile(s,C.now(game));if(!this.mapDraft)this.revision=s.revision;
    if(!s.trips.some(t=>t.id===this.selected))this.selected=s.trips[0]?.id??null;
    const t=s.trips.find(t=>t.id===this.selected), available=s.profiles;
    this.zoom=typeof options.travelZoom==='number'?options.travelZoom:this.mapViewFor(t)?.zoom??1;
    if(!this.profileDraft&&!available.some(p=>p.id===this.profileId))this.profileId=available[0]?.id??null;
    const profile=this.profileDraft??available.find(p=>p.id===this.profileId);
    const scenes=Array.from(game.scenes?.contents??game.scenes??[]).map(scene=>({value:scene.id,label:scene.name,selected:scene.id===(this.mapSceneSelections.get(t?.id)??t?.map?.sourceScene?.id??game.scenes?.current?.id??game.scenes?.active?.id)}));
    const clockInstant=C.now(game);
    const library=L.libraryOf(s),savedSelection=this.mapSavedSelections.get(t?.id)??t?.map?.libraryId??library.lastId;
    const ctx={...base,clockAvailable:C.available(game),scenes,hasScenes:!!scenes.length,help:HELP,editable:canEdit(),coordinator:editor()?.name??"Nenhum mestre conectado",isMap:this.view==="map",mapDraft:!!this.mapDraft,isCalibrating:this.mapDraft?.mode==="scale",calibrationKm:this.mapDraft?.km??100,isPlan:this.view==="plan",isTrack:this.view==="track",isProfiles:this.view==="profiles",
      mapCreatorOpen:this.mapCreatorOpen,savedMaps:library.entries.map(e=>({value:e.id,label:e.name,selected:e.id===savedSelection})),hasSavedMaps:!!library.entries.length,mapSaveName:L.mapName(t?.map),
      views:choices([["map","Mapa"],["plan","Planejamento"],["track","Acompanhar"],["profiles","Criar transportes"]],this.view),
      trips:s.trips.map(t=>({...t,selected:t.id===this.selected})),hasTrip:!!t,
      mapProfiles:s.profiles.map(p=>({value:p.id,label:`${p.name} · ${E.TYPES[p.type]}`,selected:p.id===this.mapProfileId})),
      profileDraft:!!this.profileDraft,hasProfiles:!!available.length,profileChoices:available.map(p=>({value:p.id,label:p.name===E.TYPES[p.type]?p.name:`${p.name} · ${E.TYPES[p.type]}`,selected:!this.profileDraft&&p.id===this.profileId})),
      profiles:s.profiles.map(p=>({value:p.id,label:`${p.name} · ${E.TYPES[p.type]}`})),profile:profile?{...paramsContext(profile,"profile."),typeChoices:choices(Object.entries(E.TYPES),profile.type)}:null};
    if(t) {
      const clock=C.display(s,t,clockInstant);
      const totals=E.totals(t), est=E.estimate(t),stage=E.currentStage(t),finished=t.segments.length>0&&t.segments.every(s=>E.complete(s,t.progress[s.id]));
      ctx.trip={...t,hasMappedSegments:t.segments.some(s=>s.path?.length),hasSegments:!!t.segments.length,linked:clock.linked,clockMissing:s.clockLink?.tripId===t.id&&!C.available(game),beforeLink:clock.beforeLink,canRewind:clock.linked&&canEdit(),canTimeAdvance:clock.linked?canEdit():!t.paused&&!finished&&t.segments.length>0,canSetMap:!t.elapsed||!t.map,referenceOnly:t.elapsed>0&&!t.map,started:t.elapsed>0,canUndo:!!t.history.length&&!clock.linked,canAdvance:!t.paused&&!finished&&t.segments.length>0,percent:totals.distance?Math.min(100,100*totals.done/totals.distance):finished?100:0,
        stage:{...stage,done:E.formatNumber(stage.done??0),remaining:E.formatNumber(stage.remaining??0),untilNext:stage.untilNext===null?null:E.duration(stage.untilNext)},
        distance:E.formatNumber(totals.distance),done:E.formatNumber(totals.done),remaining:E.formatNumber(totals.remaining),
        elapsedText:E.duration(t.elapsed),current:clock.linked?clock.current:E.arrival(t,t.elapsed),eta:clock.linked?clock.eta:E.arrival(t,est.arrival),remainingTime:E.duration(est.remaining),
        movingText:E.duration(totals.moving),restingText:E.duration(totals.resting),waitingText:E.duration(totals.waiting),
        totalEstimate:E.duration(est.arrival),projectedMoving:E.duration(est.moving??0),projectedRest:E.duration(est.resting??0),projectedWait:E.duration(est.waiting??0),
        blocked:est.blocked,status:t.paused?"Pausada":finished?"Concluída":t.elapsed?"Em andamento":"Planejada",
        scaleText:t.map?.sceneScale?`Escala da cena: ${E.formatNumber(t.map.sceneScale.distance)} ${t.map.sceneScale.units} por casa`:t.map?.calibration?`Escala: ${E.formatNumber(t.map.calibration.km)} km entre os pontos de referência`:"Escala não definida",
        lastAction:t.history.at(-1)?.label??"Nenhuma alteração",segments:t.segments.map((s,index)=>{
          const p=t.progress[s.id]??E.progress(), done=t.elapsed>0&&E.complete(s,p),started=p.moving+p.resting+p.waiting>0;
          const legEstimate=E.estimate({...t,segments:[s],progress:{},elapsed:0,history:[],paused:false});
          return {...paramsContext(s,`seg.${s.id}.`),mapped:!!s.path?.length,roundedDistance:Number(s.distance.toFixed(2)),distanceText:E.formatNumber(s.distance),
            durationText:E.duration(legEstimate.arrival),durationHint:legEstimate.blocked||`Movimento: ${E.duration(legEstimate.moving)} · Descanso: ${E.duration(legEstimate.resting)} · Espera: ${E.duration(legEstimate.waiting)}. Estimativa com as condições salvas.`,
            color:M.COLORS[s.type],index:index+1,first:index===0,done,started,
            doneKm:E.formatNumber(p.km),speed:E.formatNumber(E.speed(s)),rest:E.formatNumber(24-s.work)};
        })};
    }
    return ctx;
  }
  _onRender(context,options) {
    super._onRender(context,options);planners.add(this);
    this.element.querySelector('[name="calibrationKm"]')?.addEventListener("input",event=>{if(this.mapDraft)this.mapDraft.km=event.target.value;});
    bindMap(this,context.trip,canEdit());
    this.element.querySelector('[data-map-host]')?.addEventListener('scroll',()=>this.#rememberMapViewport(),{passive:true});
    this.element.querySelector('.window-content')?.addEventListener('scroll',()=>this.#rememberMapViewport(),{passive:true});
    this.element.querySelector('[name="mapSceneId"]')?.addEventListener('change',event=>this.mapSceneSelections.set(this.selected,event.target.value));
    this.element.querySelector('[name="savedMapId"]')?.addEventListener('change',event=>this.mapSavedSelections.set(this.selected,event.target.value));
    this.element.querySelector('[name="mapProfile"]')?.addEventListener('change',event=>{this.mapProfileId=event.target.value;});
    this.#rememberMapViewport();
    this.element.querySelector("form")?.addEventListener("submit",e=>e.preventDefault());
    this.element.querySelector('.tv-help-dialog')?.addEventListener('keydown',event=>event.stopPropagation());
    this.element.querySelectorAll("[data-edit]").forEach(el=>el.addEventListener("input",()=>{
      this.dirty=true; this.element.querySelector("[data-dirty]").textContent="Alterações não salvas — salve antes de avançar.";
    }));
    this.element.querySelector('[data-profile-picker]')?.addEventListener('change',event=>{this.lastAction=this.run('profileSelect',event.target.value).finally(()=>{if(event.target.isConnected)event.target.value=this.profileDraft?'':this.profileId??'';});});
    this.element.querySelector('[data-profile-type]')?.addEventListener('change',event=>{
      const parameters=event.target.closest('.tv-parameters'),type=event.target.value;
      parameters.querySelector('[data-profile-size]').hidden=!['cart','ship'].includes(type);
      parameters.querySelector('[data-profile-animals]').hidden=!['mount','cart'].includes(type);
    });
    this.element.querySelector('[data-route-picker]')?.addEventListener('change',event=>{this.lastAction=this.run('select',event.target.value).finally(()=>{if(event.target.isConnected)event.target.value=this.selected??'';});});
    this.element.querySelectorAll('[data-factor-choice]').forEach(select=>select.addEventListener('change',()=>{
      const input=select.closest('.tv-factor').querySelector('[data-factor-value]');
      input.hidden=select.value!=='custom';if(select.value!=='custom')input.value=select.value;else input.focus();
      input.dispatchEvent(new Event('input',{bubbles:true}));
    }));
    this.element.querySelectorAll('[data-speed-mode]').forEach(select=>select.addEventListener('change',()=>{
      select.closest('.tv-parameters').querySelector('[data-speed-label]').textContent=select.value==='vb'?'VB do grupo / animais':'Média (km/h)';
    }));
    this.element.querySelectorAll('details[data-travel-detail]').forEach(detail=>{
      if(this.expanded.has(detail.dataset.travelDetail))detail.open=true;
      detail.addEventListener('toggle',()=>{if(!detail.isConnected)return;if(detail.open)this.expanded.add(detail.dataset.travelDetail);else this.expanded.delete(detail.dataset.travelDetail);});
    });
  }
  async close(options={}) {
    if(busy)return this;
    if((this.dirty||this.mapDraft) && !await confirm("Descartar as alterações não salvas?"))return this;
    this.#rememberMapViewport();await this.#flushMapViews();
    this.dirty=false;this.mapDraft=null;this.profileDraft=null;planners.delete(this);return super.close(options);
  }
  static async dispatch(event,button) {
    if(["help","closeHelp"].includes(button.dataset.command))event.preventDefault();
    return this.run(button.dataset.command,button.dataset.id,button.dataset.value);
  }
  async run(command,target,value) {
    // Help never saves, re-renders or discards the form's pending edits.
    if(command==="help"||command==="closeHelp") {
      if(!game.user.isGM)return;
      const dialog=this.element.querySelector('.tv-help-dialog');
      if(command==="closeHelp") {dialog.close();return;}
      const help=HELP[value];if(!help)return;
      dialog.querySelector('h3').textContent=help.title;
      dialog.querySelector('p').textContent=help.text;
      if(!dialog.open)dialog.showModal();return;
    }
    if(command==='cancelProfile'){
      if(busy||!game.user.isGM||!this.profileDraft)return;
      this.profileDraft=null;this.dirty=false;await this.render({force:true});return;
    }
    if(command==='mapAdd'){
      if(!game.user.isGM)return;
      const panel=this.element.querySelector('.tv-map-creator');if(!panel)return;
      this.mapCreatorOpen=!this.mapCreatorOpen;panel.hidden=!this.mapCreatorOpen;
      this.element.querySelector('[data-command="mapAdd"]')?.setAttribute('aria-expanded',String(this.mapCreatorOpen));
      return;
    }
    if(busy)return;
    busy=true;
    try {
      if(!game.user.isGM)throw Error("Ferramenta exclusiva do mestre.");
      if(this.dirty && !["save","saveName","saveProfile","reload","mapBrowse","mapLoad","mapScene","delete"].includes(command))throw Error("Salve as alterações ou use Recarregar antes de continuar.");
      if(this.mapDraft && !["mapCancel","mapBack","mapSave","mapZoom","reload","delete"].includes(command))throw Error("Salve o traçado/escala ou use Cancelar antes de continuar.");
      if(command==="mapBrowse"){
        assertEditor();const picker=new foundry.applications.apps.FilePicker({type:"image",current:this.element.querySelector('[name="mapSrc"]')?.value??"",callback:path=>{const input=this.element.querySelector('[name="mapSrc"]');if(input){input.value=path;input.dispatchEvent(new Event("input",{bubbles:true}));}}});await picker.render({force:true});return;
      }
      if(command==="compact"){await openCompact(this.selected);return;}
      if(command==="mapZoom"){await this.render({force:true,travelZoom:Math.max(1,Math.min(6,this.zoom+Number(value)))});return;}
      if(command==="mapCancel"||command==="mapBack"){assertEditor();if(command==="mapCancel")this.mapDraft=null;else this.mapDraft?.points.pop();await this.render({force:true});return;}
      if(command==="reload") {
        if((this.dirty||this.mapDraft) && !await confirm("Descartar as alterações locais e recarregar?"))return;
        this.mapDraft=null;this.profileDraft=null;
      } else if(command==="view"){
        if(!['plan','map','track','profiles'].includes(value))throw Error('Escolha uma seção do planejador.');
        this.view=value;if(value==='profiles'){if(this.tab==='trips')this.tab='foot';}else this.tab='trips';
      } else if(command==="profileSelect"){if(!readState().profiles.some(p=>p.id===target))throw Error("Escolha um transporte salvo.");this.profileId=target;}
      else if(command==="tab"){this.tab=value;this.view=value==='trips'?'plan':'profiles';}
      else if(command==="select")this.selected=target;
      else {
        assertEditor();
        const s=readState(), revision=this.revision;
        if(s.revision!==revision)throw Error("A janela está desatualizada. Use Recarregar.");
        C.reconcile(s,C.now(game));
        const t=s.trips.find(t=>t.id===this.selected), index=s.trips.findIndex(t=>t.id===this.selected);
        const field=name=>this.element.querySelector(`[name="${name}"]`)?.value;
        const readParams=(p,prefix)=>{
          const next={...p};
          for(const key of ["name","type","speedMode","base","work","pace","difficulty","load","fatigue","size","animals"]){
            const v=field(prefix+key);if(v!==undefined)next[key]=v;
          }
          return E.parameters(next);
        };
        if(command==="new"||command==="example") {
          if(s.trips.length>=50)throw Error("Limite de 50 viagens. Exclua viagens antigas antes de criar outras.");
          const fresh=command==="example"?E.example():E.trip();const map=L.defaultMap(s,t);if(map)fresh.map=map;this.mapCreatorOpen=false;s.trips.push(fresh);this.selected=fresh.id;this.tab="trips";this.view=command==="example"?"plan":"map";
        } else if(command==="newProfile"||command==="copyProfile") {
          if(s.profiles.length>=500)throw Error("Limite de 500 fichas de transporte.");
          const selected=s.profiles.find(p=>p.id===this.profileId);
          const source=command==="copyProfile"?selected:E.defaultProfiles().find(p=>p.type===(selected?.type??'foot'));
          if(!source)throw Error("Selecione um transporte.");
          this.profileDraft={...E.clone(source),id:E.id(),name:command==="copyProfile"?`${source.name} (cópia)`:'Novo transporte'};
          this.view='profiles';this.dirty=true;await this.render({force:true});return;
        } else if(command==="deleteProfile") {
          if(this.profileDraft||!s.profiles.some(p=>p.id===this.profileId))throw Error("Escolha um transporte salvo para excluir.");
          if(!await confirm("Excluir esta ficha da biblioteca? Trechos existentes preservam seus valores. A exclusão da ficha não tem desfazer."))return;
          s.profiles=s.profiles.filter(p=>p.id!==this.profileId);this.profileId=null;
        } else if(command==="saveProfile") {
          const i=s.profiles.findIndex(p=>p.id===this.profileId);
          if(!this.profileDraft&&i<0)throw Error("Transporte não encontrado.");
          if(this.profileDraft&&s.profiles.length>=500)throw Error("Limite de 500 fichas de transporte.");
          const profile=readParams(this.profileDraft??s.profiles[i],"profile.");
          if(this.profileDraft)s.profiles.push(profile);else s.profiles[i]=profile;
          this.profileId=profile.id;
        } else {
          if(!t)throw Error("Selecione uma viagem.");
          if(command==="saveName") {
            const name=field("trip.name");if(name===undefined)throw Error("Edite o nome na aba Mapa.");
            const image=field("mapSrc");if(image!==undefined&&image!==(t.map?.src??""))throw Error("Carregue a imagem escolhida ou use Recarregar antes de salvar o nome.");
            t.name=String(name).trim().slice(0,120)||"Viagem";
          }
          else if(command==="linkClock") {C.bind(s,t.id,C.now(game));}
          else if(command==="unlinkClock") {if(s.clockLink?.tripId===t.id)s.clockLink=null;}
          else if(command==="mapUse") {
            const map=L.savedMap(s,field('savedMapId'));
            s.trips[index]=M.setMap(t,map);s.mapLibrary={...E.clone(L.libraryOf(s)),lastId:map.libraryId};
            this.mapSceneSelections.delete(t.id);
            this.pendingMessage='Mapa e escala salvos copiados para esta viagem.';
          } else if(command==="mapStore") {
            if(!t.map)throw Error('Escolha primeiro um mapa.');
            t.map=L.rememberMap(s,t.map,{name:field('mapSaveName'),asNew:true});this.mapSavedSelections.set(t.id,t.map.libraryId);
            this.pendingMessage='Novo mapa salvo com a escala atual. Outras viagens mantêm suas cópias.';
          } else if(command==="mapForget") {
            if(!await confirm('Remover este mapa da biblioteca? As imagens, cenas e mapas das viagens existentes serão preservados.'))return;
            L.forgetMap(s,field('savedMapId'));this.mapSavedSelections.delete(t.id);
          } else if(command==="mapScene") {
            const scene=game.scenes?.get(field("mapSceneId"));const source=sceneSource(scene);
            const loaded=await loadMapImage(source.src),result=sceneMap(source,loaded);
            s.trips[index]=M.setMap(t,result.map);this.zoom=1;this.pendingMessage=result.warning??`Imagem e escala de ${source.sceneName} copiadas para a viagem.`;
          } else if(command==="mapLoad") {
            const src=M.imagePath(field("mapSrc"));const loaded=await loadMapImage(src);
            // Do not overwrite a newer edit made while the image was loading.
            s.trips[index]=M.setMap(t,loaded);this.zoom=1;
          } else if(command==="mapScale"||command==="mapDraw"||command==="mapEdit") {
            if(t.elapsed>0)throw Error("Duplique a viagem para alterar o mapa após iniciar.");
            if(!t.map)throw Error("Escolha primeiro uma imagem de mapa.");
            if(command!=="mapScale"&&!t.map.kmPerPixel)throw Error("Calibre primeiro a escala do mapa.");
            let points=[],segmentId=null,profileId=field("mapProfile");
            if(command==="mapEdit") {const leg=t.segments.find(x=>x.id===target);if(!leg?.path)throw Error("Trecho sem traçado.");points=E.clone(leg.path);segmentId=leg.id;}
            else if(command==="mapDraw") {if(!s.profiles.some(p=>p.id===profileId))throw Error("Crie/escolha uma ficha de transporte.");const previous=t.segments.at(-1)?.path?.at(-1);if(previous)points=[E.clone(previous)];}
            this.mapProfileId=profileId;this.mapDraft={mode:command==="mapScale"?"scale":"draw",points,profileId,segmentId};await this.render({force:true});return;
          } else if(command==="mapSave") {
            const draft=this.mapDraft;if(!draft)throw Error("Inicie a escala ou um traçado.");
            if(draft.mode==="scale") {if(draft.points.length!==2)throw Error("Marque exatamente dois pontos para a escala.");s.trips[index]=M.setScale(t,...draft.points,field("calibrationKm"));}
            else {const profile=s.profiles.find(p=>p.id===draft.profileId);if(!draft.segmentId&&!profile)throw Error("Ficha de transporte não encontrada.");s.trips[index]=M.savePath(t,profile,draft.points,draft.segmentId);}
          } else if(command==="save") {
            const next=E.clone(t);
            next.dateLabel=String(field("trip.dateLabel")||"").slice(0,120);
            next.departureDay=E.number(field("trip.departureDay"),"Dia",1);
            next.departureTime=field("trip.departureTime");
            next.segments=t.segments.map(segment=>{
              if(t.elapsed>0&&E.complete(segment,t.progress[segment.id]))return segment;
              const prefix=`seg.${segment.id}.`, n=readParams(segment,prefix);
              n.distance=segment.path?.length?M.distance(segment.path,t.map):E.number(field(prefix+"distance"),"Distância");n.wait=E.number(field(prefix+"wait"),"Espera",0,1e6);return n;
            });
            s.trips[index]=E.savePlan(t,next);
          } else if(command==="delete") {
            if(!await confirm("Excluir a viagem selecionada e seu histórico? Alterações não salvas serão descartadas. Mapas e transportes salvos serão preservados. Esta exclusão não tem desfazer."))return;
            s.trips.splice(index,1);
          } else if(command==="duplicate") {
            if(s.trips.length>=50)throw Error("Limite de 50 viagens.");
            const copy=E.duplicate(t);s.trips.push(copy);this.selected=copy.id;
          } else if(command==="pause") {E.checkpoint(t,"Pausar / retomar");t.paused=!t.paused;}
          else if(command==="undo"){if(s.clockLink?.tripId===t.id)throw Error("Use H− ou D− para retroceder o tempo compartilhado.");s.trips[index]=E.undo(t);}
          else if(command==="advance") {
            const hours=Number(value??field("advanceHours"));
            if(s.clockLink?.tripId===t.id){
              if(!C.available(game))throw Error("Ative o Grande Calendário ou desvincule a viagem para avançar manualmente.");
              E.number(Math.abs(hours),"Horas",.001,1e6);await game.time.advance(hours*3600,{tagmarTravel:true});C.reconcile(s,C.now(game));clockPending=false;clockForceWrite=false;
            } else {
              const result=E.advance(t,E.number(hours,"Horas",.001,1e6));
              if(result.used===0)throw Error(result.blocked||"Viagem concluída. Não há mais tempo a avançar.");s.trips[index]=result.trip;
              this.pendingMessage=`Avançado: ${E.duration(result.used)}.${result.arrived?" Viagem concluída!":""}${result.unused>0?` Tempo não usado: ${E.duration(result.unused)}.`:""}${result.blocked?` ${result.blocked}`:""}`;
            }
          } else if(["add","remove","up","down"].includes(command)) {
            if(t.elapsed>0)throw Error("Duplique a viagem para mudar a estrutura após iniciar.");
            E.checkpoint(t,"Alteração dos trechos");
            if(command==="add") {
              if(t.segments.length>=100)throw Error("Limite de 100 trechos.");
              const p=s.profiles.find(p=>p.id===field("addProfile"));if(!p)throw Error("Selecione um perfil.");
              t.segments.push(E.segment(p,E.number(field("addDistance"),"Distância do novo trecho")));
            } else {
              const i=t.segments.findIndex(s=>s.id===target);if(i<0)throw Error("Trecho não encontrado.");
              if(command==="remove") {
                if(!await confirm("Remover este trecho? Você poderá desfazer a remoção."))return;
                t.segments.splice(i,1);
              } else {
                const j=i+(command==="up"?-1:1);
                if(j>=0&&j<t.segments.length)[t.segments[i],t.segments[j]]=[t.segments[j],t.segments[i]];
              }
            }
          } else throw Error("Ação desconhecida.");
        }
        if(['mapScene','mapLoad','mapSave'].includes(command)){
          const trip=s.trips[index];
          if(trip?.map){trip.map=L.rememberMap(s,trip.map);this.mapSavedSelections.set(trip.id,trip.map.libraryId);}
        }
        if(["save","pause","undo","add","remove","up","down","mapLoad","mapScene","mapSave","mapUse","delete"].includes(command)&&s.clockLink)C.rebase(s,this.selected,C.now(game)??s.clockLink.cursor);
        if(s.clockLink&&!s.trips.some(t=>t.id===s.clockLink.tripId))s.clockLink=null;
        await persist(s,revision);
        if(command==="saveProfile")this.profileDraft=null;
        if(['mapScene','mapLoad','mapStore','mapUse'].includes(command))this.mapCreatorOpen=false;
        if(command==="delete"){
          this.mapDraft=null;
          if(game.settings.get(MODULE_ID,'compactTrip')===t.id)await game.settings.set(MODULE_ID,'compactTrip','');
          if(mini?.rendered&&mini.selected===t.id)await mini.close();
        }
        if(command==="mapSave"||command==="mapLoad"||command==="mapScene")this.mapDraft=null;
        await refreshCompact();
        if(this.pendingMessage){ui.notifications.info(this.pendingMessage);this.pendingMessage=null;}
      }
      this.dirty=false;
      await this.render({force:true});
    } catch(error) {this.pendingMessage=null;console.error(`${MODULE_ID} |`,error);ui.notifications.warn(error.message);}
    finally {busy=false;if(clockPending)requestClockSync();}
  }
}
export function openTravel() {
  if(!game.user.isGM)return;
  app??=new TravelApp();
  if(app.rendered)app.bringToFront();else app.render({force:true});
}
const CompactApp=makeCompactApp({readState,canEdit,clock:C,act:compactAction});
async function refreshCompact(){if(mini?.rendered)await mini.render({force:true});}
async function openCompact(id,{autoLink=true}={}){
  if(autoLink&&canEdit()&&C.available(game)){const state=readState();if(state.trips.find(t=>t.id===id)?.segments.length&&state.clockLink?.tripId!==id){C.bind(state,id,C.now(game));await persist(state,state.revision);await refreshPlanners();}}
  mini??=new CompactApp();mini.selected=id;await game.settings.set(MODULE_ID,"compactTrip",id??"");await mini.render({force:true});mini.bringToFront();
}
async function compactAction(command,id,value){
  if(!game.user.isGM)return;
  if(command==="open"){openTravel();app.selected=id;app.view="track";await app.render({force:true});return;}
  if(command==="close"){await game.settings.set(MODULE_ID,"compactTrip","");return;}
  if(busy)return;busy=true;
  try{
    assertEditor();if([...planners].some(p=>p.dirty||p.mapDraft))throw Error("Salve ou cancele os ajustes do planejador antes de avançar pelo painel.");
    const s=readState();C.reconcile(s,C.now(game));const i=s.trips.findIndex(t=>t.id===id);if(i<0)throw Error("Viagem não encontrada.");const t=s.trips[i];
    if(command==="advance"){
      const hours=Number(value);
      if(s.clockLink?.tripId===id){if(!C.available(game))throw Error("Ative o Grande Calendário para mudar o tempo compartilhado.");E.number(Math.abs(hours),"Horas",.001,1e6);await game.time.advance(hours*3600,{tagmarTravel:true});C.reconcile(s,C.now(game));clockPending=false;clockForceWrite=false;}
      else {const r=E.advance(t,E.number(hours,"Horas",.001,1e6));if(!r.used)throw Error(r.blocked||"Viagem concluída.");s.trips[i]=r.trip;}
    }
    else if(command==="linkClock")C.bind(s,id,C.now(game));
    else if(command==="unlinkClock"){if(s.clockLink?.tripId===id)s.clockLink=null;}
    else if(command==="pause"){E.checkpoint(t,"Pausar / retomar");t.paused=!t.paused;C.rebase(s,id,C.now(game)??s.clockLink?.cursor);}
    else if(command==="undo"){if(s.clockLink?.tripId===id)throw Error("Use H− ou D− para retroceder o tempo compartilhado.");s.trips[i]=E.undo(t);}
    else throw Error("Ação desconhecida.");
    await persist(s,s.revision);await refreshPlanners();await refreshCompact();
  }catch(error){ui.notifications.warn(error.message);}finally{busy=false;if(clockPending)requestClockSync();}
}

Hooks.once("init",()=>{
  game.settings.register(MODULE_ID,"compactTrip",{scope:"client",config:false,type:String,default:""});
  game.settings.register(MODULE_ID,"compactPosition",{scope:"client",config:false,type:Object,default:{left:80,top:100}});
  game.settings.register(MODULE_ID,"mapViewports",{scope:"client",config:false,type:Object,default:{schema:1,views:[]}});
  game.settings.register(MODULE_ID,"state",{scope:"world",config:false,type:Object,restricted:true,default:emptyState(),onChange:value=>{
    if(!busy){refreshPlanners({state:value??readState()});refreshCompact();}
  }});
  game.settings.registerMenu(MODULE_ID,"open",{name:"Viagens e Expedições",label:"Abrir planejador",hint:"Roteiros e acompanhamento com vínculo opcional ao calendário.",icon:"fa-solid fa-route",type:TravelApp,restricted:true});
});
Hooks.on("getSceneControlButtons",controls=>{
  if(!game.user.isGM)return;
  controls[MODULE_ID]={name:MODULE_ID,title:"Viagens e Expedições",icon:"fa-solid fa-route",order:Object.keys(controls).length,visible:true,
    onChange:(_event,active)=>{if(active)openTravel();},
    tools:{planner:{name:"planner",title:"Abrir planejador de viagens",icon:"fa-solid fa-route",order:0,button:true,onChange:openTravel}}};
});
Hooks.once("ready",()=>{game.modules.get(MODULE_ID).api=Object.freeze({open:openTravel});if(game.user.isGM){const id=game.settings.get(MODULE_ID,"compactTrip");if(id&&readState().trips.some(t=>t.id===id))openCompact(id,{autoLink:false});}requestClockSync();});
Hooks.on("updateUser",()=>{if(!busy){refreshPlanners();refreshCompact();}requestClockSync();});
Hooks.on("userConnected",()=>{if(!busy){refreshPlanners();refreshCompact();}requestClockSync();});
Hooks.on("updateWorldTime",(_world,delta)=>{if(delta<0)clockForceWrite=true;return requestClockSync();});
Hooks.on("updateSetting",setting=>{if(["tagmar-calendario.epochOffset","tagmar-calendario.epochYear"].includes(setting.key)){clockForceWrite=true;return requestClockSync();}});
