import assert from 'node:assert/strict';
import {nativeWeatherEffect, createWeatherEffectsSync} from '../scripts/weather-effects.mjs';

const effects = {rain:{},rainStorm:{},snow:{},blizzard:{},fog:{},leaves:{}};
for (const [condition, target] of Object.entries({clear:'',cloudy:'',overcast:'',drizzle:'rain',rain:'rain',storm:'rainStorm',fog:'fog',snow:'snow'})) {
  assert.equal(nativeWeatherEffect({condition,wind:5},effects),target);
}
assert.equal(nativeWeatherEffect({condition:'snow',wind:35},effects),'blizzard');
assert.equal(nativeWeatherEffect({condition:'storm'},{rain:{}}),'rain');
assert.equal(nativeWeatherEffect({condition:'snow',wind:50},{snow:{}}),'snow');
assert.equal(nativeWeatherEffect({condition:'fog'},{}),undefined);
assert.equal(nativeWeatherEffect(null,effects),undefined);

function harness() {
  const flags={climate:{mode:'manual',condition:'rain',visualEffects:true,biome:'plains'}};
  const writes=[], errors=[];
  const scene={id:'test',weather:'leaves',getFlag:(_id,key)=>flags[key],async update(data,options) {
    writes.push({data,options});
    if ('weather' in data) this.weather=data.weather;
    if ('flags.tagmar-calendario.weatherVisualState' in data) flags.weatherVisualState=data['flags.tagmar-calendario.weatherVisualState'];
    if ('flags.tagmar-calendario.-=weatherVisualState' in data) delete flags.weatherVisualState;
  }};
  const gm={id:'gm',active:true,isGM:true};
  const game={user:gm,users:[gm],scenes:{active:scene},time:{worldTime:0}};
  const args={getGame:()=>game,getDate:()=>({absoluteDay:44}),getEffects:()=>effects,onError:e=>errors.push(e)};
  return {flags,writes,errors,scene,game,args,sync:createWeatherEffectsSync(args)};
}
{
  const h=harness();
  h.flags.climate.visualEffects=false;
  await h.sync(); assert.equal(h.writes.length,0,'Opt-in required');
  h.flags.climate.visualEffects=true;
  h.game.user={id:'player',isGM:false};
  await h.sync(); assert.equal(h.writes.length,0,'Players never write');
  h.game.user=h.game.users[0]; h.game.users.push({id:'aaa',isGM:true,active:true});
  await h.sync(); assert.equal(h.writes.length,0,'Only elected GM writes');
  h.game.users[1].active=false;
  await h.sync(); assert.equal(h.scene.weather,'rain');
  assert.deepEqual(h.flags.weatherVisualState,{previous:'leaves',applied:'rain'});
  assert.equal(h.writes[0].options.tagmarWeatherEffects,true);
  await Promise.all([h.sync(),h.sync(),h.sync()]);
  assert.equal(h.writes.length,1,'No same-effect writes');
  h.flags.climate.condition='storm'; await h.sync(); assert.equal(h.scene.weather,'rainStorm');
  h.flags.climate.condition='clear'; await h.sync(); assert.equal(h.scene.weather,'');
  h.flags.climate.condition='snow'; h.flags.climate.wind=40; await h.sync(); assert.equal(h.scene.weather,'blizzard');
  h.flags.climate.visualEffects=false;
  await createWeatherEffectsSync(h.args)();
  assert.equal(h.scene.weather,'leaves','Persistent ownership survives reload');
  assert.equal(h.flags.weatherVisualState,undefined);
  const n=h.writes.length; await h.sync(); assert.equal(h.writes.length,n);
}
for (const disable of [c=>c.mode='off',c=>c.biome='interior']) {
  const h=harness(); await h.sync(); disable(h.flags.climate); await h.sync();
  assert.equal(h.scene.weather,'leaves','Restore when disabled/indoors');
}
{
  const h=harness(); await h.sync();
  h.scene.weather='fog'; h.flags.climate.visualEffects=false; await h.sync();
  assert.equal(h.scene.weather,'fog','Preserve later manual selection');
  assert.equal(h.flags.weatherVisualState,undefined);
}
{
  const h=harness(); h.flags.climate.mode='hold'; h.flags.climate.hold={condition:'snow',temperature:-2,wind:10};
  await h.sync(); assert.equal(h.scene.weather,'snow','Hold follows captured weather');
  h.flags.climate.mode='auto'; h.flags.climate.region='Calco';
  await h.sync(); assert.ok(['','rain','rainStorm','fog','snow','blizzard'].includes(h.scene.weather));
}
{
  const h=harness(); h.args.getEffects=()=>({});
  await createWeatherEffectsSync(h.args)(); assert.equal(h.writes.length,0,'Unavailable rain does not erase manual effect');
}
{
  const h=harness(); const update=h.scene.update; let release;
  h.scene.update=async function(data,opts) {await new Promise(r=>release=r);return update.call(this,data,opts);};
  const first=h.sync(); await Promise.resolve();
  h.flags.climate.condition='snow'; const second=h.sync();
  h.scene.update=update; release(); await Promise.all([first,second]);
  assert.equal(h.scene.weather,'snow','Queued update sees latest state');
}
{
  const h=harness(); const update=h.scene.update; let release;
  h.scene.update=async function(data,opts) {await new Promise(r=>release=r);return update.call(this,data,opts);};
  const first=h.sync(); await Promise.resolve();
  const other=harness(); other.flags.climate.condition='fog'; h.game.scenes.active=other.scene;
  const second=h.sync(); release(); await Promise.all([first,second]);
  assert.equal(other.scene.weather,'fog','Pending request follows newly active scene');
  assert.equal(h.writes.length,1);
}
{
  const h=harness(); const update=h.scene.update;
  h.scene.update=async()=>{throw Error('failure');};
  await h.sync(); await h.sync(); assert.equal(h.errors.length,1,'No error notification flood');
  h.scene.update=update; await h.sync(); assert.equal(h.scene.weather,'rain','Recover on next request');
}
console.log('PASS: native effect mapping, opt-in, GM election, manual/auto/hold, interior/off restoration, ownership, missing effects, coalescing, scene switch, errors and recovery.');
