// SPDX-License-Identifier: GPL-3.0-or-later
// Public view: never copy a journey, its path, scale, name or planning metadata.
import {imagePath,position} from './map-model.mjs';
export const emptyPlayerMap=()=>({schema:1,map:null,position:null});
export function readPlayerMap(value){
  if(value?.schema!==1||!value.map)return emptyPlayerMap();
  const {width,height}=value.map;
  if(![width,height].every(n=>Number.isFinite(n)&&n>=1&&n<=50000))return emptyPlayerMap();
  let src;try{src=imagePath(value.map.src);}catch{return emptyPlayerMap();}
  const p=value.position;
  const marker=p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=width&&p.y>=0&&p.y<=height?{x:p.x,y:p.y}:null;
  return {schema:1,map:{src,width,height},position:marker};
}
export function playerMapSnapshot(trip){
  if(!trip?.map)return emptyPlayerMap();
  return readPlayerMap({schema:1,map:trip.map,position:position(trip)});
}

export function samePlayerMap(a,b){return !!a&&!!b&&a.src===b.src&&a.width===b.width&&a.height===b.height;}
export function readPlayerFocus(value){
  if(!value||typeof value.id!=='string'||!value.id||value.id.length>80)return null;
  const map=readPlayerMap({schema:1,map:value.map}).map;
  const {zoom,centerX,centerY}=value;
  if(!map||![zoom,centerX,centerY].every(Number.isFinite)||zoom<1||zoom>24||centerX<0||centerX>map.width||centerY<0||centerY>map.height)return null;
  return {id:value.id,map,zoom,centerX,centerY};
}
