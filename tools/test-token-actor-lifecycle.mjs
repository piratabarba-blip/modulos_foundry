import assert from 'node:assert/strict';
import fs from 'node:fs';
import {changeTokenActor,sweepRetiredTokenActors,registerTokenActorLifecycle} from '../tagmar-token-fx/scripts/token-actor-lifecycle.mjs';

// Exercise the installed 14.370 request conversion: a retired actor still
// points to its token, whose delta may now be null after returning to linked.
const source=fs.readFileSync(process.env.TAGMAR_TEST_FOUNDRY_SOURCE??'C:/Users/PIRATA/AppData/Local/Programs/Foundry Virtual Tabletop/resources/app/public/scripts/foundry.mjs','utf8');
const begin=source.indexOf('  static #adjustActorDeltaRequest(');
const end=source.indexOf('\n  /* -------------------------------------------- */',source.indexOf('  static #getTokenAncestor(',begin));
assert(begin>0&&end>begin);
const methods=source.slice(begin,end).replace('static #adjustActorDeltaRequest','static adjustActorDeltaRequest');
class TokenDocument {}
class ActorBase {}
const registry=new Set();
registry.deleteFromParent=actor=>{for(const effect of [...registry])if(effect.actor===actor)registry.delete(effect);};
registry.addFromParent=actor=>{for(const effect of actor.effects??[])registry.add(effect);};
globalThis.foundry={documents:{ActiveEffect:{registry}},utils:{isSubclass:(type,base)=>type===base,parseUuid:()=>({embedded:['Token','token','Actor','actor']})}};
const Backend=new Function('Actor$1','TokenDocument','foundry',`return class ClientDatabaseBackend {${methods}}`)(ActorBase,TokenDocument,foundry);
const request=(actor,effect=false)=>Backend.adjustActorDeltaRequest(effect?class ActiveEffect{}:ActorBase,{operation:{parent:effect?actor:actor.token,updates:[{}]}});
const scene={id:'scene',tokens:new Map()};
globalThis.game={scenes:new Map([['scene',scene]])};
globalThis.ui={windows:{}};
const token=new TokenDocument();Object.assign(token,{id:'token',parent:scene,delta:{id:'delta',uuid:'Scene.scene.Token.token.ActorDelta.delta'}});scene.tokens.set(token.id,token);
const old={isToken:true,token,parent:token,uuid:'old',apps:{},items:[],effects:[]};
const world={isToken:false,uuid:'world',apps:{},items:[],effects:[]};
const effect={actor:old,parent:old};old.effects=[effect];token.actor=old;
const worldEffect={actor:world,parent:world};world.effects=[worldEffect];registry.add(effect);registry.add(worldEffect);
let closed=0,updates=0;
const app={actor:old,async close(options){assert.equal(options.submit,false);closed++;}};
old.apps.sheet=app;ui.windows.sheet=app;
old.items=[{apps:{itemSheet:{async close(options){assert.equal(options.submit,false);closed++;}}}}];

// Reproduce both failures from the screenshots without touching any world data.
token.delta=null;
assert.throws(()=>request(old),/null/);
assert.throws(()=>request(old,true),/null/);
token.delta={id:'delta',uuid:'Scene.scene.Token.token.ActorDelta.delta'};
await changeTokenActor(token,async()=>{
 assert.equal(closed,2,'Actor and item sheets close before delta replacement');
 assert(!registry.has(effect),'Old effect removed before mutation');
 token.actor=world;token.delta=null;updates++;
});
assert.equal(updates,1);assert(!registry.has(effect));assert(registry.has(worldEffect));
await sweepRetiredTokenActors();assert(!registry.has(effect));

// Remote client: its old sheet and registry are retired on the received update.
registry.add(effect);closed=0;
await sweepRetiredTokenActors();assert.equal(closed,2);assert(!registry.has(effect));assert(registry.has(worldEffect));
// Rejection restores the previous registry membership and propagates the error.
token.actor=old;token.delta={id:'delta'};registry.add(effect);
await assert.rejects(changeTokenActor(token,async()=>{throw Error('Update denied');}),/Update denied/);
assert(registry.has(effect));assert.equal(token.actor,old);
// Deletion does not re-register effects on a token no longer in its scene.
await changeTokenActor(token,async()=>scene.tokens.delete(token.id));
assert(!registry.has(effect));assert(registry.has(worldEffect));
const hooks=new Map();globalThis.Hooks={on:(name,fn)=>hooks.set(name,fn)};
registerTokenActorLifecycle();assert(hooks.has('updateToken')&&hooks.has('deleteToken')&&hooks.has('deleteScene'));
registry.add(effect);hooks.get('updateToken')(token,{x:20});assert(registry.has(effect),'Movement alone does not sweep the registry');
hooks.get('deleteToken')(token);await new Promise(resolve=>setTimeout(resolve,0));assert(!registry.has(effect));
console.log('PASS: real 14.370 null-delta request failures reproduced; close without submit before replacement, retired effects removed, remote/delete cleanup, rollback and live world effects preserved.');
