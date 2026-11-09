// SPDX-License-Identifier: GPL-3.0-or-later
// Presentation preferences only: source-image coordinates, never route geometry.
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const finite=n=>typeof n==='number'&&Number.isFinite(n);
export function mapViewportScale(host){return host?.offsetWidth>0?host.getBoundingClientRect().width/host.offsetWidth||1:1;}
// The read-only minimap moves a fixed-size SVG camera instead of growing an
// offscreen image to thousands of CSS pixels at high zoom.
export function cameraBounds({width,height,viewportWidth,viewportHeight,zoom=1,centerX=width/2,centerY=height/2,clampCenter=true}){
  const aspect=Math.max(1,viewportWidth)/Math.max(1,viewportHeight),baseWidth=Math.max(width,height*aspect);
  const w=baseWidth/zoom,h=w/aspect;
  const x=clampCenter?(w>=width?width/2:clamp(centerX,w/2,width-w/2)):centerX,y=clampCenter?(h>=height?height/2:clamp(centerY,h/2,height-h/2)):centerY;
  return {x:x-w/2,y:y-h/2,width:w,height:h,centerX:x,centerY:y};
}
export function setMapCamera(host,view={}){
  const svg=host.querySelector('svg');if(!svg||host.clientWidth<=0||host.clientHeight<=0)return;
  const width=Number(host.dataset.mapWidth),height=Number(host.dataset.mapHeight),zoom=Number(view.zoom??host.dataset.mapZoom??1);
  const box=cameraBounds({width,height,viewportWidth:host.clientWidth,viewportHeight:host.clientHeight,zoom,
    centerX:Number(view.centerX??host.dataset.centerX??width/2),centerY:Number(view.centerY??host.dataset.centerY??height/2),clampCenter:host.dataset.followGroup!=='true'});
  Object.assign(host.dataset,{mapZoom:String(zoom),centerX:String(box.centerX),centerY:String(box.centerY)});
  const value=`${box.x} ${box.y} ${box.width} ${box.height}`;
  if(svg.getAttribute('viewBox')!==value)svg.setAttribute('viewBox',value);
  return box;
}
function normalize(view,maxZoom=6){
  if(!view||typeof view.tripId!=='string'||!view.tripId||view.tripId.length>128||typeof view.src!=='string'||!view.src||view.src.length>4096)return null;
  if(!finite(view.width)||!finite(view.height)||view.width<=0||view.height<=0||view.width>50000||view.height>50000)return null;
  if(!finite(view.zoom)||!finite(view.centerX)||!finite(view.centerY))return null;
  return {tripId:view.tripId,src:view.src,width:view.width,height:view.height,zoom:clamp(view.zoom,1,maxZoom),
    centerX:clamp(view.centerX,0,view.width),centerY:clamp(view.centerY,0,view.height),
    windowTop:finite(view.windowTop)?Math.max(0,view.windowTop):0};
}
export function readMapViews(value,maxZoom=6){
  if(value?.schema!==1||!Array.isArray(value.views))return [];
  return value.views.map(view=>normalize(view,maxZoom)).filter(Boolean).slice(-50);
}
export function findMapView(views,trip){
  return views.find(v=>v.tripId===trip?.id&&v.src===trip.map?.src&&v.width===trip.map?.width&&v.height===trip.map?.height)??null;
}
export function rememberMapView(views,view,maxZoom=6){
  const valid=normalize(view,maxZoom);if(!valid)return views;
  const previous=views.find(v=>v.tripId===valid.tripId);
  if(previous&&JSON.stringify(previous)===JSON.stringify(valid))return views;
  return [...views.filter(v=>v.tripId!==valid.tripId),valid].slice(-50);
}
export function captureMapView(element,maxZoom=6){
  const host=element?.querySelector('[data-map-host]'),svg=host?.querySelector('svg');
  if(!svg||host.clientWidth<=0||host.clientHeight<=0)return null;
  if(host.dataset.viewportMap==='true')return normalize({tripId:host.dataset.tripId,src:host.dataset.mapSrc,width:Number(host.dataset.mapWidth),height:Number(host.dataset.mapHeight),zoom:Number(host.dataset.mapZoom),centerX:Number(host.dataset.centerX),centerY:Number(host.dataset.centerY),windowTop:0},maxZoom);
  const rect=svg.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return null;const scale=mapViewportScale(host);
  return normalize({tripId:host.dataset.tripId,src:host.dataset.mapSrc,width:Number(host.dataset.mapWidth),height:Number(host.dataset.mapHeight),zoom:Number(host.dataset.mapZoom),
    centerX:(host.scrollLeft+host.clientWidth/2)*Number(host.dataset.mapWidth)*scale/rect.width,
    centerY:(host.scrollTop+host.clientHeight/2)*Number(host.dataset.mapHeight)*scale/rect.height,
    windowTop:element.querySelector('.window-content')?.scrollTop??0},maxZoom);
}
export function restoreMapView(element,host,view){
  const svg=host.querySelector('svg');if(!view||!svg)return;
  if(host.dataset?.viewportMap==='true'){setMapCamera(host,view);return;}
  const rect=svg.getBoundingClientRect(),scale=mapViewportScale(host);
  host.scrollLeft=clamp(view.centerX*rect.width/view.width/scale-host.clientWidth/2,0,Math.max(0,host.scrollWidth-host.clientWidth));
  host.scrollTop=clamp(view.centerY*rect.height/view.height/scale-host.clientHeight/2,0,Math.max(0,host.scrollHeight-host.clientHeight));
  const content=element.querySelector('.window-content');if(content)content.scrollTop=view.windowTop;
}
export function wheelMapZoom(zoom,deltaY,deltaMode=0,pageHeight=420,maxZoom=6){
  if(!finite(zoom)||!finite(deltaY))return finite(zoom)?clamp(zoom,1,maxZoom):1;
  const pixels=deltaY*(deltaMode===1?16:deltaMode===2?pageHeight:1);
  return clamp(zoom*Math.exp(-clamp(pixels,-1200,1200)*0.0015),1,maxZoom);
}
export function zoomMapAtPointer(app,host,event){
  const svg=host.querySelector('svg');if(!svg)return false;
  if(host.dataset.viewportMap==='true'){
    const zoom=wheelMapZoom(app.zoom,event.deltaY,event.deltaMode,host.clientHeight,app.maxMapZoom??6);if(zoom===app.zoom)return false;
    const rect=svg.getBoundingClientRect(),old=svg.viewBox.baseVal,u=(event.clientX-rect.left)/rect.width,v=(event.clientY-rect.top)/rect.height;
    const ratio=app.zoom/zoom,centerX=old.x+u*old.width+(.5-u)*old.width*ratio,centerY=old.y+v*old.height+(.5-v)*old.height*ratio;
    app.zoom=zoom;setMapCamera(host,{zoom,centerX,centerY});app.rememberMapViewport();return true;
  }
  const old=svg.getBoundingClientRect(),width=Number(host.dataset.mapWidth),height=Number(host.dataset.mapHeight);
  if(old.width<=0||old.height<=0||!finite(width)||!finite(height))return false;
  const zoom=wheelMapZoom(app.zoom,event.deltaY,event.deltaMode,host.clientHeight,app.maxMapZoom??6);if(zoom===app.zoom)return false;
  const bounds=host.getBoundingClientRect(),scale=mapViewportScale(host),x=(event.clientX-bounds.left)/scale-host.clientLeft,y=(event.clientY-bounds.top)/scale-host.clientTop;
  const imageX=(host.scrollLeft+x)*width*scale/old.width,imageY=(host.scrollTop+y)*height*scale/old.height;
  const content=app.element.querySelector('.window-content'),windowTop=content?.scrollTop;
  app.zoom=zoom;host.dataset.mapZoom=String(zoom);svg.style.width=`${zoom*100}%`;
  const next=svg.getBoundingClientRect();
  host.scrollLeft=clamp(imageX*next.width/width/scale-x,0,Math.max(0,host.scrollWidth-host.clientWidth));
  host.scrollTop=clamp(imageY*next.height/height/scale-y,0,Math.max(0,host.scrollHeight-host.clientHeight));
  if(content)content.scrollTop=windowTop;
  app.rememberMapViewport();return true;
}
