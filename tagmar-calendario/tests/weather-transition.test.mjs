import assert from 'node:assert/strict';
import {createWeatherTransition, fadeSeconds} from '../scripts/weather-transition.mjs';
import {createWeatherEffectsSync} from '../scripts/weather-effects.mjs';

assert.equal(fadeSeconds(99),10); assert.equal(fadeSeconds(-1),0); assert.equal(fadeSeconds('bad'),3);
function visual() {
  let time=0, index=0;
  const frames=new Map(), timers=new Map();
  const old={alpha:1,destroyed:false};
  const scene={id:'a',weather:'rain'};
  const canvas={ready:true,scene,weather:{weatherEffects:old}};
  const controller=createWeatherTransition({getCanvas:()=>canvas,now:()=>time,
    requestFrame:fn=>{frames.set(++index,fn);return index;},cancelFrame:id=>frames.delete(id),
    setTimer:fn=>{timers.set(++index,fn);return index;},clearTimer:id=>timers.delete(id)});
  return {old,scene,canvas,controller,frames,timers,
    tick(ms){time+=ms;const tasks=[...frames.values()];frames.clear();for(const fn of tasks)fn();},
    begin(target='snow'){controller.begin(scene,{token:String(++index),target,from:scene.weather,seconds:3});},
    redraw(target='snow'){
      canvas.ready=false;
      controller.initialize(canvas.weather,null); // clearEffects no _tearDown real.
      old.destroyed=true;
      const fresh={alpha:1,destroyed:false}; canvas.weather.weatherEffects=fresh;
      scene.weather=target; controller.canvasInit();
      controller.initialize(canvas.weather,target?{id:target}:undefined);
      canvas.ready=true; controller.ready();
      return fresh;
    }};
}
{
  const h=visual(); h.begin(); h.tick(750); assert.equal(h.old.alpha,0.5);
  h.tick(750); assert.equal(h.old.alpha,0);
  const fresh=h.redraw(); assert.equal(fresh.alpha,0,'New effect starts hidden');
  h.tick(750); assert.equal(fresh.alpha,0.5); h.tick(750); assert.equal(fresh.alpha,1);
  assert.equal(h.frames.size,0); assert.equal(h.timers.size,0);
}
for(const target of ['', 'fog','rainStorm','blizzard']) {
  const h=visual(); h.begin(target); h.tick(1500);
  const fresh=h.redraw(target); h.tick(1500); assert.equal(fresh.alpha,1);
}
{
  const h=visual(); h.scene.weather=''; h.begin('rain');
  const fresh=h.redraw('rain'); assert.equal(fresh.alpha,0); h.tick(1500); assert.equal(fresh.alpha,1);
}
{
  const h=visual(); h.begin(); h.tick(500); h.canvas.scene={id:'other',weather:'fog'};
  h.controller.canvasInit(); assert.equal(h.old.alpha,1); assert.equal(h.frames.size,0);
}
{
  const h=visual(); h.begin(); h.tick(700); h.begin('fog'); h.tick(1500);
  const fresh=h.redraw('fog'); h.tick(1500); assert.equal(fresh.alpha,1,'Replacement transition finishes');
}
{
  const h=visual(); h.begin(); h.tick(1500);
  for(const fn of [...h.timers.values()])fn();
  assert.equal(h.old.alpha,1,'Watchdog recovers failed write/disconnected GM');
}
{
  const h=visual(); h.controller.begin({id:'other',weather:'rain'},{token:'x',from:'rain',target:'snow',seconds:3});
  assert.equal(h.frames.size,0,'Do not animate another viewed scene');
  h.controller.begin(h.scene,{token:'x',from:'rain',target:'snow',seconds:0});
  assert.equal(h.frames.size,0,'Zero disables transition');
  h.begin(); h.controller.reset(); assert.equal(h.old.alpha,1);
}

function syncHarness() {
  const flags={climate:{mode:'manual',condition:'snow',visualEffects:true}};
  const writes=[], sleeps=[];
  const scene={id:'a',weather:'rain',getFlag:(_id,k)=>flags[k],async update(data,options) {
    writes.push({data,options});
    if ('weather' in data) this.weather=data.weather;
    for(const key of ['weatherTransition','weatherVisualState']) {
      if (`flags.tagmar-calendario.${key}` in data) flags[key]=data[`flags.tagmar-calendario.${key}`];
      if (`flags.tagmar-calendario.-=${key}` in data) delete flags[key];
    }
  }};
  const user={id:'gm',isGM:true,active:true};
  const game={user,users:[user],scenes:{active:scene},time:{worldTime:0}};
  const args={getGame:()=>game,getDate:()=>({absoluteDay:0}),getEffects:()=>({rain:{},snow:{},fog:{}}),
    getFadeSeconds:()=>3,newToken:()=>String(writes.length),sleep:async ms=>{sleeps.push(ms);}};
  return {flags,writes,sleeps,scene,game,args};
}
{
  const h=syncHarness(); await createWeatherEffectsSync(h.args)();
  assert.equal(h.writes.length,2); assert.equal(h.writes[0].options.tagmarWeatherPrepare,true);
  assert.deepEqual(h.sleeps,[1500]); assert.equal(h.scene.weather,'snow');
  assert.equal(h.flags.weatherTransition,undefined,'Transient flag deleted with final weather');
}
{
  const h=syncHarness(); h.scene.weather=''; await createWeatherEffectsSync(h.args)();
  assert.deepEqual(h.sleeps,[],'No unnecessary fade-out when clear');
}
{
  const h=syncHarness(); let first=true;
  h.args.sleep=async()=>{if(first){first=false;h.flags.climate.condition='fog';}};
  await createWeatherEffectsSync(h.args)();
  assert.equal(h.scene.weather,'fog'); assert.ok(!h.writes.some(w=>w.data.weather==='snow'),'Discard stale target');
  assert.ok(h.writes.some(w=>w.options.tagmarWeatherCancel));
}
{
  const h=syncHarness(); h.args.sleep=async()=>{h.game.scenes.active=null;};
  await createWeatherEffectsSync(h.args)(); assert.equal(h.scene.weather,'rain','No delayed write to a deactivated scene');
  assert.equal(h.flags.weatherTransition,undefined);
}
{
  const h=syncHarness(); const original=h.scene.update; const errors=[];
  h.scene.update=async function(data,options){if('weather' in data)throw Error('offline');return original.call(this,data,options);};
  h.args.onError=e=>errors.push(e);
  await createWeatherEffectsSync(h.args)(); assert.equal(errors.length,1);
  assert.equal(h.flags.weatherTransition,undefined,'Failed write cancels fade');
}
console.log('PASS: smooth fade-out/in, native teardown/draw lifecycle, clear sky, scene switches, replacement, timeout, zero duration, shared preparation, stale-target cancellation and failure cleanup.');
