import assert from 'node:assert/strict';
import {effectLightSettings,createEffectLightController} from '../tagmar-token-fx/scripts/effect-lights.mjs';
import {animationConfiguration,styleAnimation,animationScript} from '../tagmar-token-fx/scripts/jb2a.mjs';

const config=animationConfiguration({getFlag:()=>({mode:'self',lightEnabled:true,lightBright:3,lightDim:6,lightColor:'#ffcc66'})});
let origin;
const chain={};for(const key of ['atLocation','scaleToObject','duration','fadeIn','fadeOut'])chain[key]=()=>chain;
chain.origin=value=>{origin=value;return chain;};styleAnimation(chain,config,{},{});
assert.match(origin,/tagmar-fx-light:/);
assert.match(animationScript(config),/"lightEnabled": true/);
assert.equal(animationConfiguration({getFlag:()=>undefined}).lightEnabled,false);
const makeEffect=(id,extra={})=>({id,data:{name:'tagmar-token-fx:Actor.a.Item.i:jb2a',origin,sceneId:'s'},ready:false,sprite:{},worldPosition:{x:150,y:250},sourceDocument:{level:'ground',elevation:2},...extra});
assert.equal(effectLightSettings(makeEffect('zero',{data:{name:'other',origin}})),null);
assert.equal(effectLightSettings(makeEffect('bad',{data:{name:'tagmar-token-fx:test',origin:'tagmar-fx-light:[]'}})),null);
assert.equal(effectLightSettings(makeEffect('zero',{data:{name:'tagmar-token-fx:test',origin:'tagmar-fx-light:{"bright":0,"dim":0,"color":"#ffcc66"}'}})),null);

function client(){
 let time=0,updates=0;const tasks=new Set(),sources=new Map([['existing',{untouched:true}]]),made=[],errors=[];
 const view={ready:true,scene:{id:'s',grid:{size:100,distance:2}},level:{id:'ground'},effects:{lightSources:sources},app:{ticker:{add:f=>tasks.add(f),remove:f=>tasks.delete(f)}},perception:{update:()=>updates++}};
 class Light{constructor(options){this.sourceId=options.sourceId;made.push(this);}initialize(data){this.data={...data};this.updates=(this.updates??0)+1;}add(){sources.set(this.sourceId,this);}destroy(){this.destroyed=true;sources.delete(this.sourceId);}}
 const controller=createEffectLightController({getCanvas:()=>view,getGame:()=>({user:{id:'p'}}),getSourceClass:()=>Light,now:()=>time,onError:e=>errors.push(e)});
 return {controller,view,made,sources,tasks,errors,get updates(){return updates;},advance(){time+=50;for(const tick of [...tasks])tick();}};
}
const a=client(),b=client(),effect=makeEffect('one');
a.controller.add(effect);a.controller.add(effect);b.controller.add(effect);
a.advance();assert.equal(a.made.length,0);
effect.ready=true;a.advance();b.advance();assert.equal(a.made.length,1);assert.equal(b.made.length,1);
assert.equal(a.made[0].data.bright,150);assert.equal(a.made[0].data.dim,300);
assert.equal(a.made[0].data.walls,true);assert.equal(a.made[0].data.vision,false);
assert.equal(a.made[0].data.level,'ground');assert.equal(a.made[0].data.elevation,2);
assert.equal(a.made[0].data.color,'#ffcc66');
const updated=a.made[0].updates;a.advance();assert.equal(a.made[0].updates,updated);
effect.worldPosition={x:300,y:350};a.advance();assert.equal(a.made[0].data.x,300);
// Oculto não revela a posição; reaparecer recria somente a luz do efeito.
effect.sourceDocument.hidden=true;a.advance();assert(a.made[0].destroyed);assert.equal(a.sources.size,1);
effect.sourceDocument.hidden=false;a.advance();assert.equal(a.sources.size,2);
a.controller.remove(effect);b.controller.remove(effect);assert.equal(a.sources.size,1);assert.equal(a.tasks.size,0);assert.equal(b.sources.size,1);
// Área fixa e dois efeitos sobrepostos têm fontes independentes.
const area=makeEffect('area',{ready:true,sourceDocument:null}),second=makeEffect('second',{ready:true});
a.controller.add(area);a.controller.add(second);a.advance();assert.equal(a.sources.size,3);
a.controller.remove(area);assert.equal(a.sources.size,2);
second.destroyed=true;a.advance();assert.equal(a.sources.size,1);
// Projétil ilumina o destino e usa o andar/elevação do alvo.
const shot=makeEffect('shot',{ready:true,targetPosition:{x:900,y:500},targetDocument:{level:'upper',elevation:5}});
shot.data.origin='tagmar-fx-light:'+JSON.stringify({bright:2,dim:1,color:'#112233',projectile:true});
a.controller.add(shot);a.advance();const light=a.made.at(-1);
assert.equal(light.data.x,900);assert.equal(light.data.dim,100);assert.equal(light.data.bright,100);assert.equal(light.data.level,'upper');
a.view.scene.id='other';a.advance();assert.equal(a.sources.size,1);assert.equal(a.tasks.size,0);
a.view.scene.id='s';a.controller.add(makeEffect('clear',{ready:true}));a.advance();a.controller.clear();assert.equal(a.sources.size,1);assert.equal(a.tasks.size,0);
assert(a.sources.get('existing').untouched);assert.deepEqual(a.errors,[]);
assert.deepEqual(b.errors,[]);
console.log('PASS: luz opcional, unidades da cena, cor, paredes, movimento, projétil no destino, áreas, clientes, sobreposição, fim/troca de cena e preservação das luzes existentes.');
