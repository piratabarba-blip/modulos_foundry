import assert from 'node:assert/strict';
import {applyScenePreset,normalizeDayNight,presetSceneChanges} from '../scripts/scene-preset.mjs';
import {normalizeClimate,environmentInfo} from '../scripts/weather.mjs';
import {createDaylightSync} from '../scripts/daylight.mjs';
import {createWeatherEffectsSync} from '../scripts/weather-effects.mjs';
import {prepareEnvironmentUpdate} from '../scripts/scene-environment.mjs';
const ID='tagmar-calendario';
const c=normalizeClimate();
assert.equal(c.mode,'auto');assert.equal(c.visualEffects,true);assert.equal(c.tides,true);assert.equal(c.indoor,false);assert.equal(c.coastal,false);
assert.equal(normalizeDayNight().enabled,true);
assert.equal(normalizeDayNight({enabled:false}).enabled,false);
const scene=(id,flags={})=>({id,flags,weather:'rain',environment:{darknessLevel:.2},
  getFlag(_id,key){return this.flags[key];},
  async update(changes){
    for(const [k,v] of Object.entries(changes)){
      if(k.startsWith(`flags.${ID}.`))this.flags[k.slice(`flags.${ID}.`.length)]=structuredClone(v);
      else if(k==='environment.darknessLevel')this.environment.darknessLevel=v;
      else this[k]=v;
    }
  }});
const outdoor=scene('o',{dayNight:{latitude:-22,enabled:false},climate:{mode:'manual',biome:'ocean',altitude:12,region:'Calco',coastal:true,tides:false,visualEffects:false,wind:17,moonAgmarim:4,tideRange:2}});
const indoor=scene('i',{dayNight:{latitude:30},climate:{biome:'interior',region:'Caverna'}});
const blank=scene('b');
const snapshots=structuredClone([outdoor.flags,indoor.flags,blank.flags]);
const gm={id:'a',active:true,isGM:true};
const settings={scenePresetVersion:0,scenePresetBackup:{},dayNightEnabled:false,twilightMinutes:60,nightDarkness:.85,dayDarkness:0};
const writes=[];
const game={user:gm,users:[gm],scenes:[outdoor,indoor,blank],time:{worldTime:0},settings:{get:(_id,k)=>settings[k],set:async(_id,k,v)=>{writes.push(k);settings[k]=structuredClone(v);}}};
game.scenes.active=blank;settings.dayNightEnabled=true;
await createDaylightSync({getGame:()=>game,getDate:()=>({dayOfYear:0})})();
await createWeatherEffectsSync({getGame:()=>game,getDate:()=>({absoluteDay:0}),getEffects:()=>({rain:{}})})();
assert.equal(blank.environment.darknessLevel,.2,'No light writes before backup/migration');assert.equal(blank.weather,'rain','No weather writes before backup/migration');
settings.dayNightEnabled=false;
await applyScenePreset({...game,user:{isGM:false}});assert.equal(writes.length,0);
assert.deepEqual((await applyScenePreset(game)),{applied:3});
assert.equal(settings.scenePresetVersion,1);assert.equal(settings.dayNightEnabled,true);
assert.deepEqual(settings.scenePresetBackup.scenes.o.climate,snapshots[0].climate);
assert.equal(settings.scenePresetBackup.dayNightEnabled,false);
assert.equal(settings.scenePresetBackup.scenes.o.weather,'rain');
for(const s of game.scenes){assert.equal(s.flags.dayNight.enabled,true);assert.equal(s.flags.climate.mode,'auto');assert.equal(s.flags.climate.tides,true);assert.equal(s.flags.climate.visualEffects,true);}
for(const key of ['biome','altitude','region','coastal','wind','moonAgmarim','tideRange'])assert.deepEqual(outdoor.flags.climate[key],snapshots[0].climate[key]);
assert.equal(outdoor.flags.dayNight.latitude,-22);assert.equal(indoor.flags.climate.biome,'interior');assert.equal(indoor.flags.climate.indoor,true);
assert.equal(environmentInfo(blank,{absoluteDay:0},0).rows,2);
assert.equal(environmentInfo(indoor,{absoluteDay:0},0).rows,2,'HUD reference remains visible indoors');
outdoor.flags.climate.mode='off';outdoor.flags.dayNight.enabled=false;
const n=writes.length;await applyScenePreset(game);assert.equal(writes.length,n);assert.equal(outdoor.flags.climate.mode,'off');assert.equal(outdoor.flags.dayNight.enabled,false);
// One checkbox removes weather while retaining daylight and geographical preferences.
game.scenes.active=indoor;
await createDaylightSync({getGame:()=>game,getDate:()=>({dayOfYear:44})})();assert.equal(indoor.environment.darknessLevel,.85);
await createWeatherEffectsSync({getGame:()=>game,getDate:()=>({absoluteDay:44}),getEffects:()=>({rain:{}})})();assert.equal(indoor.weather,'');
assert.equal(indoor.flags.weatherVisualState.previous,'rain');
indoor.environment.darknessLock=true;indoor.environment.darknessLevel=.1;
await createDaylightSync({getGame:()=>game,getDate:()=>({dayOfYear:44})})();assert.equal(indoor.environment.darknessLevel,.1);
const patch={[`flags.${ID}.climate.indoor`]:true};
prepareEnvironmentUpdate(outdoor,patch,{absoluteDay:0},0,true);
assert.equal(patch.flags[ID].climate.indoor,true);assert.equal(patch.flags[ID].climate.wind,17);
// Resumable failure: completed scenes are not reset; original backup remains intact.
const a=scene('a'),b=scene('b',{climate:{biome:'desert',tides:false}}),origUpdate=b.update;
settings.scenePresetVersion=0;settings.scenePresetBackup={};game.scenes=[a,b];
b.update=async()=>{throw Error('offline');};
await assert.rejects(applyScenePreset(game),/offline/);assert.equal(settings.scenePresetVersion,0);
assert.deepEqual(settings.scenePresetBackup.done,['a']);
a.flags.climate.mode='manual';b.update=origUpdate;
await applyScenePreset(game);assert.equal(a.flags.climate.mode,'manual');assert.equal(settings.scenePresetBackup.scenes.b.climate.tides,false);
assert.equal(presetSceneChanges(scene('new'))[`flags.${ID}.climate`].indoor,false);
console.log('PASS: default preset, all-scene migration, original backup, geography, no reapply, failure/resume, GM permissions, internal light-only and darkness locks.');
