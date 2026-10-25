import assert from 'node:assert/strict';
import {MOONS,LUNAR_YEAR_DAYS,LUNAR_EPOCH,lunarCalendarDay,lunarOrbit,lunarTime,lunarSky,normalizeLunar,lunarTideCurve,lunarTideState} from '../scripts/lunar.mjs';
import {normalizeClimate,tideState} from '../scripts/weather.mjs';
import {prepareEnvironmentUpdate,sceneEnvironmentMarkup} from '../scripts/scene-environment.mjs';
const near=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<e,`${a} differs from ${b}`);
const epoch=LUNAR_EPOCH.dayOfYear, epochHours=epoch*24;
assert.equal(lunarCalendarDay({year:1500,dayOfYear:360,absoluteDay:999}),360);
assert.equal(lunarCalendarDay({year:1501,dayOfYear:0}),361);
assert.equal(lunarCalendarDay({year:1499,dayOfYear:360}),-1);
assert.equal(normalizeClimate({}).tideModel,'lunar');
assert.deepEqual(normalizeLunar(),{tideModel:'lunar',moonAgmarim:2.1,moonArmina:0.6,moonDenegria:0.3,tideLag:0});
assert.equal(normalizeLunar({tideModel:'simple'}).tideModel,'lunar');
assert.equal(normalizeLunar({moonAgmarim:1,moonArmina:1,moonDenegria:1}).moonAgmarim,1,'Saved neutral weights remain intact');
assert.equal(normalizeLunar({moonAgmarim:0}).moonAgmarim,0,'Explicit zero is preserved');
near(lunarTideCurve(epochHours,{tideRange:1}).height,1);
near(lunarTideCurve(epochHours,{tideRange:1,moonArmina:0,moonDenegria:0}).height,0.7);
assert.equal(normalizeLunar({moonAgmarim:-3,moonArmina:99,moonDenegria:'bad',tideLag:99}).moonAgmarim,0);
assert.equal(normalizeLunar({moonArmina:99}).moonArmina,10);
assert.equal(normalizeLunar({tideLag:99}).tideLag,12);
assert.equal(lunarTime(2,86400+3600),49);assert.equal(lunarTime(-1,-3600),-1);
for (const key of Object.keys(MOONS)) {
  assert.equal(lunarSky(key,epoch,0).above,true);
  assert.equal(lunarSky(key,epoch,43200).above,false);
  near(lunarSky(key,epoch,0).progress,0);
  assert.equal(lunarSky(key,epoch,0).label,'No alto do céu');
  const a=lunarSky(key,10,86399).progress, b=lunarSky(key,11,0).progress;
  assert.ok(Math.min(Math.abs(a-b),1-Math.abs(a-b))<0.00002,'Continuous over midnight');
  assert.notEqual(lunarSky(key,12,0).progress,lunarSky(key,12,3600).progress);
}
assert.equal(lunarSky('invalid'),null);
assert.equal(lunarOrbit('invalid'),null);
for (const [key,moon] of Object.entries(MOONS)) {
  const at=lunarOrbit(key,epoch);
  near(1/at.orbitalPeriodDays-1/LUNAR_YEAR_DAYS,1/moon.cycle);
  near(lunarOrbit(key,epoch+361).orbitalTurns,361/moon.cycle+1);
  near(lunarOrbit(key,epoch+moon.cycle).phaseProgress,0.5);
  near(at.phaseProgress,0.5);near(at.illuminatedFraction,1);
  assert.equal(at.phaseIndex,4);
  for (const [fraction,index,illumination] of [[0,0,0],[0.25,2,0.5],[0.5,4,1],[0.75,6,0.5]]) {
    const days=epoch+moon.cycle*(fraction-0.5);
    const state=lunarOrbit(key,Math.floor(days),(days%1)*86400);
    assert.equal(state.phaseIndex,index);near(state.illuminatedFraction,illumination);
  }
  // O horizonte depende da rotação diária, não de metade do ciclo das fases.
  for(let day=0;day<361;day++) {
    const samples=Array.from({length:25},(_,hour)=>lunarSky(key,day+Math.floor(hour/24),(hour%24)*3600).above);
    assert.ok(samples.includes(true)&&samples.includes(false),`${key}: daily horizon crossing at day ${day}`);
  }
  for(const day of [-365,29,30,359,360,361,100000]) {
    const before=lunarOrbit(key,day,86399),after=lunarOrbit(key,day+1,0);
    near(after.orbitalTurns-before.orbitalTurns,1/(86400*at.orbitalPeriodDays),1e-9);
  }
  // No alto e no lado oposto produzem máximos da mesma contribuição de maré.
  const weights={tideRange:3,moonAgmarim:0,moonArmina:0,moonDenegria:0};
  weights[{agmarim:'moonAgmarim',armina:'moonArmina',denegria:'moonDenegria'}[key]]=1;
  const transit=epochHours+at.transitPeriodHours;
  const top=lunarSky(key,Math.floor(transit/24),(transit%24)*3600).progress;
  near(Math.min(top,1-top),0);
  near(lunarTideCurve(transit,weights).height,1);
}
near(lunarOrbit('denegria').orbitalPeriodDays,180.5);
near(lunarOrbit('denegria').transitDelayMinutes,4);
near(lunarOrbit('agmarim').transitDelayMinutes,53+1/3);
near(lunarOrbit('armina').transitDelayMinutes,1440/89);
assert.equal(lunarSky('agmarim',epoch+28,0).above,true,'Full moon near top at midnight by model');
const config={tideModel:'lunar',coastal:true,tides:true,tideRange:3,moonAgmarim:1,moonArmina:0,moonDenegria:0};
const period=12/(1-1/28);
near(lunarTideCurve(epochHours,config).height,1);
near(lunarTideCurve(epochHours+period/2,config).height,-1);
near(lunarTideCurve(epochHours+period,config).height,1);
near(lunarTideCurve(epochHours,{...config,moonAgmarim:2}).height,2);
near(lunarTideCurve(epochHours,{...config,moonArmina:1,moonDenegria:1}).height,3);
near(lunarTideCurve(epochHours+4,{...config,tideLag:4}).height,1);
const first=lunarTideState({config,absoluteDay:epoch});
near(first.nextAbsoluteHour,epochHours+period/2);assert.equal(first.nextHigh,false);
assert.equal(first.label,'Maré alta');
assert.equal(lunarSky('agmarim',epoch,period*3600).above,false,'Below horizon still contributes to high tide');
const zero=lunarTideState({config:{...config,moonAgmarim:0}});
assert.equal(zero.height,0);assert.equal(zero.nextHour,null);assert.equal(zero.label,'Sem influência lunar');
const base={config:{...config,moonArmina:0.7,moonDenegria:2}};
for (let day=-2;day<370;day+=7) for(const hour of [0,6,12,23.99]) {
  const state=tideState({...base,absoluteDay:day,secondsToday:hour*3600});
  assert.equal(state.model,'lunar');assert.ok(Number.isFinite(state.height));
  assert.ok(state.nextAbsoluteHour>day*24+hour);
  assert.ok(state.nextAbsoluteHour<day*24+hour+72);
  assert.ok(Math.abs(lunarTideCurve(state.nextAbsoluteHour,base.config).slope)<1e-6);
  assert.equal(state.nextHigh,lunarTideCurve(state.nextAbsoluteHour,base.config).curvature<0);
  assert.ok(/^[0-2][0-9]:[0-5][0-9]$/.test(state.nextHour));
}
const midnightBefore=tideState({...base,absoluteDay:359,secondsToday:86399});
const midnightAfter=tideState({...base,absoluteDay:360,secondsToday:0});
assert.ok(Math.abs(midnightBefore.height-midnightAfter.height)<0.001,'Cruine continuity');
assert.equal(tideState({config:{...config,biome:'interior'}}),null);
assert.ok(tideState({config:{...config,coastal:false}}),'Regional reference also shown inland');
assert.equal(tideState({config:{...config,tides:false}}),null);
assert.equal(tideState({config:{...config,mode:'off'}}).model,'lunar','Independent from weather');
const simple={tides:true,coastal:true,tidePeriod:12,tideHigh:6,tideRange:2};
assert.deepEqual(tideState({config:simple,secondsToday:21600}),tideState({config:{...simple,tideModel:'simple',tidePeriod:24,tideHigh:12},secondsToday:21600}),'Legacy simple cycle is ignored; all tides use moons');
const scene={getFlag:()=>({})},change={'flags.tagmar-calendario.climate.tideModel':'lunar','flags.tagmar-calendario.climate.moonAgmarim':2.5};
prepareEnvironmentUpdate(scene,change,{absoluteDay:0},0,true);
assert.equal(change.flags['tagmar-calendario'].climate.tideModel,'lunar');assert.equal(change.flags['tagmar-calendario'].climate.moonAgmarim,2.5);
assert.ok(sceneEnvironmentMarkup(scene).includes('Influência de Denégria'));
console.log('PASS: lunar sky, weighted defaults, saved values preserved, mandatory lunar tides, superposition, lag, extrema and Cruine continuity.');
