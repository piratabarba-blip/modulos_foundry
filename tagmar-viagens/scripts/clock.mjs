// SPDX-License-Identifier: GPL-3.0-or-later
// A single shared world clock. Forward/backward projection never edits the calendar itself.
import * as E from './engine.mjs';
const DAY=86400,YEAR=361;
const MONTHS=['Conflito','Água','Paz','Semente','Ouro','Talento','Paixão','Sangue','Sabedoria','Rosa','Vida','Justiça'];
export function available(game){return !!(game.modules.get('tagmar-calendario')?.active&&game.modules.get('tagmar-calendario')?.api?.getDate);}
export function now(game){
  if(!available(game))return null;
  const d=game.modules.get('tagmar-calendario').api.getDate();
  const seconds=((Number(game.time.worldTime)%DAY)+DAY)%DAY;
  const result=(Number(d.year)*YEAR+Number(d.dayOfYear))*DAY+seconds;
  if(!Number.isFinite(result))throw Error('O calendário devolveu uma data inválida.');return result;
}
export function format(instant){
  if(!Number.isFinite(instant))return 'Indisponível';
  const days=Math.floor(instant/DAY),year=Math.floor(days/YEAR),day=((days%YEAR)+YEAR)%YEAR,seconds=((Math.floor(instant)%DAY)+DAY)%DAY;
  const date=day===360?`Cruine de ${year}`:`${day%30+1} de ${MONTHS[Math.floor(day/30)]} de ${year}`;
  return `${date}, ${String(Math.floor(seconds/3600)).padStart(2,'0')}:${String(Math.floor(seconds%3600/60)).padStart(2,'0')}`;
}
function snapshot(t){const {history,...trip}=E.clone(t);return trip;}
export function bind(state,id,instant){
  if(!Number.isFinite(instant))throw Error('Ative o Grande Calendário para sincronizar a viagem.');
  const t=state.trips.find(t=>t.id===id);if(!t)throw Error('Viagem não encontrada.');if(!t.segments.length)throw Error('Adicione pelo menos um trecho antes de vincular.');
  if(state.clockLink?.tripId===id){reconcile(state,instant);return;}
  state.clockLink={tripId:id,cursor:instant,anchors:[{at:instant,trip:snapshot(t),arrivalAt:E.currentStage(t).finished?instant:null}],arrivalAt:null};
}
export function rebase(state,id,instant){
  const link=state.clockLink;if(link?.tripId!==id)return;
  const t=state.trips.find(t=>t.id===id);if(!t){state.clockLink=null;return;}
  const anchor={at:instant,trip:snapshot(t),arrivalAt:E.currentStage(t).finished?link.arrivalAt??instant:null};
  // Changing a plan after rewinding starts a new branch, preserving earlier anchors.
  link.anchors=[...link.anchors.filter(a=>a.at<instant),anchor].slice(-128);link.cursor=instant;
}
export function reconcile(state,instant){
  const link=state.clockLink;if(!link||instant===null||link.cursor===instant)return false;
  const index=state.trips.findIndex(t=>t.id===link.tripId);if(index<0){state.clockLink=null;return true;}
  if(!link.anchors?.length)throw Error('Histórico de sincronização inválido. Desvincule e vincule a viagem novamente.');
  const anchor=link.anchors.filter(a=>a.at<=instant).at(-1)??link.anchors[0];
  const current=state.trips[index],hours=Math.max(0,(instant-anchor.at)/3600);
  const next=E.project(anchor.trip,hours);next.history=current.history;next.name=current.name;next.dateLabel=current.dateLabel;if(current.map&&!next.map)next.map=E.clone(current.map);
  const estimate=E.estimate(anchor.trip);
  link.arrivalAt=E.currentStage(next).finished?(E.currentStage(anchor.trip).finished?anchor.arrivalAt??anchor.at:anchor.at+estimate.remaining*3600):null;
  state.trips[index]=next;link.cursor=instant;return true;
}
export function display(state,t,instant){
  if(state.clockLink?.tripId!==t.id||instant===null)return {linked:false};
  const est=E.estimate(t),arrival=state.clockLink.arrivalAt;
  return {linked:true,current:format(instant),eta:arrival!==null?format(arrival):t.paused?'Retome a viagem':est.remaining===null?'Indisponível':format(Math.max(instant,state.clockLink.anchors[0].at)+est.remaining*3600),beforeLink:instant<state.clockLink.anchors[0].at};
}
