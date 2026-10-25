import assert from 'node:assert/strict';
import {environmentInfo,adventureRegion} from '../scripts/weather.mjs';
import {createWeatherEffectsSync} from '../scripts/weather-effects.mjs';
import {prepareEnvironmentUpdate,sceneEnvironmentMarkup} from '../scripts/scene-environment.mjs';
const ID='tagmar-calendario',world={id:'trono',title:'O Décimo Trono'},date={absoluteDay:44};
const make=(id,climate)=>({id,weather:'',flags:{climate,dayNight:{latitude:0}},getFlag(_id,key){return this.flags[key];},
  writes:[],async update(data){this.writes.push(data);if('weather'in data)this.weather=data.weather;for(const [k,v]of Object.entries(data))if(k.startsWith(`flags.${ID}.`))this.flags[k.slice(`flags.${ID}.`.length)]=v;}});
for(const climate of [{indoor:true},{biome:'interior'},{mode:'off',visualEffects:false,tides:false},{mode:'manual',condition:'snow',visualEffects:false}]) {
  const scene=make('s',climate),saved=JSON.stringify(scene.flags);
  const info=environmentInfo(scene,date,43200,world);
  assert.equal(info.rows,2);assert.ok(info.weather);assert.ok(info.tide);
  assert.match(info.weather.detail,/O Décimo Trono/);assert.equal(JSON.stringify(scene.flags),saved,'Display must not rewrite scene flags');
  const gm={id:'gm',isGM:true,active:true};
  await createWeatherEffectsSync({getGame:()=>({user:gm,users:[gm],scenes:{active:scene},world,time:{worldTime:43200}}),getDate:()=>date,getEffects:()=>({rain:{},snow:{}})})();
  assert.equal(scene.writes.length,0,'HUD visibility must not enable effects');
}
const a=make('forest-a',{biome:'tropical',region:'Old A'}),b=make('forest-b',{biome:'tropical',region:'Old B'});
assert.deepEqual(environmentInfo(a,date,43200,world),environmentInfo(b,date,43200,world),'Same adventure and geography share weather, regardless of previous region names');
assert.match(environmentInfo(a,date,43200,{title:'Nova aventura'}).weather.detail,/Nova aventura/);
assert.equal(environmentInfo(undefined,date,0,world).rows,2);
assert.equal(adventureRegion({id:'fallback'}),'fallback');
const change={[`flags.${ID}.climate.mode`]:'auto',[`flags.${ID}.climate.region`]:'tampered'};
prepareEnvironmentUpdate(a,change,date,0,true,world);assert.equal(change.flags[ID].climate.region,world.title);
assert.match(sceneEnvironmentMarkup(a,world),/readonly value="O Décimo Trono"/);
assert.ok(!sceneEnvironmentMarkup(a,{title:'<img src=x>'}).includes('<img'));
// Map and HUD consume the same reference when visuals are enabled.
const outdoor=make('outdoor',{mode:'manual',condition:'rain',visualEffects:true}),gm={id:'gm',isGM:true,active:true};
await createWeatherEffectsSync({getGame:()=>({user:gm,users:[gm],scenes:{active:outdoor},world,time:{worldTime:0}}),getDate:()=>date,getEffects:()=>({rain:{}})})();
assert.equal(outdoor.weather,'rain');
outdoor.flags.climate.indoor=true;
await createWeatherEffectsSync({getGame:()=>({user:gm,users:[gm],scenes:{active:outdoor},world,time:{worldTime:0}}),getDate:()=>date,getEffects:()=>({rain:{}})})();
assert.equal(outdoor.weather,'');assert.equal(environmentInfo(outdoor,date,0,world).weather.condition,'rain');
console.log('PASS: always-visible regional reference, indoor/off HUD without map effects, adventure title, shared regions, escaping, saved overrides, no mutations and visual synchronization.');
