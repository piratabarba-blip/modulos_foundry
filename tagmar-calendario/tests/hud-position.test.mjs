// Regression harness: actual calendar class and core _updatePosition method.
// Only the frame, events and settings are simulated; no world is opened.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {hudGeometry} from '../scripts/hud-layout.mjs';
const file=process.argv[2];
if(!file)throw Error('Pass the Foundry resources/app directory.');
const core=fs.readFileSync(path.join(file,'public/scripts/foundry.mjs'),'utf8');
const start=core.indexOf('  _updatePosition(position) {');
assert(start>0);
const method=core.slice(start,core.indexOf('\n  /* -------------------------------------------- */',start)).trim();
const body=method.slice(method.indexOf('{')+1,method.lastIndexOf('}')).replaceAll('this.#element','this.element');
const source=fs.readFileSync(new URL('../scripts/calendar.js',import.meta.url),'utf8');
const calendarClass=source.slice(source.indexOf('class TagmarCalendarApp extends'),source.indexOf('\nfunction openCalendar()'));
function fixture(collapsed=false){
  const values=new Map([['hudLeft',57],['hudTop',91],['hudWidth',400],['hudCollapsedWidth',340],['hudCollapsed',collapsed]]),writes=[];
  const viewport={innerWidth:1400,innerHeight:1000,addEventListener(){},removeEventListener(){}};
  class Handle{
    listeners=new Map();captures=new Set();
    addEventListener(k,f){if(!this.listeners.has(k))this.listeners.set(k,new Set());this.listeners.get(k).add(f);}
    removeEventListener(k,f){this.listeners.get(k)?.delete(f);}
    setPointerCapture(id){this.captures.add(id);}hasPointerCapture(id){return this.captures.has(id);}releasePointerCapture(id){this.captures.delete(id);}
    async emit(k,e={}){await Promise.all([...this.listeners.get(k)??[]].map(fn=>fn({pointerId:1,button:0,preventDefault(){},...e})));}
  }
  const drag=new Handle(),resize=new Handle();
  class ApplicationV2{
    static parseCSSDimension(v){return parseFloat(v)||0;}
    constructor(){this.position={...this.constructor.DEFAULT_OPTIONS.position,scale:1};}
    _onRender(){}_onClose(){}
    render(){
      const first=!this.rendered;
      if(first){const style={setProperty(k,v){this[k]=String(v);}};this.element={style,classList:{add(){},toggle(){}},querySelector:k=>k==='.hud-drag-handle'?drag:k==='.hud-resize-handle'?resize:null,
        parentElement:{offsetWidth:viewport.innerWidth,offsetHeight:viewport.innerHeight},ownerDocument:{documentElement:{get clientWidth(){return viewport.innerWidth;},get clientHeight(){return viewport.innerHeight;}}},
        getBoundingClientRect(){return Object.fromEntries(['left','top','width','height'].map(k=>[k,parseFloat(style[k])||0]));}};}
      this._onRender({environment:{rows:2}},{});this.rendered=true;
      // Foundry finalizes first renders AFTER _onRender using its stored position.
      if(first)this.setPosition(this.position);
      return this;
    }
    setPosition(position){Object.assign(this.position,position);Object.assign(this.position,this._updatePosition(this.position));for(const k of ['left','top','width','height'])this.element.style[k]=this.position[k]+'px';return this.position;}
    close(){this._onClose({});this.rendered=false;}
  }
  const math=Object.create(Math);math.clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  const context=vm.createContext({console,Math:math,MODULE_ID:'tagmar-calendario',hudGeometry,window:viewport,hudInteractionActive:false,hudRefreshPending:false,
    getComputedStyle:()=>({minWidth:'0px',minHeight:'0px',maxWidth:'none',maxHeight:'none'}),getEnvironmentInfo:()=>({rows:2}),
    activateCalendarTooltips:()=>()=>{},configureDaylight(){},configureEnvironment(){},
    game:{settings:{get:(_m,k)=>values.get(k),set:async(_m,k,v)=>{values.set(k,v);writes.push(k);}}},
    foundry:{applications:{api:{ApplicationV2,HandlebarsApplicationMixin:C=>C}}}});
  vm.runInContext('const {ApplicationV2,HandlebarsApplicationMixin}=foundry.applications.api;foundry.applications.api.ApplicationV2.prototype._updatePosition=function(position){'+body+'};'+calendarClass+';globalThis.Calendar=TagmarCalendarApp;',context);
  return {Calendar:context.Calendar,values,writes,drag,resize,viewport};
}
for(const collapsed of [false,true]){
  const f=fixture(collapsed),app=new f.Calendar();app.render();
  assert.equal(app.element.getBoundingClientRect().left,57,'First render preserves saved horizontal position');
  assert.equal(app.element.getBoundingClientRect().top,91,'First render preserves saved vertical position');
  assert.equal(app.position.left,57,'Core model and visible frame agree');
  assert.equal(f.writes.length,0,'Opening does not overwrite preferences');
  await f.drag.emit('pointerdown',{clientX:67,clientY:101});
  await f.drag.emit('pointermove',{clientX:267,clientY:201});
  await f.drag.emit('pointerup',{clientX:267,clientY:201});
  assert.equal(f.values.get('hudLeft'),257);assert.equal(f.values.get('hudTop'),191);
  app.render();app.setPosition({width:app.position.width});
  assert.equal(app.element.getBoundingClientRect().left,257,'Time refresh or partial native reposition preserves drag');
  app.close();app.render();assert.equal(app.position.top,191,'Close/reopen preserves drag');
  const next=new f.Calendar();next.render();assert.equal(next.position.left,257,'A new instance restores saved geometry');
  f.values.set('hudCollapsed',!collapsed);next.render();assert.equal(next.position.left,257,'Collapse/expand keeps saved position');
  const width=next.position.width;
  await f.resize.emit('pointerdown',{clientX:width,clientY:0});await f.resize.emit('pointermove',{clientX:width+50,clientY:0});await f.resize.emit('pointerup');
  next.close();next.render();assert.equal(next.position.left,257,'Resizing and reopening do not recenter');
  const saved=Object.fromEntries(f.values);f.viewport.innerWidth=500;f.viewport.innerHeight=400;next.render();
  assert.ok(next.position.left+next.position.width<=500.01&&next.position.top+next.position.height<=400.01);
  assert.deepEqual(Object.fromEntries(f.values),saved,'Fitting a small screen does not erase preferences');
}
console.log('PASS: real core positioning finalizer, expanded/collapsed startup, drag, native reposition, reopen/new instance, resize and temporary screen fitting.');
