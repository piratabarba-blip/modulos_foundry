import test from 'node:test';
import assert from 'node:assert/strict';
import {readMapViews,findMapView,rememberMapView,captureMapView,restoreMapView,wheelMapZoom,cameraBounds} from '../scripts/map-viewport.mjs';
const view={tripId:'trip-1',src:'worlds/test/map.webp',width:1000,height:800,zoom:2,centerX:400,centerY:300,windowTop:150};
test('client preferences reject damaged entries and limit retained trips',()=>{
  for(const value of [null,{},[],{schema:2,views:[view]}])assert.deepEqual(readMapViews(value),[]);
  assert.deepEqual(readMapViews({schema:1,views:[null,{...view,zoom:NaN},{...view,width:0},view]}),[view]);
  let views=[];for(let i=0;i<55;i++)views=rememberMapView(views,{...view,tripId:'trip-'+i});
  assert.equal(views.length,50);assert.equal(views[0].tripId,'trip-5');
});
test('zoom and screen center belong to one trip and one image',()=>{
  const views=[view],trip={id:'trip-1',map:{src:view.src,width:1000,height:800}};
  assert.equal(findMapView(views,trip),view);
  assert.equal(findMapView(views,{...trip,id:'trip-2'}),null);
  assert.equal(findMapView(views,{...trip,map:{...trip.map,src:'worlds/test/other.webp'}}),null);
  assert.equal(findMapView(views,{...trip,map:{...trip.map,width:2000}}),null);
  assert.equal(rememberMapView(views,{...view}),views,'Identical observations need no extra storage write');
  assert.deepEqual(trip,{id:'trip-1',map:{src:view.src,width:1000,height:800}},'No route/model mutation');
});
test('restoring after zoom keeps the same source-image point in the viewport center',()=>{
  const host={dataset:{tripId:'trip-1',mapSrc:view.src,mapWidth:'1000',mapHeight:'800',mapZoom:'2'},clientWidth:400,clientHeight:300,scrollLeft:600,scrollTop:450,scrollWidth:2000,scrollHeight:1600};
  let size={width:2000,height:1600};
  const svg={getBoundingClientRect:()=>size};host.querySelector=()=>svg;
  const content={scrollTop:150},element={querySelector:s=>s==='[data-map-host]'?host:content};
  const saved=captureMapView(element);assert.deepEqual(saved,view);
  size={width:3000,height:2400};host.scrollWidth=3000;host.scrollHeight=2400;host.dataset.mapZoom='3';
  host.scrollLeft=0;host.scrollTop=0;content.scrollTop=0;restoreMapView(element,host,saved);
  assert.equal(host.scrollLeft,1000);assert.equal(host.scrollTop,750);assert.equal(content.scrollTop,150);
  const result=captureMapView(element);assert.equal(result.centerX,400);assert.equal(result.centerY,300);
});
test('small maps and invalid saved zoom never produce negative offsets',()=>{
  const normalized=readMapViews({schema:1,views:[{...view,zoom:99,centerX:-1,centerY:9999,windowTop:-2}]})[0];
  assert.equal(normalized.zoom,6);assert.equal(normalized.centerX,0);assert.equal(normalized.centerY,800);assert.equal(normalized.windowTop,0);
  const host={clientWidth:500,clientHeight:400,scrollWidth:400,scrollHeight:320,querySelector:()=>({getBoundingClientRect:()=>({width:400,height:320})})};
  restoreMapView({querySelector:()=>null},host,view);assert.equal(host.scrollLeft,0);assert.equal(host.scrollTop,0);
});
test('mouse-wheel zoom is reversible and handles pixels lines and pages within limits',()=>{
  const zoom=wheelMapZoom(2,-120);assert.ok(zoom>2);
  assert.ok(Math.abs(wheelMapZoom(zoom,120)-2)<1e-12);
  assert.equal(wheelMapZoom(1,9999),1);assert.equal(wheelMapZoom(6,-9999),6);
  assert.equal(wheelMapZoom(2,-3,1),wheelMapZoom(2,-48,0));
  assert.equal(wheelMapZoom(2,1,2,420),wheelMapZoom(2,420));
  assert.equal(wheelMapZoom(2,NaN),2);assert.equal(wheelMapZoom(NaN,-120),1);
});

test('minimap zoom up to 24 survives saving while main map remains limited to 6',()=>{
  assert.equal(wheelMapZoom(20,-1200,0,420,24),24);
  assert.equal(wheelMapZoom(20,-1200),6);
  const views=rememberMapView([],{...view,zoom:24},24);
  assert.equal(readMapViews({schema:1,views},24)[0].zoom,24);
  assert.equal(readMapViews({schema:1,views})[0].zoom,6);
});

test('fixed viewport camera fits image and clamps panning without changing routes',()=>{
  const base={width:1000,height:500,viewportWidth:344,viewportHeight:344};
  assert.deepEqual(cameraBounds(base),{x:0,y:-250,width:1000,height:1000,centerX:500,centerY:250});
  const zoomed=cameraBounds({...base,zoom:24,centerX:-10,centerY:9999});
  assert.ok(Math.abs(zoomed.width-1000/24)<1e-9);assert.ok(zoomed.x>=0&&zoomed.y+zoomed.height<=500.00001);
});
