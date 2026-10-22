import assert from 'node:assert/strict';
import {createWeatherLayerWrapper, installWeatherLayerSwap, isWeatherOnlyUpdate} from '../scripts/weather-layer-swap.mjs';
import {createWeatherTransition} from '../scripts/weather-transition.mjs';

const own={tagmarWeatherEffects:true};
assert.equal(isWeatherOnlyUpdate({weather:'rain',flags:{'tagmar-calendario':{weatherVisualState:{}}}},own),true);
// O backend acrescenta metadados de revisão; eles não mudam o canvas.
assert.equal(isWeatherOnlyUpdate({weather:'rain',_stats:{modifiedTime:1792639955455,lastModifiedBy:'gm',coreVersion:'14.369'}},own),true);
assert.equal(isWeatherOnlyUpdate({weather:'rain','_stats.modifiedTime':1792639955455},own),true);
for (const changed of [{weather:'rain',width:100},{weather:'rain',tokens:[]},{weather:'rain',active:true},
  {weather:'rain',environment:{}},{weather:'rain',flags:{other:{}}},{weather:'rain','flags.other.x':true}]) {
  assert.equal(isWeatherOnlyUpdate(changed,own),false);
}
assert.equal(isWeatherOnlyUpdate({weather:'rain',_stats:{modifiedTime:1},tokens:[]},own),false,'Stats do not hide a real canvas change');
assert.equal(isWeatherOnlyUpdate({weather:'rain'},{}),false);
assert.equal(isWeatherOnlyUpdate({flags:{}},own),false);

function client() {
  let time=0,index=0;
  const frames=new Map(),timer=new Map(),nativeCalls=[],built=[],failures=[];
  const scene={id:'scene',weather:'rain'};
  const tokens={selected:['token'],position:{x:10,y:20}}, vision={mask:'untouched'};
  const canvas={scene,ready:true,tokens,visibility:vision,draws:0,draw(){this.draws++;},
    weather:{weatherEffects:{alpha:1,destroyed:false},initializeEffects(effect){
      visual.initialize(this,effect); built.push(effect?.id ?? '');
    }}};
  const visual=createWeatherTransition({getCanvas:()=>canvas,now:()=>time,
    requestFrame:fn=>{frames.set(++index,fn);return index;},cancelFrame:id=>frames.delete(id),
    setTimer:fn=>{timer.set(++index,fn);return index;},clearTimer:id=>timer.delete(id)});
  const effects={rain:{id:'rain'},snow:{id:'snow'},rainStorm:{id:'rainStorm'},fog:{id:'fog'},blizzard:{id:'blizzard'}};
  const args={getCanvas:()=>canvas,getEffects:()=>effects,enabled:()=>true,afterSwap:()=>visual.ready(),onFallback:e=>{failures.push(e);visual.reset();}};
  const wrapper=createWeatherLayerWrapper(args);
  // Modelo mínimo do ramo _onUpdate conferido no código instalado 14.369.
  const native=(data,options,userId)=>{nativeCalls.push({data,options,userId});if ('weather' in data)canvas.draw();return 'native-result';};
  return {scene,canvas,tokens,vision,built,failures,visual,args,wrapper,native,nativeCalls,
    tick(ms){time+=ms;const callbacks=[...frames.values()];frames.clear();for(const fn of callbacks)fn();},
    prepare(target){visual.begin(scene,{token:String(++index),from:scene.weather,target,seconds:3});},
    update(target){scene.weather=target;return wrapper.call(scene,native,{_id:scene.id,weather:target,_stats:{modifiedTime:time,lastModifiedBy:'gm'},'flags.tagmar-calendario.weatherVisualState':{applied:target}},own,'gm');}};
}

// Dois clientes recebem a mesma preparação e atualização; nenhum redesenha.
const gm=client(), player=client();
for(const target of ['snow','rainStorm','fog','','rain']) {
  for(const c of [gm,player]) {
    c.prepare(target); c.tick(1500);
    const beforeTokens=JSON.stringify(c.tokens),beforeVision=JSON.stringify(c.vision);
    assert.equal(c.update(target),'native-result');
    assert.equal(c.canvas.weather.weatherEffects.alpha,0);
    c.tick(750); assert.equal(c.canvas.weather.weatherEffects.alpha,0.5);
    c.tick(750); assert.equal(c.canvas.weather.weatherEffects.alpha,1);
    assert.equal(c.canvas.draws,0,'No full canvas draw for calendar weather-only updates');
    assert.equal(JSON.stringify(c.tokens),beforeTokens); assert.equal(JSON.stringify(c.vision),beforeVision);
    assert.equal(c.built.at(-1),target);
  }
}
assert.deepEqual(gm.built,player.built);
{
  const c=client(); c.update('snow');
  assert.equal(c.built[0],'snow'); assert.equal(c.canvas.weather.weatherEffects.alpha,1,'Late client needs no prior preparation');
}
{
  const c=client(); const data={weather:'snow',flags:{'tagmar-calendario':{x:1}}};
  const snapshot=structuredClone(data); c.scene.weather='snow';
  c.wrapper.call(c.scene,c.native,data,own,'gm'); assert.deepEqual(data,snapshot,'Original update/hook data unchanged');
  assert.equal(c.nativeCalls[0].options,own); assert.equal(c.nativeCalls[0].userId,'gm');
}
for(const extra of [{width:800},{tokens:[]},{flags:{thirdparty:{x:1}}}, {environment:{darknessLevel:0.5}}]) {
  const c=client(); const data={weather:'snow',...extra};
  c.wrapper.call(c.scene,c.native,data,own,'gm');
  assert.equal(c.canvas.draws,1); assert.equal(c.nativeCalls[0].data,data); assert.equal(c.built.length,0);
}
{
  const c=client(); c.wrapper.call(c.scene,c.native,{weather:'snow'},{},'gm');assert.equal(c.canvas.draws,1,'Manual weather unchanged');
}
{
  const c=client(); c.args.enabled=()=>false;
  createWeatherLayerWrapper(c.args).call(c.scene,c.native,{weather:'snow'},own,'gm');assert.equal(c.canvas.draws,1,'Setting disables shortcut');
}
{
  const c=client(); c.canvas.scene={id:'other'};
  c.wrapper.call(c.scene,()=>{}, {weather:'snow'},own,'gm');assert.equal(c.built.length,0,'Not viewing updated scene');
}
{
  const c=client(); c.canvas.weather.initializeEffects=()=>{throw Error('shader failure');};
  c.update('snow');assert.equal(c.failures.length,1);assert.equal(c.canvas.draws,1,'Safe native fallback');
}
{
  const c=client(); let resolve;
  const promise=c.wrapper.call(c.scene,()=>new Promise(r=>resolve=r),{weather:'snow'},own,'gm');
  c.canvas.scene={id:'other'};resolve(7);assert.equal(await promise,7);assert.equal(c.built.length,0,'Async scene switch guarded');
}
{
  const calls=[];const c=client();
  assert.equal(installWeatherLayerSwap({...c.args,libWrapper:null}),false);
  assert.equal(installWeatherLayerSwap({...c.args,libWrapper:{register(...args){calls.push(args);}}}),true);
  assert.equal(calls[0][0],'tagmar-calendario');
  assert.equal(calls[0][1],'CONFIG.Scene.documentClass.prototype._onUpdate');
  assert.equal(calls[0][3],'WRAPPER');
}
{
  const c=client(), events=[];
  const wrapper=createWeatherLayerWrapper({...c.args,onDiagnostic:e=>events.push(e)});
  c.scene.weather='snow';
  const data={weather:'snow',_stats:{modifiedTime:123,lastModifiedBy:'gm'}};
  wrapper.call(c.scene,c.native,data,own,'gm');
  assert.equal(events[0].event,'layer-swapped');
  assert.ok(events[0].keys.includes('_stats'));
  assert.deepEqual(c.nativeCalls[0].data._stats,data._stats,'Pass metadata through, do not drop it');
  wrapper.call(c.scene,c.native,{...data,width:900},own,'gm');
  assert.equal(events[1].reason,'mixed-or-external-update');
}
console.log('PASS: simulated GM/player fades without canvas.draw, late arrival, untouched scene/hook data, token/vision preservation, manual/mixed-update bypass, optional wrapper registration and fallback. Live multiplayer confirmation still required.');
