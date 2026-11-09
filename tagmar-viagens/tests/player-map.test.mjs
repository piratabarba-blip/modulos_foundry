import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../scripts/engine.mjs';
import {emptyPlayerMap,readPlayerMap,playerMapSnapshot,readPlayerFocus,samePlayerMap} from '../scripts/player-map.mjs';
test('snapshot contains only image geometry and current position, never itinerary',()=>{
  const trip=E.trip('Destino secreto');
  trip.map={src:'worlds/test/map.webp',width:1000,height:500,kmPerPixel:1,sourceScene:{id:'secret'},calibration:{km:400}};
  const segment=E.segment(E.defaultProfiles()[0],100);segment.name='Rota secreta';segment.path=[{x:10,y:20},{x:110,y:20}];trip.segments.push(segment);
  trip.progress[segment.id]={km:50};
  const before=structuredClone(trip),snapshot=playerMapSnapshot(trip);
  assert.deepEqual(snapshot,{schema:1,map:{src:'worlds/test/map.webp',width:1000,height:500},position:{x:60,y:20}});
  assert.deepEqual(trip,before);
  assert.deepEqual(readPlayerMap({...snapshot,name:'secret',segments:[segment],map:{...snapshot.map,calibration:'secret'}}),snapshot);
});
test('absent/deleted map, invalid coordinates and unsafe paths cannot leak legacy state',()=>{
  assert.deepEqual(playerMapSnapshot(null),emptyPlayerMap());
  assert.deepEqual(readPlayerMap({schema:1,map:{src:'javascript:alert(1)',width:100,height:100}}),emptyPlayerMap());
  assert.deepEqual(readPlayerMap({schema:1,map:{src:'a.webp',width:Infinity,height:100}}),emptyPlayerMap());
  assert.equal(readPlayerMap({schema:1,map:{src:'a.webp',width:100,height:100},position:{x:101,y:0}}).position,null);
  const trip=E.trip();trip.map={src:'a.webp',width:100,height:100};assert.equal(playerMapSnapshot(trip).position,null);
});

test('focus directive contains only map camera; rejects malformed values and drops secrets',()=>{
  const map={src:'a.webp',width:800,height:400},value={id:'one',map,zoom:4,centerX:300,centerY:200};
  assert.deepEqual(readPlayerFocus({...value,tripId:'secret',route:[1,2]}),value);
  for(const patch of [{zoom:0},{zoom:25},{centerX:NaN},{centerY:401},{id:''},{map:null}])assert.equal(readPlayerFocus({...value,...patch}),null);
  assert.equal(samePlayerMap(map,{...map}),true);assert.equal(samePlayerMap(map,{...map,src:'other.webp'}),false);
});
