import assert from "node:assert/strict";
import {BIOMES, normalizeClimate, weatherState, tideState, environmentInfo} from "../scripts/weather.mjs";
import {sceneEnvironmentMarkup, prepareEnvironmentUpdate} from "../scripts/scene-environment.mjs";
import {hudGeometry} from "../scripts/hud-layout.mjs";
const cfg = {mode:"auto", biome:"tropical", region:"Calco", coastal:true, tides:true};
const sample = (extra = {}) => weatherState({config:cfg, latitude:0, absoluteDay:44, secondsToday:43200, ...extra});
assert.equal(weatherState(), null);
assert.equal(tideState(), null);
assert.equal(sample({config:{...cfg,biome:"interior"}}), null);
assert.equal(tideState({config:{...cfg,biome:"interior"}}), null);
assert.deepEqual(sample(), sample());
assert.deepEqual(sample({sceneId:"a"}), sample({sceneId:"b"}), "Named regions share weather");
let different = false;
for (let day=0;day<20;day++) {
  different ||= sample({config:{...cfg,region:""},sceneId:"a",absoluteDay:day}).condition !== sample({config:{...cfg,region:""},sceneId:"b",absoluteDay:day}).condition;
}
assert.ok(different, "Unnamed scenes have distinct seeds");
const manual = sample({config:{...cfg,mode:"manual",condition:"fog",temperature:17,wind:8}});
assert.equal(manual.condition,"fog"); assert.equal(manual.temperature,17); assert.equal(manual.wind,8);
for (const day of [-100,0,360,361,99999]) {
  assert.deepEqual(sample({config:{...cfg,mode:"manual",condition:"fog",temperature:17,wind:8},absoluteDay:day}), manual);
}
const normalize = normalizeClimate({biome:"<script>",mode:"hack",altitude:Infinity,temperature:999,wind:-4,coastal:"false",tidePeriod:0});
assert.equal(normalize.biome,"plains"); assert.equal(normalize.mode,"off");
assert.equal(normalize.altitude,0); assert.equal(normalize.temperature,65); assert.equal(normalize.wind,0);
assert.equal(normalize.coastal,false); assert.equal(normalize.tidePeriod,6);
assert.equal(normalizeClimate({tidePeriodMinutes:745}).tidePeriod,12+25/60);
for (const biome of ['lake','ocean','open_sea']) {
  assert.equal(normalizeClimate({biome}).biome,biome);
  assert.equal(tideState({config:{biome,mode:'auto'}}),null,'Aquatic biome does not enable tides');
  assert.equal(normalizeClimate({biome,coastal:true,tides:true}).tides,true,'Explicit tide preferences preserved');
  const aquaticPatch={'flags.tagmar-calendario.climate.biome':biome};
  prepareEnvironmentUpdate({getFlag:()=>({})},aquaticPatch,{absoluteDay:0},0,true);
  assert.equal(aquaticPatch.flags['tagmar-calendario'].climate.biome,biome);
}
let lakeWind=0, oceanWind=0, openWind=0;
for(let day=0;day<361;day++) {
  const aquatic = biome => sample({absoluteDay:day,config:{...cfg,biome,coastal:false}});
  lakeWind+=aquatic('lake').wind; oceanWind+=aquatic('ocean').wind; openWind+=aquatic('open_sea').wind;
}
assert.ok(openWind>oceanWind && oceanWind>lakeWind,'Open sea is more exposed in the fictional model');
assert.ok(BIOMES.open_sea.daily<BIOMES.ocean.daily && BIOMES.ocean.daily<BIOMES.lake.daily);
let summer=0,winter=0,sea=0,mountain=0,hot=0,cold=0,wetDays=0,dryDays=0;
const kinds=new Set();
for(let day=0;day<361;day++) {
  const t=sample({absoluteDay:day}); kinds.add(t.condition);
  sea+=t.temperature; mountain+=sample({absoluteDay:day,config:{...cfg,altitude:2500}}).temperature;
  hot+=t.temperature; cold+=sample({absoluteDay:day,latitude:60}).temperature;
  wetDays+=Number(["drizzle","rain","storm","snow"].includes(t.condition));
  dryDays+=Number(["drizzle","rain","storm","snow"].includes(sample({absoluteDay:day,config:{...cfg,biome:"desert",coastal:false}}).condition));
  for(const biome of Object.keys(BIOMES).filter(b=>b!=="interior")) {
    const w=sample({absoluteDay:day,latitude:60,config:{...cfg,biome}});
    assert.ok(Number.isFinite(w.temperature)&&w.temperature>=-80&&w.temperature<=65);
    assert.ok(w.wind>=0&&w.wind<=150);
    if(w.condition==="snow") assert.ok(w.temperature<=1);
  }
}
for(let offset=-20;offset<=20;offset++) {
  summer+=sample({latitude:45,absoluteDay:44+offset}).temperature;
  winter+=sample({latitude:45,absoluteDay:224+offset}).temperature;
}
assert.ok(summer>winter); assert.ok(sea>mountain); assert.ok(hot>cold); assert.ok(wetDays>dryDays);
assert.ok(kinds.size>=4, "Climate changes during the year");
const avg = (latitude,center) => Array.from({length:41},(_,i)=>sample({latitude,absoluteDay:center+i-20}).temperature).reduce((a,b)=>a+b);
assert.ok(avg(-45,44)<avg(-45,224),"Southern seasons reverse");
// Minute boundaries interpolate, rather than rolling a new random temperature.
for(let hour=1;hour<48;hour++) {
  const before=sample({absoluteDay:Math.floor((hour*3600-1)/86400),secondsToday:hour*3600-1});
  const after=sample({absoluteDay:Math.floor(hour*3600/86400),secondsToday:hour*3600});
  assert.ok(Math.abs(before.temperature-after.temperature)<=1);
  assert.ok(Math.abs(before.wind-after.wind)<=1);
}
const tideConfig={...cfg,tidePeriod:12,tideHigh:6,tideRange:2};
const tide = hour => tideState({config:tideConfig,secondsToday:hour*3600});
assert.equal(tide(6).label,"Maré alta"); assert.equal(tide(12).label,"Maré baixa");
assert.equal(tide(9).label,"Maré vazando"); assert.equal(tide(15).label,"Maré enchendo");
assert.equal(tide(6).height,2); assert.equal(tide(12).height,-2);
assert.equal(tide(23).nextHour,"00:00"); assert.equal(tide(23).nextDay,1);
assert.equal(tideState({config:{...cfg,coastal:false}}),null);
assert.equal(tideState({config:{...cfg,tides:false}}),null);
assert.equal(tideState({config:{...cfg,mode:"off"}}).label.length>0,true,"Tides independent from weather");
const negative=tideState({config:tideConfig,absoluteDay:-2,secondsToday:-3600});
assert.ok(Number.isFinite(negative.height));

const flags={climate:cfg,dayNight:{latitude:0,enabled:true}};
const scene={id:"calco",getFlag:(_id,key)=>flags[key]};
const original=JSON.stringify(flags);
const patch={name:"Keep scene name",flags:{other:{value:1},"tagmar-calendario":{climate:{mode:"hold"}}}};
prepareEnvironmentUpdate(scene,patch,{absoluteDay:44},43200,true);
assert.equal(patch.flags.other.value,1); assert.equal(patch.name,"Keep scene name");
assert.equal(JSON.stringify(flags),original,"Hook must not mutate the scene before save");
flags.climate=patch.flags["tagmar-calendario"].climate;
const held=sample({config:flags.climate,absoluteDay:44});
assert.deepEqual(sample({config:flags.climate,absoluteDay:224}),held);
const holdCopy=structuredClone(flags.climate.hold);
const sameHold={"flags.tagmar-calendario.climate.mode":"hold"};
prepareEnvironmentUpdate(scene,sameHold,{absoluteDay:200},0,true);
assert.deepEqual(sameHold.flags["tagmar-calendario"].climate.hold,holdCopy,"Saving again doesn't recapture");
assert.equal(prepareEnvironmentUpdate(scene,{"flags.tagmar-calendario.climate.mode":"auto"},{absoluteDay:0},0,false),false);
assert.equal(prepareEnvironmentUpdate(scene,{name:"Unrelated"},{absoluteDay:0},0,false),undefined);
const flat={"flags.tagmar-calendario.dayNight.latitude":999,"flags.tagmar-calendario.climate.mode":"auto","flags.tagmar-calendario.climate.biome":"desert"};
prepareEnvironmentUpdate(scene,flat,{absoluteDay:44},0,true);
assert.equal(flat.flags["tagmar-calendario"].dayNight.latitude,90);
assert.equal(flat.flags["tagmar-calendario"].dayNight.enabled,true);
assert.equal(flat.flags["tagmar-calendario"].climate.biome,"desert");
assert.ok(!Object.keys(flat).some(k=>k.startsWith("flags.")));
assert.equal(environmentInfo(undefined,{absoluteDay:0},0).rows,0);
assert.equal(environmentInfo(scene,{absoluteDay:0},0).rows,2);
const unsafe={getFlag:(_id,key)=>key==="climate"?{region:'\"><img src=x onerror=alert(1)>'}: {latitude:Infinity}};
const html=sceneEnvironmentMarkup(unsafe);
assert.ok(!html.includes('<img')); assert.ok(html.includes('&lt;img'));
for(const collapsed of [false,true]) for(const rows of [0,1,2]) for(const [width,height] of [[800,600],[1366,768],[1920,1080]]) {
  const g=hudGeometry({collapsed,environmentRows:rows,width:600,viewportWidth:width,viewportHeight:height});
  assert.equal(g.baseHeight,(collapsed?142:500)+rows*26);
  assert.ok(g.top+g.height<=height && g.left+g.width<=width);
}
console.log(`PASS: deterministic regional weather, ${kinds.size} conditions, climate trends, continuous boundaries, manual/hold, tides, scene flags, escaping and responsive HUD.`);
