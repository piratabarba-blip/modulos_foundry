// SPDX-License-Identifier: GPL-3.0-or-later
// Saved definitions contain image and scale only; trips always receive copies.
import {clone,id} from './engine.mjs';
import {mapDefinition} from './map-model.mjs';
export function mapName(map){
  let name=map?.sourceScene?.name||String(map?.src??'').split('/').at(-1)?.split('?')[0]||'Mapa';
  try{name=decodeURIComponent(name);}catch{}
  return String(name).trim().slice(0,120)||'Mapa';
}
export function libraryOf(state){
  const library=state.mapLibrary??{schema:1,entries:[],lastId:null};
  if(library.schema!==1||!Array.isArray(library.entries)||library.entries.length>100)throw Error('Biblioteca de mapas desconhecida. Não será sobrescrita.');
  return library;
}
export function rememberMap(state,map,{name=mapName(map),asNew=false}={}){
  const library=clone(libraryOf(state)),definition=mapDefinition(map);
  let entry=!asNew&&library.entries.find(e=>e.id===map.libraryId);
  entry||=!asNew&&library.entries.find(e=>JSON.stringify(e.map)===JSON.stringify(definition));
  if(!entry){
    if(library.entries.length>=100)throw Error('Limite de 100 mapas salvos. Remova um mapa da biblioteca antes de adicionar outro.');
    entry={id:id(),name:String(name).trim().slice(0,120)||mapName(map),map:definition};library.entries.push(entry);
  }else entry.map=definition;
  library.lastId=entry.id;state.mapLibrary=library;
  return {...clone(definition),libraryId:entry.id};
}
export function savedMap(state,entryId){
  const entry=libraryOf(state).entries.find(e=>e.id===entryId);
  if(!entry)throw Error('Escolha um mapa salvo.');
  return {...mapDefinition(entry.map),libraryId:entry.id};
}
export function defaultMap(state,currentTrip){
  const library=libraryOf(state);
  if(library.lastId&&library.entries.some(e=>e.id===library.lastId))return savedMap(state,library.lastId);
  // Preserve the last map from previews that predate the library.
  if(state.mapLibrary)return null;
  const previous=currentTrip?.map??state.trips.findLast(t=>t.map)?.map;
  return previous?rememberMap(state,previous):null;
}
export function forgetMap(state,entryId){
  const library=clone(libraryOf(state));
  if(!library.entries.some(e=>e.id===entryId))throw Error('Escolha um mapa salvo.');
  library.entries=library.entries.filter(e=>e.id!==entryId);
  if(library.lastId===entryId)library.lastId=library.entries.at(-1)?.id??null;
  state.mapLibrary=library;
}
