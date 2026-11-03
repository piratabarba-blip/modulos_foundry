import assert from 'node:assert/strict';
import {castConfiguration,secondsFor} from '../tagmar-token-fx/scripts/cast-rules.mjs';
import {animationConfiguration} from '../tagmar-token-fx/scripts/jb2a.mjs';
import {startTimedAnimation,TIME_UNITS} from '../tagmar-token-fx/scripts/timers.mjs';

const itemFor=(cast,jb2aFx)=>({uuid:'Actor.a.Item.spell',name:'Sono',getFlag:(_scope,key)=>({cast,jb2aFx})[key]});
const legacyVisual={enabled:true,timeMode:'calendar',mode:'self',gameDuration:2,gameUnit:'hours'};
// A visual-only item (even with the old default cast fields) retains its actual duration.
for(const shape of ['self','point','circle']) {
  const cast=castConfiguration(itemFor({shape,enabled:true,duration:10,unit:'rounds'},legacyVisual));
  assert.equal(secondsFor(cast),7200);
}
// Existing spells with a rules timer retain the timer that already governed the cast.
for(const extra of [{effectName:'Sono'},{repeatRM:true,resolution:'rm'},{transform:true}]) {
  const cast=castConfiguration(itemFor({enabled:true,shape:'targets',duration:1,unit:'hours',...extra},legacyVisual));
  assert.equal(secondsFor(cast),3600);
}
for(const [duration,unit,seconds] of [[10,'rounds',150],[2,'weeks',1209600],[1,'hours',3600]]) {
  const cast={durationShared:true,duration,unit,enabled:true,effectName:'Sono'};
  const item=itemFor(cast,legacyVisual);
  const animation=animationConfiguration(item);
  assert.equal(animation.gameDuration*TIME_UNITS[animation.gameUnit],seconds);
  assert.equal(secondsFor(castConfiguration(item)),seconds);
  // A single edit changes both subsequent timers, despite the legacy visual fields.
  cast.duration*=2;
  const updated=animationConfiguration(item);
  assert.equal(updated.gameDuration*TIME_UNITS[updated.gameUnit],seconds*2);
  let record;
  item.setFlag=async(_scope,key,data)=>{assert.equal(key,'activeJb2a');record=data;};
  globalThis.foundry={utils:{randomID:()=> 'test'}};
  await startTimedAnimation(item,updated,{
    game:{modules:new Map([['tagmar-calendario',{active:true,api:{getDate:()=>({year:1500,dayOfYear:0})}}]]),time:{worldTime:0}},
    canvas:{scene:{id:'scene'}},source:{id:'caster'},targets:[{id:'target'}]
  });
  assert.equal(record.endsAt-record.startsAt,seconds*2);
  // Short visuals still last real seconds independently of the magic's game duration.
  const brief=animationConfiguration(itemFor(cast,{...legacyVisual,timeMode:'animation',duration:1}));
  assert.equal(brief.timeMode,'animation');assert.equal(brief.duration,1);
}
console.log('PASS: prazo único, preservação de itens antigos/portais, rodadas/semanas, expiração e visual breve independente.');
