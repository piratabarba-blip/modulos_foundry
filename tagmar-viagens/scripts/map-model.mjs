// SPDX-License-Identifier: GPL-3.0-or-later
// Geometry uses the original image pixels, independent of window size and zoom.
import {clone,number,segment,checkpoint,complete,started} from './engine.mjs';
export const COLORS={foot:'#f2ca61',mount:'#77d596',cart:'#ed995a',ship:'#6ebdf4'};
export function imagePath(value){
  const src=String(value??'').trim();
  if(!src||src.length>4096||/[<>\u0000-\u001f]/.test(src)||/^(?:[a-z]+:|\/\/)/i.test(src)&&!/^https?:\/\//i.test(src))throw Error('Escolha uma imagem válida no seletor de arquivos do Foundry.');
  return src;
}
export function mapImage(src,width,height){return {src:imagePath(src),width:number(width,'Largura da imagem',1,50000),height:number(height,'Altura da imagem',1,50000),kmPerPixel:0};}
export function mapDefinition(input){
  let map=mapImage(input.src,input.width,input.height);
  if(input.calibration)map=calibrate(map,input.calibration.a,input.calibration.b,input.calibration.km);
  else if(input.kmPerPixel)map.kmPerPixel=number(input.kmPerPixel,'Escala do mapa',Number.MIN_VALUE,1e7);
  if(input.sourceScene)map.sourceScene=clone(input.sourceScene);
  if(input.sceneScale&&!input.calibration)map.sceneScale=clone(input.sceneScale);
  return map;
}
export function point(p,map){return {x:number(p?.x,'Ponto X',0,map.width),y:number(p?.y,'Ponto Y',0,map.height)};}
export function pathLength(points,map){
  if(!Array.isArray(points)||points.length<2||points.length>2000)throw Error('Marque entre 2 e 2.000 pontos para este trecho.');
  const checked=points.map(p=>point(p,map));return checked.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-checked[i].x,p.y-checked[i].y),0);
}
export function calibrate(input,a,b,km){
  const map=clone(input),px=pathLength([a,b],map);if(px<1)throw Error('Os dois pontos da escala precisam estar separados.');
  const distance=number(km,'Distância conhecida (km)',.000001,1e7);
  map.kmPerPixel=distance/px;delete map.sceneScale;map.calibration={a:point(a,map),b:point(b,map),km:distance};return map;
}
export function distance(points,map){
  number(map?.kmPerPixel,'Escala do mapa',Number.MIN_VALUE,1e7);
  return number(pathLength(points,map)*map.kmPerPixel,'Distância do trecho',.000001,1e7);
}
function editable(t){if(started(t))throw Error('A viagem já começou. Duplique para mudar o mapa ou o caminho.');}
export function setMap(t,map){
  if(t.map)editable(t);if(t.segments.some(s=>s.path?.length))throw Error('O mapa já possui trechos desenhados. Duplique a viagem ou remova esses trechos antes de trocar a imagem.');
  const next=clone(t);checkpoint(next,'Imagem do mapa');next.map=mapDefinition(map);
  if(map.libraryId)next.map.libraryId=map.libraryId;
  return next;
}
export function setScale(t,a,b,km){
  editable(t);if(!t.map)throw Error('Escolha primeiro a imagem do mapa.');
  const next=clone(t);checkpoint(next,'Escala do mapa');next.map=calibrate(t.map,a,b,km);
  for(const s of next.segments)if(s.path?.length)s.distance=distance(s.path,next.map);
  return next;
}
export function savePath(t,profile,points,segmentId=null){
  editable(t);if(!t.map)throw Error('Escolha primeiro o mapa.');
  const km=distance(points,t.map),next=clone(t);checkpoint(next,segmentId?'Edição do caminho':'Trecho desenhado no mapa');
  if(segmentId){const s=next.segments.find(s=>s.id===segmentId);if(!s)throw Error('Trecho não encontrado.');s.path=points.map(p=>point(p,t.map));s.distance=km;}
  else {if(next.segments.length>=100)throw Error('Limite de 100 trechos.');next.segments.push({...segment(profile,km),path:points.map(p=>point(p,t.map))});}
  return next;
}
export function position(t){
  const s=t.segments.find(s=>!complete(s,t.progress[s.id]))??t.segments.at(-1);
  if(!s?.path?.length||!t.map)return null;
  const points=s.path,full=pathLength(points,t.map);let left=Math.min(full,(t.progress[s.id]?.km??0)/t.map.kmPerPixel);
  for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],len=Math.hypot(b.x-a.x,b.y-a.y);if(left<=len&&len>0)return {x:a.x+(b.x-a.x)*left/len,y:a.y+(b.y-a.y)*left/len};left-=len;}
  return points.at(-1);
}
