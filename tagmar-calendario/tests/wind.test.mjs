import assert from 'node:assert/strict';
import {weatherState,windDirectionAt,normalizeClimate} from '../scripts/weather.mjs';
import {prepareEnvironmentUpdate,sceneEnvironmentMarkup} from '../scripts/scene-environment.mjs';
const manual={mode:'manual',condition:'drizzle',temperature:10,wind:12,windDirection:45};
const sample=config=>weatherState({config});
assert.equal(sample(manual).text,'🌦️ Chuva leve · 10 °C · Vento 12 km/h de NE');
for(const [angle,label] of [[0,'N'],[45,'NE'],[90,'L'],[135,'SE'],[180,'S'],[225,'SO'],[270,'O'],[315,'NO'],[359,'N'],[-45,'NO'],[405,'NE']]) {
  assert.ok(sample({...manual,windDirection:angle}).text.endsWith(`de ${label}`));
}
assert.equal(sample({...manual,wind:0}).windDirection,null);
assert.ok(sample({...manual,wind:0}).text.endsWith('Vento 0 km/h (calmo)'));
assert.equal(normalizeClimate({windDirection:Infinity}).windDirection,0);
assert.equal(sample({mode:'hold',hold:{condition:'fog',temperature:10,wind:5}}).windDirection,null);
assert.ok(sample({mode:'hold',hold:{condition:'fog',temperature:10,wind:5}}).detail.includes('não registrada'));
const circularDistance=(a,b)=>Math.abs(((a-b+540)%360)-180);
for(let t=-100;t<9000;t+=8) {
  const a=windDirectionAt('Calco',t-1/3600),b=windDirectionAt('Calco',t+1/3600);
  assert.ok(a>=0&&a<360&&b>=0&&b<360);
  assert.ok(circularDistance(a,b)<0.02,'Smooth circular transitions');
  assert.equal(windDirectionAt('Calco',t),windDirectionAt('Calco',t));
}
assert.equal(weatherState({config:{mode:'auto',region:'coast'},sceneId:'a'}).windDirection,weatherState({config:{mode:'auto',region:'coast'},sceneId:'b'}).windDirection);
const flags={climate:manual};
const scene={id:'wind',getFlag:(_id,key)=>flags[key]};
const change={'flags.tagmar-calendario.climate.mode':'hold'};
prepareEnvironmentUpdate(scene,change,{absoluteDay:0},0,true);
const held=change.flags['tagmar-calendario'].climate;
assert.equal(held.hold.windDirection,45);
assert.equal(weatherState({config:held,absoluteDay:361}).windDirection,45);
assert.equal(flags.climate.mode,'manual','Do not write scene before saving');
const html=sceneEnvironmentMarkup(scene);
assert.ok(html.includes('value="45" selected'));
console.log('PASS: wind speed, compass origin, calm, circular interpolation, deterministic regions, manual/hold persistence and legacy hold.');
