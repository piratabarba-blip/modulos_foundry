import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../scripts/engine.mjs';
import * as M from '../scripts/map-model.mjs';
import * as L from '../scripts/map-library.mjs';
const map=()=>M.calibrate(M.mapImage('worlds/test/continente.webp',1000,600),{x:0,y:0},{x:100,y:0},50);
test('saved map keeps calibration and new trips receive independent copies after reload',()=>{
  const state={trips:[]},stored=L.rememberMap(state,map());
  const reloaded=E.clone(state),fresh=L.defaultMap(reloaded);
  assert.equal(fresh.kmPerPixel,.5);assert.deepEqual(fresh.calibration,map().calibration);
  const t=M.setMap(E.trip(),fresh);assert.equal(M.distance([{x:0,y:0},{x:100,y:0}],t.map),50);
  t.map.calibration.km=999;
  assert.equal(L.savedMap(reloaded,stored.libraryId).calibration.km,50);
  assert.equal(state.mapLibrary.entries[0].map.calibration.km,50);
});
test('multiple maps/scales remain available and changing the default preserves previous trips',()=>{
  const state={trips:[]},first=L.rememberMap(state,map());
  const old=M.savePath(M.setMap(E.trip(),first),E.defaultProfiles()[0],[{x:0,y:0},{x:100,y:0}]);state.trips.push(old);
  const snapshot=E.clone(old);
  const second=L.rememberMap(state,M.calibrate(first,{x:0,y:0},{x:100,y:0},20),{name:'Outra escala',asNew:true});
  assert.equal(state.mapLibrary.entries.length,2);assert.equal(L.defaultMap(state).kmPerPixel,.2);
  assert.equal(L.savedMap(state,first.libraryId).kmPerPixel,.5);assert.deepEqual(old,snapshot);
  assert.throws(()=>M.setMap(old,second),/trechos desenhados/);
  assert.throws(()=>M.setMap(E.advance(old,1).trip,second),/começou/);
});
test('automatic calibration updates only its library entry, repeated route saves do not duplicate maps',()=>{
  const state={trips:[]};let m=L.rememberMap(state,map());
  m=L.rememberMap(state,M.calibrate(m,{x:0,y:0},{x:100,y:0},25));
  for(let i=0;i<10;i++)m=L.rememberMap(state,m);
  assert.equal(state.mapLibrary.entries.length,1);assert.equal(L.defaultMap(state).kmPerPixel,.25);
  const copy=M.setMap(E.trip(),m);L.rememberMap(state,M.calibrate(m,{x:0,y:0},{x:100,y:0},60));
  assert.equal(copy.map.kmPerPixel,.25);
});
test('removing saved definitions never deletes trip maps, routes or image paths',()=>{
  const state={trips:[]},first=L.rememberMap(state,map()),second=L.rememberMap(state,{...map(),src:'worlds/test/other.webp'});
  state.trips.push(M.setMap(E.trip(),second));const before=E.clone(state.trips);
  L.forgetMap(state,second.libraryId);assert.deepEqual(state.trips,before);assert.equal(L.defaultMap(state).src,first.src);
  L.forgetMap(state,first.libraryId);assert.equal(L.defaultMap(state),null);assert.deepEqual(state.trips,before);
});
test('legacy preview reuses the selected trip map and scale without altering old records',()=>{
  const t=M.setMap(E.trip(),map()),state={trips:[t]},before=E.clone(t);
  const inherited=L.defaultMap(state,t);assert.equal(inherited.kmPerPixel,.5);assert.deepEqual(t,before);
  assert.equal(state.mapLibrary.entries.length,1);
});
test('library refuses unknown formats and unsafe images without overwriting existing definitions',()=>{
  const state={trips:[]};L.rememberMap(state,map());const before=E.clone(state);
  assert.throws(()=>L.rememberMap(state,{...map(),src:'javascript:alert(1)'}));assert.deepEqual(state,before);
  assert.throws(()=>L.libraryOf({mapLibrary:{schema:2,entries:[]}}),/desconhecida/);
  assert.throws(()=>L.savedMap(state,'missing'),/Escolha/);
  assert.throws(()=>L.rememberMap({mapLibrary:{schema:1,entries:Array.from({length:100},(_,i)=>({id:String(i),map:{}}))}},map(),{asNew:true}),/100 mapas/);
});
