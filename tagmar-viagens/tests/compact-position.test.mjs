import test from 'node:test';
import assert from 'node:assert/strict';
import {compactPosition,compactGeometry} from '../scripts/compact-position.mjs';

test('new and damaged client settings keep the HUD reachable',()=>{
  for(const value of [null,undefined,{},'old-setting'])assert.deepEqual(compactPosition(value),{left:80,top:100,width:400});
  assert.deepEqual(compactPosition({left:NaN,top:Infinity}),{left:80,top:100,width:400});
  assert.deepEqual(compactPosition({left:0,top:0}),{left:0,top:0,width:400});
  assert.deepEqual(compactPosition({left:20,top:30},420),{left:20,top:30,width:420},'Legacy position adopts the calendar size without losing its location');
});
test('saved position survives a normal viewport and fits after shrinking',()=>{
  const position={left:850,top:650};
  const full=compactGeometry({position,viewportWidth:1400,viewportHeight:1000,height:300});
  assert.equal(full.width,400);assert.equal(full.left,850);assert.equal(full.top,650);assert.equal(full.scale,400/360);
  const small=compactGeometry({position,viewportWidth:800,viewportHeight:600,height:300});
  assert.equal(small.left,400);assert.equal(small.top,600-small.height);
  assert.deepEqual(position,{left:850,top:650},'Fitting a small screen must not overwrite the saved preference');
});
test('dragging beyond an edge cannot hide the handle',()=>{
  const a=compactGeometry({position:{left:-200,top:-10},viewportWidth:1200,viewportHeight:900,height:300});
  assert.equal(a.left,0);assert.equal(a.top,0);
  const b=compactGeometry({position:{left:9999,top:9999},viewportWidth:1200,viewportHeight:900,height:300});
  assert.equal(b.left,1200-b.width);assert.equal(b.top,900-b.height);
});
test('narrow viewports remain scrollable without widening past the screen',()=>{
  const r=compactGeometry({position:{left:700,top:800},viewportWidth:300,viewportHeight:250,height:500});
  assert.ok(r.width<=284&&r.height<=234);assert.equal(r.left,300-r.width);assert.equal(r.top,250-r.height);
  const tiny=compactGeometry({viewportWidth:10,viewportHeight:10,height:500});assert.ok(tiny.width>0&&tiny.width<=1&&tiny.height<=1);
});
test('resized HUD scales every control uniformly and preserves the preferred width',()=>{
  assert.equal(compactPosition({width:1}).width,320);assert.equal(compactPosition({width:9999}).width,720);
  const position={left:100,top:100,width:600};
  const full=compactGeometry({position,viewportWidth:1400,viewportHeight:1000,height:300});
  assert.equal(full.width,600);assert.equal(full.height,500);assert.equal(full.scale,600/360);
  const small=compactGeometry({position,viewportWidth:500,viewportHeight:400,height:300});
  assert.ok(small.width<600&&small.height<=384);
  assert.equal(position.width,600,'Screen fitting does not replace the saved size');
});
