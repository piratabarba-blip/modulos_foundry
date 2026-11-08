import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {castConfiguration,sharedDuration} from '../tagmar-token-fx/scripts/cast-rules.mjs';
import {applyMarker,expireMarkers,resolveRequest,handleItemUse} from '../tagmar-token-fx/scripts/casts.mjs';
import {repeatResistance} from '../tagmar-token-fx/scripts/recurring-resistance.mjs';
import {reconcileResistanceAreas} from '../tagmar-token-fx/scripts/resistance-areas.mjs';
import {calendarNow} from '../tagmar-token-fx/scripts/timers.mjs';
import {invisibilityChange} from '../tagmar-token-fx/scripts/invisibility.mjs';

const ID='tagmar-token-fx';
const docs=(values=[])=>Object.assign(values,{get(id){return this.find(e=>e.id===id);}});
const assign=(target,changes)=>{for(const [path,value] of Object.entries(changes)){
  const keys=path.split('.');let next=target;
  for(const key of keys.slice(0,-1))next=next[key]??={};
  next[keys.at(-1)]=structuredClone(value);
}};
const gm={id:'gm',isGM:true,active:true,targets:new Set()},player={id:'player',isGM:false,active:true};
globalThis.game={user:gm,users:docs([gm,player]),time:{worldTime:0},modules:new Map([
  ['tagmar-calendario',{active:true,api:{getDate:()=>({year:1500,dayOfYear:0})}}]
])};
globalThis.CONFIG={specialStatusEffects:{INVISIBLE:'invisible',BLIND:'blind',BURROW:'burrow'}};
globalThis.foundry={utils:{escapeHTML:String,expandObject:x=>x,mergeObject:Object.assign}};
globalThis.ChatMessage={getSpeaker:()=>({}),create:async()=>({id:'summary'})};
globalThis.Hooks={onError:(_hook,error)=>{throw error;}};
let resisted=false,damage=0,sequence=0;
function actor(id){return {id,uuid:'Actor.'+id,name:id,items:[],effects:docs(),system:{rm:10},
  testUserPermission:()=>true,_aplicarDano:async()=>{damage++;},_rollResistencia:async()=>({success:resisted}),
  async createEmbeddedDocuments(_type,data){return data.map(d=>{
    const e={...structuredClone(d),id:'effect'+(++sequence),parent:this,
      get active(){return !this.disabled;},get system(){return {changes:[]};},getReplacementData:()=>({}),
      getFlag(scope,key){return this.flags?.[scope]?.[key];},async update(changes){assign(this,changes);},
      async delete(){this.parent.effects.splice(this.parent.effects.indexOf(this),1);}};
    this.effects.push(e);return e;
  });}};}
const caster=actor('caster'),target=actor('target');
const scene={id:'scene',grid:{size:100,distance:1},areas:[],getFlag:()=>scene.areas,
  setFlag:async(_s,_k,value)=>{scene.areas=structuredClone(value);}};
const token=(id,a,x)=>{const document={id,uuid:`Scene.scene.Token.${id}`,actor:a,actorLink:true,parent:scene,
  hidden:false,disposition:1,x,y:0,width:1,height:1};return {id,name:id,actor:a,document,center:{x:x+50,y:50}};};
const source=token('source',caster,0),recipient=token('recipient',target,100);
scene.tokens=docs([source.document,recipient.document]);game.scenes=docs([scene]);game.actors=docs([caster,target]);
globalThis.canvas={ready:true,scene,tokens:{placeables:[source,recipient]}};
const flags={cast:{enabled:true,useType:'targets',shape:'targets',resolution:'none',invisible:true,duration:2,unit:'rounds'}};
const item={uuid:'Actor.caster.Item.spell',actor:caster,type:'Magia',isOwner:true,name:'Invisibilidade',system:{},img:'icons/svg/invisible.svg',
  getFlag:(_s,k)=>flags[k]};globalThis.fromUuid=async()=>item;
const config=()=>castConfiguration(item);
const timer=e=>e.getFlag(ID,'spellTimer');
const cast=async()=>{const state={castRequest:{itemUuid:item.uuid,sourceId:source.id,sceneId:scene.id,origin:source.center,direction:0,targets:[recipient.id],status:'pending'}};
  await resolveRequest({id:'cast'+(++sequence),author:player,whisper:['gm','player'],getFlag:(_s,k)=>state[k],
    async update(changes){for(const [k,v] of Object.entries(changes))if(k.startsWith('flags.'+ID+'.'))assign(state,{[k.slice(('flags.'+ID+'.').length)]:v});}});
};

// Executa a união real de condições do Actor e as regras reais de visão V14.
const native=process.env.TAGMAR_TEST_FOUNDRY;
assert(native,'Informe TAGMAR_TEST_FOUNDRY');
async function method(file,signature){const text=await readFile(native+'/'+file,'utf8');
  const start=text.indexOf(signature);assert(start>=0,signature);
  return text.slice(start,text.indexOf('\n  }',start)+4);
}
globalThis.ActiveEffect={CHANGE_PHASES:{initial:true},_shimChanges(){}};
foundry.documents={ActiveEffect:{implementation:ActiveEffect}};
const NativeActor=new Function('return class {'+await method('client/documents/actor.mjs','  applyActiveEffects(phase) {')+'}')();
function statuses(a){const runtime=new NativeActor();Object.assign(runtime,{statuses:new Set(),_completedActiveEffectPhases:new Set(),
  getRollData:()=>({}),allApplicableEffects:()=>a.effects,tokenActiveEffectChanges:{},overrides:{}});
  runtime.applyActiveEffects('initial');return runtime.statuses;}
globalThis.Token=class {constructor(a){this.document={hasStatusEffect:id=>statuses(a).has(id),hidden:false};}};
globalThis.DetectionMode={DETECTION_TYPES:{SIGHT:1}};
const BasicDetection=new Function('return class {'+await method('client/canvas/perception/detection-mode.mjs','  _canDetect(visionSource, target, level) {')+'}')();
const SpecialDetection=new Function('return class {'+await method('client/canvas/perception/detection-modes/invisibility-perception.mjs','  _canDetect(visionSource, target) {')+'}')();
const NativeToken=new Function('return class {'+await method('client/canvas/placeables/token.mjs','  get isVisible() {')+'}')();
const sight={object:{document:{hasStatusEffect:()=>false}},blinded:{darkness:false}};
const normal=Object.assign(new BasicDetection(),{type:1,walls:true});
const special=Object.assign(new SpecialDetection(),{type:1,walls:true});

await cast();let effect=target.effects[0];
assert.equal(effect.name,item.name);assert.equal(timer(effect).invisible,true);
assert.equal(timer(effect).endsAt-calendarNow(game),30);assert(statuses(target).has('invisible'));
assert.equal(normal._canDetect(sight,new Token(target)),false);
assert.equal(special._canDetect(sight,new Token(target)),true);
const viewed=new NativeToken();Object.assign(viewed,{document:{hidden:false,getVisibilityTestPoints:()=>[]},controlled:false,_testCulled:()=>false});
canvas.visibility={tokenVision:true,testVisibility:()=>normal._canDetect(sight,new Token(target))};
canvas.effects={visionSources:[]};assert.equal(viewed.isVisible,true); // Mestre sem visão controlada.
game.user=player;assert.equal(viewed.isVisible,false);viewed.controlled=true;assert.equal(viewed.isVisible,true);
viewed.controlled=false;canvas.visibility.testVisibility=()=>special._canDetect(sight,new Token(target));assert.equal(viewed.isVisible,true);
game.user=gm;await cast();assert.equal(target.effects.length,1); // Renovar, sem acumular.
await effect.update({disabled:true});assert(!statuses(target).has('invisible'));
await effect.update({disabled:false});assert(statuses(target).has('invisible'));

// Outras magias/condição manual são fontes independentes. Hidden permanece igual.
const other={...config(),effectName:'Outra magia'};
await applyMarker(target,{...item,uuid:'Actor.caster.Item.other'},other,recipient,'cast2',[]);
await target.createEmbeddedDocuments('ActiveEffect',[{name:'Invisível manual',statuses:['invisible'],flags:{},disabled:false}]);
recipient.document.hidden=true;
await effect.delete();assert(statuses(target).has('invisible'));assert.equal(recipient.document.hidden,true);
await target.effects.find(e=>e.name==='Outra magia').delete();assert(statuses(target).has('invisible'));
await target.effects[0].delete();assert(!statuses(target).has('invisible'));assert.equal(recipient.document.hidden,true);
recipient.document.hidden=false;
await cast();game.time.worldTime=29;await expireMarkers();assert(statuses(target).has('invisible'));
game.time.worldTime=30;await expireMarkers();assert(!statuses(target).has('invisible'));assert(timer(target.effects[0]).expired);
game.time.worldTime=0;

// Sucesso inicial não recebe condição. RM por turno pode suspendê-la e restaurá-la.
target.effects=docs();flags.cast.resolution='rm';resisted=true;await cast();assert.equal(target.effects.length,0);
resisted=false;flags.cast.repeatRM=true;flags.cast.rmSuccess='turn';
const combat={id:'combat',started:true,round:1,turn:0,combatants:docs([{id:'recipient',actor:target,token:recipient.document}])};game.combat=combat;
await cast();effect=target.effects[0];assert(statuses(target).has('invisible'));
const turn=async(round)=>repeatResistance(combat,{round,turn:0},{round,turn:1,combatantId:'recipient'});
resisted=true;await turn(1);assert(!statuses(target).has('invisible'));assert(!effect.disabled);
resisted=false;await turn(2);assert(statuses(target).has('invisible'));
flags.cast.rmSuccess='end';await cast();effect=target.effects[0];resisted=true;await turn(3);
assert(effect.disabled);assert(!statuses(target).has('invisible'));

// Área: sair retira a condição; persistir conserva até o prazo. Reconexão usa dados salvos.
const area={id:'area',itemUuid:item.uuid,name:item.name,img:item.img,sourceId:source.id,sourceDisposition:1,
  origin:{x:150,y:50},direction:0,endsAt:calendarNow(game)+30,whisper:[],inside:[recipient.id],
  config:{...config(),shape:'circle',distance:1,includeCaster:false,rmSuccess:'turn'}};
target.effects=docs();resisted=false;await applyMarker(target,item,area.config,recipient,area.id,[],{areaId:area.id});
scene.areas=[structuredClone(area)];recipient.document.x=1000;
await reconcileResistanceAreas(scene,applyMarker);assert(!statuses(target).has('invisible'));
target.effects=docs();area.config.persistAfterExit=true;scene.areas=[structuredClone(area)];
await applyMarker(target,item,area.config,recipient,area.id,[],{areaId:area.id});
await reconcileResistanceAreas(scene,applyMarker);assert(statuses(target).has('invisible'));
const saved=structuredClone(target.effects[0].flags);target.effects[0].flags=saved;
game.time.worldTime=30;await expireMarkers();assert(!statuses(target).has('invisible'));

// Itens antigos continuam desativados; ponto/invocação ignoram a opção escondida.
assert.equal(castConfiguration({getFlag:()=>({})}).invisible,false);
assert.equal(castConfiguration({getFlag:()=>({shape:'point',invisible:true})}).invisible,false);
assert.equal(castConfiguration({getFlag:()=>({useType:'summon',invisible:true})}).invisible,false);
assert.equal(sharedDuration({getFlag:(_s,k)=>k==='cast'?{enabled:true,invisible:true,shape:'self',duration:1,unit:'hours'}:{timeMode:'calendar',gameDuration:2,gameUnit:'hours'}}).duration,1);
assert.deepEqual(invisibilityChange({getFlag:()=>({invisible:true}),statuses:new Set(['invisible','prone'])},false),{statuses:['prone']});
assert.equal(damage,0);
game.modules.get('tagmar-calendario').active=false;
await assert.rejects(handleItemUse(item),/Ative o calendário/);
console.log('PASS: invisibilidade aplicada/renovada, expiração/remover/desativar, fontes simultâneas e hidden preservados, RM inicial/por turno, área/persistência, reconexão e prazo. Métodos reais V14 conferiram condições, visão comum/especial, mestre e dono.');
