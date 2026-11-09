import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../scripts/engine.mjs';
import * as C from '../scripts/clock.mjs';
function trip(){
  const t=E.trip();const p={...E.defaultProfiles()[0],speedMode:'kmh',base:5,work:24};
  t.segments=[E.segment(p,10),E.segment(p,20)];t.segments[1].wait=2;return t;
}
test('adjust kilometres forwards/backwards across legs while paused without adding time',()=>{
  const t=E.advance(trip(),1).trip;t.paused=true;const before=structuredClone(t),a=E.adjustDistance(t,10);
  assert.equal(E.totals(a).done,15);assert.equal(a.elapsed,1);assert.equal(a.paused,true);
  assert.equal(E.totals(a).moving,E.totals(t).moving);assert.equal(E.totals(a).waiting,0);
  assert.equal(E.currentStage(a).index,2);assert.equal(E.currentStage(a).label,'Em deslocamento');
  const back=E.adjustDistance(a,-13);assert.equal(E.totals(back).done,2);assert.equal(back.elapsed,1);
  assert.equal(E.currentStage(back).index,1);assert.deepEqual(t,before);assert.deepEqual(E.undo(a),t);
});
test('clamps route bounds, skips passed waits without inventing hours and protects started paths',()=>{
  const t=E.adjustDistance(trip(),100);assert.equal(E.totals(t).done,30);assert(E.currentStage(t).finished);assert.equal(t.elapsed,0);
  assert.equal(E.estimate(t).remaining,0);assert(E.started(t));
  const reset=E.adjustDistance(t,-100);assert.equal(E.totals(reset).done,0);assert.equal(reset.elapsed,0);
  const half=E.adjustDistance(trip(),15);assert.equal(E.project(half,1).progress[half.segments[1].id].km,10);
  assert.throws(()=>E.adjustDistance(t,NaN));assert.throws(()=>E.adjustDistance(E.trip(),1));
  const changed=structuredClone(half);changed.segments.reverse();assert.throws(()=>E.savePlan(half,changed));
});
test('calendar projection resumes at corrected position and rewind preserves earlier history',()=>{
  const t=trip(),state={trips:[t]};C.bind(state,t.id,0);C.reconcile(state,3600);
  state.trips[0]=E.adjustDistance(state.trips[0],10);C.rebase(state,t.id,3600);
  assert.equal(state.clockLink.cursor,3600);assert.equal(state.trips[0].elapsed,1);
  C.reconcile(state,7200);assert.equal(E.totals(state.trips[0]).done,20);assert.equal(state.trips[0].elapsed,2);
  C.reconcile(state,1800);assert.equal(E.totals(state.trips[0]).done,2.5);
  C.reconcile(state,7200);assert.equal(E.totals(state.trips[0]).done,20);
});
