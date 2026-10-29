const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
(async () => {
  const root = path.resolve(__dirname, '../tagmar-token-fx/scripts');
  const timing = await import(pathToFileURL(path.join(root,'timers.mjs')));
  const jb = await import(pathToFileURL(path.join(root,'jb2a.mjs')));
  const flags = {};
  const actor = {uuid:'Actor.mage',isOwner:true,items:[]};
  let removals = 0, serial = 0;
  global.foundry = {utils:{randomID:()=>`timerABC${++serial}`}};
  const item = {uuid:'Actor.mage.Item.shield',actor,isOwner:true,getFlag:(_m,key)=>flags[key],
    setFlag:async(_m,key,value)=>{flags[key]=structuredClone(value);},unsetFlag:async(_m,key)=>{delete flags[key];removals++;}};
  actor.items.push(item);
  const source={id:'one',actor,center:{x:20,y:20},document:{uuid:'Scene.s.Token.one',isOwner:true,hidden:false}};
  const canvas={ready:true,scene:{id:'s'},tokens:{placeables:[source],controlled:[source]}};
  const gm={id:'gm',isGM:true,active:true,targets:new Set()};
  const settings=new Map();
  const calendar={active:true,api:{getDate:()=>({year:1500,dayOfYear:Math.floor(game.time.worldTime/86400)})}};
  const game={user:gm,users:[gm],actors:{contents:[actor]},scenes:{contents:[]},time:{worldTime:0},
    modules:new Map([['sequencer',{active:true}],['JB2A_DnD5e',{active:true}],['tagmar-calendario',calendar]]),
    settings:{get:(m,k)=>settings.get(`${m}.${k}`)}};
  const live=new Map(),started=[],ended=[];
  const sequencer={Database:{publicFlattenedSimpleEntries:['jb2a.shield.blue']},EffectManager:{
    getEffects:({name})=>live.has(name)?[live.get(name)]:[],
    endEffects:async({name},push)=>{assert.equal(push,false);ended.push(name);live.delete(name);}}};
  class Sequence {
    constructor(){this.effects=[];}
    effect(){const e={};this.effects.push(e);const chain={};for(const method of ['file','name','origin','atLocation','size','scaleToObject','scale','duration','fadeIn','fadeOut','tint','attachTo','persist','temporary'])chain[method]=(...args)=>{e[method]=args;return chain;};return chain;}
    async play(options){started.push({effects:this.effects,options});for(const e of this.effects)if(e.name)live.set(e.name[0],e);}
  }
  const config=jb.animationConfiguration({getFlag:()=>({enabled:true,automatic:true,file:'jb2a.shield.blue',mode:'self',timeMode:'calendar',gameDuration:2,gameUnit:'minutes',radius:2,tintEnabled:true,tint:'#ff0000',lightEnabled:true,lightBright:3,lightDim:6,lightColor:'#ffaa44'})});
  const options={game,canvas,source,targets:[source]};
  const build=()=>timing.createTimerController({getGame:()=>game,getCanvas:()=>canvas,getSequencer:()=>sequencer,getSequence:()=>Sequence,normalize:jb.animationConfiguration,style:jb.styleAnimation,onError:error=>{throw error;}});
  let controller=build();
  await timing.startTimedAnimation(item,config,options);
  const first=flags.activeJb2a;
  assert.equal(first.endsAt-first.startsAt,120);
  await controller.refresh();
  assert.equal(started.length,1);assert.deepEqual(started[0].options,{local:true});
  const effect=started[0].effects[0];
  assert.deepEqual(effect.size,[{width:4,height:4},{gridUnits:true}]);
  assert.match(effect.origin[0],/tagmar-fx-light:/);assert.equal(JSON.parse(effect.origin[0].slice(16)).color,'#ffaa44');
  assert.equal(effect.tint[0],'#ff0000');assert.equal(effect.attachTo[0],source);
  assert('persist' in effect && 'temporary' in effect && !('duration' in effect));
  await controller.sync();assert.equal(started.length,1); // Relógio pausado não duplica nem termina.
  game.time.worldTime=60;await controller.sync();assert.equal(live.size,1);
  controller=build();await controller.refresh();assert.equal(started.length,1); // Reabertura sem duplicar.
  live.clear();controller=build();await controller.refresh();assert.equal(started.length,2); // Reconstrução após reload.
  canvas.scene={id:'other'};await controller.sync();assert.equal(live.size,0);
  canvas.scene={id:'s'};await controller.sync();assert.equal(live.size,1);
  game.time.worldTime=120;
  game.user={id:'player',isGM:false};await controller.sync();assert.equal(live.size,0);assert.equal(removals,0);
  game.user=gm;await controller.sync();assert.equal(removals,1);assert.equal(flags.activeJb2a,undefined);
  game.time.worldTime=0;await controller.refresh();assert.equal(live.size,0); // Expirado não ressuscita.
  game.time.worldTime=86390;
  await timing.startTimedAnimation(item,{...config,gameDuration:30,gameUnit:'seconds'},options);
  await controller.update(item);const oldName=[...live.keys()][0];
  game.time.worldTime=86405;await controller.sync();assert.equal(live.size,1);
  await timing.startTimedAnimation(item,config,options);await controller.update(item);
  assert.equal(live.size,1);assert(!live.has(oldName)); // Reaplicar renova/substitui.
  settings.set('core.photosensitiveMode',true);await controller.sync();assert.equal(live.size,0);
  settings.clear();await controller.sync();assert.equal(live.size,1);
  await item.unsetFlag('tagmar-token-fx','activeJb2a');await controller.update(item);assert.equal(live.size,0);
  await assert.rejects(timing.startTimedAnimation(item,{...config,gameDuration:0},options),/duração/);
  await timing.startTimedAnimation(item,{...config,radius:0,scale:8},options);
  await controller.update(item);
  assert.deepEqual(started.at(-1).effects[0].scaleToObject,[8]);
  assert(!('duration' in started.at(-1).effects[0]));
  await item.unsetFlag('tagmar-token-fx','activeJb2a');await controller.update(item);
  calendar.active=false;
  await assert.rejects(timing.startTimedAnimation(item,config,options),/Calendário/);
  calendar.active=true;
  // O Sequencer real mantém play() pendente durante a persistência.
  // A fila precisa continuar para expirar, inclusive durante carregamento lento.
  class PersistentSequence extends Sequence {
    play(options) { super.play(options); return new Promise(() => {}); }
  }
  controller=timing.createTimerController({getGame:()=>game,getCanvas:()=>canvas,getSequencer:()=>sequencer,
    getSequence:()=>PersistentSequence,normalize:jb.animationConfiguration,style:jb.styleAnimation});
  await timing.startTimedAnimation(item,config,options);
  await Promise.race([controller.refresh(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Fila bloqueada pelo efeito persistente')),1000))]);
  const persistentName=[...live.keys()][0];
  await controller.sync();assert.equal(live.size,1);
  game.time.worldTime+=121;await controller.sync();assert.equal(live.size,0);
  live.set(persistentName,{}); // Simula efeito criado tardiamente.
  await controller.effectCreated({data:{name:persistentName,sceneId:'s'}});
  assert.equal(live.size,0);
  // O script copiado é executável, independente e usa a mesma cor/raio, mas duração breve.
  const command=jb.animationScript(config);
  const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
  await new AsyncFunction('game','canvas','Sequencer','Sequence','ui',command)(game,canvas,sequencer,Sequence,{notifications:{warn:message=>{throw Error(message);}}});
  const exported=started.at(-1).effects[0];
  assert.deepEqual(exported.size,effect.size);assert.deepEqual(exported.tint,effect.tint);
  assert.equal(exported.duration[0],3000);assert(!('persist' in exported));
  console.log('PASS: raio/cor/script executável, duração de calendário, pausa, virada do dia, reload, troca de cena, expiração em jogador/GM, renovação sem duplicar, remoção e fotossensibilidade.');
})().catch(error=>{console.error(error);process.exitCode=1;});
