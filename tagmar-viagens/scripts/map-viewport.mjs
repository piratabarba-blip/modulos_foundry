// SPDX-License-Identifier: GPL-3.0-or-later
// Presentation preferences only: source-image coordinates, never route geometry.
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const finite=n=>typeof n==='number'&&Number.isFinite(n);
function normalize(view){
  if(!view||typeof view.tripId!=='string'||!view.tripId||view.tripId.length>128||typeof view.src!=='string'||!view.src||view.src.length>4096)return null;
  if(!finite(view.width)||!finite(view.height)||view.width<=0||view.height<=0||view.width>50000||view.height>50000)return null;
  if(!finite(view.zoom)||!finite(view.centerX)||!finite(view.centerY))return null;
  return {tripId:view.tripId,src:view.src,width:view.width,height:view.height,zoom:clamp(view.zoom,1,6),
    centerX:clamp(view.centerX,0,view.width),centerY:clamp(view.centerY,0,view.height),
    windowTop:finite(view.windowTop)?Math.max(0,view.windowTop):0};
}
export function readMapViews(value){
  if(value?.schema!==1||!Array.isArray(value.views))return [];
  return value.views.map(normalize).filter(Boolean).slice(-50);
}
export function findMapView(views,trip){
  return views.find(v=>v.tripId===trip?.id&&v.src===trip.map?.src&&v.width===trip.map?.width&&v.height===trip.map?.height)??null;
}
export function rememberMapView(views,view){
  const valid=normalize(view);if(!valid)return views;
  const previous=views.find(v=>v.tripId===valid.tripId);
  if(previous&&JSON.stringify(previous)===JSON.stringify(valid))return views;
  return [...views.filter(v=>v.tripId!==valid.tripId),valid].slice(-50);
}
export function captureMapView(element){
  const host=element?.querySelector('[data-map-host]'),svg=host?.querySelector('svg');
  if(!svg||host.clientWidth<=0||host.clientHeight<=0)return null;
  const rect=svg.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return null;
  return normalize({tripId:host.dataset.tripId,src:host.dataset.mapSrc,width:Number(host.dataset.mapWidth),height:Number(host.dataset.mapHeight),zoom:Number(host.dataset.mapZoom),
    centerX:(host.scrollLeft+host.clientWidth/2)*Number(host.dataset.mapWidth)/rect.width,
    centerY:(host.scrollTop+host.clientHeight/2)*Number(host.dataset.mapHeight)/rect.height,
    windowTop:element.querySelector('.window-content')?.scrollTop??0});
}
export function restoreMapView(element,host,view){
  const svg=host.querySelector('svg');if(!view||!svg)return;
  const rect=svg.getBoundingClientRect();
  host.scrollLeft=clamp(view.centerX*rect.width/view.width-host.clientWidth/2,0,Math.max(0,host.scrollWidth-host.clientWidth));
  host.scrollTop=clamp(view.centerY*rect.height/view.height-host.clientHeight/2,0,Math.max(0,host.scrollHeight-host.clientHeight));
  const content=element.querySelector('.window-content');if(content)content.scrollTop=view.windowTop;
}
export function wheelMapZoom(zoom,deltaY,deltaMode=0,pageHeight=420){
  if(!finite(zoom)||!finite(deltaY))return finite(zoom)?clamp(zoom,1,6):1;
  const pixels=deltaY*(deltaMode===1?16:deltaMode===2?pageHeight:1);
  return clamp(zoom*Math.exp(-clamp(pixels,-1200,1200)*0.0015),1,6);
}
export function zoomMapAtPointer(app,host,event){
  const svg=host.querySelector('svg');if(!svg)return false;
  const old=svg.getBoundingClientRect(),width=Number(host.dataset.mapWidth),height=Number(host.dataset.mapHeight);
  if(old.width<=0||old.height<=0||!finite(width)||!finite(height))return false;
  const zoom=wheelMapZoom(app.zoom,event.deltaY,event.deltaMode,host.clientHeight);if(zoom===app.zoom)return false;
  const bounds=host.getBoundingClientRect(),x=event.clientX-bounds.left-host.clientLeft,y=event.clientY-bounds.top-host.clientTop;
  const imageX=(host.scrollLeft+x)*width/old.width,imageY=(host.scrollTop+y)*height/old.height;
  const content=app.element.querySelector('.window-content'),windowTop=content?.scrollTop;
  app.zoom=zoom;host.dataset.mapZoom=String(zoom);svg.style.width=`${zoom*100}%`;
  const next=svg.getBoundingClientRect();
  host.scrollLeft=clamp(imageX*next.width/width-x,0,Math.max(0,host.scrollWidth-host.clientWidth));
  host.scrollTop=clamp(imageY*next.height/height-y,0,Math.max(0,host.scrollHeight-host.clientHeight));
  if(content)content.scrollTop=windowTop;
  app.rememberMapViewport();return true;
}
