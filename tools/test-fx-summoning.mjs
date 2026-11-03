import assert from 'node:assert/strict';
import {beginSummon,dismissSummon,checkSummons,resolveSummonForm,summonPosition,summonState,registerSummons} from '../tagmar-token-fx/scripts/summoning.mjs';
import {resolveRequest} from '../tagmar-token-fx/scripts/casts.mjs';
import {castConfiguration} from '../tagmar-token-fx/scripts/cast-rules.mjs';
import {scheduleSummons,processSummonJobs,summonJobs,registerSummonJobs} from '../tagmar-token-fx/scripts/summon-jobs.mjs';
const ID='tagmar-token-fx';
const collection=values=>{values.get=id=>values.find(x=>x.id===id);return values;};
const gm={id:'gm',isGM:true,active:true},p={id:'player',isGM:false,active:true},other={id:'other',isGM:false,active:true};
let serial=0,approved=[],failToken=false;
const chat=[],hooks=new Map();
globalThis.foundry={utils:{randomID:()=>String(++serial).padStart(16,'a'),escapeHTML:s=>String(s).replaceAll('<','&lt;')}};
globalThis.Hooks={on:(key,fn)=>{const entries=hooks.get(key)??[];entries.push(fn);hooks.set(key,entries);}};
globalThis.ui={notifications:{warn:()=>{},error:()=>{}}};
globalThis.game={user:gm,users:collection([gm,p,other]),time:{worldTime:0},actors:collection([]),messages:collection([]),
  settings:{get:()=>approved,set:async(_s,_k,value)=>approved=value},
  modules:new Map([[ID,{active:true}],['tagmar-calendario',{active:true,api:{getDate:()=>({year:1500,dayOfYear:0})}}]])};
globalThis.ChatMessage={getSpeaker:()=>({}),create:async data=>{chat.push(data);return{id:'chat'+chat.length};}};
const original={_id:'original',name:'Enviado de Ganis',type:'NPC',img:'portrait.webp',system:{ef_npc:{value:50},eh_npc:{value:20}},
  items:[{_id:'sword',type:'Combate',flags:{[ID]:{activeJb2a:{id:'old'},cast:{enabled:false}}}}],
  effects:[{_id:'oldTimer',flags:{[ID]:{spellTimer:{endsAt:999}}}},{_id:'permanent'}],
  ownership:{default:0},prototypeToken:{texture:{src:'token.webp'},width:2,height:1,actorLink:true}};
const form={id:'original',uuid:'Compendium.creatures.Actor.original',documentName:'Actor',type:'NPC',name:original.name,img:original.img,system:original.system,
  getFlag:()=>null,testUserPermission:()=>true,toObject:()=>structuredClone(original),prototypeToken:{toObject:()=>structuredClone(original.prototypeToken)}};
const caster={id:'caster',uuid:'Actor.caster',isOwner:true,testUserPermission:user=>user.id===p.id||user.isGM};
const source={id:'source',actor:caster,disposition:1};
const flags={cast:{enabled:true,useType:'summon',formUuid:form.uuid,duration:1,unit:'minutes'}};
const item={uuid:'Actor.caster.Item.summon',name:'Invocar enviado',type:'Magia',img:'spell.webp',system:{},actor:caster,isOwner:true,
  getFlag:(_s,key)=>flags[key],setFlag:async(_s,key,v)=>flags[key]=v,unsetFlag:async(_s,key)=>delete flags[key]};
globalThis.fromUuid=async uuid=>uuid===form.uuid?form:uuid===item.uuid?item:null;
const scene={id:'scene',grid:{size:100,distance:1},width:1000,height:1000,tokens:collection([source]),
  flags:{},getFlag(s,k){return this.flags[k];},async setFlag(s,k,v){this.flags[k]=structuredClone(v);},
  async createEmbeddedDocuments(_type,rows){if(failToken)throw Error('token failure');return rows.map(data=>{const t={...structuredClone(data),id:'t'+(++serial),parent:scene,getFlag:(s,k)=>t.flags?.[s]?.[k]};this.tokens.push(t);return t;});},
  async deleteEmbeddedDocuments(_type,ids){for(const id of ids){const index=this.tokens.findIndex(t=>t.id===id);if(index>=0)this.tokens.splice(index,1);}}};
game.scenes=collection([scene]);globalThis.canvas={ready:true,scene,tokens:{placeables:[]}};
globalThis.Actor={async create(data){const actor={...structuredClone(data),id:data._id,uuid:'Actor.'+data._id,
  getFlag:(s,k)=>actor.flags?.[s]?.[k],setFlag:async(s,k,v)=>actor.flags[s][k]=structuredClone(v),unsetFlag:async(s,k)=>delete actor.flags[s][k],
  async getTokenDocument(options){return{toObject:()=>({...structuredClone(actor.prototypeToken),...options,actorId:actor.id})};},
  async delete(){game.actors.splice(game.actors.indexOf(actor),1);}};game.actors.push(actor);return actor;}};
const request={itemUuid:item.uuid,sceneId:scene.id,sourceId:source.id,origin:{x:300,y:400},direction:0,targets:[],status:'pending'};
let msgSerial=0;
function message(){const state=structuredClone(request);const msg={id:'request'+(++msgSerial),author:p,whisper:['gm','player'],getFlag:()=>state,
  async update(data){if(data[`flags.${ID}.castRequest.status`])state.status=data[`flags.${ID}.castRequest.status`];this.content=data.content??this.content;}};game.messages.push(msg);return msg;}
const c=castConfiguration(item);
assert(c.summon);assert.equal(c.shape,'point');
await assert.rejects(resolveSummonForm(form.uuid,p),/mestre/);approved=[form.uuid];
assert.equal(await resolveSummonForm(form.uuid,p),form);
await assert.rejects(beginSummon(item,c,request,message(),other),/permissão/);
assert.throws(()=>summonPosition(scene,{x:0,y:0},2,1),/dentro/);
const snapshot=JSON.stringify(original),msg=message();
await resolveRequest(msg);assert.equal(msg.getFlag().status,'done');assert.match(msg.content,/minutos/);
assert.equal(game.actors.length,1);const a=game.actors[0],state=summonState(a),t=scene.tokens.get(state.tokenId);
assert.equal(t.x,200);assert.equal(t.y,350);assert.equal(t.actorLink,false);assert.equal(t.disposition,1);
assert.equal(a.ownership[p.id],3);assert.equal(a.ownership.default,0);assert.equal(a.ownership.other,undefined);
assert.equal(a.system.ef_npc.value,50);assert.equal(a.effects.length,1);assert(!a.items[0].flags[ID].activeJb2a);
assert.equal(JSON.stringify(original),snapshot);
await resolveRequest(msg);assert.equal(game.actors.length,1); // done request never duplicates
await assert.rejects(beginSummon(item,c,request,msg,p),/já foi criada/);
game.user=p;await dismissSummon(a);assert.equal(game.actors.length,1);game.user=gm;
await checkSummons();assert.equal(game.actors.length,1);
game.time.worldTime=61;await checkSummons();assert.equal(game.actors.length,0);assert.equal(scene.tokens.length,1);
// Nova invocação independente; encerramento manual não remove um visual mais novo.
game.time.worldTime=70;const second=await beginSummon(item,c,request,message(),p);
await second.actor.setFlag(ID,'summon',{...second.state,visualId:'old'});flags.activeJb2a={id:'new'};
await dismissSummon(second.actor);assert.equal(flags.activeJb2a.id,'new');assert.equal(game.actors.length,0);
// Falha ao criar token limpa somente a ficha temporária recém-criada.
failToken=true;await assert.rejects(beginSummon(item,c,request,message(),p),/token failure/);failToken=false;assert.equal(game.actors.length,0);
// Token apagado pelo mestre: remove a ficha temporária. Cópias manuais são preservadas.
const third=await beginSummon(item,c,request,message(),p);
const manual={...third.actor,id:'manual-copy',getFlag:()=>third.state};game.actors.push(manual);
await scene.deleteEmbeddedDocuments('Token',[third.token.id]);await checkSummons();assert.deepEqual(game.actors.map(a=>a.id),['manual-copy']);
game.actors.length=0;
// Remover antecipadamente exige uma solicitação autenticada de mestre.
const fourth=await beginSummon(item,c,request,message(),p),queue=[];
registerSummons(fn=>queue.push(fn));queue.length=0;
const invalid={author:p,getFlag:()=>({actorId:fourth.actor.id,id:fourth.state.id,status:'pending'})};
hooks.get('createChatMessage')[0](invalid);await assert.rejects(queue.shift()(),/inválida/);assert.equal(game.actors.length,1);
await dismissSummon(fourth.actor);
// Três cópias com atraso de duas rodadas, salvas na cena e sem depender da cena aberta.
game.time.worldTime=100;const batch={...c,summonDelay:2,summons:[{formUuid:form.uuid,formName:form.name,quantity:3}]};
const points=[{x:200,y:200},{x:400,y:200},{x:600,y:200}],batchRequest={...request,summonPoints:points};
const batchMessage=message();await scheduleSummons(item,batch,batchRequest,batchMessage,p);
assert.equal(game.actors.length,0);assert.equal(summonJobs(scene).length,1);
const due=summonJobs(scene)[0].dueAt;assert.equal(due%86400,130);
await assert.rejects(scheduleSummons(item,batch,batchRequest,batchMessage,p),/já foi/);
game.time.worldTime=129;await processSummonJobs();assert.equal(game.actors.length,0);
game.time.worldTime=130;canvas.ready=false;await processSummonJobs();canvas.ready=true;
assert.equal(game.actors.length,3);assert.equal(summonJobs(scene).length,0);assert.equal(batchMessage.getFlag().status,'done');
assert.deepEqual(game.actors.map(a=>summonState(a).entryId),['0','1','2']);
assert(game.actors.every(a=>summonState(a).startsAt===due&&summonState(a).endsAt===due+60));
await processSummonJobs();assert.equal(game.actors.length,3);
game.time.worldTime=189;await checkSummons();assert.equal(game.actors.length,3);
game.time.worldTime=190;await checkSummons();assert.equal(game.actors.length,0);
// Uma linha inválida não cria parte do grupo. Quantidades e pontos são validados.
await assert.rejects(scheduleSummons(item,{...batch,summons:[...batch.summons,{formUuid:'missing',quantity:1}]},{...request,summonPoints:[...points,points[0]]},message(),p));
await assert.rejects(scheduleSummons(item,{...batch,summons:[{formUuid:form.uuid,quantity:21}]},batchRequest,message(),p),/quantidades/);
await assert.rejects(scheduleSummons(item,batch,request,message(),p),/Posicione/);
assert.equal(summonJobs(scene).length,0);assert.equal(game.actors.length,0);
// Relógio saltou além da duração: não materializa criaturas já expiradas.
game.time.worldTime=200;const skipped=message();await scheduleSummons(item,batch,batchRequest,skipped,p);
game.time.worldTime=300;await processSummonJobs();assert.equal(game.actors.length,0);assert.equal(skipped.getFlag().status,'done');
// Sem mestre, não executa; ao retomar, usa a chegada prevista e o tempo restante.
await scheduleSummons(item,batch,batchRequest,message(),p);game.time.worldTime=340;game.user=p;
await processSummonJobs();assert.equal(game.actors.length,0);game.user=gm;await processSummonJobs();assert.equal(game.actors.length,3);
for(const actor of [...game.actors])await dismissSummon(actor);
// Revogar autorização durante a espera interrompe, sem criar cópia ou repetir automaticamente.
const revoked=message();await scheduleSummons(item,batch,batchRequest,revoked,p);approved=[];game.time.worldTime+=30;
await processSummonJobs();assert.equal(game.actors.length,0);assert.equal(summonJobs(scene)[0].status,'interrupted');
approved=[form.uuid];await processSummonJobs();assert.equal(game.actors.length,0);
// Cancelamento autenticado de uma espera, inclusive após reconectar.
const jobQueue=[];registerSummonJobs(fn=>jobQueue.push(fn));jobQueue.length=0;
const cancelFlag={id:revoked.id,sceneId:scene.id,status:'pending'};
const cancel={author:gm,getFlag:(_s,k)=>k==='cancelSummon'?cancelFlag:null,async update(){cancelFlag.status='done';}};
hooks.get('createChatMessage').at(-1)(cancel);await jobQueue.shift()();assert.equal(summonJobs(scene).length,0);
// Estado 'running' encontrado após interrupção não duplica nem continua às cegas.
const crashed=await scheduleSummons(item,batch,batchRequest,message(),p);
await scene.setFlag(ID,'summonQueue',[{...crashed,status:'running'}]);await processSummonJobs();assert.equal(summonJobs(scene)[0].status,'interrupted');
await scene.setFlag(ID,'summonQueue',[]);
// Visual de calendário em várias criaturas: remover uma preserva as restantes.
flags.jb2aFx={enabled:true,file:'jb2a.test',timeMode:'calendar',mode:'area'};
game.time.worldTime=500;const visualBatch=message();await scheduleSummons(item,{...batch,summonDelay:0},batchRequest,visualBatch,p);await processSummonJobs();
assert.equal(flags.activeJb2a.targets.length,3);assert.equal(flags.activeJb2a.config.mode,'targets');
await dismissSummon(game.actors[0]);assert.equal(flags.activeJb2a.targets.length,2);
for(const actor of [...game.actors])await dismissSummon(actor);assert.equal(flags.activeJb2a,undefined);
console.log('PASS: autorização do mestre, clique validado, cópia independente, permissões do evocador, uso sem JB2A, não duplicação, expiração/reconexão, encerramento, falha de criação e preservação da original/cópias manuais.');
console.log('PASS: múltiplas cópias, atraso em rodadas, duração após chegada, relógio avançado, outra cena, GM ausente, revogação, cancelamento, interrupção e visual compartilhado.');
