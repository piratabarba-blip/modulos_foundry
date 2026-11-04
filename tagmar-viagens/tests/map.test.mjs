import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../scripts/engine.mjs';
import * as M from '../scripts/map-model.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const map=()=>M.mapImage('worlds/test/map.webp',1000,500);
function mapped(){const t=E.trip();return M.setScale(M.setMap(t,map()),{x:0,y:0},{x:100,y:0},50);}
test('escala conhecida e caminho com curvas usam pixels originais',()=>{
  const m=M.calibrate(map(),{x:0,y:0},{x:100,y:0},50);
  near(m.kmPerPixel,.5);near(M.distance([{x:0,y:0},{x:300,y:0},{x:300,y:400}],m),350);
});
test('itinerário misto guarda cópias independentes dos transportes',()=>{
  const profiles=E.defaultProfiles();let t=mapped();
  t=M.savePath(t,profiles[1],[{x:0,y:0},{x:100,y:0}]);t=M.savePath(t,profiles[3],[{x:100,y:0},{x:300,y:0}]);
  near(E.totals(t).distance,150);assert.equal(t.segments[0].type,'mount');assert.equal(t.segments[1].type,'ship');
  profiles[1].base=100;assert.equal(t.segments[0].base,20);
  const original=E.clone(t);const changed=M.savePath(t,null,[{x:0,y:0},{x:200,y:0}],t.segments[0].id);
  near(changed.segments[0].distance,100);assert.deepEqual(t,original);assert.deepEqual(E.undo(changed),t);
});
test('recalibrar atualiza só distâncias desenhadas, com desfazer',()=>{
  let t=mapped();t=M.savePath(t,E.defaultProfiles()[0],[{x:0,y:0},{x:100,y:0}]);t.segments.push(E.segment(E.defaultProfiles()[0],75));
  const next=M.setScale(t,{x:0,y:0},{x:100,y:0},100);near(next.segments[0].distance,100);near(next.segments[1].distance,75);assert.deepEqual(E.undo(next),t);
});
test('marcador acompanha segmentos e curvas, sem mudar o tempo global',()=>{
  let t=mapped();const p={...E.defaultProfiles()[3],base:10};t=M.savePath(t,p,[{x:0,y:0},{x:100,y:0},{x:100,y:100}]);
  let a=E.advance(t,2).trip;near(M.position(a).x,40);near(M.position(a).y,0);
  a=E.advance(a,4).trip;near(M.position(a).x,100);near(M.position(a).y,20);
  a=E.advance(a,100).trip;near(M.position(a).y,100);assert.equal(E.currentStage(a).finished,true);
});
test('protege viagens iniciadas e imagens já usadas; cópia permite novo caminho',()=>{
  let t=mapped();t=M.savePath(t,E.defaultProfiles()[0],[{x:0,y:0},{x:100,y:0}]);
  assert.throws(()=>M.setMap(t,map()),/possui trechos/);
  const a=E.advance(t,1).trip;
  for(const fn of [()=>M.setScale(a,{x:0,y:0},{x:100,y:0},10),()=>M.savePath(a,E.defaultProfiles()[0],[{x:0,y:0},{x:200,y:0}])])assert.throws(fn,/já começou/);
  const copy=E.duplicate(a);near(copy.map.kmPerPixel,.5);near(M.savePath(copy,null,[{x:0,y:0},{x:200,y:0}],copy.segments[0].id).segments[0].distance,100);
});
test('rejeita escala zero, pontos ausentes/fora da imagem e caminhos inseguros',()=>{
  const m=map();for(const src of ['javascript:alert(1)','data:text/html,hello','file:///secret','<img>',''])assert.throws(()=>M.imagePath(src));
  assert.throws(()=>M.calibrate(m,{x:1,y:1},{x:1,y:1},100));assert.throws(()=>M.calibrate(m,{x:0,y:0},{x:1,y:1},0));
  assert.throws(()=>M.distance([{x:0,y:0},{x:1,y:1}],m));assert.throws(()=>M.pathLength([{x:0,y:0},{x:1001,y:0}],m));
  assert.throws(()=>M.pathLength([{x:0,y:0}],m));assert.throws(()=>M.pathLength(Array(2001).fill({x:0,y:0}),m));
});
