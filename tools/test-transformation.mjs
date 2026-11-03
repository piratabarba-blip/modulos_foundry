import assert from 'node:assert/strict';
import {beginTransformation,checkTransformation,returnTransformation,resolveForm,resolveReturn,registerTransformations,transformationState} from '../tagmar-token-fx/scripts/transformation.mjs';
import {resolveRequest} from '../tagmar-token-fx/scripts/casts.mjs';
import {repeatResistance} from '../tagmar-token-fx/scripts/recurring-resistance.mjs';
const ID='tagmar-token-fx', clone=structuredClone;
const coll=values=>Object.assign(values,{get(id){return this.find(x=>x.id===id);}});
const gm={id:'gm',active:true,isGM:true},player={id:'player',active:true,isGM:false};
let serial=0;
const chat=[],hooks=new Map();
globalThis.Hooks={on:(name,fn)=>hooks.set(name,[...(hooks.get(name)??[]),fn])};
globalThis.foundry={utils:{randomID:()=>String(++serial).padStart(16,'0'),escapeHTML:s=>String(s).replaceAll('<','&lt;')}};
globalThis.ui={notifications:{warn:()=>{},error:()=>{}}};
globalThis.ChatMessage={getSpeaker:()=>({}),create:async data=>{chat.push(data);return{id:String(++serial)};}};
globalThis.game={user:gm,users:coll([gm,player]),time:{worldTime:0},modules:new Map([
  ['tagmar-calendario',{active:true,api:{getDate:()=>({year:1500,dayOfYear:Math.floor(game.time.worldTime/86400)})}}]
])};
function assign(object,data){for(const [path,value] of Object.entries(data)){
  const parts=path.split('.');let p=object;for(const k of parts.slice(0,-1))p=p[k]??={};p[parts.at(-1)]=clone(value);
}}
function actor(data,token=null){
  const a={...clone(data),id:data._id,documentName:'Actor',uuid:token?token.uuid+'.Actor.'+data._id:'Actor.'+data._id,
    isToken:!!token,token,isOwner:true,testUserPermission:()=>true,toObject:()=>clone(data),
    _aplicarDano:async()=>{},_rollResistencia:async()=>({success:true})};
  a.effects=coll((data.effects??[]).map(raw=>({...clone(raw),id:raw._id,parent:a,getFlag(s,k){return this.flags?.[s]?.[k];},async update(d){assign(this,d);}})));
  a.createEmbeddedDocuments=async(_type,values)=>{for(const v of values){a.effects.push({...clone(v),id:String(++serial),parent:a,getFlag(s,k){return this.flags?.[s]?.[k];},async update(d){assign(this,d);}});}};
  return a;
}
const baseData={_id:'hero',name:'Herói',type:'Personagem',img:'hero.webp',ownership:{player:3},system:{ef:{value:25},rm:8},
  items:[{_id:'sword',name:'Espada'},{_id:'spell',name:'Transformação'}],effects:[{_id:'original',name:'Original'}],flags:{personal:{a:1}}};
const formData={_id:'wolf',name:'Lobo',type:'NPC',img:'wolf.webp',ownership:{default:0},system:{ef_npc:{value:18},eh_npc:{value:9},rm:6},
  items:[{_id:'bite',name:'Mordida',flags:{[ID]:{activeJb2a:{id:'old'}}}}],effects:[{_id:'buff',name:'Forma'}],flags:{}};
const base=actor(baseData),form=actor(formData);
form.prototypeToken={toObject:()=>({texture:{src:'wolf-token.webp',scaleX:1.2,scaleY:1.2},width:2,height:2})};
game.actors=coll([base,form]);
const scene={id:'scene',grid:{size:100,distance:1}};game.scenes=coll([scene]);
// Modelo das coleções delta: itens base não tombstonados continuam existindo.
const embedded=(base,delta)=>[...delta.filter(x=>!x._tombstone),...base.filter(x=>!delta.some(d=>d._id===x._id))];
function makeToken(linked){
  const raw={_id:'token',actorId:'hero',actorLink:linked,delta:linked?{_id:'token'}:{_id:'token',system:{ef:{value:21},rm:8},items:[{_id:'personal',name:'Item local'}]},
    name:'Herói',texture:{src:'hero-token.webp',scaleX:0.8,scaleY:0.8},width:1,height:1,bar1:{attribute:'ef'},bar2:{attribute:'eh'},
    x:120,y:230,rotation:45,disposition:1,sight:{enabled:true},light:{bright:3},flags:{other:{value:7}}};
  const token={id:'token',uuid:'Scene.scene.Token.token',parent:scene,baseActor:base,toObject:()=>clone(raw),getFlag:(s,k)=>raw.flags?.[s]?.[k],
    async update(data){assign(raw,data);this.refresh();},refresh(){
      Object.assign(this,clone(raw));
      const d=raw.actorLink?{}:raw.delta??{};
      this.actor=raw.actorLink?base:actor({...baseData,...d,_id:'hero',items:embedded(baseData.items,d.items??[]),effects:embedded(baseData.effects,d.effects??[])},this);
    }};
  token.refresh();scene.tokens=coll([token]);return token;
}
let token=makeToken(true);
const config={duration:10,unit:'rounds',enabled:true,shape:'self',resolution:'none',transform:true,formUuid:form.uuid};
const item={id:'spell',uuid:'Actor.hero.Item.spell',actor:base,type:'Magia',name:'Transformação',img:'spell.webp',system:{},
  getFlag:(_s,k)=>k==='cast'?config:null,toObject:()=>({_id:'spell',name:'Transformação'}),setFlag:async()=>{},unsetFlag:async()=>{}};
globalThis.fromUuid=async uuid=>uuid===form.uuid?form:uuid===item.uuid?item:null;
assert.equal(await resolveForm(form.uuid,player),form);
await assert.rejects(resolveForm('bad',gm));
const originalPermission=form.testUserPermission;form.testUserPermission=()=>false;
await assert.rejects(resolveForm(form.uuid,player));form.testUserPermission=originalPermission;
for(const linked of [true,false]){
  token=makeToken(linked);item.actor=token.actor;
  const before=token.toObject(),oldBase=base.toObject(),oldForm=form.toObject();
  const state=await beginTransformation(token,item,config,form,'cast');
  assert.equal(token.actor.type,'NPC');assert.equal(token.actor.system.ef_npc.value,18);
  assert.equal(state.endsAt-state.startsAt,150);assert.equal(token.actor.ownership.player,3);
  assert(!token.actor.items.some(i=>i._id==='sword'));assert(!token.actor.effects.some(e=>e.id==='original'));
  assert(!token.actor.items.find(i=>i._id==='bite').flags[ID].activeJb2a);
  if(!linked)assert(token.actor.items.some(i=>i._id==='spell'));
  await assert.rejects(beginTransformation(token,item,config,form,'again'));
  await token.update({x:400,rotation:80});token.actor.system.ef_npc.value=-100;
  await checkTransformation(token);
  assert(!transformationState(token));assert.equal(token.actor.system.ef.value,linked?25:21);
  const after=token.toObject();after.x=before.x;after.rotation=before.rotation;
  // An empty module flags namespace is harmless; everything else roundtrips.
  delete after.flags[ID];assert.deepEqual(after,before);
  assert.deepEqual(base.toObject(),oldBase);assert.deepEqual(form.toObject(),oldForm);
}
// Persisted snapshot survives reconnect, time expiration and duplicate checks.
token=makeToken(true);item.actor=base;game.time.worldTime=0;
await beginTransformation(token,item,config,form,'clock');
token.refresh();game.time.worldTime=149;await checkTransformation(token);assert(transformationState(token));
const count=chat.length;game.time.worldTime=150;await checkTransformation(token);await checkTransformation(token);assert.equal(chat.length,count+1);
// Missing original actor preserves backup; secondary clients cannot restore.
await beginTransformation(token,item,config,form,'safe');game.actors=coll([form]);
await assert.rejects(returnTransformation(token));assert(transformationState(token));game.actors=coll([base,form]);
game.user=player;assert.equal(await returnTransformation(token),false);game.user=gm;
const state=transformationState(token);
await resolveReturn({author:player,getFlag:()=>({status:'pending',sceneId:'scene',tokenId:'token',id:state.id}),update:async()=>{}});
assert(!transformationState(token));
// Full cast pipeline: one self cast, visible timer, then RM success at next turn.
token=makeToken(true);item.actor=base;game.time.worldTime=0;
const placeable={id:token.id,name:token.name,document:token,center:{x:0,y:0},get actor(){return token.actor;}};
globalThis.canvas={ready:true,scene,tokens:{placeables:[placeable]}};
config.repeatRM=true;config.resolution='rm';config.fa=4;
base._rollResistencia=async()=>({success:false});
const combat={id:'combat',started:true,round:1,turn:0,combatants:coll([{id:'fighter',token,get actor(){return token.actor;}}])};game.combat=combat;
const requestState={castRequest:{itemUuid:item.uuid,sourceId:token.id,sceneId:scene.id,origin:{x:0,y:0},direction:0,targets:[],status:'pending'}};
const request={id:'cast-full',author:gm,whisper:[],getFlag:(_s,k)=>requestState[k],update:async changes=>{for(const [k,v] of Object.entries(changes)){if(k.startsWith('flags.'+ID+'.'))assign(requestState,{[k.slice(('flags.'+ID+'.').length)]:v});}}};
await resolveRequest(request);
assert.equal(requestState.castRequest.status,'done');assert(transformationState(token));
assert.equal(token.actor.effects.find(e=>e.getFlag(ID,'spellTimer')).name,item.name);
await repeatResistance(combat,{round:1,turn:0},{round:2,turn:0,combatantId:'fighter'});
assert(!transformationState(token));
// Hooks return on EF zero; disabled/deleted matching marker also returns.
await beginTransformation(token,item,config,form,'hooks');
const tasks=[];registerTransformations(fn=>tasks.push(fn));
while(tasks.length)await tasks.shift()();
token.actor.system.ef_npc.value=0;
for(const fn of hooks.get('updateActor'))fn(token.actor);
while(tasks.length)await tasks.shift()();assert(!transformationState(token));
await beginTransformation(token,item,config,form,'effect');
const effect={parent:token.actor,disabled:true,getFlag:()=>({transformationId:transformationState(token).id})};
for(const fn of hooks.get('updateActiveEffect'))fn(effect);
while(tasks.length)await tasks.shift()();assert(!transformationState(token));
// Fumaça breve não vira visual persistente por existir uma transformação longa.
game.modules.set('sequencer',{active:true});game.modules.set('JB2A_DnD5e',{active:true});
game.settings={get:(_scope,key)=>key==='jb2aEnabled'};
globalThis.Sequencer={Database:{publicFlattenedSimpleEntries:['jb2a.smoke']}};
const played=[];
globalThis.Sequence=class{
  constructor(){this.effects=[];}
  effect(){const effect={};this.effects.push(effect);const chain={};for(const method of ['file','name','atLocation','scaleToObject','duration','fadeIn','fadeOut'])chain[method]=(...args)=>{effect[method]=args;return chain;};return chain;}
  async play(){played.push(this.effects);}
};
const visualFlags={jb2aFx:{enabled:true,file:'jb2a.smoke',mode:'self',timeMode:'animation',duration:1}};
item.isOwner=true;item.getFlag=(_scope,key)=>key==='cast'?config:visualFlags[key];
item.setFlag=async(_scope,key,value)=>{visualFlags[key]=clone(value);};item.unsetFlag=async(_scope,key)=>{delete visualFlags[key];};
config.resolution='none';config.repeatRM=false;
for(const mode of ['animation','calendar']){
  game.time.worldTime=0;visualFlags.jb2aFx.timeMode=mode;requestState.castRequest.status='pending';
  await resolveRequest(request);
  assert.equal(requestState.castRequest.status,'done');assert(transformationState(token));
  assert.equal(transformationState(token).endsAt-transformationState(token).startsAt,150);
  if(mode==='animation'){
    assert.equal(played.length,1);assert.equal(played[0].length,1);
    assert.deepEqual(played[0][0].duration,[1000]);assert(!visualFlags.activeJb2a);
  }else{
    assert.equal(played.length,1);assert.equal(visualFlags.activeJb2a.endsAt-visualFlags.activeJb2a.startsAt,150);
    assert.equal(transformationState(token).visualId,visualFlags.activeJb2a.id);
  }
  game.time.worldTime=1;await checkTransformation(token);assert(transformationState(token));
  game.time.worldTime=150;await checkTransformation(token);assert(!transformationState(token));assert(!visualFlags.activeJb2a);
}
console.log('OK: transformação, retorno, RM por turno e visual breve de 1s independente da transformação de 150s; visual de calendário sincronizado.');
