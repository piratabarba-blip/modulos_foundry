// SPDX-License-Identifier: GPL-3.0-or-later
import {COLORS,position,point,distance} from './map-model.mjs';
import {formatNumber,TYPES} from './engine.mjs';
import {restoreMapView,zoomMapAtPointer,mapViewportScale,setMapCamera} from './map-viewport.mjs';
const NS='http://www.w3.org/2000/svg';
function node(tag,attributes={}){const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attributes))e.setAttribute(k,String(v));return e;}
export function bindMap(app,trip,editable,{readOnly=false}={}){
  const host=app.element.querySelector('[data-map-host]');if(!host||!trip?.map)return;
  Object.assign(host.dataset,{tripId:trip.id,mapSrc:trip.map.src,mapWidth:String(trip.map.width),mapHeight:String(trip.map.height),mapZoom:String(app.zoom)});
  if(app.positionOnly)host.dataset.followGroup='true';
  app.dragIndex=null;app.dragMoved=false;
  const map=trip.map,svg=node('svg',{viewBox:`0 0 ${map.width} ${map.height}`,role:'img','aria-label':app.positionOnly?'Mapa: posição atual do grupo':'Mapa da viagem: caminhos por transporte'});
  svg.style.width=`${app.zoom*100}%`;svg.style.aspectRatio=`${map.width}/${map.height}`;
  if(readOnly&&app.viewportMap){host.dataset.viewportMap='true';svg.style.width='100%';svg.style.height='100%';svg.style.aspectRatio='auto';}
  svg.append(node('image',{href:map.src,width:map.width,height:map.height}));
  const route=node('g'),draftLayer=node('g');svg.append(route,draftLayer);host.replaceChildren(svg);
  const radius=Math.max(4,map.width/220),stroke=Math.max(2,map.width/450);
  for(const [index,s] of (app.positionOnly?[]:trip.segments).entries()){
    if(!s.path?.length)continue;
    const line=node('polyline',{points:s.path.map(p=>`${p.x},${p.y}`).join(' '),fill:'none',stroke:COLORS[s.type], 'stroke-width':stroke*.25,'stroke-linecap':'round','stroke-linejoin':'round',tabindex:0,role:'button','aria-label':`Trecho ${index+1}: ${s.name}`});
    if(readOnly){line.removeAttribute('tabindex');line.removeAttribute('role');}
    // A finer visible route keeps the original, easier-to-click hit area.
    if(!readOnly){const hit=line.cloneNode();hit.setAttribute('stroke','transparent');hit.setAttribute('stroke-width',stroke);hit.setAttribute('aria-hidden','true');hit.removeAttribute('tabindex');hit.removeAttribute('role');hit.addEventListener('click',()=>line.dispatchEvent(new MouseEvent('click',{bubbles:false})));route.append(hit);}
    line.append(node('title'));line.firstChild.textContent=`${index+1}. ${s.name} · ${TYPES[s.type]} · ${formatNumber(s.distance)} km`;
    if(!readOnly){line.addEventListener('click',e=>{if(app.mapDraft)return;e.stopPropagation();app.lastAction=app.run('mapEdit',s.id);});
    line.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();app.lastAction=app.run('mapEdit',s.id);}});}route.append(line);
    const start=s.path[0];route.append(node('circle',{cx:start.x,cy:start.y,r:radius*.25,fill:COLORS[s.type],stroke:'#0d151c','stroke-width':stroke/8}));
    const text=node('text',{x:start.x+radius*1.5,y:start.y-radius,'font-size':radius*3,fill:'#fff','paint-order':'stroke',stroke:'#000','stroke-width':stroke/1.5});text.textContent=index+1;route.append(text);
  }
  const marker=app.positionOnly?app.progressMarker:position(trip);svg.insertBefore(node('g',{'data-travel-progress':''}),draftLayer);updateMapProgress(app,trip);
  function redraw(){
    draftLayer.replaceChildren();const d=app.mapDraft;
    if(!d){const status=app.element.querySelector('[data-map-status]');if(status)status.textContent=trip.elapsed?(marker?'O círculo branco mostra o progresso. Duplique para editar o caminho.':'Mapa de consulta: este roteiro usa distâncias manuais. Duplique a viagem para desenhar o caminho.'):'Escolha um transporte e clique em Traçar trecho. Clique em uma linha para editar seus pontos.';return;}
    if(d.points.length>1)draftLayer.append(node('polyline',{points:d.points.map(p=>`${p.x},${p.y}`).join(' '),fill:'none',stroke:'#fff','stroke-width':stroke*.3,'stroke-dasharray':`${stroke*3} ${stroke*2}`}));
    for(const [i,p]of d.points.entries()){
      const handle=node('g',{transform:`translate(${p.x} ${p.y})`,tabindex:0,'aria-label':`Ponto ${i+1} do caminho`});
      // Keep the generous hit area, but draw a much smaller pin over the map.
      handle.append(node('circle',{r:radius*1.3,fill:'transparent'}),node('circle',{'data-route-pin':'',r:radius*.15,fill:'#fff',stroke:'#c49835','stroke-width':stroke*.1625,'pointer-events':'none'}));
      handle.style.cursor='grab';handle.addEventListener('click',e=>e.stopPropagation());
      handle.addEventListener('pointerdown',e=>{if(!editable||e.button!==0)return;e.preventDefault();e.stopPropagation();app.dragIndex=i;svg.setPointerCapture(e.pointerId);});draftLayer.append(handle);
    }
    let text=d.mode==='scale'?`Escala: marque dois pontos (${d.points.length}/2) e informe a distância conhecida.`:`${d.segmentId?'Editando':'Traçando'}: ${d.points.length} pontos. Clique no mapa, arraste os pontos ou salve o trecho.`;
    if(d.mode==='draw'&&d.points.length>1){try{text+=` ${formatNumber(distance(d.points,map))} km.`;}catch{}}
    app.element.querySelector('[data-map-status]').textContent=text;
  }
  function coordinates(e){const inverse=svg.getScreenCTM()?.inverse();if(!inverse)throw Error('Mapa ainda não está pronto.');const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(inverse);return point({x:Math.max(0,Math.min(map.width,p.x)),y:Math.max(0,Math.min(map.height,p.y))},map);}
  svg.addEventListener('pointermove',e=>{if(app.dragIndex===null)return;app.mapDraft.points[app.dragIndex]=coordinates(e);app.dragMoved=true;redraw();});
  svg.addEventListener('pointerup',()=>{app.dragIndex=null;});
  svg.addEventListener('pointercancel',()=>{app.dragIndex=null;app.dragMoved=false;});
  svg.addEventListener('click',e=>{
    if(e.button!==0)return;
    if(app.dragMoved){app.dragMoved=false;return;}const d=app.mapDraft;if(!d||!editable)return;
    if(d.points.length>=(d.mode==='scale'?2:2000))return;
    d.points.push(coordinates(e));redraw();
  });
  host.addEventListener('keydown',e=>{if(e.key==='Escape'&&app.mapDraft){e.preventDefault();e.stopPropagation();app.lastAction=app.run('mapCancel');}});
  host.addEventListener('wheel',event=>{
    if(!event.deltaY)return;
    event.preventDefault();event.stopPropagation();
    if(app.dragIndex===null&&!app.mapPanning)zoomMapAtPointer(app,host,event);
  },{passive:false});
  // Right drag changes only the viewport. It never edits route/calibration points.
  let pan=null;
  host.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();});
  host.addEventListener('pointerdown',e=>{
    if(e.button!==2||app.dragIndex!==null)return;
    e.preventDefault();e.stopPropagation();
    pan={pointerId:e.pointerId,x:e.clientX,y:e.clientY,left:host.scrollLeft,top:host.scrollTop,scale:mapViewportScale(host)};
    if(host.dataset.viewportMap==='true'){const rect=svg.getBoundingClientRect(),box=svg.viewBox.baseVal;Object.assign(pan,{centerX:Number(host.dataset.centerX),centerY:Number(host.dataset.centerY),sourcePerX:box.width/rect.width,sourcePerY:box.height/rect.height});}
    app.mapPanning=true;host.classList.add('tv-map-panning');host.setPointerCapture(e.pointerId);
  });
  host.addEventListener('pointermove',e=>{
    if(!pan||e.pointerId!==pan.pointerId)return;
    e.preventDefault();e.stopPropagation();
    if(host.dataset.viewportMap==='true')setMapCamera(host,{centerX:pan.centerX+(pan.x-e.clientX)*pan.sourcePerX,centerY:pan.centerY+(pan.y-e.clientY)*pan.sourcePerY});
    else{host.scrollLeft=pan.left+(pan.x-e.clientX)/pan.scale;host.scrollTop=pan.top+(pan.y-e.clientY)/pan.scale;}
  });
  const stopPan=e=>{
    if(!pan||e.pointerId!==pan.pointerId)return;
    const pointerId=pan.pointerId;pan=null;app.mapPanning=false;host.classList.remove('tv-map-panning');
    if(host.hasPointerCapture(pointerId))host.releasePointerCapture(pointerId);
    app.rememberMapViewport();
  };
  for(const event of ['pointerup','pointercancel','lostpointercapture'])host.addEventListener(event,stopPan);
  redraw();
  if(host.dataset.viewportMap==='true')setMapCamera(host,{zoom:app.zoom});
  restoreMapView(app.element,host,app.mapViewFor(trip));
}
export function updateMapProgress(app,trip){
  const host=app.element?.querySelector('[data-map-host]'),layer=host?.querySelector('[data-travel-progress]');
  if(!layer||host.dataset.tripId!==trip?.id||host.dataset.mapSrc!==trip.map?.src)return;
  const marker=app.positionOnly?app.progressMarker:position(trip),radius=Math.max(4,trip.map.width/220),stroke=Math.max(2,trip.map.width/450);
  if(!marker){if(layer.firstChild)layer.replaceChildren();return;}
  const circle=layer.firstElementChild;
  if(circle){if(circle.getAttribute('cx')!==String(marker.x))circle.setAttribute('cx',marker.x);if(circle.getAttribute('cy')!==String(marker.y))circle.setAttribute('cy',marker.y);return;}
  layer.append(node('circle',{cx:marker.x,cy:marker.y,r:radius*.375,fill:'#fff',stroke:'#18191a','stroke-width':stroke*.25}));
}
export async function loadMapImage(src){
  return new Promise((resolve,reject)=>{const img=new Image();const timeout=setTimeout(()=>{img.src='';reject(Error('A imagem demorou para carregar. Confira o caminho.'));},15000);
    img.onload=()=>{clearTimeout(timeout);resolve({src,width:img.naturalWidth,height:img.naturalHeight});};img.onerror=()=>{clearTimeout(timeout);reject(Error('Não foi possível abrir a imagem do mapa. Confira o arquivo.'));};img.src=src;
  });
}
