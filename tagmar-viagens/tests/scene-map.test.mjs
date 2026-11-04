import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../scripts/engine.mjs';
import * as M from '../scripts/map-model.mjs';
import {sceneSource,sceneMap} from '../scripts/scene-map.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function scene(units='km'){
  return {id:'scene-1',name:'Mapa de Tagmar',width:1600,height:800,grid:{size:100,distance:10,units,type:0},firstLevel:{id:'level-1',background:{src:'worlds/test/map.webp'},textures:{fit:'fill',scaleX:1,scaleY:1}},levels:{contents:[]},get background(){throw Error('Deprecated getter must not be used');},view(){throw Error('Must not activate');},update(){throw Error('Must not edit');}};
}
test('cena V14: imagem do andar e escala em quilômetros sem getter obsoleto',()=>{
  const source=sceneSource(scene()),result=sceneMap(source,{width:800,height:400});
  assert.equal(result.map.src,'worlds/test/map.webp');near(result.map.kmPerPixel,.2);assert.equal(result.warning,null);
  near(M.distance([{x:0,y:0},{x:100,y:0}],result.map),20);
});
test('unidades reconhecidas são convertidas para km',()=>{
  for(const [unit,scale]of [['m',.001],['metros',.001],['km',1],['quilômetros',1],['mi',1.609344],['pés',.0003048]]){
    const result=sceneMap(sceneSource(scene(unit)),{width:1600,height:800});near(result.map.kmPerPixel,.1*scale);
  }
});
test('ajustes de textura respeitam contain/cover/width/height e escala extra',()=>{
  for(const [fit,expected]of [['contain',.1],['cover',.2],['width',.2],['height',.1]]){
    const s=scene();s.height=400;s.firstLevel.textures.fit=fit;near(sceneMap(sceneSource(s),{width:800,height:400}).map.kmPerPixel,expected);
  }
  const s=scene();s.firstLevel.textures.scaleX=-.5;s.firstLevel.textures.scaleY=.5;near(sceneMap(sceneSource(s),{width:800,height:400}).map.kmPerPixel,.1);
});
test('escala desconhecida/hexagonal/distorcida mantém imagem para calibração manual',()=>{
  const a=scene('hexes'),b=scene(),c=scene();b.firstLevel.textures.scaleX=2;c.grid.type=2;
  for(const s of [a,b,c]){const r=sceneMap(sceneSource(s),{width:800,height:400});assert.equal(r.map.kmPerPixel,0);assert.ok(r.warning);assert.equal(r.map.src,'worlds/test/map.webp');}
});
test('sem fundo: erro claro; pode localizar outro andar com imagem',()=>{
  const s=scene();s.firstLevel.background.src=null;s.levels.contents=[s.firstLevel];assert.throws(()=>sceneSource(s),/imagem de fundo/);
  s.levels.contents.push({id:'second',background:{src:'worlds/test/second.webp'},textures:{fit:'fill'}});assert.equal(sceneSource(s).src,'worlds/test/second.webp');
});
test('anexar primeiro mapa a viagem em curso preserva quilômetros, tempo e histórico',()=>{
  let t=E.trip();t.segments=[E.segment(E.defaultProfiles()[0],50)];t=E.advance(t,3).trip;
  const before=E.clone(t),map=sceneMap(sceneSource(scene()),{width:800,height:400}).map,next=M.setMap(t,map);
  assert.deepEqual(t,before);assert.equal(next.elapsed,before.elapsed);assert.deepEqual(next.segments,before.segments);assert.deepEqual(next.progress,before.progress);assert.deepEqual(E.undo(next),before);near(next.map.kmPerPixel,.2);
  assert.throws(()=>M.setMap(next,map),/já começou/);assert.throws(()=>M.savePath(next,E.defaultProfiles()[0],[{x:0,y:0},{x:100,y:0}]),/já começou/);
});

test('recalibrar manualmente substitui a escala importada da cena',()=>{
  const imported=sceneMap(sceneSource(scene()),{width:800,height:400}).map;
  const next=M.calibrate(imported,{x:0,y:0},{x:100,y:0},50);
  near(next.kmPerPixel,.5);assert.equal(next.sceneScale,undefined);assert.equal(next.sourceScene.id,'scene-1');assert.ok(imported.sceneScale);
});
