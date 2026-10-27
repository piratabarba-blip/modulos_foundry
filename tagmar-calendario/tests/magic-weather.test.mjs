import assert from 'node:assert/strict';
import {createMagicWeatherControl, magicWeatherState, magicDuration} from '../scripts/magic-weather.mjs';
import {environmentInfo} from '../scripts/weather.mjs';
import {createWeatherEffectsSync} from '../scripts/weather-effects.mjs';

const ID='tagmar-calendario';
const flags={climate:{biome:'plains',mode:'auto',visualEffects:true},dayNight:{latitude:-20}};
let writes=0;
const scene={id:'ocean',weather:'',getFlag:(_id,key)=>flags[key], async update(changes) {
  writes++;
  for (const [key,value] of Object.entries(changes)) {
    if(key==='weather') {this.weather=value;continue;}
    const flag=key.replace(`flags.${ID}.`,'');
    if(flag.startsWith('-=')) delete flags[flag.slice(2)]; else flags[flag]=structuredClone(value);
  }
}};
const gm={id:'a',isGM:true,active:true};
const game={user:gm,users:[gm],time:{worldTime:36000},world:{title:'Viagem'},
  scenes:{active:scene,contents:[scene]},settings:{get:(_id,key)=>({scenePresetVersion:1,weatherEnabled:true,weatherFadeSeconds:0}[key])}};
const getDate=()=>({year:1500,dayOfYear:Math.floor(game.time.worldTime/86400),absoluteDay:Math.floor(game.time.worldTime/86400)});
const getInfo=()=>environmentInfo(scene,getDate(),game.time.worldTime,game.world);
const ctl=createMagicWeatherControl({getGame:()=>game,getDate,onError:e=>{throw e;}});
const sync=createWeatherEffectsSync({getGame:()=>game,getDate,getEffects:()=>({rain:{},rainStorm:{},fog:{},snow:{},blizzard:{}}),getFadeSeconds:()=>0,onError:e=>{throw e;}});
const magic={condition:'snow',temperature:-5,wind:18,windDirection:90};
const original=structuredClone(flags);
const before=getInfo();
await ctl.apply(scene,magic,7200);
assert.equal(getInfo().weather.condition,'snow');
assert.equal(getInfo().weather.remaining,7200);
assert.deepEqual(getInfo().tide,before.tide,'Magic does not alter tides');
await sync(); assert.equal(scene.weather,'snow');
game.time.worldTime+=3600;
assert.equal(getInfo().weather.remaining,3600);
assert.equal(getInfo().weather.remaining,3600,'Paused clock stays paused');
// Reloaded players calculate expiry even before the GM persists it.
game.time.worldTime+=3600;
const atExpiry=getInfo();
assert.deepEqual(atExpiry.weather,before.weather,'Natural weather resumes exactly where paused');
assert.equal(atExpiry.weather.magic,undefined);
game.user={id:'p',isGM:false};
const playerCtl=createMagicWeatherControl({getGame:()=>game,getDate});
const count=writes;
await playerCtl.sync(); assert.equal(writes,count);
await assert.rejects(playerCtl.apply(scene,magic,60),/mestre/);
await assert.rejects(playerCtl.end(scene),/mestre/);
game.user=gm;
await Promise.all([ctl.sync(),ctl.sync(),ctl.sync()]);
assert.equal(flags.magicWeather,undefined);
assert.equal(flags.weatherTimeDelay,7200,'Expiry accounted only once');
assert.deepEqual(getInfo().weather,atExpiry.weather,'Cleanup creates no visual discontinuity');
await sync(); assert.notEqual(scene.weather,'snow');
assert.deepEqual(flags.climate,original.climate);
assert.deepEqual(flags.dayNight,original.dayNight);

// Early ending, replacement, inactive scene expiry and large clock jump.
await ctl.apply(scene,magic,7200);
game.time.worldTime+=900;
await ctl.end(scene); assert.equal(flags.weatherTimeDelay,8100);
await ctl.apply(scene,magic,7200);
game.time.worldTime+=300;
await ctl.apply(scene,{...magic,condition:'fog'},60);
assert.equal(flags.weatherTimeDelay,8400);
assert.equal(getInfo().weather.condition,'fog');
game.scenes.active=null;
game.time.worldTime+=86400;
await ctl.sync(); assert.equal(flags.weatherTimeDelay,8460);
assert.equal(flags.magicWeather,undefined);
game.scenes.active=scene;

await ctl.apply(scene,magic,600);
assert.equal(environmentInfo(scene,getDate(),game.time.worldTime,game.world,{weatherEnabled:false}).weather,null);
flags.climate.indoor=true;
await sync(); assert.equal(scene.weather,'','Indoor scene receives no particles');
assert.equal(getInfo().weather.magic,true,'Indoor HUD still shows reference weather');
flags.climate.indoor=false;
flags.climate.mode='manual'; flags.climate.condition='rain';
await ctl.end(scene); assert.equal(getInfo().weather.condition,'rain','Manual mode preserved');
flags.climate.mode='hold';flags.climate.hold={condition:'fog',temperature:10,wind:0,windDirection:0};
await ctl.apply(scene,magic,10); game.time.worldTime+=10;await ctl.sync();
assert.equal(getInfo().weather.condition,'fog','Held climate preserved');

const safeWrites=writes;
await assert.rejects(ctl.apply(scene,{...magic,wind:NaN},60),/valores/);
await assert.rejects(ctl.apply(scene,magic,0),/duração/);
assert.equal(writes,safeWrites);
for(const values of [[0,0],[-1,10],[1,60],[1.5,0],['abc',2]]) assert.throws(()=>magicDuration(...values));
assert.equal(magicDuration(2,30),9000);
assert.equal(magicWeatherState(scene,getDate(),game.time.worldTime).active,false);
console.log('PASS: magic weather, expiry/reload, GM permissions, native effects, manual/hold, indoor/global controls, replacement and inactive scenes.');
