import assert from 'node:assert/strict';
import {visualArea,areaGeometry} from '../tagmar-token-fx/scripts/area-animation.mjs';
import {playAnimation,animationConfiguration,styleAnimation} from '../tagmar-token-fx/scripts/jb2a.mjs';
import {createTimerController} from '../tagmar-token-fx/scripts/timers.mjs';
const scene={id:'s',grid:{size:100,distance:5}};
const area=visualArea({shape:'circle',distance:10,width:2,angle:90},{origin:{x:500,y:300},direction:0},scene);
assert.equal(area.distance,200);
assert.deepEqual(areaGeometry(area).center,{x:500,y:300});
const ray=areaGeometry({...area,shape:'ray',direction:90});
assert.equal(ray.width,200);assert.equal(ray.height,40);assert.equal(ray.rotation,90);
assert(Math.abs(ray.center.x-500)<0.001);assert.equal(ray.center.y,400);
const cone=areaGeometry({...area,shape:'cone'});assert.equal(cone.points.length,364);
assert.throws(()=>visualArea({shape:'self'}, {origin:{x:0,y:0}},scene),/Escolha/);
globalThis.PIXI={Circle:class{constructor(x,y,radius){Object.assign(this,{x,y,radius});}},Polygon:class{constructor(points){this.points=points;}}};
globalThis.foundry={utils:{randomID:()=> 'areaTimer123'}};
const flags={},actor={uuid:'Actor.a',isOwner:true,items:[]};
const item={uuid:'Actor.a.Item.fire',actor,isOwner:true,getFlag:(_m,k)=>flags[k],setFlag:async(_m,k,v)=>flags[k]=structuredClone(v),unsetFlag:async(_m,k)=>delete flags[k]};actor.items.push(item);
const source={id:'source',actor,center:{x:0,y:0},document:{isOwner:true,uuid:'Scene.s.Token.source'}};
const canvas={ready:true,scene,tokens:{placeables:[source],controlled:[source]}};
const gm={id:'gm',active:true,isGM:true,targets:new Set()};
const game={user:gm,users:[gm],actors:{contents:[actor]},scenes:{contents:[]},time:{worldTime:0},settings:{get:()=>false},modules:new Map([
 ['sequencer',{active:true}],['JB2A_DnD5e',{active:true}],['tagmar-calendario',{active:true,api:{getDate:()=>({year:1500,dayOfYear:0})}}]])};
// Integração habilitada; fotossensibilidade desligada.
game.settings.get=(_m,k)=>k==='jb2aEnabled';
const played=[],live=new Map();
class Sequence {
 constructor(){this.effects=[];}
 effect(){const record={};this.effects.push(record);const chain={};for(const m of ['file','name','atLocation','size','rotate','mask','duration','fadeIn','fadeOut','tint','attachTo','persist','temporary'])chain[m]=(...args)=>{record[m]=args;return chain;};return chain;}
 async play(options){played.push({effects:this.effects,options});for(const e of this.effects)live.set(e.name[0],e);}
}
const sequencer={Database:{publicFlattenedSimpleEntries:['jb2a.fire']},EffectManager:{getEffects:({name})=>live.has(name)?[live.get(name)]:[],endEffects:async({name})=>live.delete(name)}};
const config=animationConfiguration({getFlag:()=>({enabled:true,file:'jb2a.fire',mode:'area',scale:8,radius:50,duration:4})});
const context={game,canvas,sequencer,SequenceClass:Sequence,area};
assert.equal(await playAnimation(item,config,context),1);assert.equal(played.at(-1).effects.length,1);
const effect=played.at(-1).effects[0];assert.deepEqual(effect.atLocation,[{x:500,y:300}]);
assert.deepEqual(effect.size,[{width:400,height:400}]);assert.equal(effect.mask[0].radius,200);
assert(!effect.attachTo);assert.equal(effect.duration[0],4000);
await assert.rejects(playAnimation(item,config,{...context,area:null,test:true}),/posicione/);
await playAnimation(item,config,{...context,area:{...area,shape:'cone',direction:45}});assert(played.at(-1).effects[0].mask[0].points.length);
await playAnimation(item,{...config,timeMode:'calendar',gameDuration:150,gameUnit:'seconds'},context);
assert.deepEqual(flags.activeJb2a.area,area);
const build=()=>createTimerController({getGame:()=>game,getCanvas:()=>canvas,getSequencer:()=>sequencer,getSequence:()=>Sequence,normalize:animationConfiguration,style:styleAnimation,onError:e=>{throw e;}});
let controller=build();await controller.refresh();assert.equal(played.at(-1).effects.length,1);
assert(!played.at(-1).effects[0].attachTo);assert(played.at(-1).effects[0].persist);
const count=played.length;source.center={x:999,y:999};canvas.tokens.placeables=[];await controller.sync();assert.equal(played.length,count);
live.clear();controller=build();await controller.refresh();assert.deepEqual(played.at(-1).effects[0].atLocation,[{x:500,y:300}]);
game.time.worldTime=150;await controller.sync();assert.equal(flags.activeJb2a,undefined);assert.equal(live.size,0);
console.log('PASS: área única sem alvos, raio real da cena, cone/linha orientados e recortados, sem seguir tokens, restauração e expiração pelo calendário.');
