import assert from 'node:assert/strict';
import {getEnvironmentSettings} from '../scripts/environment-settings.mjs';
import {environmentInfo} from '../scripts/weather.mjs';
import {sceneEnvironmentMarkup} from '../scripts/scene-environment.mjs';
import {createWeatherEffectsSync} from '../scripts/weather-effects.mjs';

const ID = 'tagmar-calendario';
const effects = {rain:{}, rainStorm:{}, snow:{}, fog:{}, leaves:{}};
function harness() {
  function scene(id) {
    return {id, weather:'leaves', writes:[], flags:{
      climate:{mode:'manual',condition:'rain',visualEffects:true,indoor:false},
      dayNight:{enabled:true,latitude:0}
    }, getFlag(_id,key) {return this.flags[key];}, async update(data,options) {
      this.writes.push({data,options});
      if ('weather' in data) this.weather=data.weather;
      for (const [key,value] of Object.entries(data)) {
        if (!key.startsWith(`flags.${ID}.`)) continue;
        const name=key.slice(`flags.${ID}.`.length);
        if (name.startsWith('-=')) delete this.flags[name.slice(2)];
        else this.flags[name]=structuredClone(value);
      }
    }};
  }
  const active=scene('active'), inactive=scene('inactive');
  const gm={id:'gm',isGM:true,active:true};
  const settings={scenePresetVersion:1,weatherEnabled:true,tidesEnabled:true,dayNightEnabled:true};
  const game={user:gm,users:[gm],settings:{get:(_id,key)=>settings[key]},
    scenes:{active,contents:[active,inactive]},time:{worldTime:43200},world:{title:'Aventura'}};
  const args={getGame:()=>game,getDate:()=>({absoluteDay:44}),getEffects:()=>effects,
    onError:error=>{throw error;}};
  return {active,inactive,game,settings,args,sync:createWeatherEffectsSync(args)};
}

assert.deepEqual(getEnvironmentSettings(),{dayNightEnabled:true,weatherEnabled:true,tidesEnabled:true});
for (const weatherEnabled of [false,true]) for (const tidesEnabled of [false,true]) {
  const h=harness();
  h.settings.weatherEnabled=weatherEnabled;h.settings.tidesEnabled=tidesEnabled;
  for (const indoor of [false,true]) for (const mode of ['auto','manual','off']) {
    h.active.flags.climate.indoor=indoor;h.active.flags.climate.mode=mode;
    const original=structuredClone(h.active.flags);
    const info=environmentInfo(h.active,{absoluteDay:44},43200,h.game.world,getEnvironmentSettings(h.game));
    assert.equal(Boolean(info.weather),weatherEnabled);
    assert.equal(Boolean(info.tide),tidesEnabled);
    assert.equal(info.rows,Number(weatherEnabled)+Number(tidesEnabled));
    assert.deepEqual(h.active.flags,original);
  }
  const markup=sceneEnvironmentMarkup(h.active,h.game.world,getEnvironmentSettings(h.game));
  assert.ok(markup.includes(`clima ${weatherEnabled?'ligado':'desligado'}`));
  assert.ok(markup.includes(`marés ${tidesEnabled?'ligadas':'desligadas'}`));
}

for (const indoor of [false,true]) {
  const h=harness();h.active.flags.climate.indoor=indoor;
  const original=structuredClone(h.active.flags);
  await h.sync();
  assert.equal(h.active.weather,indoor?'':'rain');
  h.inactive.weather='snow';h.inactive.flags.weatherVisualState={previous:'fog',applied:'snow'};
  h.settings.weatherEnabled=false;
  await h.sync();
  assert.equal(h.active.weather,'leaves');
  assert.equal(h.inactive.weather,'fog','Restore owned effects in inactive scenes too');
  assert.equal(h.inactive.flags.weatherVisualState,undefined);
  assert.deepEqual(h.active.flags,original,'Scene preferences survive disabling');
  const count=h.active.writes.length;
  h.game.time.worldTime+=3600;await h.sync();
  assert.equal(h.active.writes.length,count,'Clock cannot reapply disabled weather');
  h.settings.weatherEnabled=true;await h.sync();
  assert.equal(h.active.weather,indoor?'':'rain','Re-enable saved scene preference');
}
{
  const h=harness();await h.sync();h.active.weather='fog';
  h.settings.weatherEnabled=false;await h.sync();
  assert.equal(h.active.weather,'fog','Keep a later manual change');
  assert.equal(h.active.flags.weatherVisualState,undefined);
  assert.equal(h.inactive.writes.length,0,'Do not touch unowned weather');
}
{
  const h=harness();await h.sync();h.settings.weatherEnabled=false;
  h.game.user={id:'player',isGM:false};await h.sync();
  assert.equal(h.active.weather,'rain','Player cannot write shared scene documents');
}
{
  const h=harness();await h.sync();
  h.active.flags.climate.condition='snow';let once=false;
  const sync=createWeatherEffectsSync({...h.args,getFadeSeconds:()=>3,newToken:()=> 'test-transition',
    sleep:async()=>{if(!once){once=true;h.settings.weatherEnabled=false;}}});
  await sync();
  assert.equal(h.active.weather,'leaves','Global disable cancels an in-flight weather change');
  assert.equal(h.active.flags.weatherTransition,undefined);
  assert.equal(h.active.flags.weatherVisualState,undefined);
  assert.ok(!h.active.writes.some(({data})=>data.weather==='snow'));
  assert.ok(h.active.writes.some(({options})=>options.tagmarWeatherCancel));
}
console.log('PASS: independent global switches, scene precedence, preserved preferences, active/inactive restoration, player permissions and in-flight cancellation.');
